import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ChevronDown,
  Building2,
  Hash,
  Globe,
  MapPin,
  UserCheck,
  Sparkles,
  FileSignature,
  Upload,
  Save,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

const MEDIUM_OPTIONS = [
  "मराठी - Marathi",
  "सेमी-इंग्रजी - Semi-English",
];

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
  "शारीरिक शिक्षण",
];

// Floating label input component
function FloatInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  icon?: any;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative mb-4">
      <label
        className="absolute left-3.5 transition-all pointer-events-none font-bold z-10 rounded-md px-1.5"
        style={{
          top: focused || filled ? "-10px" : "16px",
          fontSize: focused || filled ? "12px" : "14px",
          color: focused ? "#2563eb" : filled ? "#1e293b" : "#64748b",
          background: "white",
        }}
      >
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-slate-400 pointer-events-none">
            <Icon className="size-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? placeholder || "" : ""}
          className={`w-full ${Icon ? "pl-11" : "px-4"} pr-4 py-4 rounded-2xl text-sm font-semibold outline-none transition-all`}
          style={{
            background: focused ? "#f8fafc" : "#ffffff",
            border: `1.5px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
            boxShadow: focused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
            color: "#0f172a",
          }}
        />
      </div>
    </div>
  );
}

// Floating label dropdown for माध्यम
function FloatSelect({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative mb-4">
      <label
        className="absolute left-3.5 transition-all pointer-events-none font-bold z-10 rounded-md px-1.5"
        style={{
          top: filled || open ? "-10px" : "16px",
          fontSize: filled || open ? "12px" : "14px",
          color: open ? "#2563eb" : filled ? "#1e293b" : "#64748b",
          background: "white",
        }}
      >
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-4 rounded-2xl text-sm font-semibold text-left flex items-center justify-between outline-none transition-all cursor-pointer bg-white"
          style={{
            border: `1.5px solid ${open ? "#3b82f6" : "#cbd5e1"}`,
            boxShadow: open ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
            color: value ? "#0f172a" : "#64748b",
          }}
        >
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-blue-500" />
            <span>{value || "माध्यम निवडा"}</span>
          </div>
          <ChevronDown className={`size-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 z-50 rounded-2xl overflow-hidden shadow-2xl bg-white border border-slate-200 mt-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3.5 text-sm font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  value === opt ? "bg-blue-50 text-blue-600 font-bold" : "hover:bg-slate-50 text-slate-700 border-b border-slate-100"
                }`}
              >
                <span>{opt}</span>
                {value === opt && <CheckCircle2 className="size-4 text-blue-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Modern Image upload box
function ImageBox({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("फाइल 500KB पेक्षा लहान असावी");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="mb-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
      <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
        <FileSignature className="size-3.5 text-blue-600" />
        {label}
      </p>
      <label className="cursor-pointer block" style={{ width: wide ? "100%" : "200px" }}>
        <div
          className="rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 group"
          style={{ height: wide ? "110px" : "110px" }}
        >
          {value ? (
            <div className="relative w-full h-full p-2 flex items-center justify-center group-hover:opacity-90">
              <img src={value} alt={label} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl">
                <Upload className="size-3.5" /> बदल करा
              </div>
            </div>
          ) : (
            <div className="text-center p-3">
              <Upload className="size-6 text-slate-400 mx-auto mb-1 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
              <p className="text-xs font-bold text-slate-600">चित्र जोडण्यासाठी क्लिक करा</p>
              <p className="text-[10px] text-slate-400 font-medium">PNG / JPG (Max 500KB)</p>
            </div>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </div>
  );
}

const CLASS_OPTIONS = [
  { value: "1st", label: "इयत्ता १ ली (1st)" },
  { value: "2nd", label: "इयत्ता २ री (2nd)" },
  { value: "3rd", label: "इयत्ता ३ री (3rd)" },
  { value: "4th", label: "इयत्ता ४ थी (4th)" },
  { value: "5th", label: "इयत्ता ५ वी (5th)" },
  { value: "6th", label: "इयत्ता ६ वी (6th)" },
  { value: "7th", label: "इयत्ता ७ वी (7th)" },
  { value: "8th", label: "इयत्ता ८ वी (8th)" },
];

export function CCESettings({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
}) {
  const [activeTeacherClass, setActiveTeacherClass] = useState(selectedClass || "1st");
  const [activeTeacherMedium, setActiveTeacherMedium] = useState("मराठी - Marathi");
  const [classTeachersMap, setClassTeachersMap] = useState<
    Record<string, { teacherName: string; signatureUrl: string; medium?: string }>
  >({});

  const [settings, setSettings] = useState({
    schoolName: "",
    address: "",
    udiseCode: "",
    medium: "मराठी - Marathi",
    slogan: "",
    principalName: "",
    schoolLogo: "",
    principalSignature: "",
    subjects: DEFAULT_SUBJECTS,
    isSemiEnglish: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeMediumKey = activeTeacherMedium.toLowerCase().includes("semi") ? "semi" : "marathi";
  const currentKey = `${activeTeacherClass}_${activeMediumKey}`;

  // 1. Load global school settings
  useEffect(() => {
    let isMounted = true;
    const loadGlobal = async () => {
      setLoading(true);
      try {
        let globalData: any = {};
        try {
          const cached = localStorage.getItem("cce_general_school_settings");
          if (cached) globalData = JSON.parse(cached);
        } catch (e) {}

        const genRef = doc(db, "school_settings", "general");
        const genSnap = await getDoc(genRef);
        if (genSnap.exists()) {
          globalData = { ...globalData, ...genSnap.data() };
        }

        if (isMounted) {
          const globalMedium = globalData.medium || "मराठी - Marathi";
          setSettings((prev) => ({
            ...prev,
            schoolName: globalData.schoolName || prev.schoolName || "",
            address: globalData.address || prev.address || "",
            udiseCode: globalData.udiseCode || prev.udiseCode || "",
            medium: globalMedium,
            slogan: globalData.slogan || prev.slogan || "",
            principalName: globalData.principalName || prev.principalName || "",
            schoolLogo: globalData.schoolLogo || prev.schoolLogo || "",
            principalSignature: globalData.principalSignature || prev.principalSignature || "",
          }));
          setActiveTeacherMedium(globalMedium);
        }
      } catch (err) {
        console.error(err);
      }
      if (isMounted) setLoading(false);
    };
    loadGlobal();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch class + medium specific teacher info when activeTeacherClass or activeTeacherMedium changes
  useEffect(() => {
    let isMounted = true;
    const loadClassData = async () => {
      if (classTeachersMap[currentKey] !== undefined) return;
      try {
        // Try specific class + medium doc first
        const specRef = doc(db, "cce_settings", `${activeTeacherClass}_${activeMediumKey}_${academicYear}`);
        const specSnap = await getDoc(specRef);

        let classData: any = {};
        if (specSnap.exists()) {
          classData = specSnap.data();
        } else {
          // Fallback to legacy generic class doc
          const genRef = doc(db, "cce_settings", `${activeTeacherClass}_${academicYear}`);
          const genSnap = await getDoc(genRef);
          if (genSnap.exists()) classData = genSnap.data();
        }

        if (isMounted) {
          setClassTeachersMap((prev) => ({
            ...prev,
            [currentKey]: {
              teacherName: classData.teacherName || "",
              signatureUrl: classData.signatureUrl || "",
              medium: activeTeacherMedium,
            },
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadClassData();
    return () => {
      isMounted = false;
    };
  }, [activeTeacherClass, activeTeacherMedium, academicYear, currentKey, activeMediumKey]);

  const currentTeacher = classTeachersMap[currentKey] || { teacherName: "", signatureUrl: "" };

  const updTeacherName = (v: string) => {
    setClassTeachersMap((prev) => ({
      ...prev,
      [currentKey]: {
        ...(prev[currentKey] || { teacherName: "", signatureUrl: "", medium: activeTeacherMedium }),
        teacherName: v,
      },
    }));
  };

  const updTeacherSignature = (v: string) => {
    setClassTeachersMap((prev) => ({
      ...prev,
      [currentKey]: {
        ...(prev[currentKey] || { teacherName: "", signatureUrl: "", medium: activeTeacherMedium }),
        signatureUrl: v,
      },
    }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const globalIsSemi = settings.medium.toLowerCase().includes("semi");

      // Global settings payload (shared across all classes)
      const globalUpdated = {
        schoolName: settings.schoolName,
        address: settings.address,
        udiseCode: settings.udiseCode,
        medium: settings.medium,
        slogan: settings.slogan,
        principalName: settings.principalName,
        schoolLogo: settings.schoolLogo,
        principalSignature: settings.principalSignature,
        isSemiEnglish: globalIsSemi,
        updatedAt: new Date().toISOString(),
      };

      // Save global settings
      await setDoc(doc(db, "school_settings", "general"), globalUpdated, { merge: true });

      // Save class + medium specific teacher data for all edited/loaded keys
      for (const [key, teacherData] of Object.entries(classTeachersMap)) {
        const parts = key.split("_");
        const cls = parts[0];
        const med = parts[1] || (globalIsSemi ? "semi" : "marathi");

        const classUpdated = {
          ...globalUpdated,
          teacherName: teacherData.teacherName || "",
          signatureUrl: teacherData.signatureUrl || "",
          class: cls,
          medium: med === "semi" ? "सेमी-इंग्रजी - Semi-English" : "मराठी - Marathi",
          isSemiEnglish: med === "semi",
          academicYear,
        };

        // 1. Save specific class + medium doc
        await setDoc(doc(db, "cce_settings", `${cls}_${med}_${academicYear}`), classUpdated, { merge: true });

        // 2. Also save to main class doc for legacy compatibility
        await setDoc(doc(db, "cce_settings", `${cls}_${academicYear}`), classUpdated, { merge: true });

        try {
          const { saveJsonToBunny } = await import("@/lib/bunnyStorage");
          await saveJsonToBunny(`cce_results/${cls}_${med}_${academicYear}_settings.json`, classUpdated);
          await saveJsonToBunny(`cce_results/${cls}_${academicYear}_settings.json`, classUpdated);
        } catch (e) {}
      }

      // Local storage cache updates
      try {
        localStorage.setItem("cce_general_school_settings", JSON.stringify(globalUpdated));
        if (settings.schoolName) localStorage.setItem("schoolName", settings.schoolName);
        if (settings.udiseCode) localStorage.setItem("udiseNumber", settings.udiseCode);
      } catch (e) {}

      localStorage.setItem("cce_selected_medium", globalIsSemi ? "semi" : "marathi");
      window.dispatchEvent(new Event("cce_settings_updated"));
      toast.success(`शाळेची माहिती आणि इयत्ता ${activeTeacherClass} (${activeMediumKey === "semi" ? "सेमी" : "मराठी"}) चे वर्गशिक्षक जतन झाले!`);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const upd = (field: string) => (v: string) =>
    setSettings((prev) => ({ ...prev, [field]: v }));

  if (loading)
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative flex items-center justify-center mb-3">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">शाळेची माहिती लोड होत आहे...</p>
      </div>
    );

  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col font-sans overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Gradient Banner Header */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md border border-white/10"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-blue-200" />
                <h2 className="text-xl font-black tracking-tight text-white">शाळेची माहिती</h2>
              </div>
              <p className="text-xs text-blue-200 font-medium">शाळेची सर्वसाधारण माहिती व वर्गशिक्षक तपशील भरा</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-xl text-xs font-extrabold text-blue-100 border border-white/20 uppercase tracking-wider shadow-inner">
            इयत्ता: {activeTeacherClass} ({activeMediumKey === "semi" ? "सेमी" : "मराठी"})
          </span>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Global School Details Container */}
        <div className="bg-slate-50/60 rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-2">
          <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 className="size-4 text-blue-600" /> शाळेचा मुख्य तपशील
          </h3>

          <FloatInput
            label="शाळेचे नाव"
            value={settings.schoolName}
            onChange={upd("schoolName")}
            required
            icon={Building2}
            placeholder="जिल्हा परिषद शाळा..."
          />
          <FloatInput
            label="UDISE कोड"
            value={settings.udiseCode}
            onChange={upd("udiseCode")}
            required
            icon={Hash}
            placeholder="27350800701"
          />
          <FloatSelect
            label="मुख्य माध्यम (Default Medium)"
            value={settings.medium}
            onChange={(v) => {
              upd("medium")(v);
              setActiveTeacherMedium(v);
            }}
            options={MEDIUM_OPTIONS}
            required
          />
          <FloatInput
            label="पत्ता"
            value={settings.address}
            onChange={upd("address")}
            required
            icon={MapPin}
            placeholder="ता. जि...."
          />
          <FloatInput
            label="मुख्याध्यापक"
            value={settings.principalName}
            onChange={upd("principalName")}
            required
            icon={UserCheck}
            placeholder="श्री/श्रीमती..."
          />
          <FloatInput
            label="घोषवाक्य"
            value={settings.slogan}
            onChange={upd("slogan")}
            icon={Sparkles}
            placeholder="ज्ञान, संस्कार..."
          />
        </div>

        {/* Class + Medium Specific Section: Class Teacher Name & Class Teacher Signature */}
        <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-3xl border border-blue-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/60">
            <div>
              <h3 className="text-sm font-black text-blue-950 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="size-4 text-blue-600" /> वर्गशिक्षक माहिती
              </h3>
              <p className="text-xs text-blue-700 font-bold mt-0.5">इयत्ता व माध्यम निवडून वर्गशिक्षकांचे नाव व सही जोडा</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-slate-600">इयत्ता:</span>
                <select
                  value={activeTeacherClass}
                  onChange={(e) => setActiveTeacherClass(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 font-extrabold text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer border-none"
                >
                  {CLASS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-blue-200 shadow-sm">
                <span className="text-xs font-bold text-slate-600">माध्यम:</span>
                <select
                  value={activeTeacherMedium}
                  onChange={(e) => setActiveTeacherMedium(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 font-extrabold text-xs outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer border-none"
                >
                  {MEDIUM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <FloatInput
            label={`इयत्ता ${activeTeacherClass} (${activeMediumKey === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) वर्गशिक्षकाचे नाव`}
            value={currentTeacher.teacherName}
            onChange={updTeacherName}
            required
            icon={UserCheck}
            placeholder="श्री. / श्रीमती..."
          />

          <div className="pt-1">
            <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileSignature className="size-3.5 text-blue-600" /> इयत्ता {activeTeacherClass} ({activeMediumKey === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) वर्गशिक्षक सही
            </p>
            <label className="cursor-pointer block" style={{ width: "200px" }}>
              <div className="rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all bg-white border-2 border-dashed border-blue-300 hover:border-blue-600 hover:bg-blue-50/50 group h-28">
                {currentTeacher.signatureUrl ? (
                  <div className="relative w-full h-full p-2 flex items-center justify-center group-hover:opacity-90">
                    <img src={currentTeacher.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl">
                      <Upload className="size-3.5" /> सही बदला
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-3">
                    <Upload className="size-6 text-blue-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-blue-900">सही जोडण्यासाठी क्लिक करा</p>
                    <p className="text-[10px] text-slate-400 font-medium">PNG / JPG</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => updTeacherSignature(reader.result as string);
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Global Logos & Signatures Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageBox label="शाळेचा लोगो (Logo)" value={settings.schoolLogo} onChange={upd("schoolLogo")} wide />
          <ImageBox label="मुख्याध्यापक सही" value={settings.principalSignature} onChange={upd("principalSignature")} wide />
        </div>

        {/* Save button */}
        <div className="pt-4 pb-6">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-[0.99] text-white font-extrabold text-base rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-blue-500/25 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>जतन होत आहे...</span>
              </>
            ) : (
              <>
                <Save className="size-5" />
                <span>जतन करा</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
