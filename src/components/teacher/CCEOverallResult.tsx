import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ArrowLeft, ChevronRight } from "lucide-react";

<<<<<<< HEAD
interface Student { id: string; fullName?: string; name?: string; rollNo?: string; [key: string]: any; }

const EXAMS = ["test1", "test2", "semester1", "test3", "test4", "semester2"];
const EXAM_LABELS: Record<string, string> = {
  test1: "चाचणी १", test2: "चाचणी २", semester1: "सत्र १",
  test3: "चाचणी ३", test4: "चाचणी ४", semester2: "सत्र २",
=======
interface Student {
  id: string;
  fullName?: string;
  name?: string;
  rollNo?: string;
  [key: string]: any;
}

const EXAMS = ["test1", "test2", "semester1", "test3", "test4", "semester2"];
const EXAM_LABELS: Record<string, string> = {
  test1: "चाचणी १",
  test2: "चाचणी २",
  semester1: "सत्र १",
  test3: "चाचणी ३",
  test4: "चाचणी ४",
  semester2: "सत्र २",
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
};

const calculateGrade = (marks: number): string => {
  if (marks >= 91) return "A1";
  if (marks >= 81) return "A2";
  if (marks >= 71) return "B1";
  if (marks >= 61) return "B2";
  if (marks >= 51) return "C1";
  if (marks >= 41) return "C2";
  if (marks >= 33) return "D";
  return "E";
};

const gradeColor = (grade: string) => {
  if (grade.startsWith("A")) return { color: "#10b981", background: "#ecfdf5" };
  if (grade.startsWith("B")) return { color: "#2563eb", background: "#eff6ff" };
  if (grade.startsWith("C")) return { color: "#d97706", background: "#fffbeb" };
  if (grade.startsWith("D")) return { color: "#ea580c", background: "#fff5f5" };
  return { color: "#ef4444", background: "#fef2f2" };
};

const getSubjectKey = (subjectName: string): string => {
  if (subjectName.includes("मराठी")) return "marathi";
  if (subjectName.includes("इंग्रजी")) return "english";
  if (subjectName.includes("गणित")) return "math";
  if (subjectName.includes("कला")) return "art";
  if (subjectName.includes("कार्यानुभव")) return "work";
  if (subjectName.includes("शारीरिक")) return "pe";
  return "marathi";
};

// Blue theme tokens
const T = {
<<<<<<< HEAD
  bg:       "#ffffff",
  border:   "#e2e8f0",
  divider:  "#f1f5f9",
  cardBg:   "#eff6ff",
  cardBdr:  "#bfdbfe",
  accent:   "#2563eb",
  accentDk: "#1d4ed8",
  text:     "#1e293b",
  muted:    "#64748b",
  hoverBg:  "#f8fafc",
  numBg:    "#f1f5f9",
  shadow:   "0 10px 25px -5px rgba(0,0,0,0.1)",
};

export function CCEOverallResult({ selectedClass, academicYear, onBack }: { selectedClass: string; academicYear: string; onBack: () => void }) {
=======
  bg: "#ffffff",
  border: "#e2e8f0",
  divider: "#f1f5f9",
  cardBg: "#eff6ff",
  cardBdr: "#bfdbfe",
  accent: "#2563eb",
  accentDk: "#1d4ed8",
  text: "#1e293b",
  muted: "#64748b",
  hoverBg: "#f8fafc",
  numBg: "#f1f5f9",
  shadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
};

export function CCEOverallResult({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [allMarks, setAllMarks] = useState<Record<string, any>>({});
  const [weightages, setWeightages] = useState<any>(null);
<<<<<<< HEAD
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"), where("class", "==", selectedClass));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
      setStudents(data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
=======
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("class", "==", selectedClass),
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Student[];
      setStudents(
        data.sort(
          (a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"),
        ),
      );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    });
    return () => unsub();
  }, [selectedClass]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const result: Record<string, any> = {};
      for (const examKey of EXAMS) {
        try {
<<<<<<< HEAD
          const ref = doc(db, "cce_marks_v2", `${selectedClass}_${academicYear}_${examKey}`);
          const snap = await getDoc(ref);
          result[examKey] = snap.exists() ? (snap.data().records || {}) : {};
        } catch { result[examKey] = {}; }
=======
          const ref = doc(
            db,
            "cce_marks_v2",
            `${selectedClass}_${academicYear}_${examKey}`,
          );
          const snap = await getDoc(ref);
          result[examKey] = snap.exists() ? snap.data().records || {} : {};
        } catch {
          result[examKey] = {};
        }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      }
      setAllMarks(result);
      setLoading(false);
    };
    loadAll();
  }, [selectedClass, academicYear]);

  useEffect(() => {
    const loadWeightages = async () => {
      try {
<<<<<<< HEAD
        const snap = await getDoc(doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`));
=======
        const snap = await getDoc(
          doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`),
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        if (snap.exists() && snap.data().data) {
          setWeightages(snap.data().data);
        } else {
          setWeightages(null);
        }
      } catch {}
    };
    loadWeightages();
  }, [selectedClass, academicYear]);

