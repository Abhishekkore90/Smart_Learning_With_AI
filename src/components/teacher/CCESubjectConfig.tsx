import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft, ChevronDown, ChevronUp, RefreshCw, Plus, Trash2, Save, Globe } from "lucide-react";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";

export function CCESubjectConfig({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [medium, setMedium] = useState<"marathi" | "semi">(() => {
    const stored = localStorage.getItem("cce_selected_medium");
    return stored === "semi" ? "semi" : "marathi";
  });

  const [subjects, setSubjects] = useState<string[]>(() => getDefaultSubjectsForClass(selectedClass, medium));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.medium) {
            const isSemi = data.medium.toLowerCase().includes("semi");
            setMedium(isSemi ? "semi" : "marathi");
          }
          if (data.subjects && data.subjects.length > 0) {
            setSubjects(data.subjects);
          } else {
            setSubjects(getDefaultSubjectsForClass(selectedClass, medium));
          }
        } else {
          setSubjects(getDefaultSubjectsForClass(selectedClass, medium));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear, medium]);

  const handleMediumChange = (newMed: "marathi" | "semi") => {
    setMedium(newMed);
    localStorage.setItem("cce_selected_medium", newMed);
    setSubjects(getDefaultSubjectsForClass(selectedClass, newMed));
    toast.info(`माध्यम ${newMed === "semi" ? "सेमी-इंग्रजी" : "मराठी"} मध्ये बदलले व विषय अपडेट झाले!`);
  };

  const handleResetDefault = () => {
    const def = getDefaultSubjectsForClass(selectedClass, medium);
    setSubjects(def);
    toast.success(`इयत्ता ${selectedClass} (${medium === "semi" ? "सेमी" : "मराठी"}) साठी डिफॉल्ट विषय सेट केले!`);
  };

  const save = async () => {
    setSaving(true);
    try {
      const isSemi = medium === "semi";
      await setDoc(
        doc(db, "cce_settings", `${selectedClass}_${academicYear}`),
        {
          subjects,
          class: selectedClass,
          academicYear,
          medium: isSemi ? "सेमी-इंग्रजी - Semi-English" : "मराठी - Marathi",
          isSemiEnglish: isSemi,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      localStorage.setItem(`cce_subjects_${selectedClass}_${academicYear}`, JSON.stringify(subjects));
      localStorage.setItem("cce_selected_medium", medium);
      toast.success("विषय यशस्वीरित्या जतन केले!");
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects((prev) => [...prev, newSubject.trim()]);
      setNewSubject("");
    } else if (subjects.includes(newSubject.trim())) {
      toast.error("हा विषय आधीच जोडलेला आहे.");
    }
  };

  const removeSubject = (sub: string) => {
    setSubjects((prev) => prev.filter((s) => s !== sub));
  };

  const moveSubjectUp = (index: number) => {
    if (index === 0) return;
    setSubjects((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
  };

  const moveSubjectDown = (index: number) => {
    if (index === subjects.length - 1) return;
    setSubjects((prev) => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
  };

  if (loading)
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Globe className="size-5 text-blue-200" /> विषय निश्चिती (Subject Config)
            </h2>
            <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} साठी विषय जोडा, बदला किंवा क्रम लावा</p>
          </div>
        </div>

        {/* Medium Switcher Pill */}
        <div className="flex items-center bg-white/15 backdrop-blur-md p-1 rounded-2xl border border-white/20">
          <button
            onClick={() => handleMediumChange("marathi")}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
              medium === "marathi" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
            }`}
          >
            मराठी
          </button>
          <button
            onClick={() => handleMediumChange("semi")}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
              medium === "semi" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
            }`}
          >
            सेमी-इंग्रजी
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {/* Reset to Default Banner */}
        <div className="flex items-center justify-between bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
          <div>
            <p className="text-xs font-black text-blue-950 uppercase tracking-wider">इयत्ता {selectedClass} ({medium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) विषय यादी</p>
            <p className="text-[11px] text-blue-700 font-medium">माध्यम बदलल्यास सेमी विषयांची नाव ऑटो-अपडेट होतात</p>
          </div>
          <button
            onClick={handleResetDefault}
            className="px-3 py-2 bg-white hover:bg-blue-100 border border-blue-300 text-blue-800 font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="size-3.5" />
            <span>डिफॉल्ट रीसेट</span>
          </button>
        </div>

        {/* Add New Subject Input */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubject()}
            placeholder="नवीन विषयाचे नाव टाका (उदा. Computer / संगणक)..."
            className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900"
          />
          <button
            onClick={addSubject}
            className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            <span>विषय जोडा</span>
          </button>
        </div>

        {/* Subjects List Grid */}
        <div className="space-y-2 pt-2">
          {subjects.map((sub, index) => (
            <div
              key={`${sub}_${index}`}
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50/40 rounded-2xl border border-slate-200 transition-all group"
            >
              <span className="text-sm font-extrabold text-slate-800 group-hover:text-blue-700 transition-colors">
                {index + 1}. {sub}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => moveSubjectUp(index)}
                  disabled={index === 0}
                  className="p-1.5 text-slate-500 hover:bg-white rounded-xl transition-colors cursor-pointer disabled:opacity-30"
                  title="वर घ्या"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  onClick={() => moveSubjectDown(index)}
                  disabled={index === subjects.length - 1}
                  className="p-1.5 text-slate-500 hover:bg-white rounded-xl transition-colors cursor-pointer disabled:opacity-30"
                  title="खाली घ्या"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  onClick={() => removeSubject(sub)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="हटवा"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="pt-4 pb-6">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold text-base rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="size-5" />
            <span>{saving ? "जतन होत आहे..." : "विषय जतन करा"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
