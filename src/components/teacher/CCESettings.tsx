import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft, ChevronDown } from "lucide-react";
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
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative mb-4">
      <label
        className="absolute left-3 transition-all pointer-events-none font-bold z-10"
        style={{
          top: focused || filled ? "-11px" : "14px",
          fontSize: focused || filled ? "13px" : "14px",
          color: focused ? "#2563eb" : "#334155",
          background: "white",
          paddingLeft: "4px",
          paddingRight: "4px",
        }}
      >
        {label}{required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? (placeholder || "") : ""}
        className="w-full px-4 py-4 rounded-xl text-sm font-medium outline-none transition-all"
        style={{
          background: "transparent",
          border: `1px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
          color: "#1e293b",
        }}
      />
    </div>
  );
}

// Floating label dropdown for माध्यम
function FloatSelect({
  label, value, onChange, options, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative mb-4">
      <label
        className="absolute left-3 transition-all pointer-events-none font-bold z-10"
        style={{
          top: filled || open ? "-11px" : "14px",
          fontSize: filled || open ? "13px" : "14px",
          color: open ? "#2563eb" : "#334155",
          background: "white",
          paddingLeft: "4px",
          paddingRight: "4px",
        }}
      >
        {label}{required && "*"}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-4 rounded-xl text-sm font-medium text-left flex items-center justify-between outline-none transition-all cursor-pointer"
        style={{
          background: "transparent",
          border: `1px solid ${open ? "#3b82f6" : "#cbd5e1"}`,
          color: value ? "#1e293b" : "#64748b",
        }}
      >
        <span>{value || ""}</span>
        <ChevronDown className="size-4" style={{ color: "#64748b" }} />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{ top: "calc(100% + 4px)", background: "white", border: "1px solid #e2e8f0" }}
        >
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm transition-colors cursor-pointer"
              style={{
                background: value === opt ? "#eff6ff" : "transparent",
                color: value === opt ? "#2563eb" : "#334155",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Image upload box
function ImageBox({
  label, value, onChange, wide,
}: {
  label: string; value: string; onChange: (v: string) => void; wide?: boolean;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error("फाइल 500KB पेक्षा लहान असावी"); return; }
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2 text-slate-600">{label}</p>
      <label className="cursor-pointer block" style={{ width: wide ? "100%" : "160px" }}>
        <div
          className="rounded-xl flex items-center justify-center overflow-hidden transition-all"
          style={{
            height: wide ? "90px" : "110px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <p className="text-xs text-center text-slate-400">Click to add image</p>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </div>
  );
}

export function CCESettings({ selectedClass, academicYear, onBack }: {
  selectedClass: string; academicYear: string; onBack: () => void;
}) {
  const [settings, setSettings] = useState({
    schoolName: "", address: "", udiseCode: "",
    medium: "मराठी - Marathi", slogan: "",
    teacherName: "", teacherMobile: "", principalName: "",
    schoolLogo: "", signatureUrl: "", principalSignature: "",
    subjects: DEFAULT_SUBJECTS,
    isSemiEnglish: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let globalData: any = {};

        // 1. Load global settings (shared across all classes)
        try {
          const cached = localStorage.getItem("cce_general_school_settings");
          if (cached) globalData = JSON.parse(cached);
        } catch (e) {}

        const genRef = doc(db, "school_settings", "general");
        const genSnap = await getDoc(genRef);
        if (genSnap.exists()) {
          globalData = { ...globalData, ...genSnap.data() };
        }

        // 2. Load class-specific settings for selectedClass (Teacher Name & Teacher Signature)
        const ref = doc(db, "cce_settings", `${selectedClass}_${academicYear}`);
        const snap = await getDoc(ref);
        const classData = snap.exists() ? snap.data() : {};

        setSettings(prev => ({
          ...prev,
          // Global fields: same for all classes
          schoolName: globalData.schoolName || prev.schoolName || "",
          address: globalData.address || prev.address || "",
          udiseCode: globalData.udiseCode || prev.udiseCode || "",
          medium: globalData.medium || prev.medium || "मराठी - Marathi",
          slogan: globalData.slogan || prev.slogan || "",
          principalName: globalData.principalName || prev.principalName || "",
          schoolLogo: globalData.schoolLogo || prev.schoolLogo || "",
          principalSignature: globalData.principalSignature || prev.principalSignature || "",

          // Class-specific fields: blank for new classes, unique per class
          teacherName: classData.teacherName || "",
          signatureUrl: classData.signatureUrl || "",
        }));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [selectedClass, academicYear]);

  const save = async () => {
    setSaving(true);
    try {
      const isSemi = settings.medium.toLowerCase().includes("semi");

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
        isSemiEnglish: isSemi,
        updatedAt: new Date().toISOString(),
      };

      // Save global settings for ALL classes
      await setDoc(doc(db, "school_settings", "general"), globalUpdated, { merge: true });

      // Class-specific payload (Teacher Name & Teacher Signature for this class)
      const classUpdated = {
        ...globalUpdated,
        teacherName: settings.teacherName,
        signatureUrl: settings.signatureUrl,
        class: selectedClass,
        academicYear,
      };
      await setDoc(doc(db, "cce_settings", `${selectedClass}_${academicYear}`), classUpdated, { merge: true });

      // Save to Bunny Storage CDN for global sharing
      try {
        const { saveJsonToBunny } = await import("@/lib/bunnyStorage");
        await saveJsonToBunny("cce_results/general_school_settings.json", globalUpdated);
        await saveJsonToBunny(`cce_results/${selectedClass}_${academicYear}_settings.json`, classUpdated);
      } catch (e) {}

      // Save to local cache
      try {
        localStorage.setItem("cce_general_school_settings", JSON.stringify(globalUpdated));
        if (settings.schoolName) localStorage.setItem("schoolName", settings.schoolName);
        if (settings.udiseCode) localStorage.setItem("udiseNumber", settings.udiseCode);
      } catch (e) {}

      localStorage.setItem("cce_selected_medium", isSemi ? "semi" : "marathi");
      toast.success(`इयत्ता ${selectedClass} साठी वर्गशिक्षक आणि शाळेची माहिती जतन झाली!`);
    } catch (err: any) { toast.error("जतन अयशस्वी: " + err.message); }
    setSaving(false);
  };

  const upd = (field: string) => (v: string) =>
    setSettings(prev => ({ ...prev, [field]: v }));

  if (loading) return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">शाळेची माहिती</h2>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">इयत्ता : {selectedClass}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Global School Info (Shared for All Classes) */}
        <FloatInput
          label="शाळेचे नाव" value={settings.schoolName}
          onChange={upd("schoolName")} required
          placeholder="जिल्हा परिषद शाळा..."
        />
        <FloatInput
          label="UDISE कोड" value={settings.udiseCode}
          onChange={upd("udiseCode")} required
          placeholder="27350800701"
        />
        <FloatSelect
          label="माध्यम" value={settings.medium}
          onChange={upd("medium")} options={MEDIUM_OPTIONS} required
        />
        <FloatInput
          label="पत्ता" value={settings.address}
          onChange={upd("address")} required
          placeholder="ता. जि...."
        />
        <FloatInput
          label="मुख्याध्यापक" value={settings.principalName}
          onChange={upd("principalName")} required
          placeholder="श्री/श्रीमती..."
        />
        <FloatInput
          label="घोषवाक्य" value={settings.slogan}
          onChange={upd("slogan")}
          placeholder="ज्ञान, संस्कार..."
        />

        {/* Class-Specific Section: Class Teacher Name & Class Teacher Signature */}
        <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-4 my-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-blue-900 uppercase tracking-wider">इयत्ता {selectedClass} साठी वर्गशिक्षक माहिती</h3>
            <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">वर्गासाठी स्वतंत्र</span>
          </div>

          <FloatInput
            label="वर्गशिक्षकाचे नाव" value={settings.teacherName}
            onChange={upd("teacherName")} required
            placeholder="श्री. / श्रीमती..."
          />

          <div className="space-y-2 pt-1">
            <p className="text-slate-700 text-[15px] font-medium">वर्गशिक्षक सही</p>
            <label className="cursor-pointer block" style={{ width: "160px" }}>
              <div
                className="rounded-xl flex items-center justify-center overflow-hidden transition-all bg-white"
                style={{ height: "110px", border: "1px solid #cbd5e1" }}
              >
                {settings.signatureUrl ? (
                  <img src={settings.signatureUrl} alt="Signature" className="w-full h-full object-contain" />
                ) : (
                  <p className="text-xs text-center text-slate-400">Click to add image</p>
                )}
              </div>
              <input
                type="file" accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => upd("signatureUrl")(reader.result as string);
                  reader.readAsDataURL(file);
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Global Logos & Signatures */}
        <ImageBox
          label="शाळेचा लोगो"
          value={settings.schoolLogo}
          onChange={upd("schoolLogo")}
          wide
        />
        <ImageBox
          label="मुख्याध्यापक सही"
          value={settings.principalSignature}
          onChange={upd("principalSignature")}
        />

        {/* Save button */}
        <div className="pb-6 pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20 disabled:opacity-50"
          >
            {saving ? "जतन होत आहे..." : "जतन करा"}
          </button>
        </div>
      </div>
    </div>
  );
}
