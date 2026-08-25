import { useState, useEffect, useMemo, useRef } from "react";
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
  Save,
  Users,
  Upload,
  Hash,
  Activity,
  Globe,
  Home,
  Shield,
  Printer,
  Eye,
  FileText,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const RELIGION_OPTIONS = [
  "हिंदू",
  "इस्लाम",
  "मुस्लिम",
  "शीख",
  "ख्रिश्चन",
  "बौद्ध",
  "जैन",
  "इतर",
];

export const CASTE_OPTIONS = [
  "OPEN (ओपन)",
  "SC (अनुसूचित जाती)",
  "ST (अनुसूचित जमाती)",
  "OBC (इतर मागास वर्ग)",
  "SBC (विशेष मागास प्रवर्ग)",
  "VJ (भटक्या जमाती - अ)",
  "NTB (भटक्या जमाती - ब)",
  "NTC (भटक्या जमाती - क)",
  "NTD (भटक्या जमाती - ड)",
  "OTHER (इतर)",
];

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

export interface StudentDetails {
  registrationNo: string; // 1. नोंदणी क्रमांक
  dob: string; // 2. जन्मतारीख
  address: string; // 3. पत्ता
  phone: string; // 4. फोन नंबर / मोबाईल
  aadhar: string; // 5. आधार कार्ड नं.
  studentId: string; // 6. स्टुडंट आयडी (SARAL)
  aparId: string; // 7. अपार आयडी (APAAR ID)
  height: string; // 8. उंची (cm)
  weight: string; // 9. वजन (kg)
  religion: string; // 10. धर्म
  caste: string; // 11. जात / संवर्ग
  sickCount: string;
  motherName: string; // 12. आईचे नाव
  motherEducation: string; // आईचे शिक्षण
  motherOccupation: string; // आईचा व्यवसाय
  fatherName: string; // 13. वडिलांचे नाव
  fatherEducation: string; // वडिलांचे शिक्षण
  fatherOccupation: string; // वडिलांचा व्यवसाय
  siblingsCount: string;
  siblingsAge: string;
  motherTongue: string; // 14. मातृभाषा
  regionType: "ग्रामीण" | "शहरी"; // 15. प्रदेश प्रकार
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

// Floating label select component for Religion and Caste dropdowns
function FloatSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  icon?: any;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value !== undefined && value !== null && value.toString().length > 0;

