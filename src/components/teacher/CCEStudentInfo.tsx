import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
// @ts-ignore
import { matchStudentClassAndMedium } from "@/result/firestoreMarksHelper";
// @ts-ignore
import { getTeacherId, matchStudentTeacherClassAndMedium } from "@/lib/teacherIsolationHelper";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  ArrowLeft,
  Plus,
  Search,
  User,
  Trash2,
  Edit2,
  Calendar,
  Phone,
  CreditCard,
  MapPin,
  Heart,
  Save,
  Users,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

interface StudentRecord {
  id: string;
  name: string;
  fullName?: string;
  rollNo: string;
  gender: string;
  parentName?: string;
  photoUrl?: string;
  class: string;
  academicYear?: string;
  role: string;
}

interface StudentDetails {
  registrationNo: string;
  dob: string;
  address: string;
  phone: string;
  aadhar: string;
  studentId: string;
  aparId: string;
  height: string;
  weight: string;
  religion: string;
  caste: string;
  sickCount: string;
  motherName: string;
  motherEducation: string;
  motherOccupation: string;
  fatherName: string;
  fatherEducation: string;
  fatherOccupation: string;
  siblingsCount: string;
  siblingsAge: string;
  motherTongue: string;
  regionType: "ग्रामीण" | "शहरी";
}

const emptyDetails = (): StudentDetails => ({
  registrationNo: "",
  dob: "",
  address: "",
  phone: "",
  aadhar: "",
  studentId: "",
  aparId: "",
  height: "",
  weight: "",
  religion: "",
  caste: "",
  sickCount: "0",
  motherName: "",
  motherEducation: "",
  motherOccupation: "",
  fatherName: "",
  fatherEducation: "",
  fatherOccupation: "",
  siblingsCount: "0",
  siblingsAge: "",
  motherTongue: "",
  regionType: "ग्रामीण",
});

const classMarathiMap: Record<string, string> = {
  "1st": "पहिली",
  "2nd": "दुसरी",
  "3rd": "तिसरी",
  "4th": "चौथी",
  "5th": "पाचवी",
  "6th": "सहावी",
  "7th": "सातवी",
  "8th": "आठवी",
  "9th": "नववी",
  "10th": "दहावी",
};

// Floating label input component
function FloatInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  clearable,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  clearable?: boolean;
  icon?: any;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value !== undefined && value !== null && value.toString().length > 0;
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
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? placeholder || "" : ""}
          className={`w-full ${Icon ? "pl-11" : "px-4"} ${clearable ? "pr-10" : "pr-4"} py-4 rounded-2xl text-sm font-semibold outline-none transition-all`}
          style={{
            background: focused ? "#f8fafc" : "#ffffff",
            border: `1.5px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
            boxShadow: focused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
            color: "#0f172a",
          }}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer p-1"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// Plain input
function PlainInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-4">
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full px-4 py-4 rounded-2xl text-slate-800 text-sm font-semibold outline-none transition-all"
        style={{
          background: focused ? "#f8fafc" : "#ffffff",
          border: `1.5px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
          boxShadow: focused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
        }}
      />
    </div>
  );
}

// Image upload box
function ImageBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
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
      <p className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">{label}</p>
      <label className="cursor-pointer block" style={{ width: "160px" }}>
        <div className="rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 group h-36">
          {value ? (
            <div className="relative w-full h-full p-2 flex items-center justify-center group-hover:opacity-90">
              <img src={value} alt={label} className="w-full h-full object-contain rounded-xl" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1 rounded-xl">
                <Upload className="size-3.5" /> फोटो बदला
              </div>
            </div>
          ) : (
            <div className="text-center p-3">
              <Upload className="size-6 text-slate-400 mx-auto mb-1 group-hover:text-blue-600 transition-colors" />
              <p className="text-xs font-bold text-slate-600">फोटो जोडण्यासाठी क्लिक करा</p>
            </div>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </div>
  );
}

