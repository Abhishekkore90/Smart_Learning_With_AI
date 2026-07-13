import { useState, useEffect } from "react";
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
} from "firebase/firestore";
import { ArrowLeft, Plus } from "lucide-react";
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  clearable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value !== undefined && value !== null && value.toString().length > 0;
  return (
    <div className="relative mb-4">
      <label
        className="absolute left-3 transition-all pointer-events-none font-medium z-10"
        style={{
          top: focused || filled ? "-9px" : "14px",
          fontSize: focused || filled ? "11px" : "14px",
          color: focused ? "#3b82f6" : "#64748b",
          background: focused || filled ? "white" : "transparent",
          paddingLeft: focused || filled ? "4px" : "0",
          paddingRight: focused || filled ? "4px" : "0",
        }}
      >
        {label}{required && "*"}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? (placeholder || "") : ""}
        className={`w-full px-4 py-4 rounded-xl text-sm font-medium outline-none transition-all ${clearable ? "pr-10" : ""}`}
        style={{
          background: "transparent",
          border: `1px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
          color: "#1e293b",
        }}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer p-1"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Plain input (no floating label)
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
    <div
      className="rounded-xl overflow-hidden transition-all mb-4"
      style={{
        border: `1px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
        background: "transparent",
      }}
    >
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full px-4 py-4 text-[#1e293b] text-sm font-medium outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

// Image upload box
function ImageBox({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
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
      <label className="cursor-pointer block" style={{ width: "160px" }}>
        <div
          className="rounded-xl flex items-center justify-center overflow-hidden transition-all"
          style={{
            height: "160px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <p className="text-xs text-center text-slate-400">Clik to add image</p>
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

  const set = <K extends keyof StudentDetails>(key: K, val: StudentDetails[K]) =>
    setDetails((prev) => ({ ...prev, [key]: val }));

  const academicYear = localStorage.getItem("cce_academic_year") || "2025-2026";

  // Load students
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("role", "==", "student"),
      where("class", "==", selectedClass)
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
          academicYear: dd.academicYear || academicYear,
          role: "student",
        } as StudentRecord;
      });
      data.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"));
      setStudents(data);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedClass, academicYear]);

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
        // prefill from base record
        setDetails({
          ...emptyDetails(),
          phone: (student as any).phone || "",
          fatherName: student.parentName || "",
        });
      }
    } catch {
      setDetails(emptyDetails());
    }
  };

  const saveDetails = async () => {
    if (!editingStudent) return;
    if (!editName.trim() || !editRollNo.trim()) {
      toast.error("कृपया सर्व आवश्यक माहिती भरा (नाव, रोल नंबर)");
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "student_details", editingStudent.id), {
        ...details,
        studentId_ref: editingStudent.id,
        class: selectedClass,
        academicYear,
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "users", editingStudent.id), {
        fullName: editName.trim(),
        name: editName.trim(),
        rollNo: editRollNo.trim(),
        gender: editGender,
        photoUrl: editPhotoUrl,
        phone: details.phone || "",
        aadhar: details.aadhar || "",
        address: details.address || "",
        dob: details.dob || "",
        religion: details.religion || "",
        caste: details.caste || "",
        motherTongue: details.motherTongue || "",
        updatedAt: new Date().toISOString(),
      });

      toast.success("विद्यार्थी माहिती जतन झाली!");
      setEditingStudent(null);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const addStudent = async () => {
    if (!newName.trim() || !newRollNo.trim() || !newGender) {
      toast.error("कृपया सर्व आवश्यक माहिती भरा (नाव, रोल नंबर, लिंग)");
      return;
    }
    setSaving(true);
    try {
      const newStudentRef = doc(collection(db, "users"));
      await setDoc(newStudentRef, {
        fullName: newName.trim(),
        name: newName.trim(),
        rollNo: newRollNo.trim(),
        gender: newGender,
        photoUrl: newPhotoUrl,
        class: selectedClass,
        role: "student",
        academicYear,
        createdAt: new Date().toISOString(),
      });

      // Keep student_details empty record for backward schema compatibility
      await setDoc(doc(db, "student_details", newStudentRef.id), {
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
        studentId_ref: newStudentRef.id,
        class: selectedClass,
        academicYear,
        updatedAt: new Date().toISOString(),
      });

      toast.success("विद्यार्थी यशस्वीरित्या जोडला गेला!");
      // Reset fields
      setNewName("");
      setNewRollNo("");
      setNewGender("Male");
      setNewPhotoUrl("");
      setIsAdding(false);
    } catch (err: any) {
      toast.error("त्रुटी: " + err.message);
    }
    setSaving(false);
  };

  // ─── ADD STUDENT VIEW ───
  if (isAdding) {
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setIsAdding(false)}
            className="text-slate-800 hover:text-slate-650 transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">नवीन विद्यार्थी जोडा</h2>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-4">
          <FloatInput
            label="नाव"
            value={newName}
            onChange={setNewName}
            required
            placeholder="सिद्धांत आनंदराव सूर्यवंशी"
          />

          <FloatInput
            label="रोल नंबर"
            value={newRollNo}
            onChange={setNewRollNo}
            required
            type="number"
            placeholder="1"
          />

          <div>
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">
              लिंग
            </label>
            <div className="flex items-center gap-8 pl-1">
              {[
                { label: "पुरुष", value: "Male" },
                { label: "स्त्री", value: "Female" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setNewGender(opt.value)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      borderColor: "#3b82f6",
                      background: newGender === opt.value ? "#3b82f6" : "transparent",
                    }}
                  >
                    {newGender === opt.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-slate-800 text-sm font-medium">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <ImageBox
            label="फोटो"
            value={newPhotoUrl}
            onChange={setNewPhotoUrl}
          />
        </div>

        {/* Fixed save button */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white to-transparent z-10">
          <button
            onClick={addStudent}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? "जतन होत आहे..." : "जतन करा"}
          </button>
        </div>
      </div>
    );
  }

  // ─── EDIT FORM VIEW ───
  if (editingStudent) {
    const idx = students.indexOf(editingStudent);
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col relative select-none overflow-hidden"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <button
            onClick={() => setEditingStudent(null)}
            className="text-slate-800 hover:text-slate-650 transition-colors cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-base font-bold text-slate-800">विद्यार्थी संपादन करा</h2>
        </div>

        {/* Student name badge */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center border border-blue-500 flex-shrink-0">
              {editRollNo || idx + 1}
            </div>
            <span className="text-slate-800 text-[14px] font-bold">
              {editName}
            </span>
          </div>
          <span className="text-slate-500 text-xs font-semibold">
            {classMarathiMap[selectedClass] || selectedClass}
          </span>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-28 space-y-4">
          <FloatInput
            label="नाव"
            value={editName}
            onChange={setEditName}
            required
            placeholder="सिद्धांत आनंदराव सूर्यवंशी"
          />

          <FloatInput
            label="रोल नंबर"
            value={editRollNo}
            onChange={setEditRollNo}
            required
            type="number"
            placeholder="1"
          />

          <div>
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">
              लिंग
            </label>
            <div className="flex items-center gap-8 pl-1 mb-4">
              {[
                { label: "पुरुष", value: "Male" },
                { label: "स्त्री", value: "Female" },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setEditGender(opt.value)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      borderColor: "#3b82f6",
                      background: editGender === opt.value ? "#3b82f6" : "transparent",
                    }}
                  >
                    {editGender === opt.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-slate-800 text-sm font-medium">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* नोंदणी क्रमांक */}
          <FloatInput
            label="नोंदणी क्रमांक"
            value={details.registrationNo}
            onChange={(v) => set("registrationNo", v)}
          />

          {/* जन्म तारीख */}
          <FloatInput
            label="जन्म तारीख"
            value={details.dob}
            onChange={(v) => set("dob", v)}
            placeholder="DD MMM YYYY"
          />

          {/* पत्ता */}
          <FloatInput
            label="पत्ता"
            value={details.address}
            onChange={(v) => set("address", v)}
          />

          {/* फोन नंबर */}
          <FloatInput
            label="फोन नंबर"
            value={details.phone}
            onChange={(v) => set("phone", v)}
            type="tel"
          />

          {/* आधार क्रमांक */}
          <FloatInput
            label="आधार क्रमांक"
            value={details.aadhar}
            onChange={(v) => set("aadhar", v)}
          />

          {/* स्टुडन्ट आयडी */}
          <PlainInput
            value={details.studentId}
            onChange={(v) => set("studentId", v)}
            placeholder="स्टुडन्ट आयडी"
          />

          {/* अपार आयडी */}
          <PlainInput
            value={details.aparId}
            onChange={(v) => set("aparId", v)}
            placeholder="अपार आयडी"
          />

          {/* उंची + वजन */}
          <div className="grid grid-cols-2 gap-3">
            <PlainInput
              value={details.height}
              onChange={(v) => set("height", v)}
              placeholder="उंची"
            />
            <PlainInput
              value={details.weight}
              onChange={(v) => set("weight", v)}
              placeholder="वजन"
            />
          </div>

          {/* धर्म */}
          <FloatInput
            label="धर्म"
            value={details.religion}
            onChange={(v) => set("religion", v)}
            clearable
          />

          {/* जात */}
          <FloatInput
            label="जात"
            value={details.caste}
            onChange={(v) => set("caste", v)}
            clearable
          />

          {/* विद्यार्थी किती वेळा आजारी पडला */}
          <div>
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">
              विद्यार्थी किती वेळा आजारी पडला आहे?
            </label>
            <PlainInput
              type="number"
              value={details.sickCount}
              onChange={(v) => set("sickCount", v)}
              placeholder="0"
            />
          </div>

          {/* आई/पालक माहिती */}
          <div>
            <p className="text-slate-800 text-sm font-bold mt-4 mb-2 ml-1">आई/पालक माहिती</p>
            <div className="space-y-3">
              <FloatInput
                label="नाव"
                value={details.motherName}
                onChange={(v) => set("motherName", v)}
                required
              />
              <PlainInput
                value={details.motherEducation}
                onChange={(v) => set("motherEducation", v)}
                placeholder="शिक्षण"
              />
              <FloatInput
                label="व्यवसाय"
                value={details.motherOccupation}
                onChange={(v) => set("motherOccupation", v)}
              />
            </div>
          </div>

          {/* वडील/पालक माहिती */}
          <div>
            <p className="text-slate-800 text-sm font-bold mt-4 mb-2 ml-1">वडील/पालक माहिती</p>
            <div className="space-y-3">
              <FloatInput
                label="नाव"
                value={details.fatherName}
                onChange={(v) => set("fatherName", v)}
                required
              />
              <PlainInput
                value={details.fatherEducation}
                onChange={(v) => set("fatherEducation", v)}
                placeholder="शिक्षण"
              />
              <FloatInput
                label="व्यवसाय"
                value={details.fatherOccupation}
                onChange={(v) => set("fatherOccupation", v)}
              />
            </div>
          </div>

          {/* भावंडांची संख्या */}
          <FloatInput
            label="भावंडांची संख्या"
            value={details.siblingsCount}
            onChange={(v) => set("siblingsCount", v)}
            type="number"
          />

          {/* भावंडांचे वय */}
          <PlainInput
            value={details.siblingsAge}
            onChange={(v) => set("siblingsAge", v)}
            placeholder="भावंडांचे वय"
          />

          {/* मातृभाषा */}
          <FloatInput
            label="मातृभाषा"
            value={details.motherTongue}
            onChange={(v) => set("motherTongue", v)}
          />

          {/* प्रदेश प्रकार */}
          <div>
            <label className="text-[11px] text-slate-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">
              प्रदेश प्रकार
            </label>
            <div className="flex items-center gap-8 pl-1 mb-4">
              {([
                { label: "ग्रामीण", value: "ग्रामीण" },
                { label: "शहरी", value: "शहरी" },
              ] as const).map((opt) => (
                <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => set("regionType", opt.value)}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                    style={{
                      borderColor: "#3b82f6",
                      background: details.regionType === opt.value ? "#3b82f6" : "transparent",
                    }}
                  >
                    {details.regionType === opt.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-slate-800 text-sm font-medium">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <ImageBox
            label="फोटो"
            value={editPhotoUrl}
            onChange={setEditPhotoUrl}
          />
        </div>

        {/* Fixed save button */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 pt-3 bg-gradient-to-t from-white to-transparent z-10">
          <button
            onClick={saveDetails}
            disabled={saving}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
          >
            {saving ? "जतन होत आहे..." : "जतन करा"}
          </button>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-xl min-h-[600px] flex flex-col relative select-none"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-850 flex items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">विद्यार्थ्यांची माहिती</h2>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-xs text-slate-400 font-bold">विद्यार्थी लोड होत आहेत...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-400 font-bold text-sm">अद्याप कोणताही विद्यार्थी जोडला नाही</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {students.map((student, idx) => (
              <button
                key={student.id}
                onClick={() => openEdit(student)}
                className="w-full flex items-center justify-between px-3 py-3.5 rounded-xl hover:bg-slate-50 active:scale-[0.995] transition-all border border-transparent hover:border-slate-100 cursor-pointer text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-blue-50 text-blue-600 border border-blue-100 font-bold text-sm flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                    {student.rollNo || idx + 1}
                  </div>
                  <span className="text-[15px] font-medium text-slate-850 group-hover:text-blue-600 transition-colors">
                    {student.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FAB for adding students */}
      <button
        onClick={() => setIsAdding(true)}
        className="absolute bottom-6 right-6 size-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-200/50 flex items-center justify-center hover:scale-105 transition-all cursor-pointer border border-blue-500/30 z-30"
        title="विद्यार्थी जोडा"
      >
        <Plus className="size-7 stroke-[2.5]" />
      </button>
    </div>
  );
}
