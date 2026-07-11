import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Plus, Pencil, Copy, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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
  studentIds: number[]; // roll numbers assigned
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
  "शारीरिक शिक्षण"
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
          tondiKaam: "", pratyakshikPrayog: "", upakramKriti: "", prakalpa: "",
          chaachaniLekhi: "", swadhyayVargakarya: "", itar: "",
          sankalitTondi: "", sankalitPratyakshik: "", sankalitLekhi: "",
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
      <span className="text-[12px] text-slate-500 font-semibold ml-1">{label}</span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 outline-none transition-all font-medium"
      />
    </div>
  );
}

export function CCEWeightage({ selectedClass, academicYear, onBack }: { selectedClass: string; academicYear: string; onBack: () => void }) {
  const [data, setData] = useState<WeightageData>({ semester1: [], semester2: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSemester, setActiveSemester] = useState<"semester1" | "semester2">("semester1");
  const [editingItem, setEditingItem] = useState<WeightageItem | null>(null);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [students, setStudents] = useState<{ id: string; name: string; rollNo: string }[]>([]);
  const [assigningItemId, setAssigningItemId] = useState<string | null>(null);
  const [dynamicSubjects, setDynamicSubjects] = useState<string[]>(DEFAULT_SUBJECTS);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let loadedSubjects = DEFAULT_SUBJECTS;
        const settingsRef = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists() && settingsSnap.data().subjects) {
          loadedSubjects = settingsSnap.data().subjects;
        }
        setDynamicSubjects(loadedSubjects);

        const ref = doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().data) {
          const loadedData = snap.data().data as WeightageData;
          setData({
            semester1: (loadedData.semester1 || []).map(i => ensureSubjectWeightages(i, loadedSubjects)),
            semester2: (loadedData.semester2 || []).map(i => ensureSubjectWeightages(i, loadedSubjects)),
          });
        } else {
          // Migrate from old format or create default
          const oldRef = doc(db, "cce_weightage", `${selectedClass}_${academicYear}`);
          const oldSnap = await getDoc(oldRef);
          if (oldSnap.exists() && oldSnap.data().rows) {
            const oldRows = oldSnap.data().rows;
            const defaultItems: WeightageItem[] = oldRows.map((row: any, idx: number) => {
              const defaultSubjects: Record<string, SubjectWeightage> = {};
              loadedSubjects.forEach((sub) => {
                defaultSubjects[sub] = {
                  tondiKaam: getSubjectKeyFallback(sub) === "marathi" ? (row.oral || "") : "",
                  pratyakshikPrayog: "",
                  upakramKriti: getSubjectKeyFallback(sub) === "marathi" ? (row.activity || "") : "",
                  prakalpa: "",
                  chaachaniLekhi: getSubjectKeyFallback(sub) === "marathi" ? (row.test || "") : "",
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
            setData({ semester1: defaultItems.map(i => ensureSubjectWeightages(i, loadedSubjects)), semester2: [] });
          } else {
            setData({
              semester1: [],
              semester2: [],
            });
          }
        }
      } catch (err) {
        console.error(err);
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
      await setDoc(doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`), {
        class: selectedClass,
        academicYear,
        data,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
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
        tondiKaam: "", pratyakshikPrayog: "", upakramKriti: "", prakalpa: "",
        chaachaniLekhi: "", swadhyayVargakarya: "", itar: "",
        sankalitTondi: "", sankalitPratyakshik: "", sankalitLekhi: "",
      };
    });
    const newItem: WeightageItem = {
      id: `item_${Date.now()}`,
      name: "",
      studentIds: [],
      subjects: defaultSubjects,
    };
    setData(prev => ({
      ...prev,
      [activeSemester]: [...prev[activeSemester], newItem],
    }));
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
      await setDoc(doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`), {
        class: selectedClass,
        academicYear,
        data: updatedData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
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
      [activeSemester]: data[activeSemester].filter(i => i.id !== itemId),
    };
    setData(updatedData);
    
    setSaving(true);
    try {
      await setDoc(doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`), {
        class: selectedClass,
        academicYear,
        data: updatedData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success("भारांश यशस्वीरित्या हटवला!");
    } catch (err: any) {
      toast.error("हटवणे अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const currentItems = data[activeSemester];

  if (editingItem) {
    const currentSubject = dynamicSubjects[subjectIndex];
    const sw = editingItem.subjects[currentSubject] || {
      tondiKaam: "", pratyakshikPrayog: "", upakramKriti: "", prakalpa: "",
      chaachaniLekhi: "", swadhyayVargakarya: "", itar: "",
      sankalitTondi: "", sankalitPratyakshik: "", sankalitLekhi: "",
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

    const handleNextOrSave = async () => {
      const updatedList = data[activeSemester].map((item) =>
        item.id === editingItem.id ? editingItem : item
      );
      const updatedData = { ...data, [activeSemester]: updatedList };
      setData(updatedData);

      if (subjectIndex < dynamicSubjects.length - 1) {
        setSubjectIndex(subjectIndex + 1);
      } else {
        setSaving(true);
        try {
          await setDoc(doc(db, "cce_weightage_v2", `${selectedClass}_${academicYear}`), {
            class: selectedClass,
            academicYear,
            data: updatedData,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          toast.success("भारांश यशस्वीरित्या जतन करण्यात आला!");
        } catch (err: any) {
          toast.error("जतन अयशस्वी: " + err.message);
        }
        setSaving(false);
        setEditingItem(null);
      }
    };

    return (
      <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col font-sans relative select-none overflow-hidden" style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setEditingItem(null)}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-800 flex items-center justify-center"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            भारांश निश्चिती संपादन करा
          </h2>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-5">
          {/* Weightage Name */}
          <div className="flex flex-col gap-1.5 mb-2">
            <span className="text-[12px] text-slate-500 font-bold uppercase tracking-wider ml-1">
              भारांश निश्चितीचे नाव*
            </span>
            <input
              type="text"
              value={editingItem.name}
              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              placeholder="भारांश निश्चिती नाव"
              className="w-full px-4 py-3.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-slate-800 outline-none transition-all font-semibold"
            />
          </div>

          {/* Subject Navigation Header */}
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
            <span className="text-sm md:text-base font-extrabold text-blue-600">
              {currentSubject}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setSubjectIndex(Math.max(0, subjectIndex - 1))}
                disabled={subjectIndex === 0}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center cursor-pointer disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="size-4 text-slate-650" />
              </button>
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                {subjectIndex + 1} / {dynamicSubjects.length}
              </span>
              <button
                onClick={() => setSubjectIndex(Math.min(dynamicSubjects.length - 1, subjectIndex + 1))}
                disabled={subjectIndex === dynamicSubjects.length - 1}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center cursor-pointer disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="size-4 text-slate-650" />
              </button>
            </div>
          </div>

          {/* आकारिक मूल्यमापन Section */}
          <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">आकारिक मूल्यमापन</h3>
              {expectedMarks.akarik > 0 && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                  अपेक्षित गुण: {expectedMarks.akarik}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <WeightageInput
                label="तोंडीकाम"
                value={sw.tondiKaam}
                onChange={(v) => updateField("tondiKaam", v)}
              />
              <WeightageInput
                label="प्रात्यक्षिक / प्रयोग"
                value={sw.pratyakshikPrayog}
                onChange={(v) => updateField("pratyakshikPrayog", v)}
              />
              <WeightageInput
                label="उपक्रम / कृती"
                value={sw.upakramKriti}
                onChange={(v) => updateField("upakramKriti", v)}
              />
              <WeightageInput
                label="प्रकल्प"
                value={sw.prakalpa}
                onChange={(v) => updateField("prakalpa", v)}
              />
              <WeightageInput
                label="चाचणी (लेखी)"
                value={sw.chaachaniLekhi}
                onChange={(v) => updateField("chaachaniLekhi", v)}
              />
              <WeightageInput
                label="स्वाध्याय / वर्गकार्य"
                value={sw.swadhyayVargakarya}
                onChange={(v) => updateField("swadhyayVargakarya", v)}
              />
            </div>
            <div className="pt-1">
              <WeightageInput
                label="इतर"
                value={sw.itar}
                onChange={(v) => updateField("itar", v)}
              />
            </div>
            
            <div className={`flex items-center justify-end text-xs font-bold pt-2 border-t border-slate-100 ${expectedMarks.akarik > 0 && akarikSum !== expectedMarks.akarik ? 'text-red-500' : 'text-green-600'}`}>
              भरलेले गुण: {akarikSum} {expectedMarks.akarik > 0 ? `/ ${expectedMarks.akarik}` : ''}
            </div>
          </div>

          {/* संकलित मूल्यमापन Section */}
          <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/30 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">संकलित मूल्यमापन</h3>
              {expectedMarks.sankalit > 0 && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
                  अपेक्षित गुण: {expectedMarks.sankalit}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <WeightageInput
                label="तोंडी"
                value={sw.sankalitTondi}
                onChange={(v) => updateField("sankalitTondi", v)}
              />
              <WeightageInput
                label="प्रात्यक्षिक"
                value={sw.sankalitPratyakshik}
                onChange={(v) => updateField("sankalitPratyakshik", v)}
              />
            </div>
            <div className="pt-1">
              <WeightageInput
                label="लेखी"
                value={sw.sankalitLekhi}
                onChange={(v) => updateField("sankalitLekhi", v)}
              />
            </div>
            
            <div className={`flex items-center justify-end text-xs font-bold pt-2 border-t border-slate-100 ${expectedMarks.sankalit > 0 && sankalitSum !== expectedMarks.sankalit ? 'text-red-500' : 'text-green-600'}`}>
              भरलेले गुण: {sankalitSum} {expectedMarks.sankalit > 0 ? `/ ${expectedMarks.sankalit}` : ''}
            </div>
          </div>
        </div>

        {/* Footer Next/Save button */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white to-transparent z-10">
          <button
            onClick={handleNextOrSave}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? "जतन होत आहे..." : (subjectIndex === dynamicSubjects.length - 1 ? "जतन करा" : "पुढे")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col font-sans relative select-none" style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-800 flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          भारांश निश्चिती
        </h2>
      </div>

      {/* Semester Tabs */}
      <div className="px-5 py-3 border-b border-slate-100">
        <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-1">
          <button
            onClick={() => setActiveSemester("semester1")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeSemester === "semester1"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            प्रथम सत्र
          </button>
          <button
            onClick={() => setActiveSemester("semester2")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              activeSemester === "semester2"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            द्वितीय सत्र
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-xs text-slate-400 font-bold">लोड होत आहे...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Item list */}
            {currentItems.map((item) => (
              <div key={item.id} className="space-y-0">
                {/* Item row */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-[15px] font-medium text-slate-800">
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const upgraded = ensureSubjectWeightages(item, dynamicSubjects);
                        setEditingItem(upgraded);
                        setSubjectIndex(0);
                      }}
                      className="p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-blue-600"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => duplicateItem(item)}
                      className="p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-blue-600"
                    >
                      <Copy className="size-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Student assignment cards */}
            {currentItems.map((item) => (
              <div key={`card_${item.id}`} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-extrabold text-slate-800">{item.name}</p>
                </div>

                {/* Subject Weightages Summary */}
                <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-2">
                  <p className="text-xs font-bold text-slate-500">निश्चित केलेला भारांश:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dynamicSubjects.map((sub) => {
                      const sw = item.subjects?.[sub];
                      if (!sw) return null;
                      const akarikSum = getAkarikTotal(sw);
                      const sankalitSum = getSankalitTotal(sw);
                      if (akarikSum === 0 && sankalitSum === 0) return null;

                      const details = [];
                      if (sw.tondiKaam) details.push(`तोंडीकाम: ${sw.tondiKaam}`);
                      if (sw.pratyakshikPrayog) details.push(`प्रात्यक्षिक: ${sw.pratyakshikPrayog}`);
                      if (sw.upakramKriti) details.push(`उपक्रम: ${sw.upakramKriti}`);
                      if (sw.prakalpa) details.push(`प्रकल्प: ${sw.prakalpa}`);
                      if (sw.chaachaniLekhi) details.push(`चाचणी: ${sw.chaachaniLekhi}`);
                      if (sw.swadhyayVargakarya) details.push(`स्वाध्याय: ${sw.swadhyayVargakarya}`);
                      if (sw.itar) details.push(`इतर: ${sw.itar}`);

                      const sankalitDetails = [];
                      if (sw.sankalitTondi) sankalitDetails.push(`तोंडी: ${sw.sankalitTondi}`);
                      if (sw.sankalitPratyakshik) sankalitDetails.push(`प्रात्यक्षिक: ${sw.sankalitPratyakshik}`);
                      if (sw.sankalitLekhi) sankalitDetails.push(`लेखी: ${sw.sankalitLekhi}`);

                      return (
                        <div key={sub} className="bg-white border border-slate-150 rounded-xl p-2.5 space-y-1">
                          <p className="text-[13px] font-extrabold text-blue-600">{sub}</p>
                          <div className="space-y-0.5 text-[11px] text-slate-650">
                            {akarikSum > 0 && (
                              <p>
                                <span className="font-bold text-slate-700">आकारिक ({akarikSum}):</span> {details.join(", ")}
                              </p>
                            )}
                            {sankalitSum > 0 && (
                              <p>
                                <span className="font-bold text-slate-700">संकलित ({sankalitSum}):</span> {sankalitDetails.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Save button */}
            <div className="pt-4 pb-16">
              <button
                onClick={save}
                disabled={saving}
                className="mx-auto block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-200"
              >
                {saving ? "जतन होत आहे..." : "जतन करा"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FAB - Add new item */}
      <button
        onClick={handleAddNew}
        className="absolute bottom-6 right-6 size-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-200/50 flex items-center justify-center hover:scale-105 transition-all cursor-pointer border border-blue-500/30 z-30"
        title="भारांश जोडा"
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>

    </div>
  );
}
