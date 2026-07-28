import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { ChevronRight, ArrowLeft, Calendar, Users, CheckCircle2, Clock, Sparkles, Save, Check } from "lucide-react";
import { toast } from "sonner";

// @ts-ignore
import { matchStudentClassAndMedium } from "@/result/firestoreMarksHelper";

interface Student {
  id: string;
  fullName?: string;
  name?: string;
  rollNo?: string;
  gender?: string;
  [key: string]: any;
}

const MONTHS = [
  { key: "june", label: "जून", days: 30, icon: "🌧️" },
  { key: "july", label: "जुलै", days: 31, icon: "🌧️" },
  { key: "august", label: "ऑगस्ट", days: 31, icon: "🇮🇳" },
  { key: "september", label: "सप्टें.", days: 30, icon: "🌺" },
  { key: "october", label: "ऑक्टो.", days: 31, icon: "🪔" },
  { key: "november", label: "नोव्हें.", days: 30, icon: "✨" },
  { key: "december", label: "डिसें.", days: 31, icon: "❄️" },
  { key: "january", label: "जाने.", days: 31, icon: "🚩" },
  { key: "february", label: "फेब्रु.", days: 28, icon: "🌸" },
  { key: "march", label: "मार्च", days: 31, icon: "☀️" },
  { key: "april", label: "एप्रिल", days: 30, icon: "🌳" },
  { key: "may", label: "मे", days: 31, icon: "🏖️" },
];

type ViewTab = "student" | "month";
type MainView = "attendance" | "working-days";

