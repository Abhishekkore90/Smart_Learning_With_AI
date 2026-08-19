import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
// @ts-ignore
import { getTeacherId, matchStudentTeacherClassAndMedium } from "@/lib/teacherIsolationHelper";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2, Save, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { CLASS_1_OUTCOMES, CLASS_1_SEMI_OUTCOMES, OutcomeItem } from "@/data/class1_outcomes";
import { CLASS_2_OUTCOMES, CLASS_2_SEMI_OUTCOMES } from "@/data/class2_outcomes";
import { CLASS_3_OUTCOMES, CLASS_3_SEMI_OUTCOMES } from "@/data/class3_outcomes";
import { CLASS_4_OUTCOMES, CLASS_4_SEMI_OUTCOMES } from "@/data/class4_outcomes";
import { CLASS_5_OUTCOMES, CLASS_5_SEMI_OUTCOMES } from "@/data/class5_outcomes";
import { CLASS_6_OUTCOMES, CLASS_6_SEMI_OUTCOMES } from "@/data/class6_outcomes";
import { CLASS_7_OUTCOMES, CLASS_7_SEMI_OUTCOMES } from "@/data/class7_outcomes";
import { CLASS_8_OUTCOMES, CLASS_8_SEMI_OUTCOMES } from "@/data/class8_outcomes";

type Semester = "sem1" | "sem2";
interface Student {
  id: string;
  fullName?: string;
  name?: string;
  rollNo?: string;
  [key: string]: any;
}

const CLASS_OPTIONS = [
  { key: "1st", label: "इयत्ता १ ली (1st)" },
  { key: "2nd", label: "इयत्ता २ री (2nd)" },
  { key: "3rd", label: "इयत्ता ३ री (3rd)" },
  { key: "4th", label: "इयत्ता ४ थी (4th)" },
  { key: "5th", label: "इयत्ता ५ वी (5th)" },
  { key: "6th", label: "इयत्ता ६ वी (6th)" },
  { key: "7th", label: "इयत्ता ७ वी (7th)" },
  { key: "8th", label: "इयत्ता ८ वी (8th)" },
];

const SUBJECTS_LIST = [
  { key: "marathi", label: "प्रथम भाषा (मराठी)" },
  { key: "hindi", label: "द्वितीय भाषा (हिंदी)" },
  { key: "math", label: "गणित" },
  { key: "english", label: "तृतीय भाषा (इंग्रजी)" },
  { key: "evs1", label: "परिसर अभ्यास १" },
  { key: "evs2", label: "परिसर अभ्यास २" },
  { key: "science", label: "सामान्य विज्ञान" },
  { key: "history", label: "इतिहास व नागरिकशास्त्र" },
  { key: "geography", label: "भूगोल" },
  { key: "kala", label: "कला" },
  { key: "karyanubhav", label: "कार्यानुभव / कार्यशिक्षण" },
  { key: "sharirik", label: "शारीरिक शिक्षण व आरोग्य" },
];