export function CCEStudentInfo({
  selectedClass,
  onBack,
}: {
  selectedClass: string;
  onBack: () => void;
}) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null);
  const [details, setDetails] = useState<StudentDetails>(emptyDetails());
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add form fields
  const [newName, setNewName] = useState("");
  const [newRollNo, setNewRollNo] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  // Edit form fields
  const [editName, setEditName] = useState("");
  const [editRollNo, setEditRollNo] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");

  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi">(() => {
    const stored = localStorage.getItem("cce_selected_medium");
    return stored === "semi" ? "semi" : "marathi";
  });

  const set = <K extends keyof StudentDetails>(key: K, val: StudentDetails[K]) =>
    setDetails((prev) => ({ ...prev, [key]: val }));

  const academicYear = localStorage.getItem("cce_academic_year") || "2025-2026";

  // Load students
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const dd = d.data();
        return {
          id: d.id,
          name: dd.fullName || dd.name || "",
          fullName: dd.fullName || dd.name || "",
          rollNo: dd.rollNo || "",
          gender: dd.gender || "",
          parentName: dd.parentName || "",
          photoUrl: dd.photoUrl || "",
          class: dd.class || selectedClass,
          medium: dd.medium,
          isSemiEnglish: dd.isSemiEnglish,
          academicYear: dd.academicYear || academicYear,
          role: "student",
        } as StudentRecord & { medium?: string; isSemiEnglish?: boolean; class?: string };
      });
      data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"));
      setStudents(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedClass, academicYear]);

  const { user, profile } = useAuth();
  const teacherId = getTeacherId(user, profile);

  const filteredStudents = useMemo(() => {
    let list = students.filter((s: any) => {
      return matchStudentTeacherClassAndMedium(s, teacherId, selectedClass, selectedMedium);
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.toString().includes(q))
    );
  }, [students, searchQuery, selectedClass, selectedMedium, teacherId]);

  const openEdit = async (student: StudentRecord) => {
    setEditingStudent(student);
    setEditName(student.name || student.fullName || "");
    setEditRollNo(student.rollNo || "");
    setEditGender(student.gender || "Male");
    setEditPhotoUrl(student.photoUrl || "");
    try {
      const ref = doc(db, "student_details", student.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setDetails({ ...emptyDetails(), ...snap.data() } as StudentDetails);
      } else {
        setDetails(emptyDetails());
      }
    } catch (e) {
      setDetails(emptyDetails());
    }
  };

  const handleAddStudent = async () => {
    if (!newName.trim()) {
      toast.error("कृपया विद्यार्थ्याचे नाव टाका");
      return;
    }
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, "users"), {
        fullName: newName.trim(),
        name: newName.trim(),
        rollNo: newRollNo.trim(),
        gender: newGender,
        photoUrl: newPhotoUrl,
        class: selectedClass,
        medium: selectedMedium,
        isSemiEnglish: selectedMedium === "semi",
        teacherId,
        createdById: teacherId,
        academicYear,
        role: "student",
        createdAt: new Date().toISOString(),
      });
      toast.success(`विद्यार्थी (${selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) जोडला गेला!`);
      setIsAdding(false);
      setNewName("");
      setNewRollNo("");
      setNewGender("Male");
      setNewPhotoUrl("");
    } catch (err: any) {
      toast.error("विद्यार्थी जोडणे अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const handleDeleteStudent = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`तुम्हाला नक्की ${name} ची नोंद हटवायची आहे का?`)) return;
    try {
      await deleteDoc(doc(db, "users", id));
      toast.success("विद्यार्थी हटवला!");
    } catch (err: any) {
      toast.error("हटवणे अयशस्वी: " + err.message);
    }
  };

  const saveDetails = async () => {
    if (!editingStudent) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", editingStudent.id), {
        fullName: editName.trim(),
        name: editName.trim(),
        rollNo: editRollNo.trim(),
        gender: editGender,
        photoUrl: editPhotoUrl,
        medium: selectedMedium,
        isSemiEnglish: selectedMedium === "semi",
      });

      await setDoc(
        doc(db, "student_details", editingStudent.id),
        { ...details, updatedAt: new Date().toISOString() },
        { merge: true }
      );

      toast.success("विद्यार्थ्याची माहिती जतन झाली!");
      setEditingStudent(null);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  // ─── ADD STUDENT VIEW ───
  if (isAdding) {
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col font-sans overflow-hidden select-none"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdding(false)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">नवीन विद्यार्थी जोडा</h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} साठी विद्यार्थी तपशील भरा</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          <FloatInput
            label="विद्यार्थ्याचे पूर्ण नाव"
            value={newName}
            onChange={setNewName}
            required
            icon={User}
            placeholder="उदा. समृद्धी सचिन साळुंखे पाटील"
          />
          <FloatInput
            label="हजेरी क्रमांक (Roll No.)"
            value={newRollNo}
            onChange={setNewRollNo}
            type="number"
            icon={Calendar}
            placeholder="1"
          />

          <div>
            <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-2">लिंग</label>
            <div className="flex items-center gap-4">
              {[
                { label: "👦 मुलगा (Boy)", value: "Male" },
                { label: "👧 मुलगी (Girl)", value: "Female" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewGender(opt.value)}
                  className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-sm border cursor-pointer transition-all ${
                    newGender === opt.value
                      ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <ImageBox label="विद्यार्थ्याचा फोटो (Photo)" value={newPhotoUrl} onChange={setNewPhotoUrl} />

          <div className="pt-4">
            <button
              onClick={handleAddStudent}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-base rounded-2xl transition-all cursor-pointer shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {saving ? "जोडले जात आहे..." : "विद्यार्थी जोडा"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── EDIT STUDENT PROFILE VIEW ───
  if (editingStudent) {
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col font-sans overflow-hidden relative select-none"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setEditingStudent(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white">{editingStudent.name}</h2>
              <p className="text-xs text-blue-200 font-medium">विद्यार्थी प्रोफाईल व सर्व माहिती संपादन</p>
            </div>
          </div>
          <span className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white font-black text-sm border border-white/20">
            {editRollNo || "—"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-6">
          {/* मूलभूत माहिती */}
          <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="size-4 text-blue-600" /> मूलभूत माहिती
            </h3>
            <FloatInput label="विद्यार्थ्याचे नाव" value={editName} onChange={setEditName} required icon={User} />
            <FloatInput label="हजेरी क्र." value={editRollNo} onChange={setEditRollNo} type="number" icon={Calendar} />

            <div>
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-2">लिंग</label>
              <div className="flex items-center gap-4">
                {[
                  { label: "👦 मुलगा", value: "Male" },
                  { label: "👧 मुलगी", value: "Female" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEditGender(opt.value)}
                    className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs border cursor-pointer transition-all ${
                      editGender === opt.value
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* नोंदणी व ओळखपत्र माहिती */}
          <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="size-4 text-blue-600" /> ओळख व नोंदणी क्रमांक
            </h3>
            <FloatInput label="General Register No." value={details.registrationNo} onChange={(v) => set("registrationNo", v)} />
            <FloatInput label="Student ID (सरल आयडी)" value={details.studentId} onChange={(v) => set("studentId", v)} />
            <FloatInput label="APAR ID" value={details.aparId} onChange={(v) => set("aparId", v)} />
            <FloatInput label="आधार क्रमांक" value={details.aadhar} onChange={(v) => set("aadhar", v)} icon={CreditCard} />
            <FloatInput label="जन्म तारीख" value={details.dob} onChange={(v) => set("dob", v)} placeholder="DD/MM/YYYY" icon={Calendar} />
          </div>

          {/* संपर्क व घरचा पत्ता */}
          <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="size-4 text-blue-600" /> संपर्क व पत्ता
            </h3>
            <FloatInput label="मोबाईल नंबर" value={details.phone} onChange={(v) => set("phone", v)} type="tel" icon={Phone} />
            <FloatInput label="पूर्ण पत्ता" value={details.address} onChange={(v) => set("address", v)} icon={MapPin} />
          </div>

          {/* आईची व वडिलांची माहिती */}
          <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-4 text-blue-600" /> पालक तपशील
            </h3>
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-blue-900">आईची माहिती</p>
              <FloatInput label="आईचे नाव" value={details.motherName} onChange={(v) => set("motherName", v)} />
              <FloatInput label="शिक्षण" value={details.motherEducation} onChange={(v) => set("motherEducation", v)} />
              <FloatInput label="व्यवसाय" value={details.motherOccupation} onChange={(v) => set("motherOccupation", v)} />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-xs font-extrabold text-blue-900">वडिलांची माहिती</p>
              <FloatInput label="वडिलांचे नाव" value={details.fatherName} onChange={(v) => set("fatherName", v)} required />
              <FloatInput label="शिक्षण" value={details.fatherEducation} onChange={(v) => set("fatherEducation", v)} />
              <FloatInput label="व्यवसाय" value={details.fatherOccupation} onChange={(v) => set("fatherOccupation", v)} />
            </div>
          </div>

          <ImageBox label="विद्यार्थ्याचा फोटो" value={editPhotoUrl} onChange={setEditPhotoUrl} />
        </div>

        {/* Sticky glassmorphism save bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30">
          <button
            onClick={saveDetails}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-base rounded-2xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
          >
            <Save className="size-5" />
            <span>{saving ? "जतन होत आहे..." : "जतन करा"}</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Gradient Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={onBack}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md border border-white/10"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <User className="size-5 text-blue-200" /> विद्यार्थ्यांची माहिती
              </h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} विद्यार्थी यादी व तपशील व्यवस्थापन</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/15 backdrop-blur-md p-1 rounded-2xl border border-white/20">
              <button
                onClick={() => {
                  setSelectedMedium("marathi");
                  localStorage.setItem("cce_selected_medium", "marathi");
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  selectedMedium === "marathi" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
                }`}
              >
                मराठी
              </button>
              <button
                onClick={() => {
                  setSelectedMedium("semi");
                  localStorage.setItem("cce_selected_medium", "semi");
                }}
                className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                  selectedMedium === "semi" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
                }`}
              >
                सेमी-इंग्रजी
              </button>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 font-extrabold text-xs rounded-2xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              <span>विद्यार्थी जोडा</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roster Controls Bar */}
      <div className="px-6 pt-4 pb-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="विद्यार्थ्याचे नाव किंवा हजेरी क्र. शोधा..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
              ×
            </button>
          )}
        </div>
        <span className="px-3 py-1.5 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-xl border border-blue-100 whitespace-nowrap">
          एकूण: {students.length}
        </span>
      </div>

      {/* Student List Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            <span className="text-xs text-slate-400 font-bold">विद्यार्थी यादी लोड होत आहे...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-400 font-bold text-sm">कोणताही विद्यार्थी सापडला नाही</p>
          </div>
        ) : (
          filteredStudents.map((student, idx) => (
            <div
              key={student.id}
              onClick={() => openEdit(student)}
              className="group flex items-center justify-between p-4 bg-white hover:bg-blue-50/40 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  {student.rollNo || idx + 1}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    {student.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                    <span>इयत्ता: {selectedClass}</span>
                    {student.gender && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
                        {student.gender === "Male" ? "👦 मुलगा" : "👧 मुलगी"}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => openEdit(student)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                  title="संपादित करा"
                >
                  <Edit2 className="size-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteStudent(e, student.id, student.name)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="हटवा"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAdding(true)}
        className="absolute bottom-6 right-6 size-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20 z-30"
        title="विद्यार्थी जोडा"
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
