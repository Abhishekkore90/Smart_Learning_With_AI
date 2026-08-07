import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Search,
  BookOpen,
  Loader2,
  RefreshCw,
  Layers,
  Globe,
  Filter,
  CheckCircle2,
  X,
  FileText,
  FolderPlus,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { getClassRemarks } from "@/data/classRemarksData";
import { uploadBlobToBunny, saveJsonToBunny } from "@/lib/bunnyStorage";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cce-remarks")({
  head: () => ({
    meta: [{ title: "वर्णनात्मक नोंदी व्यवस्थापन (Admin CCE Remarks Manager) — SMART LEARNING" }],
  }),
  component: AdminCCERemarksPage,
});

const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली (1st)" },
  { id: "2nd", label: "इयत्ता २ री (2nd)" },
  { id: "3rd", label: "इयत्ता ३ री (3rd)" },
  { id: "4th", label: "इयत्ता ४ थी (4th)" },
  { id: "5th", label: "इयत्ता ५ वी (5th)" },
  { id: "6th", label: "इयत्ता ६ वी (6th)" },
  { id: "7th", label: "इयत्ता ७ वी (7th)" },
  { id: "8th", label: "इयत्ता ८ वी (8th)" },
  { id: "9th", label: "इयत्ता ९ वी (9th)" },
  { id: "10th", label: "इयत्ता १० वी (10th)" },
];

const MEDIUMS_LIST = [
  { id: "marathi", label: "मराठी माध्यम (Marathi Medium)" },
  { id: "semi", label: "सेमी इंग्रजी माध्यम (Semi-English Medium)" },
];

const DEFAULT_SUBJECTS_CONFIG: CustomSubjectItem[] = [
  { key: "prathambhasha", label: "प्रथम भाषा (मराठी)", icon: "📘" },
  { key: "dvitiybhasha", label: "द्वितीय भाषा (इंग्रजी)", icon: "🌐" },
  { key: "tritiyabhasha", label: "तृतीय भाषा (हिंदी)", icon: "🪔" },
  { key: "ganit", label: "गणित", icon: "📐" },
  { key: "parisar", label: "परिसर अभ्यास / विज्ञान", icon: "🔬" },
  { key: "samajik_shastra", label: "सामाजिक शास्त्रे", icon: "🏛️" },
  { key: "kala", label: "कला", icon: "🎨" },
  { key: "karyanubhav", label: "कार्यानुभव", icon: "🛠️" },
  { key: "sharirik", label: "शारीरिक शिक्षण व आरोग्य", icon: "⚽" },
  { key: "visheshpragati", label: "विशेष प्रगती", icon: "🌟" },
  { key: "aavad", label: "आवड / छंद", icon: "💖" },
  { key: "sudharna", label: "सुधारणा आवश्यक", icon: "⚠️" },
  { key: "vyaktimatva", label: "व्यक्तिमत्त्व गुणविशेष", icon: "👤" },
];

interface CustomSubjectItem {
  key: string;
  label: string;
  icon: string;
  isCustom?: boolean;
}

