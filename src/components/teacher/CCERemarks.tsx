import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Globe,
  Calculator,
  FlaskConical,
  Palette,
  Wrench,
  Activity,
  Sparkles,
  AlertTriangle,
  User,
  Save,
  Filter,
  CheckCircle2,
  X,
  Languages,
  Landmark,
  Trees,
  Award,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { getClassRemarks, SUBJECT_NAMES_MAP } from "@/data/classRemarksData";

type Semester = "sem1" | "sem2";
type Medium = "marathi" | "semi";
type GenderMode = "male" | "female" | "none";

interface Student {
  id: string;
  name?: string;
  fullName?: string;
  rollNo?: string;
  class?: string;
  gender?: string;
}

// Remarks record per student: map of subject/category key => array of remark strings or object values
type StudentRemarks = Record<string, any>;

const SUBJECT_META: Record<
  string,
  { label: string; icon: any; gradient: string; text: string; bg: string; border: string; activeBg: string }
> = {
  prathambhasha: {
    label: "प्रथम भाषा (मराठी)",
    icon: BookOpen,
    gradient: "from-blue-600 to-indigo-700",
    text: "text-indigo-600",
    bg: "bg-indigo-50/80",
    border: "border-indigo-200",
    activeBg: "bg-indigo-50 border-indigo-300 text-indigo-950",
  },
  dvitiybhasha: {
    label: "द्वितीय भाषा (इंग्रजी)",
    icon: Globe,
    gradient: "from-purple-600 to-violet-700",
    text: "text-purple-600",
    bg: "bg-purple-50/80",
    border: "border-purple-200",
    activeBg: "bg-purple-50 border-purple-300 text-purple-950",
  },
  tritiyabhasha: {
    label: "तृतीय भाषा (हिंदी)",
    icon: Languages,
    gradient: "from-amber-600 to-orange-700",
    text: "text-amber-600",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    activeBg: "bg-amber-50 border-amber-300 text-amber-950",
  },
  hindi: {
    label: "हिंदी भाषा",
    icon: Languages,
    gradient: "from-amber-600 to-orange-700",
    text: "text-amber-600",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    activeBg: "bg-amber-50 border-amber-300 text-amber-950",
  },
  ganit: {
    label: "गणित",
    icon: Calculator,
    gradient: "from-emerald-600 to-teal-700",
    text: "text-emerald-600",
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    activeBg: "bg-emerald-50 border-emerald-300 text-emerald-950",
  },
  vijnan: {
    label: "विज्ञान व तंत्रज्ञान",
    icon: FlaskConical,
    gradient: "from-cyan-600 to-blue-700",
    text: "text-cyan-600",
    bg: "bg-cyan-50/80",
    border: "border-cyan-200",
    activeBg: "bg-cyan-50 border-cyan-300 text-cyan-950",
  },
  vidnyan: {
    label: "विज्ञान",
    icon: FlaskConical,
    gradient: "from-cyan-600 to-blue-700",
    text: "text-cyan-600",
    bg: "bg-cyan-50/80",
    border: "border-cyan-200",
    activeBg: "bg-cyan-50 border-cyan-300 text-cyan-950",
  },
  parisar: {
    label: "परिसर अभ्यास",
    icon: Trees,
    gradient: "from-green-600 to-emerald-700",
    text: "text-green-600",
    bg: "bg-green-50/80",
    border: "border-green-200",
    activeBg: "bg-green-50 border-green-300 text-green-950",
  },
  parisar1: {
    label: "परिसर अभ्यास १",
    icon: Trees,
    gradient: "from-teal-600 to-emerald-700",
    text: "text-teal-600",
    bg: "bg-teal-50/80",
    border: "border-teal-200",
    activeBg: "bg-teal-50 border-teal-300 text-teal-950",
  },
  parisar2: {
    label: "परिसर अभ्यास २",
    icon: Trees,
    gradient: "from-emerald-600 to-green-700",
    text: "text-emerald-600",
    bg: "bg-emerald-50/80",
    border: "border-emerald-200",
    activeBg: "bg-emerald-50 border-emerald-300 text-emerald-950",
  },
  samajik_shastra: {
    label: "सामाजिक शास्त्रे",
    icon: Landmark,
    gradient: "from-orange-600 to-amber-700",
    text: "text-orange-600",
    bg: "bg-orange-50/80",
    border: "border-orange-200",
    activeBg: "bg-orange-50 border-orange-300 text-orange-950",
  },
  samajshastra: {
    label: "सामाजिक शास्त्रे",
    icon: Landmark,
    gradient: "from-orange-600 to-amber-700",
    text: "text-orange-600",
    bg: "bg-orange-50/80",
    border: "border-orange-200",
    activeBg: "bg-orange-50 border-orange-300 text-orange-950",
  },
  kala: {
    label: "कला",
    icon: Palette,
    gradient: "from-pink-600 to-rose-700",
    text: "text-pink-600",
    bg: "bg-pink-50/80",
    border: "border-pink-200",
    activeBg: "bg-pink-50 border-pink-300 text-pink-950",
  },
  karyanubhav: {
    label: "कार्यानुभव",
    icon: Wrench,
    gradient: "from-amber-600 to-yellow-700",
    text: "text-amber-600",
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    activeBg: "bg-amber-50 border-amber-300 text-amber-950",
  },
  sharirik: {
    label: "शारीरिक शिक्षण व आरोग्य",
    icon: Activity,
    gradient: "from-rose-600 to-red-700",
    text: "text-rose-600",
    bg: "bg-rose-50/80",
    border: "border-rose-200",
    activeBg: "bg-rose-50 border-rose-300 text-rose-950",
  },
  visheshpragati: {
    label: "विशेष प्रगती",
    icon: Award,
    gradient: "from-sky-600 to-blue-700",
    text: "text-sky-600",
    bg: "bg-sky-50/80",
    border: "border-sky-200",
    activeBg: "bg-sky-50 border-sky-300 text-sky-950",
  },
  aavad: {
    label: "आवडी-निवडी",
    icon: Sparkles,
    gradient: "from-fuchsia-600 to-purple-700",
    text: "text-fuchsia-600",
    bg: "bg-fuchsia-50/80",
    border: "border-fuchsia-200",
    activeBg: "bg-fuchsia-50 border-fuchsia-300 text-fuchsia-950",
  },
  sudharna: {
    label: "सुधारणा आवश्यक",
    icon: AlertTriangle,
    gradient: "from-amber-600 to-red-600",
    text: "text-amber-700",
    bg: "bg-amber-50/90",
    border: "border-amber-300",
    activeBg: "bg-amber-50 border-amber-400 text-amber-950",
  },
  vyaktimatva: {
    label: "व्यक्तिमत्त्व गुण",
    icon: User,
    gradient: "from-indigo-600 to-purple-700",
    text: "text-indigo-600",
    bg: "bg-indigo-50/80",
    border: "border-indigo-200",
    activeBg: "bg-indigo-50 border-indigo-300 text-indigo-950",
  },
};

