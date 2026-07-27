import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Layers,
  Scale,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";

interface SubjectWeightage {
  tondiKaam: string;
  pratyakshikPrayog: string;
  upakramKriti: string;
  prakalpa: string;
  chaachaniLekhi: string;
  swadhyayVargakarya: string;
  itar: string;
  sankalitTondi: string;
  sankalitPratyakshik: string;
  sankalitLekhi: string;
}

interface WeightageItem {
  id: string;
  name: string;
  studentIds: number[];
  subjects: Record<string, SubjectWeightage>;
  description?: string;
}

interface WeightageData {
  semester1: WeightageItem[];
  semester2: WeightageItem[];
}

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण",
];

const getSubjectKeyFallback = (subjectName: string): string => {
  if (subjectName.includes("मराठी")) return "marathi";
  if (subjectName.includes("इंग्रजी")) return "english";
  if (subjectName.includes("गणित")) return "math";
  if (subjectName.includes("कला")) return "art";
  if (subjectName.includes("कार्यानुभव")) return "work";
  if (subjectName.includes("शारीरिक")) return "pe";
  return "marathi";
};

const ensureSubjectWeightages = (item: WeightageItem, dynamicSubjects: string[]): WeightageItem => {
  const subjects = item.subjects || {};
  dynamicSubjects.forEach((sub) => {
    if (!subjects[sub]) {
      const oldKey = getSubjectKeyFallback(sub);
      if (subjects[oldKey]) {
        subjects[sub] = subjects[oldKey];
      } else {
        subjects[sub] = {
          tondiKaam: "",
          pratyakshikPrayog: "",
          upakramKriti: "",
          prakalpa: "",
          chaachaniLekhi: "",
          swadhyayVargakarya: "",
          itar: "",
          sankalitTondi: "",
          sankalitPratyakshik: "",
          sankalitLekhi: "",
        };
      }
    }
  });
  return { ...item, subjects };
};

const getAkarikTotal = (w: SubjectWeightage) => {
  return (
    (parseInt(w.tondiKaam) || 0) +
    (parseInt(w.pratyakshikPrayog) || 0) +
    (parseInt(w.upakramKriti) || 0) +
    (parseInt(w.prakalpa) || 0) +
    (parseInt(w.chaachaniLekhi) || 0) +
    (parseInt(w.swadhyayVargakarya) || 0) +
    (parseInt(w.itar) || 0)
  );
};

const getSankalitTotal = (w: SubjectWeightage) => {
  return (
    (parseInt(w.sankalitTondi) || 0) +
    (parseInt(w.sankalitPratyakshik) || 0) +
    (parseInt(w.sankalitLekhi) || 0)
  );
};

const getExpectedMarks = (selectedClass: string) => {
  if (["1st", "2nd"].includes(selectedClass)) return { akarik: 70, sankalit: 30 };
  if (["3rd", "4th"].includes(selectedClass)) return { akarik: 60, sankalit: 40 };
  if (["5th", "6th"].includes(selectedClass)) return { akarik: 50, sankalit: 50 };
  if (["7th", "8th"].includes(selectedClass)) return { akarik: 40, sankalit: 60 };
  return { akarik: 0, sankalit: 0 };
};

// Weightage numeric input without spinner buttons/scroll bars
function WeightageInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-slate-600 font-extrabold ml-1">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value || ""}
        onChange={(e) => {
          const val = e.target.value.replace(/[^0-9]/g, "");
          onChange(val);
        }}
        placeholder="0"
        className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-2xl text-sm text-slate-900 outline-none transition-all font-bold shadow-sm"
      />
    </div>
  );
}