<<<<<<< HEAD
  const getSubjectPercentage = (rollNoStr: string, subjectName: string, examKey: string, record: any) => {
=======
  const getSubjectPercentage = (
    rollNoStr: string,
    subjectName: string,
    examKey: string,
    record: any,
  ) => {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    if (!record) return 0;
    const rollNo = parseInt(rollNoStr);
    const subKey = getSubjectKey(subjectName);
    const isSem1 = ["test1", "test2", "semester1"].includes(examKey);
    const semesterKey = isSem1 ? "semester1" : "semester2";

    const defaultWeights: Record<string, number> = {
      tondiKaam: 20,
      upakramKriti: 15,
      chaachaniLekhi: 20,
      swadhyayVargakarya: 15,
      sankalitTondi: 10,
      sankalitLekhi: 20,
    };

    let weights = defaultWeights;

    if (weightages) {
      const items = weightages[semesterKey] || [];
<<<<<<< HEAD
      const assignedItem = items.find((item: any) => item.studentIds?.includes(rollNo));
      if (assignedItem && assignedItem.subjects && assignedItem.subjects[subKey]) {
=======
      const assignedItem = items.find((item: any) =>
        item.studentIds?.includes(rollNo),
      );
      if (
        assignedItem &&
        assignedItem.subjects &&
        assignedItem.subjects[subKey]
      ) {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        const sw = assignedItem.subjects[subKey];
        weights = {
          tondiKaam: parseInt(sw.tondiKaam) || 0,
          pratyakshikPrayog: parseInt(sw.pratyakshikPrayog) || 0,
          upakramKriti: parseInt(sw.upakramKriti) || 0,
          prakalpa: parseInt(sw.prakalpa) || 0,
          chaachaniLekhi: parseInt(sw.chaachaniLekhi) || 0,
          swadhyayVargakarya: parseInt(sw.swadhyayVargakarya) || 0,
          itar: parseInt(sw.itar) || 0,
          sankalitTondi: parseInt(sw.sankalitTondi) || 0,
          sankalitPratyakshik: parseInt(sw.sankalitPratyakshik) || 0,
          sankalitLekhi: parseInt(sw.sankalitLekhi) || 0,
        };
      }
    }

    let obtainedSum = 0;
    let maxSum = 0;

    const getValue = (key: string) => {
<<<<<<< HEAD
      if (key === "upakramKriti") return record.upakramKriti ?? record.upakram ?? 0;
      if (key === "chaachaniLekhi") return record.chaachaniLekhi ?? record.chaachani ?? 0;
      if (key === "swadhyayVargakarya") return record.swadhyayVargakarya ?? record.swadhyay ?? 0;
      return record[key] ?? 0;
    };

    Object.keys(weights).forEach(key => {
=======
      if (key === "upakramKriti")
        return record.upakramKriti ?? record.upakram ?? 0;
      if (key === "chaachaniLekhi")
        return record.chaachaniLekhi ?? record.chaachani ?? 0;
      if (key === "swadhyayVargakarya")
        return record.swadhyayVargakarya ?? record.swadhyay ?? 0;
      return record[key] ?? 0;
    };

    Object.keys(weights).forEach((key) => {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      const w = weights[key];
      if (w > 0) {
        obtainedSum += parseInt(getValue(key) as any) || 0;
        maxSum += w;
      }
    });

    return maxSum > 0 ? (obtainedSum / maxSum) * 100 : 0;
  };

  const getStudentOverall = (student: Student) => {
    let totalPct = 0;
    let count = 0;

    for (const examKey of EXAMS) {
      const examRecords = allMarks[examKey] || {};
      const studentRecord = examRecords[student.id];
      if (!studentRecord) continue;

      let subjectCount = 0;
      let subjectPctSum = 0;

<<<<<<< HEAD
      Object.keys(studentRecord).forEach(subjectName => {
        const pct = getSubjectPercentage(student.rollNo || "", subjectName, examKey, studentRecord[subjectName]);
=======
      Object.keys(studentRecord).forEach((subjectName) => {
        const pct = getSubjectPercentage(
          student.rollNo || "",
          subjectName,
          examKey,
          studentRecord[subjectName],
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        if (pct > 0) {
          subjectPctSum += pct;
          subjectCount++;
        }
      });

      if (subjectCount > 0) {
        totalPct += subjectPctSum / subjectCount;
        count++;
      }
    }

    return count > 0 ? Math.round(totalPct / count) : 0;
  };

  const containerStyle = {
    fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
    background: T.bg,
    borderColor: T.border,
    boxShadow: T.shadow,
  };

  // ── STUDENT DETAIL VIEW ──
  if (selectedStudentId) {
<<<<<<< HEAD
    const student = students.find(s => s.id === selectedStudentId);
=======
    const student = students.find((s) => s.id === selectedStudentId);
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    const overall = student ? getStudentOverall(student) : 0;
    const overallGrade = calculateGrade(overall);
    const overallGC = gradeColor(overallGrade);

    return (
      <div
        className="text-white rounded-[2.5rem] border shadow-2xl min-h-[600px] flex flex-col"
        style={containerStyle}
      >
        {/* Header */}
<<<<<<< HEAD
        <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
=======
        <div
          className="flex items-center gap-4 px-5 py-4"
          style={{ borderBottom: `1px solid ${T.divider}` }}
        >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          <button
            onClick={() => setSelectedStudentId(null)}
            className="p-1.5 rounded-full transition-colors cursor-pointer"
            style={{ color: T.text }}
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold" style={{ color: T.text }}>
            {student?.fullName || student?.name || "-"}
          </h2>
        </div>

        {/* Exam-wise marks */}
        <div className="flex-1 px-4 py-3 space-y-1">
<<<<<<< HEAD
          {EXAMS.map(examKey => {
=======
          {EXAMS.map((examKey) => {
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            const studentRecord = allMarks[examKey]?.[selectedStudentId];
            let subjectCount = 0;
            let subjectPctSum = 0;

            if (studentRecord) {
<<<<<<< HEAD
              Object.keys(studentRecord).forEach(subjectName => {
                const pct = getSubjectPercentage(student?.rollNo || "", subjectName, examKey, studentRecord[subjectName]);
=======
              Object.keys(studentRecord).forEach((subjectName) => {
                const pct = getSubjectPercentage(
                  student?.rollNo || "",
                  subjectName,
                  examKey,
                  studentRecord[subjectName],
                );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                if (pct > 0) {
                  subjectPctSum += pct;
                  subjectCount++;
                }
              });
            }

<<<<<<< HEAD
            const avg = subjectCount > 0 ? Math.round(subjectPctSum / subjectCount) : 0;
=======
            const avg =
              subjectCount > 0 ? Math.round(subjectPctSum / subjectCount) : 0;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
            const grade = calculateGrade(avg);
            const gc = gradeColor(grade);
            return (
              <div
                key={examKey}
                className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-colors"
                style={{ cursor: "default" }}
              >
<<<<<<< HEAD
                <span className="text-[15px] font-medium" style={{ color: T.text }}>
=======
                <span
                  className="text-[15px] font-medium"
                  style={{ color: T.text }}
                >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  {EXAM_LABELS[examKey]}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm" style={{ color: T.muted }}>
                    {avg > 0 ? `${avg}%` : "—"}
                  </span>
                  {avg > 0 && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{ color: gc.color, background: gc.background }}
                    >
                      {grade}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Overall summary card */}
          <div
            className="mt-4 rounded-2xl p-4 flex items-center justify-between"
            style={{ background: T.cardBg, border: `1px solid ${T.cardBdr}` }}
          >
<<<<<<< HEAD
            <span className="font-bold" style={{ color: T.text }}>एकत्रित सरासरी</span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold" style={{ color: T.accent }}>{overall}%</span>
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ color: overallGC.color, background: overallGC.background }}
=======
            <span className="font-bold" style={{ color: T.text }}>
              एकत्रित सरासरी
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold" style={{ color: T.accent }}>
                {overall}%
              </span>
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{
                  color: overallGC.color,
                  background: overallGC.background,
                }}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
              >
                {overallGrade}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LIST VIEW ──
  return (
    <div
      className="text-white rounded-[2.5rem] border shadow-2xl min-h-[600px] flex flex-col relative"
      style={containerStyle}
    >
      {/* Header */}
<<<<<<< HEAD
      <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: `1px solid ${T.divider}` }}>
=======
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ borderBottom: `1px solid ${T.divider}` }}
      >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
        <button
          onClick={onBack}
          className="p-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center"
          style={{ color: T.text }}
        >
          <ArrowLeft className="size-5" />
        </button>
<<<<<<< HEAD
        <h2 className="text-lg font-bold tracking-tight" style={{ color: T.text }}>
=======
        <h2
          className="text-lg font-bold tracking-tight"
          style={{ color: T.text }}
        >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          एकत्रित निकाल
        </h2>
      </div>

      {/* Student list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div
              className="animate-spin rounded-full h-8 w-8"
              style={{ borderBottom: `2px solid ${T.accent}` }}
            />
<<<<<<< HEAD
            <span className="text-xs font-bold" style={{ color: T.muted }}>लोड होत आहे...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm" style={{ color: T.muted }}>विद्यार्थी सापडले नाहीत</p>
=======
            <span className="text-xs font-bold" style={{ color: T.muted }}>
              लोड होत आहे...
            </span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm" style={{ color: T.muted }}>
              विद्यार्थी सापडले नाहीत
            </p>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
          </div>
        ) : (
          <div className="space-y-0.5">
            {students.map((student, idx) => {
              const overall = getStudentOverall(student);
              const grade = calculateGrade(overall);
              const gc = gradeColor(grade);

              // Progress bar width
              const barWidth = overall > 0 ? `${overall}%` : "0%";

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="px-3 py-3.5 rounded-xl transition-colors cursor-pointer"
                  style={{ borderBottom: `1px solid ${T.divider}` }}
<<<<<<< HEAD
                  onMouseEnter={e => (e.currentTarget.style.background = T.hoverBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
=======
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = T.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0"
<<<<<<< HEAD
                        style={{ background: T.numBg, color: T.accent, border: `1px solid ${T.cardBdr}` }}
=======
                        style={{
                          background: T.numBg,
                          color: T.accent,
                          border: `1px solid ${T.cardBdr}`,
                        }}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      >
                        {student.rollNo || idx + 1}
                      </div>
                      <div>
<<<<<<< HEAD
                        <p className="text-[15px] font-medium" style={{ color: T.text }}>
                          {student.fullName || student.name || "-"}
                        </p>
                        {overall > 0 && (
                          <p className="text-xs mt-0.5" style={{ color: T.muted }}>
=======
                        <p
                          className="text-[15px] font-medium"
                          style={{ color: T.text }}
                        >
                          {student.fullName || student.name || "-"}
                        </p>
                        {overall > 0 && (
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: T.muted }}
                          >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                            सरासरी: {overall}%
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {overall > 0 && (
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ color: gc.color, background: gc.background }}
                        >
                          {grade}
                        </span>
                      )}
<<<<<<< HEAD
                      <ChevronRight className="size-4" style={{ color: T.muted }} />
=======
                      <ChevronRight
                        className="size-4"
                        style={{ color: T.muted }}
                      />
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    </div>
                  </div>

                  {/* Progress bar */}
                  {overall > 0 && (
                    <div
                      className="h-1 rounded-full ml-12 overflow-hidden"
                      style={{ background: "#e2e8f0" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: barWidth,
                          background: `linear-gradient(90deg, ${T.accentDk}, ${T.accent})`,
                        }}
                      />
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
<<<<<<< HEAD

=======
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
