import React, { useState, useEffect } from "react";
import {
  School,
  User,
  UserCheck,
  MapPin,
  Milestone,
  GraduationCap,
  Save,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface PinGateProps {
  sectionKey: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function clearUnlockedPinSections() {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("teacher_setup_unlocked");
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("unlocked_section_")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error clearing unlocked pin sections", e);
    }
  }
}

export function PinGate({ sectionKey, children, enabled = true }: PinGateProps) {
  const { user, profile } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [savingSetup, setSavingSetup] = useState<boolean>(false);

  // Profile setup states
  const [teacherName, setTeacherName] = useState<string>("");
  const [principalName, setPrincipalName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [udiseNumber, setUdiseNumber] = useState<string>("");
  const [taluka, setTaluka] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [center, setCenter] = useState<string>("");
  const [academicYear, setAcademicYear] = useState<string>("2026-27");

  const storageKey = `unlocked_section_${sectionKey}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check global or per-section unlocked state
      const globalUnlocked = sessionStorage.getItem("teacher_setup_unlocked") === "true" || localStorage.getItem("teacher_setup_completed") === "true";
      const sectionState = sessionStorage.getItem(storageKey) === "true";
      
      // Check if user already has school/teacher profile filled
      const hasSavedSchool = Boolean(
        profile?.schoolName ||
        localStorage.getItem("teacher_school_name") ||
        localStorage.getItem("teaching_diary_school_profile") ||
        localStorage.getItem("sqaaf_teacher_profile")
      );

      if (globalUnlocked || sectionState || hasSavedSchool) {
        setIsUnlocked(true);
      }

      // Load saved setup values from logged-in user's profile first
      if (profile) {
        if (profile.fullName || profile.teacherName)
          setTeacherName(profile.fullName || profile.teacherName || "");
        if (profile.principalName || profile.cookName || profile.swayampakiName)
          setPrincipalName(
            profile.principalName ||
              profile.cookName ||
              profile.swayampakiName ||
              ""
          );
        if (profile.schoolName) setSchoolName(profile.schoolName || "");
        if (profile.udise) setUdiseNumber(profile.udise || "");
        if (profile.taluka) setTaluka(profile.taluka || "");
        if (profile.district) setDistrict(profile.district || "");
        if (profile.center) setCenter(profile.center || "");
        if (profile.academicYear)
          setAcademicYear(profile.academicYear || "2026-27");
      } else {
        setTeacherName(localStorage.getItem("teacher_name") || "");
        setPrincipalName(localStorage.getItem("teacher_principal_name") || "");
        setSchoolName(localStorage.getItem("teacher_school_name") || "");
        setUdiseNumber(localStorage.getItem("teacher_udise") || "");
        setTaluka(localStorage.getItem("teacher_taluka") || "");
        setDistrict(localStorage.getItem("teacher_district") || "");
        setCenter(localStorage.getItem("teacher_center") || "");
        setAcademicYear(localStorage.getItem("cce_academic_year") || "2026-27");
      }
    }
  }, [storageKey, profile]);

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSetup(true);

    const updatedData = {
      fullName: teacherName,
      teacherName: teacherName,
      principalName: principalName,
      cookName: principalName,
      swayampakiName: principalName,
      schoolName: schoolName,
      udise: udiseNumber,
      taluka: taluka,
      district: district,
      center: center,
      academicYear: academicYear,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (user) {
        await setDoc(doc(db, "teachers", user.uid), updatedData, { merge: true });
        await setDoc(doc(db, "users", user.uid), updatedData, { merge: true });
      }

      const savedProfile = localStorage.getItem("sqaaf_teacher_profile");
      let merged = { ...updatedData, role: "teacher" };
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          merged = { ...parsed, ...updatedData };
        } catch (e) {}
      }
      localStorage.setItem("sqaaf_teacher_profile", JSON.stringify(merged));
      localStorage.setItem("teacher_name", teacherName);
      localStorage.setItem("teacher_principal_name", principalName);
      localStorage.setItem("teacher_school_name", schoolName);
      localStorage.setItem("teacher_udise", udiseNumber);
      localStorage.setItem("teacher_taluka", taluka);
      localStorage.setItem("teacher_district", district);
      localStorage.setItem("teacher_center", center);
      localStorage.setItem("cce_academic_year", academicYear);

      sessionStorage.setItem("teacher_setup_unlocked", "true");
      localStorage.setItem("teacher_setup_completed", "true");
      sessionStorage.setItem(storageKey, "true");
      setIsUnlocked(true);
      toast.success("माहिती जतन केली / Setup Info Saved!");
    } catch (err) {
      console.error("Error saving setup info:", err);
      toast.error("माहिती जतन करताना त्रुटी आली.");
    } finally {
      setSavingSetup(false);
    }
  };

  const handleSkipOrContinue = () => {
    sessionStorage.setItem("teacher_setup_unlocked", "true");
    localStorage.setItem("teacher_setup_completed", "true");
    sessionStorage.setItem(storageKey, "true");
    setIsUnlocked(true);
  };

  if (!enabled || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center py-8 sm:py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-xl bg-white border border-slate-200/90 rounded-[2.5rem] p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-100/50 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-100/50 rounded-full blur-3xl -z-10" />

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex size-14 sm:size-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white items-center justify-center shadow-lg shadow-amber-200 mx-auto">
            <School className="size-7 sm:size-8" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            माहिती भरा / School & Teacher Info Setup
          </h3>
          <p className="text-xs font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
            कृपया तुमची व शाळेची माहिती भरा. ही माहिती सर्व अहवाल, संचिका व प्रमाणपत्रांवर आपोआप वापरली जाईल.
            <br />
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
              (Fill your school & teacher details to auto-populate reports and records.)
            </span>
          </p>
        </div>

        {/* Setup Form */}
        <form
          onSubmit={handleSaveSetup}
          className="space-y-4 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar"
        >
          {/* 1. School Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              शाळेचे नाव (School Name) *
            </label>
            <div className="relative">
              <School className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="शाळेचे नाव टाका"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
                required
              />
            </div>
          </div>

          {/* 2. Teacher Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              शिक्षकाचे नाव (Teacher Name) *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="शिक्षकाचे नाव टाका"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
                required
              />
            </div>
          </div>

          {/* 3. Principal Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              मुख्याध्यापकांचे नाव (Principal Name)
            </label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="मुख्याध्यापकांचे नाव टाका"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* 4. Center */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              केंद्र (Center)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={center}
                onChange={(e) => setCenter(e.target.value)}
                placeholder="केंद्र टाका"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* 5. Taluka */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              तालुका (Taluka)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={taluka}
                onChange={(e) => setTaluka(e.target.value)}
                placeholder="तालुका टाका"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* 6. District */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              जिल्हा (District)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="जिल्हा टाका"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* 7. UDISE Number (Optional school reference) */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              UDISE NUMBER (ऐच्छिक / Optional)
            </label>
            <div className="relative">
              <Milestone className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={udiseNumber}
                onChange={(e) => setUdiseNumber(e.target.value)}
                placeholder="११-अंकी UDISE कोड (ऐच्छिक)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>

          {/* 8. Academic Year */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
              शैक्षणिक वर्ष (Academic Year)
            </label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-3.5 size-4 text-slate-400" />
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-amber-500 focus:bg-white transition-all text-slate-800"
              >
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
                <option value="2024-25">2024-25</option>
                <option value="2023-24">2023-24</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={savingSetup}
              className="w-full sm:flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingSetup ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span>माहिती जतन करा आणि सुरू करा / Save Info</span>
            </button>

            <button
              type="button"
              onClick={handleSkipOrContinue}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>थेट पुढे जा / Continue</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
