import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const EXAMS_SEM1 = [
  { key: "test1",    label: "चाचणी १" },
  { key: "test2",    label: "चाचणी २" },
  { key: "semester1", label: "सत्र परीक्षा १" },
];
const EXAMS_SEM2 = [
  { key: "test3",    label: "चाचणी ३" },
  { key: "test4",    label: "चाचणी ४" },
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
  return "marathi"; // fallback
};

interface Student { id: string; fullName?: string; name?: string; rollNo?: string; [key: string]: any; }
type Semester = "sem1" | "sem2";
type ViewTab = "student" | "subject";

// ── Shared theme tokens ──
const T = {
  bg:       "#ffffff",
  card:     "#f8fafc",
  border:   "#e2e8f0",
  accent:   "#2563eb",
  accentDim:"#eff6ff",
  textHi:   "#1e293b",
  textLo:   "#64748b",
  input:    "#f1f5f9",
};

function MarksInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden" style={{ background: T.input, border: `1px solid ${T.border}` }}>
      <input
        type="number" min="0"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
        placeholder="0"
        className="flex-1 px-3 py-3.5 bg-transparent text-base font-bold outline-none w-0"
        style={{ color: T.textHi }}
      />
      <span className="pr-3 text-sm whitespace-nowrap" style={{ color: T.textLo }}>/ {max}</span>
    </div>
  );
}