export function CCEAttendance({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0]);
  const [attendance, setAttendance] = useState<Record<string, Record<number, "P" | "A" | "">>>({});
  const [monthlyAttendance, setMonthlyAttendance] = useState<Record<string, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>("student");
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [selectedMonthForEdit, setSelectedMonthForEdit] = useState<typeof MONTHS[0] | null>(null);
  const [mainView, setMainView] = useState<MainView>("attendance");
  const [workingDays, setWorkingDays] = useState<Record<string, number>>(
    Object.fromEntries(MONTHS.map((m) => [m.key, 0]))
  );
  const [savingWorkingDays, setSavingWorkingDays] = useState(false);

  const today = new Date();
  const todayDay = today.getDate();

  // 1. Fetch student roster (Filtered by Class and Medium)
  useEffect(() => {
    const currentMedium = localStorage.getItem("cce_selected_medium") || "marathi";
    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Student[];
      const filtered = data.filter((s) => matchStudentClassAndMedium(s, selectedClass, currentMedium));
      setStudents(filtered.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999")));
    });
    return () => unsubscribe();
  }, [selectedClass]);

  // 2. Load daily attendance for selected month
  useEffect(() => {
    const loadAttendance = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, "cce_attendance", `${selectedClass}_${academicYear}_${selectedMonth.key}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setAttendance(snap.data().records || {});
        } else {
          setAttendance({});
        }
      } catch (err) {
        console.error("Error loading attendance:", err);
      }
      setLoading(false);
    };
    loadAttendance();
  }, [selectedClass, academicYear, selectedMonth]);

  // 3. Load monthly attendance summary records for all students
  useEffect(() => {
    let isMounted = true;
    try {
      const cached = localStorage.getItem(`cce_monthly_attendance_${selectedClass}_${academicYear}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setMonthlyAttendance(parsed);
        }
      }
    } catch (e) {}

    const ref = doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists() && snap.data().records) {
          const recs = snap.data().records;
          setMonthlyAttendance(recs);
          try {
            localStorage.setItem(
              `cce_monthly_attendance_${selectedClass}_${academicYear}`,
              JSON.stringify(recs)
            );
          } catch (e) {}
        }
      },
      (err) => console.warn("Monthly attendance snapshot error:", err)
    );
    return () => {
      isMounted = false;
      unsub();
    };
  }, [selectedClass, academicYear]);

  // 4. Load working days
  useEffect(() => {
    const loadWorkingDays = async () => {
      try {
        const ref = doc(db, "cce_working_days", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().days) {
          setWorkingDays((prev) => ({ ...prev, ...snap.data().days }));
        }
      } catch (err) {
        console.error("Error loading working days:", err);
      }
    };
    loadWorkingDays();
  }, [selectedClass, academicYear]);

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "cce_attendance", `${selectedClass}_${academicYear}_${selectedMonth.key}`);
      await setDoc(
        docRef,
        {
          class: selectedClass,
          academicYear,
          month: selectedMonth.key,
          records: attendance,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("उपस्थिती जतन झाली!");
    } catch (err: any) {
      console.error(err);
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const getStudentMonthlyRecord = (st: Student): Record<string, number> => {
    if (!monthlyAttendance || typeof monthlyAttendance !== "object") return {};
    return (
      monthlyAttendance[st.id] ||
      (st.rollNo ? monthlyAttendance[st.rollNo] : null) ||
      (st.rollNo ? monthlyAttendance[String(st.rollNo)] : null) ||
      (st.name ? monthlyAttendance[st.name] : null) ||
      (st.fullName ? monthlyAttendance[st.fullName] : null) ||
      {}
    );
  };

  const getMonthAttendedForStudent = (st: Student, monthKey: string): number => {
    const rec = getStudentMonthlyRecord(st);
    if (rec && typeof rec[monthKey] === "number") return rec[monthKey];
    const raw = (attendance[st.id] as any)?.[`m_${monthKey}`];
    return typeof raw === "number" ? raw : 0;
  };

  const saveWorkingDays = async () => {
    setSavingWorkingDays(true);
    try {
      const ref = doc(db, "cce_working_days", `${selectedClass}_${academicYear}`);
      await setDoc(
        ref,
        {
          class: selectedClass,
          academicYear,
          days: workingDays,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("कामाचे दिवस जतन झाले!");
      setMainView("attendance");
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSavingWorkingDays(false);
  };

  // Compute KPI stats for student list
  const filledStudentsCount = students.filter((st) =>
    MONTHS.some((m) => getMonthAttendedForStudent(st, m.key) > 0)
  ).length;

  // ── STUDENT EDIT FORM (Month-wise attendance counts) ──
  if (selectedStudentForEdit) {
    const student = selectedStudentForEdit;

    const getMonthAttended = (monthKey: string): number => {
      return getMonthAttendedForStudent(student, monthKey);
    };

    const setMonthAttended = (monthKey: string, val: number) => {
      const currentRec = getStudentMonthlyRecord(student);
      const updatedStudentObj = { ...currentRec, [monthKey]: val };

      setMonthlyAttendance((prev) => {
        const nextState = {
          ...prev,
          [student.id]: updatedStudentObj,
          ...(student.rollNo ? { [student.rollNo]: updatedStudentObj } : {}),
        };
        try {
          localStorage.setItem(
            `cce_monthly_attendance_${selectedClass}_${academicYear}`,
            JSON.stringify(nextState)
          );
        } catch (e) {}
        return nextState;
      });

      setAttendance((prev) => ({
        ...prev,
        [student.id]: {
          ...(prev[student.id] || {}),
          [`m_${monthKey}`]: val as any,
        },
      }));
    };

    const saveMonthAttendance = async () => {
      setSaving(true);
      try {
        const ref = doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`);

        const updatedStudentObj = Object.fromEntries(
          MONTHS.map((m) => [m.key, getMonthAttended(m.key)])
        );

        const updatedRecords = {
          ...monthlyAttendance,
          [student.id]: updatedStudentObj,
          ...(student.rollNo ? { [student.rollNo]: updatedStudentObj } : {}),
          ...(student.fullName ? { [student.fullName]: updatedStudentObj } : {}),
        };

        try {
          localStorage.setItem(
            `cce_monthly_attendance_${selectedClass}_${academicYear}`,
            JSON.stringify(updatedRecords)
          );
        } catch (e) {}

        await setDoc(
          ref,
          {
            class: selectedClass,
            academicYear,
            records: updatedRecords,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setMonthlyAttendance(updatedRecords);
        toast.success("उपस्थिती यशस्विरित्या जतन झाली!");
        setSelectedStudentForEdit(null);
      } catch (err: any) {
        toast.error("जतन अयशस्वी: " + err.message);
      }
      setSaving(false);
    };

    return (
      <div
        className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden min-h-[85vh] relative flex flex-col transition-all"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Top Gradient Bar */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedStudentForEdit(null)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-slate-900 text-lg font-extrabold tracking-tight">विद्यार्थी उपस्थिती नोंद</h2>
              <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} • महिनानिहाय उपस्थिती</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Student Info Card Banner */}
          <div className="mx-6 mt-5 p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-lg flex items-center justify-center shadow-inner">
                {student.rollNo || students.indexOf(student) + 1}
              </div>
              <div>
                <span className="text-xs text-blue-200 font-bold uppercase tracking-wider">विद्यार्थ्याचे नाव</span>
                <h3 className="text-lg font-extrabold leading-tight">
                  {student.fullName || student.name || "विद्यार्थी"}
                </h3>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20 backdrop-blur-xs text-xs font-bold">
              <Calendar className="size-4 text-blue-200" />
              <span>शैक्षणिक वर्ष {academicYear}</span>
            </div>
          </div>

          <p className="px-6 mt-4 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Sparkles className="size-4 text-blue-500" />
            प्रत्येक महिन्यासाठी विद्यार्थ्याने उपस्थित राहिलेल्या दिवसांची संख्या प्रविष्ट करा.
          </p>

          {/* Month-wise 2-column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-6 mt-4">
            {MONTHS.map((month) => {
              const totalDays = workingDays[month.key] || 0;
              const attended = getMonthAttended(month.key);
              const isEntered = attended > 0;

              return (
                <div
                  key={month.key}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isEntered
                      ? "bg-blue-50/40 border-blue-200 shadow-xs"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{month.icon}</span>
                      <span>{month.label}</span>
                    </span>
                    {isEntered && (
                      <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="size-3" /> नोंदवले
                      </span>
                    )}
                  </div>

                  <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-inner">
                    <input
                      type="number"
                      min="0"
                      max={totalDays || month.days}
                      value={attended === 0 ? "" : attended}
                      onChange={(e) => {
                        const val = Math.min(
                          totalDays || month.days,
                          Math.max(0, parseInt(e.target.value) || 0)
                        );
                        setMonthAttended(month.key, val);
                      }}
                      placeholder="0"
                      className="flex-1 px-4 py-3 bg-transparent text-slate-900 text-base font-extrabold outline-none w-0"
                    />
                    <div className="pr-4 py-3 text-slate-400 font-bold text-sm bg-slate-50 border-l border-slate-100 flex items-center gap-1">
                      <span>/</span>
                      <span className="text-slate-700">{totalDays || month.days}</span>
                      <span className="text-[10px] text-slate-400 font-medium">दिवस</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Bottom Save Button */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-md border-t border-slate-100">
          <button
            onClick={saveMonthAttendance}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="size-4" />
            <span>{saving ? "जतन होत आहे..." : "उपस्थिती जतन करा"}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── WORKING DAYS EDIT VIEW ──
  if (mainView === "working-days") {
    return (
      <div
        className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden min-h-[85vh] flex flex-col"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMainView("attendance")}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-slate-900 text-lg font-extrabold">महिन्याचे कामाचे दिवस</h2>
              <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} • एकूण शालेय कामकाज दिवस</p>
            </div>
          </div>
          <button
            onClick={saveWorkingDays}
            disabled={savingWorkingDays}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="size-4" />
            <span>{savingWorkingDays ? "जतन होत आहे..." : "जतन करा"}</span>
          </button>
        </div>

        <div className="p-6 space-y-2.5 overflow-y-auto flex-1">
          {MONTHS.map((month) => (
            <div
              key={month.key}
              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all"
            >
              <span className="text-slate-800 text-base font-bold flex items-center gap-2">
                <span>{month.icon}</span>
                <span>{month.label}</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setWorkingDays((prev) => ({
                      ...prev,
                      [month.key]: Math.max(0, (prev[month.key] || 0) - 1),
                    }))
                  }
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-blue-600 font-extrabold flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer active:scale-90 shadow-xs"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max={month.days}
                  value={workingDays[month.key] || 0}
                  onChange={(e) =>
                    setWorkingDays((prev) => ({
                      ...prev,
                      [month.key]: Math.min(
                        month.days,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    }))
                  }
                  className="w-16 text-center py-2 bg-white border-2 border-blue-500 rounded-xl text-base text-blue-700 font-black outline-none shadow-xs"
                />
                <button
                  onClick={() =>
                    setWorkingDays((prev) => ({
                      ...prev,
                      [month.key]: Math.min(month.days, (prev[month.key] || 0) + 1),
                    }))
                  }
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-blue-600 font-extrabold flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer active:scale-90 shadow-xs"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
            <span className="text-sm font-bold text-blue-100">वार्षिक एकूण कामाचे दिवस</span>
            <span className="text-2xl font-black">
              {Object.values(workingDays).reduce((sum, v) => sum + (v || 0), 0)} दिवस
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── MONTH EDIT VIEW (Single month modal for all students) ──
  if (selectedMonthForEdit) {
    const month = selectedMonthForEdit;
    const totalDays = workingDays[month.key] || month.days;

    const getAttended = (studentId: string): number => {
      const rec = monthlyAttendance[studentId] || {};
      const val = rec[month.key];
      if (typeof val === "number") return val;
      const raw = (attendance[studentId] as any)?.[`m_${month.key}`];
      return typeof raw === "number" ? raw : 0;
    };

    const setAttended = (studentId: string, val: number) => {
      setMonthlyAttendance((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [month.key]: val,
        },
      }));
    };

    const totalAttended = students.reduce((sum, s) => sum + getAttended(s.id), 0);

    const saveMonthData = async () => {
      setSaving(true);
      try {
        const ref = doc(db, "cce_attendance", `${selectedClass}_${academicYear}_monthly`);
        const existing = await getDoc(ref);
        const existingRecords = existing.exists() ? existing.data().records || {} : {};
        const updatedRecords = { ...existingRecords };
        for (const student of students) {
          updatedRecords[student.id] = {
            ...(updatedRecords[student.id] || {}),
            [month.key]: getAttended(student.id),
          };
        }
        await setDoc(
          ref,
          {
            class: selectedClass,
            academicYear,
            records: updatedRecords,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setMonthlyAttendance(updatedRecords);
        toast.success(`${month.label} उपस्थिती जतन झाली!`);
        setSelectedMonthForEdit(null);
      } catch (err: any) {
        toast.error("जतन अयशस्वी: " + err.message);
      }
      setSaving(false);
    };

    return (
      <div
        className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden min-h-[85vh] relative flex flex-col"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMonthForEdit(null)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-slate-900 text-lg font-extrabold flex items-center gap-2">
                <span>{month.icon}</span>
                <span>{month.label} महिना उपस्थिती</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} • सर्व विद्यार्थ्यांचे उपस्थिती दिवस</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">एकूण उपस्थिती:</span>
            <span className="text-blue-700 font-black text-base">{totalAttended}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-28 p-6 space-y-3">
          {students.map((student, idx) => {
            const attended = getAttended(student.id);
            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm shadow-blue-500/30 flex-shrink-0">
                    {student.rollNo || idx + 1}
                  </div>
                  <span className="text-slate-900 text-base font-bold truncate">
                    {student.fullName || student.name || "विद्यार्थी"}
                  </span>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden w-32 h-11 flex-shrink-0 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-inner">
                  <input
                    type="number"
                    min="0"
                    max={totalDays}
                    value={attended === 0 ? "" : attended}
                    onChange={(e) => {
                      const val = Math.min(totalDays, Math.max(0, parseInt(e.target.value) || 0));
                      setAttended(student.id, val);
                    }}
                    placeholder="0"
                    className="flex-1 w-0 h-full text-center bg-transparent text-slate-900 text-base font-black outline-none"
                  />
                  <span className="pr-3 text-slate-400 font-bold text-xs whitespace-nowrap bg-slate-50 border-l border-slate-100 h-full flex items-center">
                    / {totalDays}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 backdrop-blur-md border-t border-slate-100">
          <button
            onClick={saveMonthData}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="size-4" />
            <span>{saving ? "जतन होत आहे..." : `${month.label} उपस्थिती जतन करा`}</span>
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD VIEW ──
  return (
    <div
      className="bg-white text-slate-800 rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden min-h-[85vh] flex flex-col"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Accent Header Bar */}
      <div className="h-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer shadow-xs"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-slate-900 text-xl font-black tracking-tight">विद्यार्थी उपस्थिती पत्रक</h2>
              <span className="px-2.5 py-0.5 text-[11px] font-extrabold bg-blue-100 text-blue-700 rounded-full border border-blue-200">
                इयत्ता {selectedClass}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">शैक्षणिक वर्ष {academicYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMainView("working-days")}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 hover:text-blue-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200 flex items-center gap-1.5 shadow-xs"
          >
            <Calendar className="size-4 text-blue-600" />
            <span>कामाचे दिवस</span>
            <ChevronRight className="size-3.5 text-slate-400" />
          </button>

          <button
            onClick={saveAttendance}
            disabled={saving}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="size-4" />
            <span>{saving ? "जतन..." : "जतन करा"}</span>
          </button>
        </div>
      </div>

      {/* Segmented Pill Tabs */}
      <div className="px-6 pt-4 pb-2 border-b border-slate-100 bg-slate-50/20">
        <div className="bg-slate-200/60 p-1.5 rounded-2xl flex border border-slate-200/80 max-w-md">
          <button
            onClick={() => setActiveTab("student")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "student"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="size-4" />
            <span>विद्यार्थी निहाय हजेरी</span>
          </button>
          <button
            onClick={() => setActiveTab("month")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "month"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="size-4" />
            <span>महिना निहाय हजेरी</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Summary Bar */}
      <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">एकूण विद्यार्थी</p>
            <p className="text-lg font-black text-slate-800">{students.length}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">हजेरी पूर्ण</p>
            <p className="text-lg font-black text-emerald-600">{filledStudentsCount}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">हजेरी बाकी</p>
            <p className="text-lg font-black text-amber-600">{Math.max(0, students.length - filledStudentsCount)}</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600" />
            <span className="text-xs font-bold text-slate-400">हजेरी माहिती लोड होत आहे...</span>
          </div>
        ) : activeTab === "student" ? (
          /* Student-wise View: Student Cards */
          <div className="space-y-3">
            {students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <p className="text-sm font-bold">विद्यार्थी सापडले नाहीत</p>
              </div>
            ) : (
              students.map((student, idx) => {
                let filledMonthsCount = 0;
                MONTHS.forEach((m) => {
                  if (getMonthAttendedForStudent(student, m.key) > 0) {
                    filledMonthsCount++;
                  }
                });

                const isFilled = filledMonthsCount > 0;

                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudentForEdit(student)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-white via-slate-50/40 to-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md hover:translate-y-[-1px] active:scale-[0.995] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Avatar badge */}
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/25 flex-shrink-0 group-hover:scale-105 transition-transform">
                        {student.rollNo || idx + 1}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-slate-900 text-base font-bold group-hover:text-blue-600 transition-colors truncate">
                          {student.fullName || student.name || "विद्यार्थी"}
                        </h4>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-2">
                          <span>हजेरी नोंद: {filledMonthsCount > 0 ? `${filledMonthsCount} महिने पूर्ण` : "अपूरित"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Filled Checkmark Badge */}
                      {isFilled && (
                        <div
                          className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-500/25"
                          title={`${filledMonthsCount} महिन्यांची उपस्थिती नोंदवली`}
                        >
                          <CheckCircle2 className="size-4 text-white" />
                          <span>हजेरी पूर्ण</span>
                        </div>
                      )}

                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                        <ChevronRight className="size-5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Month-wise View: Month Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {MONTHS.map((month) => {
              const filledStudentsCount = students.filter(
                (s) => getMonthAttendedForStudent(s, month.key) > 0
              ).length;
              const isMonthFilled = filledStudentsCount > 0;

              return (
                <div
                  key={month.key}
                  onClick={() => {
                    setSelectedMonthForEdit(month);
                    setSelectedMonth(month);
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-r from-white via-slate-50/40 to-white border border-slate-200/80 hover:border-blue-300 hover:shadow-md hover:translate-y-[-1px] active:scale-[0.995] transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-blue-100">
                      {month.icon}
                    </div>
                    <div>
                      <h4 className="text-slate-900 text-base font-bold group-hover:text-blue-600 transition-colors">
                        {month.label}
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        कामाचे दिवस: {workingDays[month.key] || month.days}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isMonthFilled && (
                      <div
                        className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-500/25"
                        title={`${filledStudentsCount}/${students.length} विद्यार्थी नोंदवले`}
                      >
                        <CheckCircle2 className="size-4" />
                        <span>{filledStudentsCount}/{students.length}</span>
                      </div>
                    )}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                      <ChevronRight className="size-5" />
                    </div>
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