function convertGenderEnding(text: string, gender: GenderMode): string {
  if (!text || gender === "none") return text;
  if (gender === "female") {
    return text
      .replace(/करतो/g, "करते")
      .replace(/सांगतो/g, "सांगते")
      .replace(/ओळखतो/g, "ओळखते")
      .replace(/लिहितो/g, "लिहिते")
      .replace(/गातो/g, "गाते")
      .replace(/सोडवतो/g, "सोडवते")
      .replace(/पाहतो/g, "पाहते")
      .replace(/बाळगतो/g, "बाळगते")
      .replace(/दाखवतो/g, "दाखवते")
      .replace(/घेतो/g, "घेते")
      .replace(/पडतो/g, "पडते")
      .replace(/बनवतो/g, "बनवते")
      .replace(/मोजतो/g, "मोजते")
      .replace(/वाचतो/g, "वाचते")
      .replace(/रंगवतो/g, "रंगवते")
      .replace(/काढतो/g, "काढते")
      .replace(/आणतो/g, "आणते")
      .replace(/शिवतो/g, "शिवते")
      .replace(/बसवातो/g, "बसवते")
      .replace(/शोधतो/g, "शोधते")
      .replace(/मदत करतो/g, "मदत करते")
      .replace(/सहभागी होतो/g, "सहभागी होते")
      .replace(/तयार करतो/g, "तयार करते");
  } else {
    return text
      .replace(/करते/g, "करतो")
      .replace(/सांगते/g, "सांगतो")
      .replace(/ओळखते/g, "ओळखतो")
      .replace(/लिहिते/g, "लिहितो")
      .replace(/गाते/g, "गातो")
      .replace(/सोडवते/g, "सोडवतो")
      .replace(/पाहते/g, "पाहतो")
      .replace(/बाळगते/g, "बाळगतो")
      .replace(/दाखवते/g, "दाखवतो")
      .replace(/घेते/g, "घेतो")
      .replace(/पडते/g, "पडतो")
      .replace(/बनवते/g, "बनवतो")
      .replace(/मोजते/g, "मोजतो")
      .replace(/वाचते/g, "वाचतो")
      .replace(/रंगवते/g, "रंगवतो")
      .replace(/काढते/g, "काढतो")
      .replace(/आणते/g, "आणतो")
      .replace(/शिवते/g, "शिवतो")
      .replace(/शोधते/g, "शोधतो")
      .replace(/मदत करते/g, "मदत करतो")
      .replace(/सहभागी होते/g, "सहभागी होतो")
      .replace(/तयार करते/g, "तयार करतो");
  }
}