export function CCEMarksEntry({ selectedClass, academicYear, onBack }: {
  selectedClass: string; academicYear: string; onBack: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState<Semester>("sem1");
  const [activeView, setActiveView] = useState<ViewTab>("student");
  const [selectedExamKey, setSelectedExamKey] = useState(EXAMS_SEM1[0].key);
  const [allMarks, setAllMarks] = useState<Record<string, Record<string, SubjectMarks>>>({});
  const [weightages, setWeightages] = useState<any>(null);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);

  const currentExams = activeSemester === "sem1" ? EXAMS_SEM1 : EXAMS_SEM2;

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"), where("class", "==", selectedClass));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      setStudents(data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => unsub();
  }, [selectedClass]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const settingsSnap = await getDoc(doc(db, "cce_settings", `${selectedClass}_${academicYear}`));
        if (settingsSnap.exists() && settingsSnap.data().subjects) setSubjects(settingsSnap.data().subjects);
        const marksSnap = await getDoc(doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_${selectedExamKey}`));
        setAllMarks(marksSnap.exists() ? marksSnap.data().records || {} : {});
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear, selectedExamKey]);

  useEffect(() => {
    const loadWeightages = async () => {
      try {
        const snap = await getDoc(doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`));
        if (snap.exists() && snap.data().data) {
          setWeightages(snap.data().data);
        } else {
          // Fallback to old format
          const oldSnap = await getDoc(doc(db, "cce_weightage", `${selectedClass}_${academicYear}`));
          if (oldSnap.exists() && oldSnap.data().rows) {
            const oldRows = oldSnap.data().rows;
            const defaultSubjects: any = {};
            oldRows.forEach((row: any) => {
               const key = getSubjectKey(row.subject);
               defaultSubjects[key] = {
                 tondiKaam: key === "marathi" ? (row.oral || "") : "",
                 upakramKriti: key === "marathi" ? (row.activity || "") : "",
                 chaachaniLekhi: key === "marathi" ? (row.test || "") : "",
               };
            });
            setWeightages({
              semester1: [{ id: "item_1", name: "Default", studentIds: [], subjects: defaultSubjects }],
              semester2: []
            });
          } else {
            setWeightages(null);
          }
        }
      } catch (e) {
        console.error("Error loading weightages:", e);
      }
    };
    loadWeightages();
  }, [selectedClass, academicYear]);

  useEffect(() => {
    const exams = activeSemester === "sem1" ? EXAMS_SEM1 : EXAMS_SEM2;
    setSelectedExamKey(exams[0].key);
    setEditingStudent(null);
    setEditingSubject(null);
  }, [activeSemester]);

  const getSubjectMarks = (studentId: string, subjectName: string): SubjectMarks => {
    const record = allMarks[studentId]?.[subjectName] || {};
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
    studentId: string, subjectName: string, field: string, value: number
  ) => {
    setAllMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: { ...getSubjectMarks(studentId, subjectName), [field]: value },
      },
    }));
  };

  const getActiveColsForStudent = (rollNoStr: string, subjectName: string) => {
    const rollNo = parseInt(rollNoStr);
    
    // Default fallback columns if no weightage settings exist or are assigned
    const defaultCols = [
      { key: "tondiKaam", label: "तोंडीकाम", max: 20, type: "akarik" },
      { key: "upakramKriti", label: "उपक्रम / कृती", max: 15, type: "akarik" },
      { key: "chaachaniLekhi", label: "चाचणी (लेखी)", max: 20, type: "akarik" },
      { key: "swadhyayVargakarya", label: "स्वाध्याय / वर्गकार्य", max: 15, type: "akarik" },
      { key: "sankalitTondi", label: "तोंडी", max: 10, type: "sankalit" },
      { key: "sankalitLekhi", label: "लेखी", max: 20, type: "sankalit" },
    ];

    if (!weightages) return defaultCols;

    const semesterKey = activeSemester === "sem1" ? "semester1" : "semester2";
    const items = weightages[semesterKey] || [];
    let assignedItem = items.find((item: any) => item.studentIds?.includes(rollNo));
    
    if (!assignedItem && items.length > 0) {
      assignedItem = items[0]; // fallback
    }

    if (!assignedItem || !assignedItem.subjects) {
      return defaultCols;
    }

    const sw = assignedItem.subjects[subjectName] || assignedItem.subjects[getSubjectKey(subjectName)];
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
      { key: "sankalitTondi", label: "तोंडी", max: parseInt(sw.sankalitTondi) || 0, type: "sankalit" },
      { key: "sankalitPratyakshik", label: "प्रात्यक्षिक", max: parseInt(sw.sankalitPratyakshik) || 0, type: "sankalit" },
      { key: "sankalitLekhi", label: "लेखी", max: parseInt(sw.sankalitLekhi) || 0, type: "sankalit" },
    ];

    const activeCols = allPossibleCols.filter(col => col.max > 0);
    return activeCols.length > 0 ? activeCols : defaultCols;
  };

  const isSubjectFilledForStudent = (studentId: string, rollNoStr: string, subjectName: string): boolean => {
    const sm = getSubjectMarks(studentId, subjectName);
    const activeCols = getActiveColsForStudent(rollNoStr, subjectName);
    if (activeCols.length === 0) return false;
    return activeCols.some(col => {
      const val = sm[col.key];
      return val !== undefined && val > 0;
    });
  };

  const getStudentProgress = (student: Student) => {
    let filled = 0;
    subjects.forEach(sub => {
      if (isSubjectFilledForStudent(student.id, student.rollNo || "", sub)) {
        filled++;
      }
    });
    return { filled, total: subjects.length };
  };

  const getSubjectProgress = (subjectName: string) => {
    let filled = 0;
    students.forEach(student => {
      if (isSubjectFilledForStudent(student.id, student.rollNo || "", subjectName)) {
        filled++;
      }
    });
    return { filled, total: students.length };
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_${selectedExamKey}`),
        { class: selectedClass, academicYear, exam: selectedExamKey, records: allMarks, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      toast.success("गुण जतन झाले!");
    } catch (err: any) { toast.error("जतन अयशस्वी: " + err.message); }
    setSaving(false);
  };

  const containerStyle = {
    fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
    background: T.bg,
    color: T.textHi,
  };

  // ── STUDENT MARKS EDITOR ──
  if (editingStudent) {
    const student = editingStudent;
    const studentIdx = students.indexOf(student);
    const subject = subjects[subjectIndex];
    const sm = getSubjectMarks(student.id, subject);

    const activeCols = getActiveColsForStudent(student.rollNo || "", subject);
    const akarikCols = activeCols.filter(c => c.type === "akarik");
    const sankalitCols = activeCols.filter(c => c.type === "sankalit");

    const akarikMax = akarikCols.reduce((sum, c) => sum + c.max, 0);
    const sankalitMax = sankalitCols.reduce((sum, c) => sum + c.max, 0);

    const akarikTotal = akarikCols.reduce((sum, c) => sum + (sm[c.key] || 0), 0);
    const sankalitTotal = sankalitCols.reduce((sum, c) => sum + (sm[c.key] || 0), 0);

    return (
      <div className="rounded-[2.5rem] border shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden" style={{ ...containerStyle, borderColor: T.border }}>
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setEditingStudent(null)} className="cursor-pointer transition-colors" style={{ color: T.textHi }}>
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold" style={{ color: T.textHi }}>
            गुण नोंदणी - {activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
          </h2>
        </div>
        <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center border flex-shrink-0"
            style={{ background: T.accentDim, color: T.accent, borderColor: T.border }}>
            {student.rollNo || studentIdx + 1}
          </div>
          <span className="text-[14px] font-medium flex-1" style={{ color: T.textHi }}>{student.fullName || student.name || "-"}</span>
        </div>
        <div className="flex-1 overflow-y-auto pb-28 px-5 py-4">
          {/* Subject nav */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-bold text-blue-600" style={{ color: T.accent }}>{subject}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setSubjectIndex(Math.max(0, subjectIndex - 1))} disabled={subjectIndex === 0}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-40"
                style={{ background: T.card, color: T.textLo }}>
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm" style={{ color: T.textLo }}>{subjectIndex + 1}/{subjects.length}</span>
              <button onClick={() => setSubjectIndex(Math.min(subjects.length - 1, subjectIndex + 1))} disabled={subjectIndex === subjects.length - 1}
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-40"
                style={{ background: T.card, color: T.textLo }}>
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* आकारिक मूल्यमापन */}
          {akarikCols.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">आकारिक मूल्यमापन</h3>
                <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">एकूण गुण: {akarikMax}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {akarikCols.map(col => (
                  <div key={col.key}>
                    <p className="text-xs mb-1 text-slate-650 font-bold">{col.label} ({col.max})</p>
                    <MarksInput value={sm[col.key] || 0} max={col.max} onChange={v => setSubjectMark(student.id, subject, col.key, v)} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-xs text-slate-500">एकूण प्राप्त गुण: <span className="font-bold text-slate-850">{akarikTotal}</span></span>
                <span className="text-xs text-slate-500">पैकी गुण: {akarikMax}</span>
              </div>
            </div>
          )}

          {akarikCols.length > 0 && sankalitCols.length > 0 && (
            <div className="my-4" style={{ borderTop: `1px solid ${T.border}` }} />
          )}

          {/* संकलित मूल्यमापन */}
          {sankalitCols.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">संकलित मूल्यमापन</h3>
                <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded">एकूण गुण: {sankalitMax}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sankalitCols.map(col => (
                  <div key={col.key}>
                    <p className="text-xs mb-1 text-slate-650 font-bold">{col.label} ({col.max})</p>
                    <MarksInput value={sm[col.key] || 0} max={col.max} onChange={v => setSubjectMark(student.id, subject, col.key, v)} />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-xs text-slate-500">एकूण प्राप्त गुण: <span className="font-bold text-slate-850">{sankalitTotal}</span></span>
                <span className="text-xs text-slate-500">पैकी गुण: {sankalitMax}</span>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 flex gap-3" style={{ background: `linear-gradient(to top, ${T.bg}, transparent)` }}>
          <button onClick={saveMarks} disabled={saving}
            className="flex-1 py-4 font-bold text-sm rounded-2xl cursor-pointer disabled:opacity-50 transition-all border border-slate-200"
            style={{ background: T.card, color: T.textHi }}>
            {saving ? "जतन..." : "जतन करा"}
          </button>
          <button onClick={async () => { await saveMarks(); if (subjectIndex < subjects.length - 1) setSubjectIndex(subjectIndex + 1); }}
            disabled={saving}
            className="flex-[2] py-4 font-extrabold text-sm rounded-2xl cursor-pointer disabled:opacity-50 transition-all active:scale-[0.99] shadow-md shadow-blue-200"
            style={{ background: T.accent, color: "#ffffff" }}>
            {saving ? "जतन होत आहे..." : "जतन करा & पुढे जा"}
          </button>
        </div>
      </div>
    );
  }

  // ── SUBJECT MARKS EDITOR ──
  if (editingSubject) {
    const subject = editingSubject;

    return (
      <div className="rounded-[2.5rem] border shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden" style={{ ...containerStyle, borderColor: T.border }}>
        <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setEditingSubject(null)} className="cursor-pointer" style={{ color: T.textHi }}>
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold" style={{ color: T.textHi }}>गुण नोंदणी</h2>
        </div>
        <div className="flex items-center justify-between px-5 py-2.5 flex-shrink-0 bg-slate-50/50" style={{ borderBottom: `1px solid ${T.border}` }}>
          <span className="text-xs font-bold text-slate-500">{selectedClass}</span>
          <span className="text-xs font-black text-blue-600">{subject}</span>
          <span className="text-xs font-bold text-slate-500">{activeSemester === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 px-4 py-3 space-y-4">
          {students.length === 0 ? (
            <div className="flex justify-center py-20 text-sm" style={{ color: T.textLo }}>विद्यार्थी सापडले नाहीत</div>
          ) : students.map((student, idx) => {
            const sm = getSubjectMarks(student.id, subject);
            const activeCols = getActiveColsForStudent(student.rollNo || "", subject);
            const total = activeCols.reduce((sum, col) => sum + (sm[col.key] || 0), 0);
            const totalMax = activeCols.reduce((sum, col) => sum + col.max, 0);

            return (
              <div key={student.id} className="pb-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center border flex-shrink-0"
                      style={{ background: T.accentDim, color: T.accent, borderColor: T.border }}>
                      {student.rollNo || idx + 1}
                    </div>
                    <span className="text-xs font-bold text-slate-800">{student.fullName || student.name || "-"}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{total}/{totalMax}</span>
                </div>
                <div className="overflow-x-auto pb-1">
                  <div className="flex gap-2" style={{ minWidth: "max-content" }}>
                    {activeCols.map((col) => (
                      <div key={col.key} className="flex-shrink-0" style={{ width: "95px" }}>
                        <p className="text-[10px] mb-1 truncate text-slate-500 font-bold" title={`${col.label} (${col.max})`}>{col.label} ({col.max})</p>
                        <div className="flex items-center rounded-xl overflow-hidden h-11" style={{ background: T.input, border: `1px solid ${T.border}` }}>
                          <input
                            type="number" min="0"
                            value={(sm[col.key] as number) === 0 ? "" : sm[col.key]}
                            onChange={(e) => setSubjectMark(student.id, subject, col.key, e.target.value === "" ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                            placeholder="0"
                            className="flex-1 px-2 py-1 bg-transparent text-xs font-bold outline-none w-0 min-w-0"
                            style={{ color: T.textHi }}
                          />
                          <span className="pr-1.5 text-[10px] text-slate-400 font-bold">/{col.max}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3" style={{ background: `linear-gradient(to top, ${T.bg}, transparent)` }}>
          <button onClick={saveMarks} disabled={saving}
            className="w-full py-4 font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg disabled:opacity-50 active:scale-[0.99]"
            style={{ background: T.accent, color: "#ffffff" }}>
            {saving ? "जतन होत आहे..." : "जतन करा"}
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN LIST VIEW ──
  return (
    <div className="rounded-[2.5rem] border shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
      style={{ ...containerStyle, borderColor: T.border }}>

      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        <button onClick={onBack} className="p-1.5 rounded-full transition-colors cursor-pointer" style={{ color: T.textHi }}>
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-base font-bold tracking-tight" style={{ color: T.textHi }}>गुण नोंदणी</h2>
      </div>

      {/* Semester Tabs */}
      <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="flex p-1 rounded-xl" style={{ background: T.card }}>
          {(["sem1", "sem2"] as Semester[]).map((sem) => (
            <button key={sem} onClick={() => setActiveSemester(sem)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer`}
              style={{
                background: activeSemester === sem ? T.accentDim : "transparent",
                color: activeSemester === sem ? T.accent : T.textLo,
              }}>
              {sem === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
            </button>
          ))}
        </div>
      </div>

      {/* View sub-tabs (विद्यार्थी निहाय | विषय निहाय) */}
      <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        {(["student", "subject"] as ViewTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveView(tab)}
            className="flex-1 py-3 text-sm font-bold text-center transition-colors cursor-pointer"
            style={{
              color: activeView === tab ? T.accent : T.textLo,
              borderBottom: activeView === tab ? `2px solid ${T.accent}` : "2px solid transparent",
            }}>
            {tab === "student" ? "विद्यार्थी निहाय" : "विषय निहाय"}
          </button>
        ))}
      </div>

      {/* Exam pills */}
      <div className="px-4 py-3 overflow-x-auto flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center gap-2">
          {currentExams.map((e) => (
            <button key={e.key} onClick={() => setSelectedExamKey(e.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border"
              style={{
                background: e.key === selectedExamKey ? T.accent : T.card,
                color: e.key === selectedExamKey ? "#ffffff" : T.textLo,
                borderColor: e.key === selectedExamKey ? T.accent : T.border,
              }}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: T.accent }} />
            <span className="text-xs font-bold" style={{ color: T.textLo }}>लोड होत आहे...</span>
          </div>
        ) : activeView === "student" ? (
          <div className="space-y-0.5">
            {students.length === 0 ? (
              <div className="flex justify-center py-20 text-sm" style={{ color: T.textLo }}>विद्यार्थी सापडले नाहीत</div>
            ) : students.map((student, idx) => {
              const { filled, total } = getStudentProgress(student);
              return (
                <div key={student.id} className="flex items-center justify-between px-2 py-3.5 rounded-xl transition-colors cursor-pointer"
                  style={{ background: "transparent" }}
                  onClick={() => { setEditingStudent(student); setSubjectIndex(0); }}
                  onMouseEnter={e => (e.currentTarget.style.background = T.card)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center border"
                      style={{ background: T.accentDim, color: T.accent, borderColor: T.border }}>
                      {student.rollNo || idx + 1}
                    </div>
                    <span className="text-[15px] font-medium" style={{ color: T.textHi }}>{student.fullName || student.name || "-"}</span>
                  </div>
                  {filled === 0 ? (
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: T.accent, background: "transparent" }} />
                  ) : filled === total ? (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: T.accent }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ color: "#ffffff" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
                      style={{ borderColor: T.accent, color: T.accent, background: "transparent" }}>
                      {filled}/{total}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-0.5">
            {subjects.map((sub) => {
              const { filled, total } = getSubjectProgress(sub);
              return (
                <div key={sub} className="flex items-center justify-between px-2 py-4 rounded-xl transition-colors cursor-pointer"
                  style={{ background: "transparent" }}
                  onClick={() => setEditingSubject(sub)}
                  onMouseEnter={e => (e.currentTarget.style.background = T.card)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span className="text-[15px] font-medium" style={{ color: T.textHi }}>{sub}</span>
                  {filled === 0 ? (
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: T.accent, background: "transparent" }} />
                  ) : filled === total ? (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: T.accent }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} style={{ color: "#ffffff" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
                      style={{ borderColor: T.accent, color: T.accent, background: "transparent" }}>
                      {filled}/{total}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