  const allOptions = useMemo(() => {
    if (value && !options.includes(value)) {
      return [value, ...options];
    }
    return options;
  }, [value, options]);

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
          <div className="absolute left-4 text-slate-400 pointer-events-none z-10">
            <Icon className="size-4" />
          </div>
        )}
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full ${Icon ? "pl-11" : "px-4"} pr-10 py-4 rounded-2xl text-sm font-semibold outline-none transition-all appearance-none cursor-pointer`}
          style={{
            background: focused ? "#f8fafc" : "#ffffff",
            border: `1.5px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
            boxShadow: focused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
            color: value ? "#0f172a" : "#94a3b8",
          }}
        >
          <option value="" disabled hidden>
            {placeholder || "-- निवडा --"}
          </option>
          {allOptions.map((opt) => (
            <option key={opt} value={opt} className="text-slate-900 font-semibold py-1">
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
          <ChevronDown className="size-4" />
        </div>
      </div>
    </div>
  );
}

// Floating label date picker component for Birthdate
function FloatDatePicker({
  label,
  value,
  onChange,
  required,
  icon: Icon = Calendar,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  icon?: any;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert DD/MM/YYYY or DD0MM0YYYY or free text to YYYY-MM-DD for native <input type="date">
  const toIsoDate = (val: string) => {
    if (!val) return "";
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

    const parts = clean.split(/[\/\.-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
    if (/^\d{8}$/.test(clean)) {
      const d = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      const y = clean.slice(4, 8);
      return `${y}-${m}-${d}`;
    }
    return "";
  };

  // Convert YYYY-MM-DD to DD/MM/YYYY for display and storing
  const toDisplayDate = (isoVal: string) => {
    if (!isoVal) return "";
    const parts = isoVal.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
    return isoVal;
  };

  const isoValue = toIsoDate(value);
  const displayValue = value
    ? value.includes("-") && value.split("-")[0].length === 4
      ? toDisplayDate(value)
      : value
    : "";
  const filled = Boolean(displayValue);

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === "function") {
        try {
          inputRef.current.showPicker();
        } catch (e) {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative mb-4 cursor-pointer" onClick={handleOpenPicker}>
      <label
        className="absolute left-3.5 transition-all pointer-events-none font-bold z-10 rounded-md px-1.5"
        style={{
          top: focused || filled ? "-10px" : "16px",
          fontSize: focused || filled ? "12px" : "14px",
          color: focused ? "#2563eb" : filled ? "#1e293b" : "#64748b",
          background: "white",
        }}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-4 text-blue-600 pointer-events-none z-10">
            <Icon className="size-4" />
          </div>
        )}
        <input
          ref={inputRef}
          type="date"
          value={isoValue}
          onChange={(e) => {
            const rawIso = e.target.value;
            if (!rawIso) {
              onChange("");
              return;
            }
            const formattedDate = toDisplayDate(rawIso);
            onChange(formattedDate);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full pl-11 pr-4 py-4 rounded-2xl text-sm font-semibold outline-none transition-all cursor-pointer opacity-0 absolute inset-0 z-20"
        />
        <input
          type="text"
          readOnly
          value={displayValue}
          placeholder="DD/MM/YYYY (कॅलेंडर निवडा)"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full ${Icon ? "pl-11" : "px-4"} pr-10 py-4 rounded-2xl text-sm font-bold outline-none transition-all cursor-pointer`}
          style={{
            background: focused ? "#f8fafc" : "#ffffff",
            border: `1.5px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
            boxShadow: focused ? "0 0 0 4px rgba(59, 130, 246, 0.12)" : "none",
            color: displayValue ? "#0f172a" : "#94a3b8",
          }}
        />
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none z-10">
          <Calendar className="size-4" />
        </div>
      </div>
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
  const [studentDetailsMap, setStudentDetailsMap] = useState<Record<string, StudentDetails>>({});
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [studentPageTab, setStudentPageTab] = useState<"view" | "edit">("view");

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<StudentDetails>(emptyDetails());
  const [newDetails, setNewDetails] = useState<StudentDetails>(emptyDetails());
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

  const printRef = useRef<HTMLDivElement>(null);

  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi">(() => {
    const stored = localStorage.getItem("cce_selected_medium");
    return stored === "semi" ? "semi" : "marathi";
  });

  const set = <K extends keyof StudentDetails>(key: K, val: StudentDetails[K]) =>
    setDetails((prev) => ({ ...prev, [key]: val }));

  const setNew = <K extends keyof StudentDetails>(key: K, val: StudentDetails[K]) =>
    setNewDetails((prev) => ({ ...prev, [key]: val }));

  const academicYear = localStorage.getItem("cce_academic_year") || "2025-2026";

  // Load students
  useEffect(() => {
    setLoading(true);
    const currentTeacherId = getTeacherId();
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
          teacherId: dd.teacherId || dd.createdById,
          academicYear: dd.academicYear || academicYear,
          role: "student",
        } as StudentRecord & { medium?: string; isSemiEnglish?: boolean; class?: string; teacherId?: string };
      });
      const filtered = data.filter((s) => matchStudentClassAndMedium(s, selectedClass, selectedMedium, currentTeacherId));
      filtered.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"));
      setStudents(filtered);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedClass, selectedMedium, academicYear]);

  // Load student_details for all students in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "student_details"), (snap) => {
      const map: Record<string, StudentDetails> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { ...emptyDetails(), ...d.data() } as StudentDetails;
      });
      setStudentDetailsMap(map);
    });
    return () => unsub();
  }, []);

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

  // Open dedicated separate page for selected student
  const openStudentPage = async (student: StudentRecord, mode: "view" | "edit" = "view") => {
    setSelectedStudent(student);
    setStudentPageTab(mode);
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
        dob: newDetails.dob || "",
        birthDate: newDetails.dob || "",
        religion: newDetails.religion || "",
        caste: newDetails.caste || "",
        category: newDetails.caste || "",
        class: selectedClass,
        medium: selectedMedium,
        isSemiEnglish: selectedMedium === "semi",
        teacherId,
        createdById: teacherId,
        academicYear,
        role: "student",
        createdAt: new Date().toISOString(),
      });

      // Save all 15 student details fields to student_details collection
      await setDoc(
        doc(db, "student_details", docRef.id),
        {
          ...newDetails,
          birthDate: newDetails.dob || "",
          fatherName: newDetails.fatherName || (newName.trim().split(" ").length > 1 ? newName.trim().split(" ").slice(1).join(" ") : ""),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      toast.success(`विद्यार्थी (${selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) व संपूर्ण माहिती जोडली गेली!`);
      setIsAdding(false);
      setNewName("");
      setNewRollNo("");
      setNewGender("Male");
      setNewPhotoUrl("");
      setNewDetails(emptyDetails());
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
      await deleteDoc(doc(db, "student_details", id));
      toast.success("विद्यार्थी हटवला!");
    } catch (err: any) {
      toast.error("हटवणे अयशस्वी: " + err.message);
    }
  };

  const saveDetails = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", selectedStudent.id), {
        fullName: editName.trim(),
        name: editName.trim(),
        rollNo: editRollNo.trim(),
        gender: editGender,
        photoUrl: editPhotoUrl,
        dob: details.dob || "",
        birthDate: details.dob || "",
        religion: details.religion || "",
        caste: details.caste || "",
        category: details.caste || "",
        medium: selectedMedium,
        isSemiEnglish: selectedMedium === "semi",
      });

      await setDoc(
        doc(db, "student_details", selectedStudent.id),
        { ...details, birthDate: details.dob || "", updatedAt: new Date().toISOString() },
        { merge: true }
      );

      toast.success("विद्यार्थ्याची संपूर्ण माहिती जतन झाली!");
      setStudentPageTab("view");
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const handlePrintProfile = () => {
    window.print();
  };

  // Helper render function for Student Details Form Sections
  const renderDetailsFormSections = (
    currentDetails: StudentDetails,
    updateFn: <K extends keyof StudentDetails>(key: K, val: StudentDetails[K]) => void
  ) => (
    <>
      {/* 1. नोंदणी व शासकीय ओळखपत्र माहिती */}
      <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2">
        <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <CreditCard className="size-4 text-blue-600" /> नोंदणी व ओळख क्रमांक (IDs)
        </h3>
        <FloatInput label="General Register No. (नोंदणी क्रमांक)" value={currentDetails.registrationNo} onChange={(v) => updateFn("registrationNo", v)} icon={Hash} placeholder="उदा. 1042" />
        <FloatDatePicker label="जन्म तारीख (Birthdate)" value={currentDetails.dob} onChange={(v) => updateFn("dob", v)} icon={Calendar} />
        <FloatInput label="Student ID (सरल आयडी)" value={currentDetails.studentId} onChange={(v) => updateFn("studentId", v)} icon={CreditCard} placeholder="उदा. 201827..." />
        <FloatInput label="APAR ID (अपार आयडी)" value={currentDetails.aparId} onChange={(v) => updateFn("aparId", v)} icon={Shield} placeholder="उदा. APAAR-890..." />
        <FloatInput label="आधार क्रमांक (Aadhaar No)" value={currentDetails.aadhar} onChange={(v) => updateFn("aadhar", v)} icon={CreditCard} placeholder="उदा. 1234 5678 9012" />
      </div>

      {/* 2. वैयक्तिक, सामाजिक व शारीरिक माहिती */}
      <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-3">
        <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Activity className="size-4 text-blue-600" /> धर्म, जात, शारीरिक व इतर माहिती
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <FloatSelect
            label="धर्म (Religion)"
            value={currentDetails.religion}
            onChange={(v) => updateFn("religion", v)}
            options={RELIGION_OPTIONS}
            placeholder="उदा. हिंदू"
          />
          <FloatSelect
            label="जात / संवर्ग (Caste)"
            value={currentDetails.caste}
            onChange={(v) => updateFn("caste", v)}
            options={CASTE_OPTIONS}
            placeholder="उदा. मराठा / OBC"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <FloatInput label="मातृभाषा (Mother Tongue)" value={currentDetails.motherTongue} onChange={(v) => updateFn("motherTongue", v)} icon={Globe} placeholder="उदा. मराठी" />
          <div>
            <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-2">प्रदेश प्रकार (Area Type)</label>
            <div className="flex items-center gap-3">
              {[
                { label: "🌾 ग्रामीण", value: "ग्रामीण" },
                { label: "🏙️ शहरी", value: "शहरी" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFn("regionType", opt.value as "ग्रामीण" | "शहरी")}
                  className={`flex-1 py-3.5 px-3 rounded-2xl font-bold text-xs border cursor-pointer transition-all ${
                    currentDetails.regionType === opt.value
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
        <div className="grid grid-cols-2 gap-3 pt-1">
          <FloatInput label="उंची (Height cm)" value={currentDetails.height} onChange={(v) => updateFn("height", v)} type="number" placeholder="उदा. 120" />
          <FloatInput label="वजन (Weight kg)" value={currentDetails.weight} onChange={(v) => updateFn("weight", v)} type="number" placeholder="उदा. 22" />
        </div>
      </div>

      {/* 3. संपर्क व घरचा पत्ता */}
      <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2">
        <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <MapPin className="size-4 text-blue-600" /> संपर्क व पत्ता
        </h3>
        <FloatInput label="मोबाईल नंबर (Phone No)" value={currentDetails.phone} onChange={(v) => updateFn("phone", v)} type="tel" icon={Phone} placeholder="उदा. 9876543210" />
        <FloatInput label="पूर्ण पत्ता (Full Address)" value={currentDetails.address} onChange={(v) => updateFn("address", v)} icon={Home} placeholder="उदा. मु. पो. तासगाव, जि. सांगली" />
      </div>

      {/* 4. आई व वडिलांची माहिती */}
      <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Users className="size-4 text-blue-600" /> आई-वडिल व पालक तपशील
        </h3>
        <div className="space-y-2">
          <p className="text-xs font-extrabold text-blue-900 flex items-center gap-1">👩 आईची माहिती</p>
          <FloatInput label="आईचे नाव (Mother Name)" value={currentDetails.motherName} onChange={(v) => updateFn("motherName", v)} placeholder="उदा. सुनिता" />
          <div className="grid grid-cols-2 gap-2">
            <FloatInput label="शिक्षण" value={currentDetails.motherEducation} onChange={(v) => updateFn("motherEducation", v)} placeholder="उदा. B.A." />
            <FloatInput label="व्यवसाय" value={currentDetails.motherOccupation} onChange={(v) => updateFn("motherOccupation", v)} placeholder="उदा. गृहिणी" />
          </div>
        </div>
        <div className="space-y-2 pt-3 border-t border-slate-200">
          <p className="text-xs font-extrabold text-blue-900 flex items-center gap-1">👨 वडिलांची माहिती</p>
          <FloatInput label="वडिलांचे नाव (Father Name)" value={currentDetails.fatherName} onChange={(v) => updateFn("fatherName", v)} placeholder="उदा. सचिन साळुंखे" />
          <div className="grid grid-cols-2 gap-2">
            <FloatInput label="शिक्षण" value={currentDetails.fatherEducation} onChange={(v) => updateFn("fatherEducation", v)} placeholder="उदा. B.Com" />
            <FloatInput label="व्यवसाय" value={currentDetails.fatherOccupation} onChange={(v) => updateFn("fatherOccupation", v)} placeholder="उदा. शेतकरी / नोकरी" />
          </div>
        </div>
      </div>
    </>
  );

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
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} साठी विद्यार्थी संपूर्ण तपशील भरा</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-28">
          {/* मूलभूत माहिती */}
          <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 space-y-2">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="size-4 text-blue-600" /> मूलभूत माहिती
            </h3>
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
          </div>

          {/* extended 15 details sections */}
          {renderDetailsFormSections(newDetails, setNew)}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30">
          <button
            onClick={handleAddStudent}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-base rounded-2xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
          >
            <Plus className="size-5" />
            <span>{saving ? "जोडले जात आहे..." : "विद्यार्थी जोडा (माहिती जतन करा)"}</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── DEDICATED SEPARATE FULL PAGE FOR SELECTED STUDENT DETAILS ───
  if (selectedStudent) {
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200/90 shadow-2xl min-h-[650px] flex flex-col font-sans overflow-hidden relative select-none"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Banner Top */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-6 py-5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setSelectedStudent(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md border border-white/10"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{selectedStudent.name}</span>
                <span className="text-xs px-2.5 py-0.5 bg-white/20 rounded-full font-bold">
                  {selectedStudent.gender === "Male" ? "👦 मुलगा" : "👧 मुलगी"}
                </span>
              </h2>
              <p className="text-xs text-blue-200 font-medium">इयत्ता {selectedClass} • सविस्तर विद्यार्थी नोंद माहिती पत्रक</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/15 backdrop-blur-md p-1 rounded-2xl border border-white/20">
              <button
                onClick={() => setStudentPageTab("view")}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  studentPageTab === "view" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
                }`}
              >
                <Eye className="size-3.5" /> सविस्तर पत्रक
              </button>
              <button
                onClick={() => setStudentPageTab("edit")}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  studentPageTab === "edit" ? "bg-white text-blue-900 shadow-md" : "text-blue-100 hover:text-white"
                }`}
              >
                <Edit2 className="size-3.5" /> माहिती संपादन
              </button>
            </div>
            <button
              onClick={handlePrintProfile}
              className="p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center border border-white/10"
              title="माहिती पत्रक प्रिंट करा"
            >
              <Printer className="size-5" />
            </button>
          </div>
        </div>

        {/* View Profile Sheet Tab */}
        {studentPageTab === "view" && (
          <div ref={printRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-20">
            {/* Student Header Card */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                  {selectedStudent.photoUrl ? (
                    <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-10 text-white/50" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{selectedStudent.name}</h3>
                  <p className="text-xs text-blue-300 font-bold mt-1 flex items-center gap-3">
                    <span>इयत्ता: <b>{selectedClass}</b></span>
                    <span>हजेरी क्र.: <b>{selectedStudent.rollNo || "—"}</b></span>
                    <span>सत्र: <b>द्वितीय सत्र</b></span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStudentPageTab("edit")}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="size-4" /> माहिती बदला
                </button>
              </div>
            </div>

            {/* 15 Fields Clean Grid Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: 📜 नोंदणी व शासकीय ओळख आयडी */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <CreditCard className="size-4 text-blue-600" /> १. नोंदणी व शासकीय आयडी (IDs)
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">1. General Register No. (नोंदणी क्र.):</span>
                    <span className="font-black text-blue-900">{details.registrationNo || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">2. जन्मतारीख (DOB):</span>
                    <span className="font-black text-slate-800">{details.dob || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">3. Student ID (सरल आयडी):</span>
                    <span className="font-black text-slate-800">{details.studentId || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">4. APAR ID (अपार आयडी):</span>
                    <span className="font-black text-slate-800">{details.aparId || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-bold">5. आधार कार्ड क्रमांक:</span>
                    <span className="font-black text-slate-800">{details.aadhar || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 🕉️ धर्म, जात व शारीरिक माहिती */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Activity className="size-4 text-blue-600" /> २. धर्म, जात व शारीरिक माहिती
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">6. धर्म (Religion):</span>
                    <span className="font-black text-slate-800">{details.religion || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">7. जात / संवर्ग (Caste):</span>
                    <span className="font-black text-slate-800">{details.caste || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">8. मातृभाषा (Mother Tongue):</span>
                    <span className="font-black text-slate-800">{details.motherTongue || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">9. प्रदेश प्रकार (Area Type):</span>
                    <span className="font-black text-blue-900">{details.regionType || "ग्रामीण"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-bold">10. उंची व वजन:</span>
                    <span className="font-black text-slate-800">
                      {details.height || details.weight ? `${details.height || "—"} cm | ${details.weight || "—"} kg` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: 📞 संपर्क व पत्ता */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <MapPin className="size-4 text-blue-600" /> ३. संपर्क व घरचा पत्ता
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200/60">
                    <span className="text-slate-500 font-bold">11. मोबाईल नंबर:</span>
                    <span className="font-black text-blue-900">{details.phone || "—"}</span>
                  </div>
                  <div className="py-1.5">
                    <span className="text-slate-500 font-bold block mb-1">12. पूर्ण पत्ता:</span>
                    <span className="font-bold text-slate-900 bg-white p-2.5 rounded-xl border border-slate-200 block leading-relaxed">
                      {details.address || "पत्ता भरलेला नाही"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: 👨‍👩‍👧 पालक माहिती */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Users className="size-4 text-blue-600" /> ४. पालक तपशील
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                    <span className="font-black text-blue-900 block">13. 👩 आईची माहिती</span>
                    <p className="text-slate-800 font-bold">नाव: <b>{details.motherName || "—"}</b></p>
                    <p className="text-slate-500">शिक्षण: {details.motherEducation || "—"} | व्यवसाय: {details.motherOccupation || "—"}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-1">
                    <span className="font-black text-blue-900 block">14. 👨 वडिलांची माहिती</span>
                    <p className="text-slate-800 font-bold">नाव: <b>{details.fatherName || "—"}</b></p>
                    <p className="text-slate-500">शिक्षण: {details.fatherEducation || "—"} | व्यवसाय: {details.fatherOccupation || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Tab */}
        {studentPageTab === "edit" && (
          <div className="flex-1 overflow-y-auto px-6 py-6 pb-28 space-y-6">
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

              <ImageBox label="विद्यार्थ्याचा फोटो" value={editPhotoUrl} onChange={setEditPhotoUrl} />
            </div>

            {/* Extended 15 Details Sections */}
            {renderDetailsFormSections(details, set)}
          </div>
        )}

        {/* Sticky glassmorphic save bar when editing */}
        {studentPageTab === "edit" && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 z-30">
            <button
              onClick={saveDetails}
              disabled={saving}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-extrabold text-base rounded-2xl transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2"
            >
              <Save className="size-5" />
              <span>{saving ? "जतन होत आहे..." : "सर्व बदल जतन करा"}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── MAIN STUDENT ROSTER VIEW ───
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
          filteredStudents.map((student, idx) => {
            return (
              <div
                key={student.id}
                onClick={() => openStudentPage(student, "view")}
                className="group flex items-center justify-between p-4 bg-white hover:bg-blue-50/40 rounded-2xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                    {student.rollNo || idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                      <span>{student.name}</span>
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
                    onClick={() => openStudentPage(student, "view")}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="सविस्तर माहिती पाहा"
                  >
                    <Eye className="size-3.5" />
                    <span>सविस्तर माहिती</span>
                  </button>
                  <button
                    onClick={() => openStudentPage(student, "edit")}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    title="माहिती संपादन"
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
            );
          })
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