export function CCEWeightage({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<WeightageData>({ semester1: [], semester2: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState<"semester1" | "semester2">("semester1");
  const [editingItem, setEditingItem] = useState<WeightageItem | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [students, setStudents] = useState<{ id: string; name: string; rollNo: string }[]>([]);
  const [dynamicSubjects, setDynamicSubjects] = useState<string[]>(() => getDefaultSubjectsForClass(selectedClass));

  // Instant cache & real-time sync for subjects from CCESubjectConfig
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`cce_subjects_${selectedClass}_${academicYear}`);
      if (cached) {
        setDynamicSubjects(JSON.parse(cached));
      }
    } catch (e) {}

    const unsubSettings = onSnapshot(doc(db, "cce_settings", `${selectedClass}_${academicYear}`), (snap) => {
      if (snap.exists() && snap.data().subjects) {
        const subs = snap.data().subjects;
        setDynamicSubjects(subs);
        localStorage.setItem(`cce_subjects_${selectedClass}_${academicYear}`, JSON.stringify(subs));
      }
    });
    return () => unsubSettings();
  }, [selectedClass, academicYear]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let loadedSubjects = dynamicSubjects;
        const settingsRef = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().subjects) {
          loadedSubjects = settingsSnap.data().subjects;
          setDynamicSubjects(loadedSubjects);
        }

        const ref = doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const docData = snap.data();
          const loadedData = (docData.data || docData) as WeightageData;
          const sem1 = (loadedData.semester1 || docData.semester1 || []).map((i: WeightageItem) =>
            ensureSubjectWeightages(i, loadedSubjects)
          );
          const sem2 = (loadedData.semester2 || docData.semester2 || []).map((i: WeightageItem) =>
            ensureSubjectWeightages(i, loadedSubjects)
          );
          setData({ semester1: sem1, semester2: sem2 });
        } else {
          // Check old ref
          const oldRef = doc(db, "cce_weightage", `${selectedClass}_${academicYear}`);
          const oldSnap = await getDoc(oldRef);
          if (oldSnap.exists() && oldSnap.data().rows) {
            const oldRows = oldSnap.data().rows;
            const defaultItems: WeightageItem[] = oldRows.map((row: any, idx: number) => {
              const defaultSubjects: Record<string, SubjectWeightage> = {};
              loadedSubjects.forEach((sub) => {
                defaultSubjects[sub] = {
                  tondiKaam: getSubjectKeyFallback(sub) === "marathi" ? row.oral || "" : "",
                  pratyakshikPrayog: "",
                  upakramKriti: getSubjectKeyFallback(sub) === "marathi" ? row.activity || "" : "",
                  prakalpa: "",
                  chaachaniLekhi: getSubjectKeyFallback(sub) === "marathi" ? row.test || "" : "",
                  swadhyayVargakarya: "",
                  itar: "",
                  sankalitTondi: "",
                  sankalitPratyakshik: "",
                  sankalitLekhi: "",
                };
              });
              return {
                id: `item_${idx + 1}`,
                name: `भारांश निश्चिती ${idx + 1}`,
                studentIds: [],
                subjects: defaultSubjects,
                description: `${row.subject} - तोंडी: ${row.oral}, उपक्रम: ${row.activity}, चाचणी: ${row.test}`,
              };
            });
            setData({
              semester1: defaultItems.map((i) => ensureSubjectWeightages(i, loadedSubjects)),
              semester2: [],
            });
          } else {
            setData({ semester1: [], semester2: [] });
          }
        }
      } catch (err) {
        console.error("Error loading weightage:", err);
      }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear]);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("class", "==", selectedClass)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => {
        const dd = d.data();
        return {
          id: d.id,
          name: dd.fullName || dd.name || "",
          rollNo: dd.rollNo || "",
        };
      });
      list.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"));
      setStudents(list);
    });
    return () => unsub();
  }, [selectedClass]);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(
        doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`),
        {
          class: selectedClass,
          academicYear,
          data,
          semester1: data.semester1,
          semester2: data.semester2,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("भारांश जतन झाला!");
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const handleAddNew = () => {
    const defaultSubjects: Record<string, SubjectWeightage> = {};
    dynamicSubjects.forEach((sub) => {
      defaultSubjects[sub] = {
        tondiKaam: "",
        pratyakshikPrayog: "",
        upakramKriti: "",
        prakalpa: "",
        chaachaniLekhi: "",
        swadhyayVargakarya: "",
        itar: "",
        sankalitTondi: "",
        sankalitPratyakshik: "",
        sankalitLekhi: "",
      };
    });
    const newItem: WeightageItem = {
      id: `item_${Date.now()}`,
      name: `भारांश निश्चिती ${data[activeSemester].length + 1}`,
      studentIds: [],
      subjects: defaultSubjects,
    };
    setEditingItem(newItem);
    setSubjectIndex(0);
  };

  const duplicateItem = async (item: WeightageItem) => {
    const clonedSubjects = JSON.parse(JSON.stringify(item.subjects || {}));
    const newItem: WeightageItem = {
      ...item,
      id: `item_${Date.now()}`,
      name: `${item.name} (प्रत)`,
      subjects: clonedSubjects,
    };
    const updatedData = {
      ...data,
      [activeSemester]: [...data[activeSemester], newItem],
    };
    setData(updatedData);

    setSaving(true);
    try {
      await setDoc(
        doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`),
        {
          class: selectedClass,
          academicYear,
          data: updatedData,
          semester1: updatedData.semester1,
          semester2: updatedData.semester2,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("प्रत तयार झाली आणि जतन केली!");
    } catch (err: any) {
      toast.error("प्रत तयार करणे अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("हा भारांश हटवायचा आहे का?")) return;
    const updatedData = {
      ...data,
      [activeSemester]: data[activeSemester].filter((i) => i.id !== itemId),
    };
    setData(updatedData);

    setSaving(true);
    try {
      await setDoc(
        doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`),
        {
          class: selectedClass,
          academicYear,
          data: updatedData,
          semester1: updatedData.semester1,
          semester2: updatedData.semester2,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("भारांश यशस्वीरित्या हटवला!");
    } catch (err: any) {
      toast.error("हटवणे अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const currentItems = data[activeSemester];

  // ── EDITING WEIGHTAGE FORM ──
  if (editingItem) {
    const currentSubject = dynamicSubjects[subjectIndex];
    const sw = editingItem.subjects[currentSubject] || {
      tondiKaam: "",
      pratyakshikPrayog: "",
      upakramKriti: "",
      prakalpa: "",
      chaachaniLekhi: "",
      swadhyayVargakarya: "",
      itar: "",
      sankalitTondi: "",
      sankalitPratyakshik: "",
      sankalitLekhi: "",
    };

    const updateField = (field: keyof SubjectWeightage, val: string) => {
      const updatedSubjects = {
        ...editingItem.subjects,
        [currentSubject]: {
          ...sw,
          [field]: val,
        },
      };
      setEditingItem({
        ...editingItem,
        subjects: updatedSubjects,
      });
    };

    const expectedMarks = getExpectedMarks(selectedClass);
    const akarikSum = getAkarikTotal(sw);
    const sankalitSum = getSankalitTotal(sw);

    const handleSaveItem = async (saveAndClose: boolean = false) => {
      const nameToSave = editingItem.name.trim() || `भारांश निश्चिती ${data[activeSemester].length + 1}`;
      const itemToSave = { ...editingItem, name: nameToSave };

      const existingIdx = data[activeSemester].findIndex((i) => i.id === editingItem.id);
      let updatedList: WeightageItem[];
      if (existingIdx >= 0) {
        updatedList = data[activeSemester].map((i) => (i.id === editingItem.id ? itemToSave : i));
      } else {
        updatedList = [...data[activeSemester], itemToSave];
      }

      const updatedData = { ...data, [activeSemester]: updatedList };
      setData(updatedData);

      setSaving(true);
      try {
        await setDoc(
          doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`),
          {
            class: selectedClass,
            academicYear,
            data: updatedData,
            semester1: updatedData.semester1,
            semester2: updatedData.semester2,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        toast.success("भारांश यशस्वीरित्या जतन करण्यात आला!");
      } catch (err: any) {
        toast.error("जतन अयशस्वी: " + err.message);
      }
      setSaving(false);

      if (saveAndClose) {
        setEditingItem(null);
      }
    };

    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col font-sans overflow-hidden select-none"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingItem(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <Scale className="size-5 text-blue-200" /> भारांश निश्चिती संपादन
              </h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} - {activeSemester === "semester1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</p>
            </div>
          </div>
        </div>

        {/* Subject Nav Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          <button
            onClick={() => setSubjectIndex((prev) => Math.max(0, prev - 1))}
            disabled={subjectIndex === 0}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {dynamicSubjects.map((sub, idx) => (
              <button
                key={sub}
                onClick={() => setSubjectIndex(idx)}
                className={`px-3.5 py-2 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  subjectIndex === idx
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSubjectIndex((prev) => Math.min(dynamicSubjects.length - 1, prev + 1))}
            disabled={subjectIndex === dynamicSubjects.length - 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Weightage Input Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 flex items-center justify-between">
            <span className="text-xs font-black text-blue-900 uppercase tracking-wider">{currentSubject}</span>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className={`px-2.5 py-1 rounded-xl border ${akarikSum === expectedMarks.akarik ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
                आकारिक: {akarikSum} / {expectedMarks.akarik}
              </span>
              <span className={`px-2.5 py-1 rounded-xl border ${sankalitSum === expectedMarks.sankalit ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}>
                संकलित: {sankalitSum} / {expectedMarks.sankalit}
              </span>
            </div>
          </div>

          {/* Akarik Section */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">आकारिक मूल्यमापन घटक (Akarik)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <WeightageInput label="तोंडी काम" value={sw.tondiKaam} onChange={(v) => updateField("tondiKaam", v)} />
              <WeightageInput label="प्रात्यक्षिक / प्रयोग" value={sw.pratyakshikPrayog} onChange={(v) => updateField("pratyakshikPrayog", v)} />
              <WeightageInput label="उपक्रम / कृती" value={sw.upakramKriti} onChange={(v) => updateField("upakramKriti", v)} />
              <WeightageInput label="प्रकल्प" value={sw.prakalpa} onChange={(v) => updateField("prakalpa", v)} />
              <WeightageInput label="चाचणी (लेखी)" value={sw.chaachaniLekhi} onChange={(v) => updateField("chaachaniLekhi", v)} />
              <WeightageInput label="स्वाध्याय / वर्गकार्य" value={sw.swadhyayVargakarya} onChange={(v) => updateField("swadhyayVargakarya", v)} />
            </div>
          </div>

          {/* Sankalit Section */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-4">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">संकलित मूल्यमापन घटक (Sankalit)</h4>
            <div className="grid grid-cols-3 gap-3">
              <WeightageInput label="तोंडी काम" value={sw.sankalitTondi} onChange={(v) => updateField("sankalitTondi", v)} />
              <WeightageInput label="प्रात्यक्षिक" value={sw.sankalitPratyakshik} onChange={(v) => updateField("sankalitPratyakshik", v)} />
              <WeightageInput label="लेखी परीक्षा" value={sw.sankalitLekhi} onChange={(v) => updateField("sankalitLekhi", v)} />
            </div>
          </div>

          <div className="pt-4 pb-6">
            <button
              onClick={() => handleSaveItem(true)}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="size-5" />
              <span>जतन करा</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN WEIGHTAGE LIST VIEW ──
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
                <Scale className="size-5 text-blue-200" /> भारांश निश्चिती
              </h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} गुण भारांश वाटप व्यवस्थापन</p>
            </div>
          </div>
        </div>
      </div>

      {/* Semester Switcher Tabs */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-center gap-3">
        {(["semester1", "semester2"] as const).map((sem) => (
          <button
            key={sem}
            onClick={() => setActiveSemester(sem)}
            className={`flex-1 py-3 px-6 rounded-2xl font-black text-xs transition-all cursor-pointer ${
              activeSemester === sem
                ? "bg-white text-blue-700 shadow-md border border-blue-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            {sem === "semester1" ? "प्रथम सत्र" : "द्वितीय सत्र"}
          </button>
        ))}
      </div>

      {/* Weightage List */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <span className="text-xs text-slate-400 font-bold">भारांश लोड होत आहे...</span>
          </div>
        ) : currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
            <Scale className="size-12 text-slate-300 mb-2" />
            <p className="text-slate-600 font-bold text-sm">कोणताही निश्चित केलेला भारांश नाही</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">नवीन भारांश जोडण्यासाठी खालील '+' बटणावर क्लिक करा</p>
            <button
              onClick={handleAddNew}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-500/20 flex items-center gap-2"
            >
              <Plus className="size-4" />
              <span>नवीन भारांश निश्चित करा</span>
            </button>
          </div>
        ) : (
          currentItems.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white hover:bg-blue-50/20 rounded-3xl border border-slate-200 hover:border-blue-300 shadow-md transition-all space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-blue-900">{item.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                    title="संपादित करा"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => duplicateItem(item)}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="प्रत बनवा"
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="हटवा"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {/* Formatted Subjects Summary */}
              <div className="space-y-2">
                {dynamicSubjects.map((sub) => {
                  const sw = item.subjects?.[sub];
                  if (!sw) return null;
                  const aTot = getAkarikTotal(sw);
                  const sTot = getSankalitTotal(sw);
                  if (aTot === 0 && sTot === 0) return null;

                  return (
                    <div key={sub} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700">
                      <p className="text-blue-900 font-extrabold mb-1">{sub}</p>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                        <span className="font-bold text-slate-800">आकारिक ({aTot}):</span> नोंदी: {sw.tondiKaam || 0}, प्रात्याक्षिक: {sw.pratyakshikPrayog || 0}, उपक्रम: {sw.upakramKriti || 0}, प्रकल्प: {sw.prakalpa || 0}, चाचणी: {sw.chaachaniLekhi || 0}, स्वाध्याय: {sw.swadhyayVargakarya || 0}
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium leading-relaxed mt-0.5">
                        <span className="font-bold text-slate-800">संकलित ({sTot}):</span> तोंडी: {sw.sankalitTondi || 0}, प्रात्यक्षिक: {sw.sankalitPratyakshik || 0}, लेखी: {sw.sankalitLekhi || 0}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={handleAddNew}
        className="absolute bottom-6 right-6 size-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20 z-30"
        title="भारांश जोडा"
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