export function CCERemarks({
  selectedClass,
  academicYear,
  selectedMedium: propMedium,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  selectedMedium?: string;
  onBack: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState<Semester>("sem1");
  const [selectedMedium, setSelectedMedium] = useState<Medium>(() => {
    if (propMedium === "semi" || propMedium === "marathi") return propMedium as Medium;
    const stored = localStorage.getItem("cce_selected_medium") || localStorage.getItem("selectedMedium");
    if (stored === "semi" || stored === "marathi") return stored as Medium;
    return "marathi";
  });

  const [allRemarks, setAllRemarks] = useState<Record<string, StudentRemarks>>({});
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [customClassRemarks, setCustomClassRemarks] = useState<Record<string, string[]>>({});
  const [studentRemarks, setStudentRemarks] = useState<StudentRemarks>({});
  const [expandedSubject, setExpandedSubject] = useState<string | null>("prathambhasha");
  const [writeText, setWriteText] = useState("");
  const [genderMode, setGenderMode] = useState<GenderMode>("male");
  const [searchRosterQuery, setSearchRosterQuery] = useState("");
  const [remarkSearchQuery, setRemarkSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all");

  useEffect(() => {
    let isMounted = true;
    let newMedium: Medium | null = null;
    if (propMedium === "semi" || propMedium === "marathi") {
      newMedium = propMedium as Medium;
    } else {
      const stored = localStorage.getItem("cce_selected_medium") || localStorage.getItem("selectedMedium");
      if (stored === "semi" || stored === "marathi") {
        newMedium = stored as Medium;
      }
    }
    if (newMedium && newMedium !== selectedMedium) {
      setSelectedMedium(newMedium);
      return;
    }

    async function checkSchoolConfig() {
      try {
        const udise = localStorage.getItem("teacher_udise") || localStorage.getItem("udiseNumber");
        if (udise) {
          const docRef = doc(db, "school_data", `${udise}_class_config`);
          const docSnap = await getDoc(docRef);
          if (isMounted && docSnap.exists() && docSnap.data().config) {
            const classCfg = docSnap.data().config[selectedClass];
            if ((classCfg === "semi" || classCfg === "marathi") && classCfg !== selectedMedium) {
              setSelectedMedium(classCfg as Medium);
            }
          }
        }
      } catch (err) {
        console.warn("Error checking class config:", err);
      }
    }
    checkSchoolConfig();

    return () => {
      isMounted = false;
    };
  }, [propMedium, selectedClass, selectedMedium]);

  // Load master remarks for the standard
  useEffect(() => {
    let isMounted = true;
    const masterData = getClassRemarks(selectedClass, selectedMedium);
    setCustomClassRemarks(masterData);

    async function fetchCustomAdminRemarks() {
      try {
        const cdnUrl = `https://SGKBRAINOVA.b-cdn.net/cce_remarks/class_${selectedClass}_${selectedMedium}_remarks.json`;
        const res = await fetch(cdnUrl);
        if (isMounted && res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setCustomClassRemarks(data);
          }
        }
      } catch (err) {
        console.warn("Could not load custom remarks from Bunny CDN:", err);
      }
    }
    fetchCustomAdminRemarks();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedMedium]);

  // Load student roster for selectedClass
  useEffect(() => {
    let isMounted = true;
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("class", "==", selectedClass)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (!isMounted) return;
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Student[];
      setStudents(data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [selectedClass]);

  // Load remarks for all students
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    try {
      const cached = localStorage.getItem(
        `cce_remarks_cache_${selectedClass}_${academicYear}_${activeSemester}`
      );
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setAllRemarks(parsed);
        }
      }
    } catch (e) {}

    const loadAllRemarks = async () => {
      let merged: Record<string, StudentRemarks> = {};

      const docIdsToTry = [
        `${selectedClass}_${academicYear}_${activeSemester}`,
        `${selectedClass}_${activeSemester}`,
        `${selectedClass}_${academicYear}`,
        selectedClass,
      ];

      for (const dId of docIdsToTry) {
        try {
          const sSnap = await getDoc(doc(db, "cce_remarks_v2", dId));
          if (sSnap.exists()) {
            const data = sSnap.data();
            const recs = data.records || data.remarks || data.data || {};
            Object.entries(recs).forEach(([k, v]) => {
              if (v && typeof v === "object") {
                merged[k] = { ...(merged[k] || {}), ...(v as StudentRemarks) };
              }
            });
          }
        } catch (e) {}
      }

      if (isMounted && Object.keys(merged).length > 0) {
        setAllRemarks((prev) => ({ ...prev, ...merged }));
        setLoading(false);
      }
    };

    const primaryRef = doc(
      db,
      "cce_remarks_v2",
      `${selectedClass}_${academicYear}_${activeSemester}`
    );
    const unsub = onSnapshot(
      primaryRef,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists() && snap.data().records) {
          setAllRemarks((prev) => {
            const updated = { ...prev, ...(snap.data().records || {}) };
            try {
              localStorage.setItem(
                `cce_remarks_cache_${selectedClass}_${academicYear}_${activeSemester}`,
                JSON.stringify(updated)
              );
            } catch (e) {}
            return updated;
          });
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Remarks fetch error:", err);
        if (isMounted) setLoading(false);
      }
    );

    loadAllRemarks();

    return () => {
      isMounted = false;
      unsub();
    };
  }, [selectedClass, academicYear, activeSemester]);

  // Helper to retrieve student's remarks record
  const getStudentRemarksRecord = (st: Student): StudentRemarks => {
    if (!allRemarks || typeof allRemarks !== "object") return {};

    if (st.id && allRemarks[st.id]) return allRemarks[st.id];
    if (st.rollNo && allRemarks[st.rollNo]) return allRemarks[st.rollNo];
    if (st.rollNo && allRemarks[String(st.rollNo)]) return allRemarks[String(st.rollNo)];
    if (st.name && allRemarks[st.name]) return allRemarks[st.name];
    if (st.fullName && allRemarks[st.fullName]) return allRemarks[st.fullName];

    const sId = (st.id || "").toLowerCase();
    const sName = (st.fullName || st.name || "").toLowerCase().trim();
    const sRoll = (st.rollNo || "").trim();

    for (const [k, v] of Object.entries(allRemarks)) {
      const kLower = k.toLowerCase().trim();
      if (sId && kLower === sId) return v;
      if (sRoll && (kLower === sRoll || kLower === `roll_${sRoll}` || kLower === `student_${sRoll}`))
        return v;
      if (sName && (kLower === sName || kLower.includes(sName) || sName.includes(kLower))) return v;
    }

    return {};
  };

  const openStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentRemarks(getStudentRemarksRecord(student));
    setExpandedSubject("prathambhasha");
    setWriteText("");
    setRemarkSearchQuery("");
    
    // Auto-detect gender if available
    const g = (student.gender || "").toLowerCase();
    if (g.includes("female") || g.includes("girl") || g.includes("स्त्री")) {
      setGenderMode("female");
    } else if (g.includes("male") || g.includes("boy") || g.includes("पुरुष")) {
      setGenderMode("male");
    } else {
      setGenderMode("male");
    }
  };

  const removeRemark = (subKey: string, text: string) => {
    setStudentRemarks((prev) => ({
      ...prev,
      [subKey]: (Array.isArray(prev[subKey]) ? prev[subKey] : []).filter((r: string) => r !== text),
    }));
  };

  const clearAllRemarksForSubject = (subKey: string) => {
    setStudentRemarks((prev) => ({
      ...prev,
      [subKey]: [],
    }));
    toast.info("ह्या विषयातील सर्व नोंदी काढल्या!");
  };

  const addRemark = (subKey: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const formatted = convertGenderEnding(trimmed, genderMode);
    setStudentRemarks((prev) => ({
      ...prev,
      [subKey]: [...new Set([...(Array.isArray(prev[subKey]) ? prev[subKey] : []), formatted])],
    }));
  };

  const saveStudentRemarks = async (andNext: boolean = false) => {
    if (!editingStudent) return;
    setSaving(true);
    try {
      const updated = {
        ...allRemarks,
        [editingStudent.id]: studentRemarks,
        ...(editingStudent.rollNo ? { [editingStudent.rollNo]: studentRemarks } : {}),
        ...(editingStudent.fullName ? { [editingStudent.fullName]: studentRemarks } : {}),
        ...(editingStudent.name ? { [editingStudent.name]: studentRemarks } : {}),
      };

      try {
        localStorage.setItem(
          `cce_remarks_cache_${selectedClass}_${academicYear}_${activeSemester}`,
          JSON.stringify(updated)
        );
      } catch (e) {}

      const ref = doc(
        db,
        "cce_remarks_v2",
        `${selectedClass}_${academicYear}_${activeSemester}`
      );
      await setDoc(
        ref,
        {
          class: selectedClass,
          academicYear,
          semester: activeSemester,
          records: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setAllRemarks(updated);
      toast.success(`${editingStudent.fullName || editingStudent.name} च्या नोंदी जतन झाल्या!`);

      if (andNext) {
        const currIdx = students.findIndex((s) => s.id === editingStudent.id);
        if (currIdx >= 0 && currIdx < students.length - 1) {
          openStudent(students[currIdx + 1]);
        } else {
          setEditingStudent(null);
        }
      }
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  // Switch to next or previous student
  const navigateStudent = (dir: "prev" | "next") => {
    if (!editingStudent) return;
    const currIdx = students.findIndex((s) => s.id === editingStudent.id);
    if (currIdx === -1) return;

    if (dir === "prev" && currIdx > 0) {
      openStudent(students[currIdx - 1]);
    } else if (dir === "next" && currIdx < students.length - 1) {
      openStudent(students[currIdx + 1]);
    }
  };

  // Computed roster list with stats
  const rosterStats = useMemo(() => {
    let completedCount = 0;
    const items = students.map((st) => {
      const sr = getStudentRemarksRecord(st);
      let filledSubjectsCount = 0;
      let totalItemsCount = 0;

      Object.entries(sr || {}).forEach(([_, val]) => {
        if (Array.isArray(val) && val.length > 0) {
          filledSubjectsCount++;
          totalItemsCount += val.length;
        } else if (typeof val === "string" && val.trim().length > 0) {
          filledSubjectsCount++;
          totalItemsCount += 1;
        }
      });

      const isCompleted = filledSubjectsCount > 0;
      if (isCompleted) completedCount++;

      return {
        student: st,
        filledSubjectsCount,
        totalItemsCount,
        isCompleted,
      };
    });

    return { items, completedCount, total: students.length };
  }, [students, allRemarks]);

  const filteredRoster = useMemo(() => {
    let list = rosterStats.items;
    if (filterStatus === "completed") {
      list = list.filter((i) => i.isCompleted);
    } else if (filterStatus === "pending") {
      list = list.filter((i) => !i.isCompleted);
    }

    if (searchRosterQuery.trim()) {
      const q = searchRosterQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          (i.student.fullName || "").toLowerCase().includes(q) ||
          (i.student.name || "").toLowerCase().includes(q) ||
          (i.student.rollNo || "").toString().includes(q)
      );
    }

    return list;
  }, [rosterStats, filterStatus, searchRosterQuery]);

  // Available subjects for this class
  const availableSubjectKeys = useMemo(() => {
    const defaultKeys = Object.keys(SUBJECT_NAMES_MAP);
    const customKeys = Object.keys(customClassRemarks);
    const combined = [...new Set([...defaultKeys, ...customKeys])];
    // Filter to only keys that exist in customClassRemarks and have at least 1 item or default
    return combined.filter(
      (k) => (customClassRemarks[k] && customClassRemarks[k].length > 0) || SUBJECT_NAMES_MAP[k]
    );
  }, [customClassRemarks]);

  // ── STUDENT REMARK EDITOR VIEW ──
  if (editingStudent) {
    const currentStudentIdx = students.findIndex((s) => s.id === editingStudent.id);
    const hasPrev = currentStudentIdx > 0;
    const hasNext = currentStudentIdx < students.length - 1;

    return (
      <div
        className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-200/90 shadow-2xl min-h-[650px] flex flex-col relative select-none overflow-hidden bg-slate-50/50"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white px-5 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingStudent(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
            >
              <ArrowLeft className="size-4" />
              <span>यादीकडे</span>
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <Sparkles className="size-5 text-amber-300 animate-pulse" />
                <span>वर्णनात्मक नोंदी</span>
              </h2>
              <p className="text-[11px] text-blue-100/90 font-medium">
                इयत्ता {selectedClass} | {selectedMedium === "semi" ? "सेमी इंग्रजी माध्यम" : "मराठी माध्यम"}
              </p>
            </div>
          </div>

          {/* Prev / Next Quick Switchers */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigateStudent("prev")}
              disabled={!hasPrev}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-white flex items-center gap-1 text-xs font-bold"
              title="मागील विद्यार्थी"
            >
              <ChevronLeft className="size-4" />
              <span className="hidden sm:inline">मागील</span>
            </button>
            <span className="text-xs font-bold bg-white/15 px-2.5 py-1 rounded-lg">
              {currentStudentIdx + 1} / {students.length}
            </span>
            <button
              onClick={() => navigateStudent("next")}
              disabled={!hasNext}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-white flex items-center gap-1 text-xs font-bold"
              title="पुढील विद्यार्थी"
            >
              <span className="hidden sm:inline">पुढील</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Student Banner Bar */}
        <div className="bg-white px-5 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0">
              {editingStudent.rollNo || currentStudentIdx + 1}
            </div>
            <div className="truncate">
              <h3 className="text-base sm:text-lg font-black text-slate-900 truncate tracking-tight">
                {editingStudent.fullName || editingStudent.name || "विद्यार्थी"}
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                हजेरी क्र. {editingStudent.rollNo || currentStudentIdx + 1}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Gender Toggle Pill */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
              <button
                onClick={() => setGenderMode("male")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  genderMode === "male"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="मुलासाठी verb endings (करतो, सांगतो)"
              >
                <span>👦 मुलगा (करतो)</span>
              </button>
              <button
                onClick={() => setGenderMode("female")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  genderMode === "female"
                    ? "bg-pink-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="मुलीसाठी verb endings (करते, सांगते)"
              >
                <span>👧 मुलगी (करते)</span>
              </button>
            </div>

            {/* Semester Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-bold">
              <button
                onClick={() => setActiveSemester("sem1")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeSemester === "sem1"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                सत्र १
              </button>
              <button
                onClick={() => setActiveSemester("sem2")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeSemester === "sem2"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                सत्र २
              </button>
            </div>
          </div>
        </div>

        {/* Accordion List of Subjects */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
          {availableSubjectKeys.map((subKey) => {
            const isExpanded = expandedSubject === subKey;
            const meta = SUBJECT_META[subKey] || {
              label: SUBJECT_NAMES_MAP[subKey] || subKey,
              icon: BookOpen,
              gradient: "from-blue-600 to-indigo-700",
              text: "text-blue-600",
              bg: "bg-blue-50/80",
              border: "border-blue-200",
              activeBg: "bg-blue-50 border-blue-300 text-blue-950",
            };

            const IconComp = meta.icon;
            const currentSelected: string[] = Array.isArray(studentRemarks[subKey])
              ? studentRemarks[subKey]
              : [];
            const masterList: string[] = Array.isArray(customClassRemarks[subKey])
              ? customClassRemarks[subKey]
              : [];

            // Filter master list based on live search query inside expanded panel
            const filteredMasterList = masterList.filter((itemText) => {
              if (!remarkSearchQuery.trim()) return true;
              return itemText.toLowerCase().includes(remarkSearchQuery.toLowerCase().trim());
            });

            return (
              <div
                key={subKey}
                className={`rounded-2xl transition-all duration-200 border shadow-xs overflow-hidden ${
                  isExpanded
                    ? "bg-white border-blue-300 ring-2 ring-blue-500/10 shadow-lg"
                    : "bg-white hover:bg-slate-50/80 border-slate-200/90"
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => {
                    setExpandedSubject(isExpanded ? null : subKey);
                    setRemarkSearchQuery("");
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-r ${meta.gradient} shadow-sm flex-shrink-0`}
                    >
                      <IconComp className="size-4.5" />
                    </div>

                    <div className="truncate">
                      <span className="text-sm sm:text-base font-bold text-slate-900 truncate block">
                        {meta.label}
                      </span>
                    </div>

                    {currentSelected.length > 0 && (
                      <span className="px-2.5 py-0.5 text-xs font-black bg-blue-600 text-white rounded-full shadow-xs flex-shrink-0">
                        {currentSelected.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {currentSelected.length > 0 && !isExpanded && (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                        भरले
                      </span>
                    )}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform ${
                        isExpanded ? "rotate-180 bg-slate-100 text-slate-700" : "text-slate-400"
                      }`}
                    >
                      <ChevronDown className="size-4" />
                    </div>
                  </div>
                </button>

                {/* Expanded Subject Content */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/30 space-y-4">
                    {/* Selected Remarks Tags Section */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-blue-600" />
                          <span>निवडलेल्या नोंदी ({currentSelected.length}):</span>
                        </span>

                        {currentSelected.length > 0 && (
                          <button
                            onClick={() => clearAllRemarksForSubject(subKey)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="size-3" />
                            <span>सर्व काढा</span>
                          </button>
                        )}
                      </div>

                      {currentSelected.length === 0 ? (
                        <div className="p-3 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400 text-xs font-semibold">
                          खालील यादीतून किमान १ किंवा त्यापेक्षा जास्त नोंदी निवडा
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentSelected.map((remText: string, rIdx: number) => (
                            <div
                              key={rIdx}
                              className="group flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all"
                            >
                              <span className="leading-snug">{remText}</span>
                              <button
                                onClick={() => removeRemark(subKey, remText)}
                                className="p-0.5 hover:bg-white/20 rounded-md transition-colors cursor-pointer"
                                title="काढा"
                              >
                                <X className="size-3.5 text-white" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Master Choices List with Live Search */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Filter className="size-3.5 text-slate-500" />
                          <span>नोंदी निवडा (एकूण {masterList.length}):</span>
                        </span>

                        {/* Search Input Box */}
                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={remarkSearchQuery}
                            onChange={(e) => setRemarkSearchQuery(e.target.value)}
                            placeholder="या विषयात नोंदी शोधा..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                          />
                          {remarkSearchQuery && (
                            <button
                              onClick={() => setRemarkSearchQuery("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Options Grid/List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 pr-2 rounded-2xl bg-white border border-slate-200/80">
                        {filteredMasterList.length === 0 ? (
                          <div className="col-span-full py-8 text-center text-xs text-slate-400 font-semibold">
                            "{remarkSearchQuery}" शी संबंधित नोंद सापडली नाही
                          </div>
                        ) : (
                          filteredMasterList.map((rawItemText, iIdx) => {
                            const formattedText = convertGenderEnding(rawItemText, genderMode);
                            const isSelected = currentSelected.includes(formattedText);

                            return (
                              <button
                                key={iIdx}
                                onClick={() => {
                                  if (isSelected) removeRemark(subKey, formattedText);
                                  else addRemark(subKey, rawItemText);
                                }}
                                className={`w-full flex items-start gap-2.5 p-3 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer border ${
                                  isSelected
                                    ? meta.activeBg + " shadow-sm font-bold ring-1 ring-blue-400/40"
                                    : "bg-slate-50/50 hover:bg-blue-50/40 text-slate-700 border-slate-200/80"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                    isSelected
                                      ? "bg-blue-600 border-blue-600 text-white"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && <Check className="size-3 stroke-[3]" />}
                                </div>
                                <span className="leading-relaxed flex-1">{formattedText}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Custom Remark Input */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs flex gap-2">
                      <input
                        type="text"
                        value={writeText}
                        onChange={(e) => setWriteText(e.target.value)}
                        placeholder="स्वतःची नवीन नोंद लिहा..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && writeText.trim()) {
                            addRemark(subKey, writeText);
                            setWriteText("");
                          }
                        }}
                        className="flex-1 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                      />
                      <button
                        onClick={() => {
                          addRemark(subKey, writeText);
                          setWriteText("");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                      >
                        <Plus className="size-4" />
                        <span>जोडा</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Bottom Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-2xl flex items-center justify-between gap-3">
          <button
            onClick={() => navigateStudent("prev")}
            disabled={!hasPrev}
            className="px-3.5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">मागील विद्यार्थी</span>
          </button>

          <button
            onClick={() => saveStudentRemarks(true)}
            disabled={saving}
            className="flex-1 max-w-md py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 hover:from-blue-700 hover:to-violet-800 active:scale-[0.99] text-white font-black text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="size-4" />
            <span>{saving ? "जतन होत आहे..." : "जतन करा व पुढील विद्यार्थी →"}</span>
          </button>

          <button
            onClick={() => navigateStudent("next")}
            disabled={!hasNext}
            className="px-3.5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="hidden sm:inline">पुढील विद्यार्थी</span>
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN STUDENT ROSTER VIEW ──
  return (
    <div
      className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-200/90 shadow-2xl min-h-[650px] flex flex-col relative select-none bg-white overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Top Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center justify-center active:scale-95"
            title="मागे जा"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-wide flex items-center gap-2">
              <Sparkles className="size-5 text-amber-300 animate-pulse" />
              <span>वर्णनात्मक नोंदी - इयत्ता {selectedClass}</span>
            </h2>
            <p className="text-xs text-blue-100/90 font-medium">
              {selectedMedium === "semi" ? "सेमी इंग्रजी माध्यम" : "मराठी माध्यम"} | शैक्षणिक वर्ष {academicYear}
            </p>
          </div>
        </div>

        {/* Progress Badge */}
        <div className="flex items-center gap-2 bg-white/15 px-3.5 py-1.5 rounded-2xl border border-white/20 text-xs font-bold">
          <CheckCircle2 className="size-4 text-emerald-300" />
          <span>
            प्रगती: {rosterStats.completedCount} / {rosterStats.total} विद्यार्थी पूर्ण
          </span>
        </div>
      </div>

      {/* Roster Controls Bar */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        {/* Semester Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300/60 text-xs font-bold">
          {(["sem1", "sem2"] as Semester[]).map((sem) => (
            <button
              key={sem}
              onClick={() => setActiveSemester(sem)}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                activeSemester === sem
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {sem === "sem1" ? "प्रथम सत्र (Sem 1)" : "द्वितीय सत्र (Sem 2)"}
            </button>
          ))}
        </div>

        {/* Status Filter Pills */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300/60 text-xs font-bold">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterStatus === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            सर्व ({rosterStats.total})
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterStatus === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            पूर्ण ({rosterStats.completedCount})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterStatus === "pending"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            बाकी ({rosterStats.total - rosterStats.completedCount})
          </button>
        </div>

        {/* Student Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchRosterQuery}
            onChange={(e) => setSearchRosterQuery(e.target.value)}
            placeholder="विद्यार्थ्याचे नाव किंवा हजेरी क्र. शोधा..."
            className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
          />
          {searchRosterQuery && (
            <button
              onClick={() => setSearchRosterQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-3 border-blue-600" />
            <span className="text-sm font-bold text-slate-500">नोंदी लोड होत आहेत...</span>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-400">
            <User className="size-12 stroke-1 text-slate-300" />
            <span className="text-sm font-semibold">कोणतेही विद्यार्थी सापडले नाहीत</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRoster.map(({ student, filledSubjectsCount, totalItemsCount, isCompleted }) => {
              return (
                <div
                  key={student.id}
                  onClick={() => openStudent(student)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer shadow-xs hover:shadow-md group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center transition-all flex-shrink-0 shadow-sm ${
                        isCompleted
                          ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                          : "bg-blue-50 text-blue-700 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white"
                      }`}
                    >
                      {student.rollNo || "•"}
                    </div>

                    <div className="truncate">
                      <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {student.fullName || student.name || "विद्यार्थी"}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {isCompleted ? (
                          <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                            <Check className="size-3.5 stroke-[3]" />
                            {filledSubjectsCount} विषयात {totalItemsCount} नोंदी भरल्या
                          </span>
                        ) : (
                          <span className="text-slate-400">नोंदी भरणे बाकी आहे</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
                        <Check className="size-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white px-3 py-1.5 rounded-xl border border-blue-100 group-hover:border-blue-600 transition-all flex items-center gap-1">
                        <span>नवा नोंद</span>
                        <ChevronRight className="size-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
