import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "श शारीरिक शिक्षण",
];

export function CCESubjectConfig({ selectedClass, academicYear, onBack }: {
  selectedClass: string; academicYear: string; onBack: () => void;
}) {
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().subjects) {
          setSubjects(snap.data().subjects);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear]);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "cce_settings", `${selectedClass}_${academicYear}`), {
        subjects, class: selectedClass, academicYear, updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success("विषय यशस्वीरित्या जतन केले!");
    } catch (err: any) { toast.error("जतन अयशस्वी: " + err.message); }
    setSaving(false);
  };

  const addSubject = () => {
    if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
      setSubjects(prev => [...prev, newSubject.trim()]);
      setNewSubject("");
    } else if (subjects.includes(newSubject.trim())) {
      toast.error("हा विषय आधीच जोडलेला आहे.");
    }
  };

  const removeSubject = (sub: string) => {
    setSubjects(prev => prev.filter(s => s !== sub));
  };

  const moveSubjectUp = (index: number) => {
    if (index === 0) return;
    setSubjects(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
      return list;
    });
  };

  const moveSubjectDown = (index: number) => {
    if (index === subjects.length - 1) return;
    setSubjects(prev => {
      const list = [...prev];
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
      return list;
    });
  };

  if (loading) return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-[17px] font-black text-slate-800 tracking-tight">विषय निश्चिती</h2>
          <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">{selectedClass} • {academicYear}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <div className="space-y-4 max-w-xl mx-auto">
          <p className="text-slate-600 text-[13px] font-medium leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            येथे तुम्ही <b>{selectedClass}</b> च्या वर्गासाठी विषय जोडू शकता, काढून टाकू शकता किंवा त्यांचा क्रम ठरवू शकता. तुम्ही लावलेला क्रम थेट <b>गुण नोंदणी</b> मध्ये लागू होईल.
          </p>

          <div className="space-y-3 pt-2">
            {subjects.map((sub, idx) => (
              <div key={sub} className="flex items-center justify-between bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm hover:border-blue-300 transition-colors group">
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold font-mono">
                    {idx + 1}
                  </div>
                  <span className="text-slate-800 text-[15px] font-bold">{sub}</span>
                </div>
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveSubjectUp(idx)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all"
                    title="वर हलवा"
                  >
                    <ChevronUp className="size-4.5" />
                  </button>
                  <button
                    disabled={idx === subjects.length - 1}
                    onClick={() => moveSubjectDown(idx)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-all"
                    title="खाली हलवा"
                  >
                    <ChevronDown className="size-4.5" />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  <button
                    onClick={() => removeSubject(sub)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer font-bold"
                    title="काढून टाका"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add subject */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="नवीन विषयाचे नाव लिहा..."
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
              className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl text-[14px] text-slate-800 font-bold placeholder-slate-400 outline-none transition-all shadow-inner"
            />
            <button
              onClick={addSubject}
              className="px-6 py-3.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-2xl text-[14px] font-black transition-all cursor-pointer shadow-sm"
            >
              + जोडा
            </button>
          </div>

          {/* Save button */}
          <div className="pt-8 pb-4">
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-4.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-[15px] rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 disabled:opacity-50"
            >
              {saving ? "जतन होत आहे..." : "विषय जतन करा"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