// Circular progress indicator component
function OutcomeProgressCircle({
  filledCount,
  totalStudents,
  onClick,
}: {
  filledCount: number;
  totalStudents: number;
  onClick: () => void;
}) {
  const percentage = totalStudents > 0 ? Math.round((filledCount / totalStudents) * 100) : 0;
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 group focus:outline-none"
      title={`${filledCount}/${totalStudents} विद्यार्थ्यांची माहिती भरली आहे (${percentage}%)`}
    >
      <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="3.5"
        />
        {percentage > 0 && (
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke={percentage === 100 ? "#10b981" : "#2563eb"}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      <span
        className={`absolute text-[10px] font-black ${
          percentage === 100
            ? "text-emerald-600"
            : percentage > 0
              ? "text-blue-600"
              : "text-slate-400 group-hover:text-blue-500"
        }`}
      >
        {percentage > 0 ? `${percentage}%` : "0%"}
      </span>
    </button>
  );
}

// ratings: { [subjectKey]: { [outcomeCode]: { [studentId]: 1|2|3|4|0 } } }
type RatingData = Record<string, Record<string, Record<string, number>>>;

export function CCESubjectWise({
  selectedClass: initialClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [activeClass, setActiveClass] = useState<string>(initialClass || "1st");
  const [activeSemester, setActiveSemester] = useState<Semester>("sem1");
  const [expandedSubject, setExpandedSubject] = useState<string | null>("marathi");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ratingData, setRatingData] = useState<RatingData>({});

  // Class-wise dynamic outcomes state per subject
  const [classOutcomes, setClassOutcomes] = useState<Record<string, OutcomeItem[]>>({});

  // Outcome add inputs per subject
  const [newCode, setNewCode] = useState("");
  const [newText, setNewText] = useState("");

  // Outcome detail student rating view state
  const [editingOutcome, setEditingOutcome] = useState<{
    subjectKey: string;
    subjectLabel: string;
    code: string;
    text: string;
  } | null>(null);

  // 1. Fetch student roster for activeClass
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    const unsub = onSnapshot(q, (snap) => {
      const teacherId = getTeacherId();
      const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Student[];
      const filtered = raw.filter((s) => matchStudentTeacherClassAndMedium(s, teacherId, activeClass, currentMedium));
      setStudents(filtered.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => unsub();
  }, [activeClass]);

  // 2. Load class-wise dynamic outcomes list (isolated per medium)
  useEffect(() => {
    let isMounted = true;
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const cacheKey = `cce_class_outcomes_${activeClass}_${currentMedium}_${academicYear}`;
    const docKey = `${activeClass}_${currentMedium}_${academicYear}`;

    // Check local cache first
    try {
      const cached = localStorage.getItem(cacheKey) || localStorage.getItem(`cce_class_outcomes_${activeClass}_${academicYear}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setClassOutcomes(parsed);
        }
      }
    } catch (e) {}

    const loadOutcomes = async () => {
      try {
        const medRef = doc(db, "cce_outcomes_list_v2", docKey);
        const medSnap = await getDoc(medRef);
        if (isMounted && medSnap.exists() && medSnap.data().outcomes) {
          const recs = medSnap.data().outcomes;
          setClassOutcomes(recs);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(recs));
          } catch (e) {}
          return;
        }

        const fallbackRef = doc(db, "cce_outcomes_list_v2", `${activeClass}_${academicYear}`);
        const fallbackSnap = await getDoc(fallbackRef);
        if (isMounted && fallbackSnap.exists() && fallbackSnap.data().outcomes) {
          const recs = fallbackSnap.data().outcomes;
          setClassOutcomes(recs);
        }
      } catch (err) {
        console.warn("Could not load outcomes list:", err);
      }
    };

    const ref = doc(db, "cce_outcomes_list_v2", docKey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists() && snap.data().outcomes) {
          const recs = snap.data().outcomes;
          setClassOutcomes(recs);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(recs));
          } catch (e) {}
        }
      },
      (err) => console.warn("Outcomes snapshot error:", err)
    );

    loadOutcomes();
    return () => {
      isMounted = false;
      unsub();
    };
  }, [activeClass, academicYear]);

  // 3. Load student ratings for activeClass & activeSemester (isolated per medium)
  useEffect(() => {
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const docKey = `${activeClass}_${currentMedium}_${academicYear}_${activeSemester}`;

    const loadRatings = async () => {
      setLoading(true);
      try {
        const medRef = doc(db, "cce_outcomes", docKey);
        const medSnap = await getDoc(medRef);
        if (medSnap.exists()) {
          setRatingData(medSnap.data().ratings || {});
          setLoading(false);
          return;
        }
        const fallbackRef = doc(db, "cce_outcomes", `${activeClass}_${academicYear}_${activeSemester}`);
        const fallbackSnap = await getDoc(fallbackRef);
        setRatingData(fallbackSnap.exists() ? fallbackSnap.data().ratings || {} : {});
      } catch (err) {
        console.warn("Error loading ratings:", err);
      }
      setLoading(false);
    };

    const ref = doc(db, "cce_outcomes", docKey);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setRatingData(snap.data().ratings || {});
        }
        setLoading(false);
      },
      (err) => console.warn("Ratings snapshot error:", err)
    );

    loadRatings();
    return () => unsub();
  }, [activeClass, academicYear, activeSemester]);

  // Get outcomes list for a subject
  const getOutcomesForSubject = (subKey: string): OutcomeItem[] => {
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const custom = classOutcomes[subKey];
    if (Array.isArray(custom) && custom.length > 0) return custom;

    let outcomeBank: Record<string, OutcomeItem[]> | null = null;
    if (activeClass === "1st" || activeClass === "1") outcomeBank = currentMedium === "semi" ? CLASS_1_SEMI_OUTCOMES : CLASS_1_OUTCOMES;
    else if (activeClass === "2nd" || activeClass === "2") outcomeBank = currentMedium === "semi" ? CLASS_2_SEMI_OUTCOMES : CLASS_2_OUTCOMES;
    else if (activeClass === "3rd" || activeClass === "3") outcomeBank = currentMedium === "semi" ? CLASS_3_SEMI_OUTCOMES : CLASS_3_OUTCOMES;
    else if (activeClass === "4th" || activeClass === "4") outcomeBank = currentMedium === "semi" ? CLASS_4_SEMI_OUTCOMES : CLASS_4_OUTCOMES;
    else if (activeClass === "5th" || activeClass === "5") outcomeBank = currentMedium === "semi" ? CLASS_5_SEMI_OUTCOMES : CLASS_5_OUTCOMES;
    else if (activeClass === "6th" || activeClass === "6") outcomeBank = currentMedium === "semi" ? CLASS_6_SEMI_OUTCOMES : CLASS_6_OUTCOMES;
    else if (activeClass === "7th" || activeClass === "7") outcomeBank = currentMedium === "semi" ? CLASS_7_SEMI_OUTCOMES : CLASS_7_OUTCOMES;
    else if (activeClass === "8th" || activeClass === "8") outcomeBank = currentMedium === "semi" ? CLASS_8_SEMI_OUTCOMES : CLASS_8_OUTCOMES;

    if (outcomeBank && outcomeBank[subKey]) {
      const list = outcomeBank[subKey];
      if (currentMedium === "semi" && (subKey === "math" || subKey === "science" || subKey === "evs1" || subKey === "evs2")) {
        const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str);
        return list.filter((item) => !isDevanagari(item.text));
      }
      return list;
    }
    return [];
  };

  // Class-specific subject filter (show ONLY subjects relevant for activeClass)
  const activeSubjectsList = useMemo(() => {
    const norm = String(activeClass || "1st").toLowerCase().replace(/[^0-9]/g, "") || "1";
    return SUBJECTS_LIST.filter((sub) => {
      if (norm === "1" || norm === "2") {
        return ["marathi", "english", "math", "kala", "karyanubhav", "sharirik"].includes(sub.key);
      }
      if (norm === "3" || norm === "4") {
        return ["marathi", "english", "math", "evs1", "kala", "karyanubhav", "sharirik"].includes(sub.key);
      }
      if (norm === "5") {
        return ["marathi", "english", "hindi", "math", "evs1", "kala", "karyanubhav", "sharirik"].includes(sub.key);
      }
      if (parseInt(norm) >= 6) {
        return ["marathi", "english", "hindi", "math", "science", "history", "geography", "kala", "karyanubhav", "sharirik"].includes(sub.key);
      }
      return true;
    });
  }, [activeClass]);

  // Reset expanded subject if it's no longer in activeSubjectsList
  useEffect(() => {
    if (activeSubjectsList.length > 0 && !activeSubjectsList.some((s) => s.key === expandedSubject)) {
      setExpandedSubject(activeSubjectsList[0].key);
    }
  }, [activeClass, activeSubjectsList]);

  // Add new outcome for current active class and subject
  const addOutcome = async (subKey: string) => {
    const code = newCode.trim();
    const text = newText.trim();
    if (!code || !text) {
      toast.error("कृपया अध्ययन निष्पत्ती कोड आणि वर्णन प्रविष्ट करा.");
      return;
    }

    const newItem: OutcomeItem = {
      id: `out_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code,
      text,
    };

    const currentSubList = getOutcomesForSubject(subKey);
    const updatedSubList = [...currentSubList, newItem];
    const updatedClassOutcomes = { ...classOutcomes, [subKey]: updatedSubList };

    setClassOutcomes(updatedClassOutcomes);
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const cacheKey = `cce_class_outcomes_${activeClass}_${currentMedium}_${academicYear}`;
    const docKey = `${activeClass}_${currentMedium}_${academicYear}`;

    try {
      localStorage.setItem(cacheKey, JSON.stringify(updatedClassOutcomes));
    } catch (e) {}

    setNewCode("");
    setNewText("");

    try {
      const ref = doc(db, "cce_outcomes_list_v2", docKey);
      await setDoc(
        ref,
        {
          class: activeClass,
          medium: currentMedium,
          academicYear,
          outcomes: updatedClassOutcomes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("नवीन अध्ययन निष्पत्ती जोडली!");
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
  };

  // Delete outcome from active class and subject
  const deleteOutcome = async (subKey: string, outcomeId: string) => {
    const currentSubList = getOutcomesForSubject(subKey);
    const updatedSubList = currentSubList.filter((item) => item.id !== outcomeId);
    const updatedClassOutcomes = { ...classOutcomes, [subKey]: updatedSubList };

    setClassOutcomes(updatedClassOutcomes);
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const cacheKey = `cce_class_outcomes_${activeClass}_${currentMedium}_${academicYear}`;
    const docKey = `${activeClass}_${currentMedium}_${academicYear}`;

    try {
      localStorage.setItem(cacheKey, JSON.stringify(updatedClassOutcomes));
    } catch (e) {}

    try {
      const ref = doc(db, "cce_outcomes_list_v2", docKey);
      await setDoc(
        ref,
        {
          class: activeClass,
          medium: currentMedium,
          academicYear,
          outcomes: updatedClassOutcomes,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("अध्ययन निष्पत्ती काढून टाकली!");
    } catch (err: any) {
      toast.error("त्रुटी: " + err.message);
    }
  };

  const getRating = (subKey: string, code: string, studentId: string): number =>
    ratingData[subKey]?.[code]?.[studentId] || 0;

  const getFilledCount = (subKey: string, code: string): number =>
    students.filter((s) => getRating(subKey, code, s.id) > 0).length;

  const setRating = (subKey: string, code: string, studentId: string, value: number) => {
    setRatingData((prev) => ({
      ...prev,
      [subKey]: {
        ...(prev[subKey] || {}),
        [code]: {
          ...((prev[subKey] || {})[code] || {}),
          [studentId]: value,
        },
      },
    }));
  };

  const saveRatings = async () => {
    setSaving(true);
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const docKey = `${activeClass}_${currentMedium}_${academicYear}_${activeSemester}`;
    try {
      await setDoc(
        doc(db, "cce_outcomes", docKey),
        {
          class: activeClass,
          medium: currentMedium,
          academicYear,
          semester: activeSemester,
          ratings: ratingData,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("गुणवत्तेच्या नोंदी जतन झाल्या!");
      setEditingOutcome(null);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  // ── OUTCOME DETAIL RATING VIEW ──
  if (editingOutcome) {
    const { subjectKey, code, text } = editingOutcome;
    return (
      <div
        className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden min-h-[85vh] flex flex-col relative select-none"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingOutcome(null)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-slate-900 text-base font-extrabold">
                इयत्ता {activeClass} • {activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">विद्यार्थी गुण / क्षमता श्रेणी नोंदी</p>
            </div>
          </div>
        </div>

        {/* Outcome Description Card */}
        <div className="px-6 py-4 border-b border-slate-100 bg-blue-50/30 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 px-3 py-1 rounded-xl text-xs font-black bg-blue-600 text-white shadow-xs">
              {code}
            </div>
            <p className="text-sm leading-relaxed text-slate-800 font-bold">{text}</p>
          </div>
        </div>

        {/* Student Rating List */}
        <div className="flex-1 overflow-y-auto pb-28 px-6 py-4 space-y-3">
          {students.length === 0 ? (
            <div className="flex justify-center py-20 text-slate-400 text-sm font-bold">
              या इयत्तेमध्ये विद्यार्थी सापडले नाहीत
            </div>
          ) : (
            students.map((student, idx) => {
              const rating = getRating(subjectKey, code, student.id);
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs flex-shrink-0">
                      {student.rollNo || idx + 1}
                    </div>
                    <span className="text-base font-bold text-slate-900">
                      {student.fullName || student.name || "विद्यार्थी"}
                    </span>
                  </div>

                  {/* Level rating buttons [ 1 | 2 | 3 | 4 ] */}
                  <div className="flex items-center rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs p-0.5">
                    {[1, 2, 3, 4].map((level) => (
                      <button
                        key={level}
                        onClick={() =>
                          setRating(subjectKey, code, student.id, rating === level ? 0 : level)
                        }
                        className={`w-9 h-9 flex items-center justify-center text-xs font-black transition-all cursor-pointer rounded-lg ${
                          rating === level
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Bottom Save Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-md border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-600">
            {students.filter((s) => getRating(subjectKey, code, s.id) > 0).length} / {students.length} विद्यार्थ्यांची नोंद पूर्ण
          </span>
          <button
            onClick={saveRatings}
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="size-4" />
            <span>{saving ? "जतन होत आहे..." : "जतन करा"}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN CLASS-WISE OUTCOMES LIST VIEW ──
  return (
    <div
      className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden min-h-[85vh] flex flex-col select-none"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Accent Header Bar */}
      <div className="h-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/40 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-slate-900 text-xl font-black tracking-tight">
              अध्ययन निष्पत्ती प्रगती (इयत्तानिहाय)
            </h2>
            <p className="text-xs text-slate-500 font-medium">इयत्ता निवडून विषयनिहाय अध्ययन निष्पत्ती जोडा व नोंदी करा</p>
          </div>
        </div>

        {/* Class Selection Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">इयत्ता:</span>
          <select
            value={activeClass}
            onChange={(e) => setActiveClass(e.target.value)}
            className="px-4 py-2.5 bg-white border-2 border-blue-500 rounded-xl text-xs text-blue-700 font-extrabold outline-none shadow-xs focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {CLASS_OPTIONS.map((cls) => (
              <option key={cls.key} value={cls.key}>
                {cls.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Semester Tabs */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/20">
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl border border-slate-200/80 max-w-sm">
          {(["sem1", "sem2"] as Semester[]).map((sem) => (
            <button
              key={sem}
              onClick={() => {
                setActiveSemester(sem);
              }}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                activeSemester === sem
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {sem === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Accordion & Dynamic Outcome Add Form */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600" />
            <span className="text-xs font-bold text-slate-400">माहिती लोड होत आहे...</span>
          </div>
        ) : (
          activeSubjectsList.map((subject) => {
            const isOpen = expandedSubject === subject.key;
            const outcomesList = getOutcomesForSubject(subject.key);

            return (
              <div
                key={subject.key}
                className="border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-xs"
              >
                {/* Subject Accordion Header */}
                <button
                  onClick={() => setExpandedSubject(isOpen ? null : subject.key)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-slate-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-extrabold text-slate-900">{subject.label}</span>
                    {outcomesList.length > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-black bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                        {outcomesList.length} निष्पत्ती
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronUp className="size-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="size-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Subject Accordion Body */}
                {isOpen && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-4">
                    {/* Form to Add Dynamic Class Outcome */}
                    <div className="p-4 rounded-2xl bg-white border border-blue-200/80 shadow-xs space-y-3">
                      <p className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="size-4 text-blue-600" />
                        इयत्ता {activeClass} साठी नवीन अध्ययन निष्पत्ती जोडा:
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          value={newCode}
                          onChange={(e) => setNewCode(e.target.value)}
                          placeholder="कोड (उदा. C-1.1)"
                          className="w-full sm:w-32 px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                        />
                        <input
                          type="text"
                          value={newText}
                          onChange={(e) => setNewText(e.target.value)}
                          placeholder="अध्ययन निष्पत्तीचे वर्णन लिहा..."
                          className="flex-1 px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                        />
                        <button
                          onClick={() => addOutcome(subject.key)}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
                        >
                          <Plus className="size-4" />
                          <span>जोडा</span>
                        </button>
                      </div>
                    </div>

                    {/* Outcomes List for Active Class & Subject */}
                    {outcomesList.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-300 rounded-2xl bg-white">
                        <p className="text-xs text-slate-400 font-bold">
                          इयत्ता {activeClass} साठी अद्याप अध्ययन निष्पत्ती जोडलेल्या नाहीत. वर दिलेल्या फॉर्ममधून नवीन नोंद जोडा.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {outcomesList.map((item) => {
                          const filledCount = getFilledCount(subject.key, item.code);
                          return (
                            <div
                              key={item.id}
                              onClick={() =>
                                setEditingOutcome({
                                  subjectKey: subject.key,
                                  subjectLabel: subject.label,
                                  code: item.code,
                                  text: item.text,
                                })
                              }
                              className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md active:scale-[0.995] transition-all cursor-pointer group"
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <div className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 mt-0.5 flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                  {item.code}
                                </div>
                                <p className="text-xs leading-relaxed text-slate-800 font-bold group-hover:text-blue-700 transition-colors">
                                  {item.text}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Circular progress indicator */}
                                <OutcomeProgressCircle
                                  filledCount={filledCount}
                                  totalStudents={students.length}
                                  onClick={() =>
                                    setEditingOutcome({
                                      subjectKey: subject.key,
                                      subjectLabel: subject.label,
                                      code: item.code,
                                      text: item.text,
                                    })
                                  }
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteOutcome(subject.key, item.id);
                                  }}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                  title="काढून टाका"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
