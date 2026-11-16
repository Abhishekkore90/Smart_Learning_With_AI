import React, { useState } from "react";
import { X, UserPlus, Save, Loader2, User, Phone, MapPin, Calendar, Hash, IdCard } from "lucide-react";
import { toast } from "sonner";
import { createHpcStudent } from "../services/hpcService";
import { CASTE_OPTIONS } from "../data/studentProfileOptions";

interface HpcAddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClass: string;
  defaultDivision?: string;
  academicYear: string;
  medium?: string;
  nextRollNo?: string;
  onStudentAdded: () => void;
}

const ALL_CLASSES = [
  { id: "1st", labelMarathi: "इयत्ता १ ली" },
  { id: "2nd", labelMarathi: "इयत्ता २ री" },
  { id: "3rd", labelMarathi: "इयत्ता ३ री" },
  { id: "4th", labelMarathi: "इयत्ता ४ थी" },
  { id: "5th", labelMarathi: "इयत्ता ५ वी" },
  { id: "6th", labelMarathi: "इयत्ता ६ वी" },
  { id: "7th", labelMarathi: "इयत्ता ७ वी" },
  { id: "8th", labelMarathi: "इयत्ता ८ वी" },
];

const DIVISIONS = ["अ", "ब", "क", "ड", "इ", "फ"];

export const HpcAddStudentModal: React.FC<HpcAddStudentModalProps> = ({
  isOpen,
  onClose,
  defaultClass,
  defaultDivision = "अ",
  academicYear,
  medium = "marathi",
  nextRollNo = "1",
  onStudentAdded,
}) => {
  const [saving, setSaving] = useState(false);

  // Form State
  const [selectedClass, setSelectedClass] = useState(defaultClass || "1st");
  const [division, setDivision] = useState(defaultDivision || "अ");
  const [rollNo, setRollNo] = useState(nextRollNo || "1");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [grNo, setGrNo] = useState("");
  const [saralId, setSaralId] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aparId, setAparId] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [address, setAddress] = useState("");
  const [caste, setCaste] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("कृपया विद्यार्थ्याचे संपूर्ण नाव प्रविष्ट करा.");
      return;
    }

    if (!rollNo.trim()) {
      toast.error("कृपया हजेरी क्रमांक (Roll No.) प्रविष्ट करा.");
      return;
    }

    setSaving(true);
    try {
      await createHpcStudent({
        name: fullName.trim(),
        fullName: fullName.trim(),
        rollNo: rollNo.trim(),
        class: selectedClass,
        division,
        gender,
        medium,
        academicYear,
        dob,
        saralId: saralId.trim(),
        aadhaar: aadhaar.trim(),
        aparId: aparId.trim(),
        fatherName: fatherName.trim(),
        motherName: motherName.trim(),
        parentPhone: parentPhone.trim(),
        address: address.trim(),
        grNo: grNo.trim(),
        caste: caste.trim(),
      });

      toast.success(`${fullName.trim()} - विद्यार्थी यशस्वीरीत्या जोडला गेला!`);
      onStudentAdded();
    } catch (err: any) {
      console.error("Failed to add student:", err);
      toast.error("विद्यार्थी जोडताना त्रुटी आली: " + (err.message || "कृपया पुन्हा प्रयत्न करा."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <UserPlus className="size-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">नवीन विद्यार्थी जोडा (Add Student)</h3>
              <p className="text-xs text-orange-100 font-semibold">
                {ALL_CLASSES.find((c) => c.id === selectedClass)?.labelMarathi} | तुकडी: {division} | वर्ष: {academicYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Class & Roll Info */}
          <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-orange-900 border-b border-orange-200/60 pb-2">
              <Hash className="size-3.5 text-orange-600" />
              <span>वर्ग, तुकडी व हजेरी माहिती</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">वर्ग (इयत्ता) *</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-orange-300 text-xs font-black bg-white text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-orange-400"
                >
                  {ALL_CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.labelMarathi}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">तुकडी *</label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-orange-300 text-xs font-black bg-white text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-orange-400"
                >
                  {DIVISIONS.map((d) => (
                    <option key={d} value={d}>
                      तुकडी {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">हजेरी क्र. (Roll No.) *</label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="उदा. 1"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-orange-300 text-xs font-black bg-white text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">लिंग (Gender) *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-orange-300 text-xs font-black bg-white text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-orange-400"
                >
                  <option value="male">मुलगा (Male)</option>
                  <option value="female">मुलगी (Female)</option>
                  <option value="other">इतर (Other)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Student Identity & IDs */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 border-b border-slate-200 pb-2">
              <User className="size-3.5 text-indigo-600" />
              <span>विद्यार्थ्याची वैयक्तिक माहिती व शासकीय ओळख</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  विद्यार्थ्याचे संपूर्ण नाव (Full Name) * <span className="text-red-500 font-black">[आवश्यक]</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="उदा. जाधव अविराज नंदकुमार / अविराज नंदकुमार जाधव"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="size-3 text-slate-500" />
                  <span>जन्मतारीख (Date of Birth)</span>
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <IdCard className="size-3 text-slate-500" />
                  <span>जनरल रजिस्टर क्र. (G.R. No.)</span>
                </label>
                <input
                  type="text"
                  value={grNo}
                  onChange={(e) => setGrNo(e.target.value)}
                  placeholder="उदा. 1245"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">सरल / स्टुडंट आयडी (SARAL ID)</label>
                <input
                  type="text"
                  value={saralId}
                  onChange={(e) => setSaralId(e.target.value)}
                  placeholder="उदा. 202127210200123"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">आधार क्रमांक (Aadhaar No.)</label>
                <input
                  type="text"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="उदा. 1234 5678 9012"
                  maxLength={14}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">अपार आयडी (APAAR ID / PEN)</label>
                <input
                  type="text"
                  value={aparId}
                  onChange={(e) => setAparId(e.target.value)}
                  placeholder="उदा. 12 अंकी APAAR आयडी"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">जात / प्रवर्ग (Caste / Category)</label>
                <input
                  type="text"
                  list="add-student-caste-list"
                  value={caste}
                  onChange={(e) => setCaste(e.target.value)}
                  placeholder="उदा. मराठा, कुणबी, बौद्ध किंवा निवडा..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
                <datalist id="add-student-caste-list">
                  {CASTE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 3: Parents & Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 border-b border-slate-200 pb-2">
              <Phone className="size-3.5 text-emerald-600" />
              <span>पालक व संपर्क माहिती</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">वडिलांचे / पालकांचे नाव</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="उदा. नंदकुमार जाधव"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">आईचे नाव</label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="उदा. सुनिता जाधव"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">पालकांचा मोबाईल नंबर</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="उदा. 9876543210"
                  maxLength={10}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="size-3 text-slate-500" />
                  <span>पत्ता (Address)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="उदा. मु. पो. शिरूर, जि. पुणे"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-orange-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>जतन होत आहे...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>विद्यार्थी जतन करा</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