function AdminCCERemarksPage() {
  const navigate = useNavigate();

  const [selectedClass, setSelectedClass] = useState("1st");
  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi">("marathi");
  const [activeSubjectKey, setActiveSubjectKey] = useState("prathambhasha");

  // Subject-wise remarks store: { prathambhasha: ["...", "..."], ganit: [...] }
  const [remarksStore, setRemarksStore] = useState<Record<string, string[]>>({});
  // Custom subjects added by admin for this class & medium
  const [customSubjects, setCustomSubjects] = useState<CustomSubjectItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New remark input & inline edit state
  const [newRemarkText, setNewRemarkText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // New Subject Modal State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState("📚");

  const docId = `${selectedClass}_${selectedMedium}`;

  // Combined subjects list (Default + Custom Admin Subjects)
  const allSubjects = useMemo(() => {
    return [...DEFAULT_SUBJECTS_CONFIG, ...customSubjects];
  }, [customSubjects]);

  // ── Load Master Remarks & Custom Subjects for Class & Medium ──
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const defaultMaster = getClassRemarks(selectedClass, selectedMedium) || {};

    // 1. Listen for Firestore Admin Remarks & Custom Subjects
    const unsubDoc = onSnapshot(
      doc(db, "cce_admin_remarks", docId),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          const remoteRemarks = data.remarks || {};
          const remoteCustomSubjects = data.customSubjects || [];

          const merged: Record<string, string[]> = { ...defaultMaster };
          Object.keys(remoteRemarks).forEach((k) => {
            if (Array.isArray(remoteRemarks[k])) {
              merged[k] = remoteRemarks[k];
            }
          });

          setRemarksStore(merged);
          setCustomSubjects(remoteCustomSubjects);
        } else {
          setRemarksStore(defaultMaster);
          setCustomSubjects([]);
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore snapshot notice:", err);
        setLoading(false);
      }
    );

    // 2. Fetch Bunny CDN JSON fallback
    async function fetchFromBunnyCdn() {
      try {
        const cdnBase = import.meta.env.DEV ? "/api/bunny-cdn" : "https://sgkbrainova.b-cdn.net";
        const cdnUrl = `${cdnBase}/cce_remarks/class_${selectedClass}_${selectedMedium}_remarks.json`;
        const res = await fetch(cdnUrl);
        if (isMounted && res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setRemarksStore((prev) => ({
              ...defaultMaster,
              ...prev,
              ...data,
            }));
          }
        }
      } catch (e) {
        console.warn("Bunny CDN fetch notice:", e);
      }
    }
    fetchFromBunnyCdn();

    return () => {
      isMounted = false;
      unsubDoc();
    };
  }, [selectedClass, selectedMedium, docId]);

  // Current Active List of Remarks
  const currentSubjectRemarks = useMemo(() => {
    return remarksStore[activeSubjectKey] || [];
  }, [remarksStore, activeSubjectKey]);

  // Filtered Remarks by search term
  const filteredRemarks = useMemo(() => {
    if (!searchTerm.trim()) return currentSubjectRemarks;
    const q = searchTerm.toLowerCase().trim();
    return currentSubjectRemarks.filter((r) => r.toLowerCase().includes(q));
  }, [currentSubjectRemarks, searchTerm]);

  // ── Handle Add New Custom Subject ──
  const handleAddNewSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) {
      toast.error("कृपया विषयाचे नाव टाका!");
      return;
    }

    const key = `subj_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    const newSubjectItem: CustomSubjectItem = {
      key,
      label: trimmed,
      icon: newSubjectIcon || "📚",
      isCustom: true,
    };

    const updatedCustomSubjects = [...customSubjects, newSubjectItem];
    const updatedRemarksStore = { ...remarksStore, [key]: [] };

    setCustomSubjects(updatedCustomSubjects);
    setRemarksStore(updatedRemarksStore);
    setActiveSubjectKey(key);

    setNewSubjectName("");
    setIsAddSubjectOpen(false);
    toast.success(`🎉 '${trimmed}' हा नवीन विषय जोडला गेला!`);
  };

  // ── Handle Delete Custom Subject ──
  const handleDeleteCustomSubject = (subjKey: string, subjName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`नक्की '${subjName}' हा विषय हटवायचा आहे का?`)) return;

    const updatedCustomSubjects = customSubjects.filter((s) => s.key !== subjKey);
    const updatedRemarksStore = { ...remarksStore };
    delete updatedRemarksStore[subjKey];

    setCustomSubjects(updatedCustomSubjects);
    setRemarksStore(updatedRemarksStore);
    setActiveSubjectKey(DEFAULT_SUBJECTS_CONFIG[0].key);
    toast.success(`'${subjName}' विषय हटवला गेला.`);
  };

  // ── Handle Add New Remark ──
  const handleAddRemark = () => {
    const trimmed = newRemarkText.trim();
    if (!trimmed) {
      toast.error("कृपया नोंदीचे वर्णन टाका!");
      return;
    }

    if (currentSubjectRemarks.includes(trimmed)) {
      toast.error("ही नोंद आधीपासूनच समाविष्ट आहे!");
      return;
    }

    const updatedList = [trimmed, ...currentSubjectRemarks];
    const updatedStore = { ...remarksStore, [activeSubjectKey]: updatedList };

    setRemarksStore(updatedStore);
    setNewRemarkText("");
    toast.success("✅ नोंद समाविष्ट केली! (जतन करण्यासाठी 'सर्व सेव्ह करा' वर क्लिक करा)");
  };

  // ── Handle Edit Existing Remark ──
  const handleSaveEdit = (originalIndex: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      toast.error("नोंद रिकामी असू शकत नाही!");
      return;
    }

    const updatedList = [...currentSubjectRemarks];
    updatedList[originalIndex] = trimmed;
    const updatedStore = { ...remarksStore, [activeSubjectKey]: updatedList };

    setRemarksStore(updatedStore);
    setEditingIndex(null);
    setEditingText("");
    toast.success("✅ नोंद अपडेट केली!");
  };

  // ── Handle Delete Remark ──
  const handleDeleteRemark = (indexToDelete: number) => {
    if (!confirm("तुम्हाला नक्की ही नोंद हटवायची आहे का?")) return;

    const updatedList = currentSubjectRemarks.filter((_, idx) => idx !== indexToDelete);
    const updatedStore = { ...remarksStore, [activeSubjectKey]: updatedList };

    setRemarksStore(updatedStore);
    toast.success("🗑️ नोंद हटवली!");
  };

  // ── Handle Save & Sync All to Backend (Firestore + Bunny CDN + LocalStorage) ──
  const handleSaveAllToBackend = async () => {
    setSaving(true);
    toast.info("⚡ विषय व वर्णनात्मक नोंदी Firestore व Bunny Storage CDN वर सेव्ह होत आहेत...", { duration: 4000 });

    try {
      // 1. Save to Firestore
      const firestoreRef = doc(db, "cce_admin_remarks", docId);
      await setDoc(
        firestoreRef,
        {
          classId: selectedClass,
          mediumId: selectedMedium,
          remarks: remarksStore,
          customSubjects: customSubjects,
          updatedAt: new Date().toISOString(),
          updatedBy: "admin",
        },
        { merge: true }
      );

      // 2. Save JSON to Bunny Storage CDN for instant public access across all user sessions
      const bunnyPath = `cce_remarks/class_${selectedClass}_${selectedMedium}_remarks.json`;
      await saveJsonToBunny(bunnyPath, remarksStore);

      // 3. Local Cache update
      localStorage.setItem(`cce_custom_remarks_${selectedClass}_${selectedMedium}`, JSON.stringify(remarksStore));

      toast.success("🎉 विषय व वर्णनात्मक नोंदी यशस्वीरित्या जतन आणि पब्लिश झाल्या! युजर पॅनेलमध्ये लगेच अपडेट होतील.");
    } catch (err: any) {
      console.error("Save remarks error:", err);
      toast.error("सेव्ह करताना त्रुटी आली: " + (err?.message || "काहीतरी अडचण आली"));
    } finally {
      setSaving(false);
    }
  };

  const activeSubjectInfo = allSubjects.find((s) => s.key === activeSubjectKey) || allSubjects[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-xs"
            title="मागे जा"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
              <Sparkles className="size-5 text-amber-500 animate-pulse shrink-0" />
              <span>वर्णनात्मक नोंदी व्यवस्थापन (Admin CCE Remarks)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">वर्ग, माध्यम व विषय जोडा, नोंदी संपादित करा व पब्लिश करा</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveAllToBackend}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer transform hover:scale-105 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin text-white" /> : <Save className="size-4 text-white" />}
            <span>💾 सर्व सेव्ह करा (Save & Publish All)</span>
          </button>
        </div>
      </div>

      {/* ── FILTERS BAR (CLASS & MEDIUM) ────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Class selector pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="size-3.5 text-blue-600" />
              <span>वर्ग:</span>
            </span>
            {CLASSES_LIST.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  selectedClass === c.id
                    ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Medium selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {MEDIUMS_LIST.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMedium(m.id as "marathi" | "semi")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedMedium === m.id
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT SIDE: SUBJECT TABS + ADD SUBJECT BUTTON ─────────────────── */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="size-4 text-blue-600" />
                <span>विषय व घटक यादी</span>
              </h2>

              <button
                onClick={() => setIsAddSubjectOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>विषय जोडा</span>
              </button>
            </div>

            {/* Subject List */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {allSubjects.map((subj) => {
                const count = (remarksStore[subj.key] || []).length;
                const isActive = activeSubjectKey === subj.key;

                return (
                  <div
                    key={subj.key}
                    onClick={() => {
                      setActiveSubjectKey(subj.key);
                      setEditingIndex(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer border group ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-md font-extrabold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-bold"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      <span className="text-base">{subj.icon}</span>
                      <span className="text-xs truncate">{subj.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-amber-300 text-slate-950"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>

                      {subj.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustomSubject(subj.key, subj.label, e)}
                          className={`p-1 rounded-md transition-colors ${
                            isActive ? "hover:bg-rose-600 text-amber-200" : "hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                          }`}
                          title="विषय हटवा"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE: REMARKS EDITOR & MANAGEMENT ────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">
          {/* Header Banner for Selected Subject */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600">
                {activeSubjectInfo.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">
                    {selectedClass}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                    {selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी माध्यम"}
                  </span>
                  {activeSubjectInfo.isCustom && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                      सानुकूल विषय (Custom)
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {activeSubjectInfo.label} — वर्णनात्मक नोंदी
                </h2>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
              <div className="text-xs font-bold text-slate-500">एकूण नोंद संख्या</div>
              <div className="text-xl font-black text-blue-700">{currentSubjectRemarks.length}</div>
            </div>
          </div>

          {/* Add New Remark Input Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md space-y-3">
            <label className="text-xs font-black text-blue-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Plus className="size-4 text-blue-600" />
              <span>या विषयात नवीन नोंद समाविष्ट करा (Add New Remark)</span>
            </label>

            <div className="flex gap-2.5">
              <textarea
                value={newRemarkText}
                onChange={(e) => setNewRemarkText(e.target.value)}
                placeholder="येथे नवीन वर्णनात्मक नोंद टाईप करा... (उदा. चित्राचे वाचन करून माहिती सांगतो)"
                rows={2}
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none font-sans leading-relaxed transition-all"
              />
              <button
                onClick={handleAddRemark}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md cursor-pointer self-end transform hover:scale-105"
              >
                <Plus className="size-4 stroke-[3]" />
                <span>जोडा (Add)</span>
              </button>
            </div>
          </div>

          {/* Search & List Header */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="नोंदीमध्ये शोधा (Search remarks)..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-slate-500">
              दाखवत आहे: <span className="text-blue-700 font-black">{filteredRemarks.length}</span> नोंदी
            </div>
          </div>

          {/* Remarks List Container */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-12 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs font-bold">डेटा लोड होत आहे...</p>
              </div>
            ) : filteredRemarks.length > 0 ? (
              filteredRemarks.map((remark, idx) => {
                const originalIndex = currentSubjectRemarks.indexOf(remark);
                const isEditing = editingIndex === originalIndex;

                return (
                  <div
                    key={`${idx}-${remark.slice(0, 15)}`}
                    className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 transition-all flex items-start gap-3 shadow-xs group"
                  >
                    <span className="size-6 rounded-lg bg-blue-50 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                      {originalIndex + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-slate-50 border border-blue-600 rounded-lg p-2 text-xs text-slate-900 focus:outline-none resize-none font-sans"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(originalIndex)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                            title="सेव्ह करा"
                          >
                            <Check className="size-4 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer"
                            title="रद्द करा"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 text-xs text-slate-800 font-semibold leading-relaxed pt-0.5 font-sans">
                          {remark}
                        </div>

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingIndex(originalIndex);
                              setEditingText(remark);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="संपादन करा (Edit)"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRemark(originalIndex)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="हटवा (Delete)"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold">या विषयात कोणत्याही वर्णनात्मक नोंदी सापडल्या नाहीत.</p>
                <p className="text-[11px] text-slate-400">वरील फॉर्म वापरून नवीन नोंद जोडा.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ADD NEW SUBJECT MODAL ────────────────────────────────────────────── */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="size-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">नवीन विषय जोडा</h3>
              </div>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  विषयाचे नाव (Subject Name)*
                </label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="उदा. संगणक, संस्कृत, खेळू करू शिकू, इ."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  आयकॉन / इमोजी (Emoji Icon)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubjectIcon}
                    onChange={(e) => setNewSubjectIcon(e.target.value)}
                    placeholder="📚"
                    className="w-16 bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl px-3 py-2 text-center text-base focus:outline-none"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {["📚", "💻", "🌿", "🏆", "🎨", "🧩", "🧪", "🎯"].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewSubjectIcon(icon)}
                        className={`size-8 rounded-lg border text-sm flex items-center justify-center transition-all cursor-pointer ${
                          newSubjectIcon === icon ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleAddNewSubject}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md cursor-pointer"
              >
                ➕ विषय जोडा
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
