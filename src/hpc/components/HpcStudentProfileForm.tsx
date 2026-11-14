import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  ArrowLeft,
  User,
  Heart,
  Smile,
  Users,
  CheckCircle2,
  Sparkles,
  Camera,
  Home,
  Check,
  Loader2,
  Building2,
  CalendarCheck,
  GraduationCap,
  Phone,
  Calendar,
  Shield,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  HpcStudentProfile,
  HpcStageId,
} from "../types/hpc";
import {
  getHpcStudentById,
  getHpcStudentProfile,
  saveHpcStudentProfile,
  getHpcSchoolSettings,
  getHpcStudentAttendance,
  StudentInfoSummary,
} from "../services/hpcService";
import { SELF_ASSESSMENT_OPTIONS } from "../data/hpcRubrics";

interface HpcStudentProfileFormProps {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  onBack?: () => void;
  onSaved?: () => void;
}

export const ATTENDANCE_MONTHS = [
  { key: "june", labelMarathi: "जून", defaultWorkingDays: 22, term: 1 },
  { key: "july", labelMarathi: "जुलै", defaultWorkingDays: 25, term: 1 },
  { key: "august", labelMarathi: "ऑगस्ट", defaultWorkingDays: 24, term: 1 },
  { key: "september", labelMarathi: "सप्टेंबर", defaultWorkingDays: 21, term: 1 },
  { key: "october", labelMarathi: "ऑक्टोबर", defaultWorkingDays: 18, term: 1 },
  { key: "november", labelMarathi: "नोव्हेंबर", defaultWorkingDays: 19, term: 2 },
  { key: "december", labelMarathi: "डिसेंबर", defaultWorkingDays: 24, term: 2 },
  { key: "january", labelMarathi: "जानेवारी", defaultWorkingDays: 22, term: 2 },
  { key: "february", labelMarathi: "फेब्रुवारी", defaultWorkingDays: 20, term: 2 },
  { key: "march", labelMarathi: "मार्च", defaultWorkingDays: 24, term: 2 },
  { key: "april", labelMarathi: "एप्रिल", defaultWorkingDays: 6, term: 2 },
];

export const BLOOD_GROUPS = ["A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-", "माहित नाही"];
export const GENDERS = [
  { id: "male", label: "मुलगा (Boy)" },
  { id: "female", label: "मुलगी (Girl)" },
  { id: "other", label: "इतर (Other)" },
];

export function HpcStudentProfileForm({
  studentId,
  academicYear,
  stageId,
  classId,
  onBack,
  onSaved,
}: HpcStudentProfileFormProps) {
  // Tab State: 'a1' (School & Teacher) vs 'a2' (Attendance & Interests)
  const [activeTab, setActiveTab] = useState<"a1" | "a2">("a2");

  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---------------- PART A(1) STATE ----------------
  // School Details
  const [schoolName, setSchoolName] = useState("");
  const [udiseNumber, setUdiseNumber] = useState("");
  const [cluster, setCluster] = useState("");
  const [taluka, setTaluka] = useState("");
  const [district, setDistrict] = useState("");
  const [headmasterName, setHeadmasterName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");

  // Student Basic Details
  const [fullName, setFullName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [division, setDivision] = useState("अ");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [caste, setCaste] = useState("");
  const [category, setCategory] = useState("");
  const [saralId, setSaralId] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [aparId, setAparId] = useState("");

  // Parent Details
  const [parentName, setParentName] = useState("");
  const [parentOccupation, setParentOccupation] = useState("");
  const [parentEducation, setParentEducation] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // ---------------- PART A(2) STATE ----------------
  // Attendance
  const [workingDays, setWorkingDays] = useState<Record<string, number>>(() =>
    Object.fromEntries(ATTENDANCE_MONTHS.map((m) => [m.key, m.defaultWorkingDays]))
  );
  const [attendedDays, setAttendedDays] = useState<Record<string, number>>(() =>
    Object.fromEntries(ATTENDANCE_MONTHS.map((m) => [m.key, 0]))
  );

  // Me & My Surroundings (मी व माझा परिसर)
  const [age, setAge] = useState("");
  const [birthday, setBirthday] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [familyDescription, setFamilyDescription] = useState("");
  const [ambition, setAmbition] = useState("");
  const [friendsText, setFriendsText] = useState("");

  // Favorites
  const [favoriteColor, setFavoriteColor] = useState("");
  const [favoriteFlower, setFavoriteFlower] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteGame, setFavoriteGame] = useState("");
  const [favoriteAnimal, setFavoriteAnimal] = useState("");
  const [favoriteSubject, setFavoriteSubject] = useState("");

  // Hobbies & Reflections
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [otherHobby, setOtherHobby] = useState("");
  const [regularHomeChores, setRegularHomeChores] = useState("");
  const [studentSelfReflection, setStudentSelfReflection] = useState("");
  const [parentCollaborationNotes, setParentCollaborationNotes] = useState("");

  // Load existing profile, school info & student records
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);

      // 1. Fetch School Settings
      const schoolSettings = await getHpcSchoolSettings();
      if (isMounted && schoolSettings) {
        setSchoolName(schoolSettings.schoolName || "");
        setUdiseNumber(schoolSettings.udiseNumber || schoolSettings.udise || "");
        setCluster(schoolSettings.cluster || schoolSettings.kendra || "");
        setTaluka(schoolSettings.taluka || "");
        setDistrict(schoolSettings.district || "");
        setHeadmasterName(schoolSettings.headmasterName || schoolSettings.hmName || "");
        setTeacherName(schoolSettings.teacherName || "");
        setTeacherPhone(schoolSettings.teacherPhone || schoolSettings.phone || "");
      }

      // 2. Fetch Student Summary
      const st = await getHpcStudentById(studentId);
      if (!isMounted) return;
      setStudent(st);

      if (st) {
        setFullName(st.fullName || st.name || "");
        setRollNo(st.rollNo || "0");
        setDivision(st.division || "अ");
        setGender(st.gender || "male");
        setDob(st.dob || "");
        setBirthday(st.dob || "");
        setHomeAddress(st.address || "");
        setSaralId(st.saralId || "");
        setAadhaar(st.aadhaar || "");
        setAparId(st.aparId || "");
        setParentName(st.parentName || "");
        setParentPhone(st.parentPhone || "");
        setParentOccupation(st.parentOccupation || "");
        setParentEducation(st.parentEducation || "");
      }

      // 3. Fetch Attendance Record
      const attData = await getHpcStudentAttendance(classId, academicYear, studentId);
      if (isMounted && attData) {
        const loadedAttended: Record<string, number> = {};
        if (attData.term1) {
          loadedAttended.june = attData.term1.june || 0;
          loadedAttended.july = attData.term1.july || 0;
          loadedAttended.august = attData.term1.august || 0;
          loadedAttended.september = attData.term1.september || 0;
          loadedAttended.october = attData.term1.october || 0;
        }
        if (attData.term2) {
          loadedAttended.november = attData.term2.november || 0;
          loadedAttended.december = attData.term2.december || 0;
          loadedAttended.january = attData.term2.january || 0;
          loadedAttended.february = attData.term2.february || 0;
          loadedAttended.march = attData.term2.march || 0;
          loadedAttended.april = attData.term2.april || 0;
        }
        setAttendedDays((prev) => ({ ...prev, ...loadedAttended }));
      }

      // 4. Fetch Existing HPC Student Profile
      const existing = await getHpcStudentProfile(studentId, academicYear);
      if (!isMounted) return;

      if (existing) {
        // Part A1 overrides if stored in profile
        if (existing.schoolName) setSchoolName(existing.schoolName);
        if (existing.udiseNumber) setUdiseNumber(existing.udiseNumber);
        if (existing.cluster) setCluster(existing.cluster);
        if (existing.taluka) setTaluka(existing.taluka);
        if (existing.district) setDistrict(existing.district);
        if (existing.headmasterName) setHeadmasterName(existing.headmasterName);
        if (existing.teacherName) setTeacherName(existing.teacherName);
        if (existing.teacherPhone) setTeacherPhone(existing.teacherPhone);

        if (existing.fullName) setFullName(existing.fullName);
        if (existing.rollNo) setRollNo(existing.rollNo);
        if (existing.division) setDivision(existing.division);
        if (existing.gender) setGender(existing.gender);
        if (existing.dob) setDob(existing.dob);
        if (existing.bloodGroup) setBloodGroup(existing.bloodGroup);
        if (existing.caste) setCaste(existing.caste);
        if (existing.category) setCategory(existing.category);
        if (existing.saralId) setSaralId(existing.saralId);
        if (existing.aadhaar) setAadhaar(existing.aadhaar);
        if (existing.aparId) setAparId(existing.aparId);
        if (existing.parentName) setParentName(existing.parentName);
        if (existing.parentOccupation) setParentOccupation(existing.parentOccupation);
        if (existing.parentEducation) setParentEducation(existing.parentEducation);
        if (existing.parentPhone) setParentPhone(existing.parentPhone);

        // Part A2 - Attendance
        if (existing.monthlyAttendance) {
          setAttendedDays((prev) => ({ ...prev, ...existing.monthlyAttendance }));
        }
        if (existing.monthlyWorkingDays) {
          setWorkingDays((prev) => ({ ...prev, ...existing.monthlyWorkingDays }));
        }

        // Part A2 - Me & My Surroundings
        setAge(existing.age || "");
        if (existing.birthday) setBirthday(existing.birthday);
        if (existing.homeAddress) setHomeAddress(existing.homeAddress);
        setFamilyDescription(existing.familyDescription || "");
        setAmbition(existing.ambition || "");
        setFriendsText((existing.friends || []).join(", "));
        setFavoriteColor(existing.favoriteColor || "");
        setFavoriteFlower(existing.favoriteFlower || "");
        setFavoriteFood(existing.favoriteFood || "");
        setFavoriteGame(existing.favoriteGame || "");
        setFavoriteAnimal(existing.favoriteAnimal || "");
        setFavoriteSubject(existing.favoriteSubject || "");
        setSelectedHobbies(existing.hobbies || []);
        setOtherHobby(existing.otherHobby || "");
        setRegularHomeChores(existing.regularHomeChores || "");
        setStudentSelfReflection(existing.studentSelfReflection || "");
        setParentCollaborationNotes(existing.parentCollaborationNotes || "");
      }

      setLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentId, academicYear, classId]);

  // Attendance Calculations
  const term1Summary = useMemo(() => {
    let working = 0;
    let present = 0;
    ATTENDANCE_MONTHS.filter((m) => m.term === 1).forEach((m) => {
      working += workingDays[m.key] || 0;
      present += attendedDays[m.key] || 0;
    });
    return { working, present };
  }, [workingDays, attendedDays]);

  const term2Summary = useMemo(() => {
    let working = 0;
    let present = 0;
    ATTENDANCE_MONTHS.filter((m) => m.term === 2).forEach((m) => {
      working += workingDays[m.key] || 0;
      present += attendedDays[m.key] || 0;
    });
    return { working, present };
  }, [workingDays, attendedDays]);

  const annualAttendanceTotal = useMemo(() => {
    const totalWorking = term1Summary.working + term2Summary.working;
    const totalPresent = term1Summary.present + term2Summary.present;
    const pct = totalWorking > 0 ? ((totalPresent / totalWorking) * 100).toFixed(1) : "0.0";
    return { totalWorking, totalPresent, pct };
  }, [term1Summary, term2Summary]);

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  };

  const handleAttendanceChange = (monthKey: string, valStr: string) => {
    const totalAllowed = workingDays[monthKey] || 31;
    const clean = valStr.replace(/[^0-9]/g, "");
    if (clean === "") {
      setAttendedDays((prev) => ({ ...prev, [monthKey]: 0 }));
      return;
    }
    const num = parseInt(clean, 10) || 0;
    const bounded = Math.min(totalAllowed, Math.max(0, num));
    setAttendedDays((prev) => ({ ...prev, [monthKey]: bounded }));
  };

  const handleWorkingDaysChange = (monthKey: string, valStr: string) => {
    const clean = valStr.replace(/[^0-9]/g, "");
    const num = clean === "" ? 0 : parseInt(clean, 10) || 0;
    setWorkingDays((prev) => ({ ...prev, [monthKey]: Math.max(0, num) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const friendsArray = friendsText
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const profileData: HpcStudentProfile = {
        studentId,
        academicYear,
        stageId,
        classId,
        division,

        // Part A(1) - School & Teacher Info
        schoolName,
        udiseNumber,
        cluster,
        taluka,
        district,
        headmasterName,
        teacherName,
        teacherPhone,

        // Part A(1) - Student & Parent Details
        fullName,
        rollNo,
        gender,
        dob,
        bloodGroup,
        caste,
        category,
        saralId,
        aadhaar,
        aparId,
        parentName,
        parentPhone,
        parentOccupation,
        parentEducation,

        // Part A(2) - Attendance Record
        monthlyAttendance: attendedDays,
        monthlyWorkingDays: workingDays,

        // Part A(2) - Personal profile details
        photoUrl: student?.photoUrl || "",
        age,
        birthday: birthday || dob,
        homeAddress,
        familyDescription,
        ambition,
        friends: friendsArray,
        favoriteColor,
        favoriteFlower,
        favoriteFood,
        favoriteGame,
        favoriteAnimal,
        favoriteSubject,
        hobbies: selectedHobbies,
        otherHobby,
        regularHomeChores,
        studentSelfReflection,
        parentCollaborationNotes,
      };

      await saveHpcStudentProfile(profileData);
      toast.success("भाग अ (विद्यार्थी वैयक्तिक, शाळा व उपस्थिती माहिती) यशस्वीरीत्या जतन झाली!");
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error("माहिती जतन करताना त्रुटी आली: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी माहिती लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Back Action Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack || (() => window.history.back())}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>विद्यार्थी यादीवर परत जा (Back to Students List)</span>
        </button>
      </div>

      {/* ================= TOP HEADER CARD ================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="size-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="मागे जा"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-xl shadow-md overflow-hidden flex-shrink-0">
            {student?.photoUrl ? (
              <img src={student.photoUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              fullName?.charAt(0) || "वि"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                भाग अ: विद्यार्थी प्रोफाईल
              </span>
              <span className="text-xs font-bold text-slate-500">
                हजेरी क्र: <b className="text-slate-800">{rollNo || student?.rollNo}</b>
              </span>
              <span className="text-xs font-bold text-slate-500">
                तुकडी: <b className="text-slate-800">{division}</b>
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {fullName || student?.fullName || student?.name}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              शाळा, शिक्षक, उपस्थिती व वैयक्तिक आवडीनिवडी (Part A1 & A2)
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>नोंद सेव्ह करा (Save Profile)</span>
        </button>
      </div>

      {/* ================= TWO-PART TAB PILLS (Matching User Screenshot) ================= */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="inline-flex items-center p-1.5 bg-white sm:bg-slate-100/90 rounded-full border border-slate-200/90 shadow-xs gap-1 sm:gap-2">
          {/* Tab 1: भाग A(1) - शाळा व शिक्षक */}
          <button
            type="button"
            onClick={() => setActiveTab("a1")}
            className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold sm:font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "a1"
                ? "bg-[#137547] text-white shadow-md shadow-emerald-950/20"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <Building2 className="size-4" />
            <span>भाग A(1) - शाळा व शिक्षक</span>
          </button>

          {/* Tab 2: भाग A(2) - उपस्थिती व आवड */}
          <button
            type="button"
            onClick={() => setActiveTab("a2")}
            className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold sm:font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "a2"
                ? "bg-[#137547] text-white shadow-md shadow-emerald-950/20"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <CalendarCheck className="size-4" />
            <span>भाग A(2) - उपस्थिती व आवड</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: भाग A(1) - शाळा व शिक्षक (School, Teacher, Student & Parent Info)
      ========================================================================= */}
      {activeTab === "a1" && (
        <div className="space-y-6">
          {/* Section 1: School & Teacher Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="size-5 text-emerald-700" />
                <span>१. शालेय व शिक्षक माहिती (School & Teacher Information)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">भाग A(1)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  शाळेचे नाव (School Name) *
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="उदा. जि. प. प्राथमिक शाळा..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  शाळा UDISE क्र. / शालार्थ आयडी
                </label>
                <input
                  type="text"
                  value={udiseNumber}
                  onChange={(e) => setUdiseNumber(e.target.value)}
                  placeholder="उदा. 2725..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  केंद्र (Cluster)
                </label>
                <input
                  type="text"
                  value={cluster}
                  onChange={(e) => setCluster(e.target.value)}
                  placeholder="केंद्राचे नाव"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  तालुका (Taluka)
                </label>
                <input
                  type="text"
                  value={taluka}
                  onChange={(e) => setTaluka(e.target.value)}
                  placeholder="तालुक्याचे नाव"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  जिल्हा (District)
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="जिल्ह्याचे नाव"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  मुख्याध्यापकांचे नाव (Headmaster Name)
                </label>
                <input
                  type="text"
                  value={headmasterName}
                  onChange={(e) => setHeadmasterName(e.target.value)}
                  placeholder="मुख्याध्यापकांचे नाव"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  वर्ग शिक्षकांचे नाव (Class Teacher) *
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="उदा. श्री/श्रीमती..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  वर्ग शिक्षकांचा मोबाईल क्र. (Teacher Mobile)
                </label>
                <input
                  type="text"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="१० अंकी मोबाईल क्र."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Student Basic & Identification Details */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <User className="size-5 text-indigo-600" />
                <span>२. विद्यार्थ्याची सर्वसाधारण माहिती (Student Information)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">नोंद व ओळख</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  विद्यार्थ्याचे पूर्ण नाव (Student Full Name) *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="उदा. कदम रोहन संतोष"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  हजेरी क्रमांक (Roll No) *
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="उदा. १"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  तुकडी (Division)
                </label>
                <select
                  value={division}
                  onChange={(e) => setDivision(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                >
                  <option value="अ">तुकडी अ</option>
                  <option value="ब">तुकडी ब</option>
                  <option value="क">तुकडी क</option>
                  <option value="ड">तुकडी ड</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  लिंग (Gender)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                >
                  {GENDERS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  जन्मतारीख (Date of Birth)
                </label>
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    if (!birthday) setBirthday(e.target.value);
                  }}
                  placeholder="DD/MM/YYYY किंवा उदा. १५/०८/२०१७"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  रक्तगट (Blood Group)
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                >
                  <option value="">निवडा...</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  प्रवर्ग / जात (Category / Caste)
                </label>
                <input
                  type="text"
                  value={caste}
                  onChange={(e) => setCaste(e.target.value)}
                  placeholder="उदा. OPEN, OBC, SC, ST इ."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  सरल आयडी (SARAL / Student ID)
                </label>
                <input
                  type="text"
                  value={saralId}
                  onChange={(e) => setSaralId(e.target.value)}
                  placeholder="१९ अंकी सरल क्रमांक"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  आधार क्रमांक (Aadhaar No.)
                </label>
                <input
                  type="text"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="१२ अंकी आधार क्रमांक"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  अपार आयडी (APAAR ID)
                </label>
                <input
                  type="text"
                  value={aparId}
                  onChange={(e) => setAparId(e.target.value)}
                  placeholder="APAAR ID"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  घराचा संपूर्ण पत्ता (Home Address)
                </label>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="घराचा क्रमांक, गल्ली, गाव/शहर, पिनकोड"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Parents Information */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="size-5 text-purple-600" />
                <span>३. पालकांची माहिती (Parents / Guardian Details)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">पालक संपर्क</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  आईचे / वडिलांचे / पालकांचे नाव (Parent Name)
                </label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="पालकांचे पूर्ण नाव"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  पालकांचा व्यवसाय (Occupation)
                </label>
                <input
                  type="text"
                  value={parentOccupation}
                  onChange={(e) => setParentOccupation(e.target.value)}
                  placeholder="उदा. शेती, नोकरी, व्यवसाय"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  पालकांचे शिक्षण (Education)
                </label>
                <input
                  type="text"
                  value={parentEducation}
                  onChange={(e) => setParentEducation(e.target.value)}
                  placeholder="उदा. पदवीधर, १० वी, १२ वी"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  पालकांचा संपर्क / मोबाईल क्रमांक (Parent Mobile)
                </label>
                <input
                  type="text"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="१० अंकी मोबाईल क्रमांक"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: भाग A(2) - उपस्थिती व आवड (Attendance & Interests / Me & Surroundings)
      ========================================================================= */}
      {activeTab === "a2" && (
        <div className="space-y-6">
          {/* Section 1: Annual Attendance Report (महिनानिहाय वार्षिक उपस्थिती अहवाल) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="size-5 text-emerald-700" />
                  <span>१. वार्षिक उपस्थिती अहवाल (Annual Attendance Report)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  प्रथम व द्वितीय सत्रातील महिनानिहाय प्रत्यक्ष शालेय उपस्थिती दिवस नोंदवा.
                </p>
              </div>

              {/* Attendance Total Pill */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-2xl">
                <span className="text-xs font-bold text-emerald-800">वार्षिक उपस्थिती:</span>
                <span className="text-sm font-black text-emerald-950">
                  {annualAttendanceTotal.totalPresent} / {annualAttendanceTotal.totalWorking} दिवस
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-600 text-white">
                  {annualAttendanceTotal.pct}%
                </span>
              </div>
            </div>

            {/* Term 1 Attendance Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md">
                  प्रथम सत्र (Term 1)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  सत्र १ एकूण: <b className="text-blue-900">{term1Summary.present}</b> / {term1Summary.working} दिवस
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {ATTENDANCE_MONTHS.filter((m) => m.term === 1).map((m) => {
                  const presentVal = attendedDays[m.key] || 0;
                  const workingVal = workingDays[m.key] || m.defaultWorkingDays;
                  return (
                    <div
                      key={m.key}
                      className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-800">{m.labelMarathi}</span>
                        <span className="text-[10px] font-bold text-slate-400">कामकाज: {workingVal}</span>
                      </div>
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-100">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={presentVal === 0 ? "" : presentVal}
                          onChange={(e) => handleAttendanceChange(m.key, e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-xs font-black text-slate-900 outline-none"
                        />
                        <span className="pr-2.5 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          /{workingVal}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Term 1 Summary Box */}
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col justify-center text-center">
                  <span className="text-[11px] font-bold text-blue-800">सत्र १ उपस्थिती</span>
                  <span className="text-base font-black text-blue-950 mt-0.5">
                    {term1Summary.present} दिवस
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    (एकूण {term1Summary.working} पैकी)
                  </span>
                </div>
              </div>
            </div>

            {/* Term 2 Attendance Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md">
                  द्वितीय सत्र (Term 2)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  सत्र २ एकूण: <b className="text-purple-900">{term2Summary.present}</b> / {term2Summary.working} दिवस
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {ATTENDANCE_MONTHS.filter((m) => m.term === 2).map((m) => {
                  const presentVal = attendedDays[m.key] || 0;
                  const workingVal = workingDays[m.key] || m.defaultWorkingDays;
                  return (
                    <div
                      key={m.key}
                      className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-800">{m.labelMarathi}</span>
                        <span className="text-[10px] font-bold text-slate-400">कामकाज: {workingVal}</span>
                      </div>
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-purple-600 focus-within:ring-1 focus-within:ring-purple-100">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={presentVal === 0 ? "" : presentVal}
                          onChange={(e) => handleAttendanceChange(m.key, e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-1.5 text-xs font-black text-slate-900 outline-none"
                        />
                        <span className="pr-2.5 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          /{workingVal}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Term 2 Summary Box */}
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col justify-center text-center">
                  <span className="text-[11px] font-bold text-purple-800">सत्र २ उपस्थिती</span>
                  <span className="text-base font-black text-purple-950 mt-0.5">
                    {term2Summary.present} दिवस
                  </span>
                  <span className="text-[10px] text-purple-600 font-semibold">
                    (एकूण {term2Summary.working} पैकी)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Personal Profile & Surroundings (मी व माझा परिसर) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Smile className="size-5 text-indigo-600" />
                <span>२. वैयक्तिक ओळख व परिसर (Personal Profile)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">मी व माझा परिसर</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  माझे वय (वर्षे) *
                </label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="उदा. ७"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  माझा वाढदिवस (तारीख)
                </label>
                <input
                  type="text"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  placeholder="उदा. १५ ऑगस्ट २०१७ किंवा DD/MM/YYYY"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  माझ्या घराचा पत्ता
                </label>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="घराचा पत्ता / गाव / वस्ती"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  मोठे होऊन मला व्हायचे आहे... (My Aspiration) 🌟
                </label>
                <input
                  type="text"
                  value={ambition}
                  onChange={(e) => setAmbition(e.target.value)}
                  placeholder="उदा. डॉक्टर, शिक्षक, पोलीस, चित्रकार, शास्त्रज्ञ, सैनिक..."
                  className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 text-sm font-black text-indigo-900 focus:outline-none focus:border-indigo-500 bg-indigo-50/40"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  हे माझे मित्र / मैत्रिणी आहेत
                </label>
                <input
                  type="text"
                  value={friendsText}
                  onChange={(e) => setFriendsText(e.target.value)}
                  placeholder="स्वल्पविराम देऊन नावे लिहा (उदा. राहुल, स्नेहा, अमित)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  माझे कुटुंब (कुटुंबातील व्यक्ती, भावंडे व नाती)
                </label>
                <textarea
                  rows={2}
                  value={familyDescription}
                  onChange={(e) => setFamilyDescription(e.target.value)}
                  placeholder="उदा. आई, वडील, आजी, आजोबा व एक लहान भाऊ..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Favorites (माझा आवडता) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Heart className="size-5 text-rose-500" />
                <span>३. माझा आवडता... (My Favorites)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">आवड</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  🎨 रंग (Color)
                </label>
                <input
                  type="text"
                  value={favoriteColor}
                  onChange={(e) => setFavoriteColor(e.target.value)}
                  placeholder="उदा. निळा, गुलाबी"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400 bg-slate-50/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  🌸 फूल (Flower)
                </label>
                <input
                  type="text"
                  value={favoriteFlower}
                  onChange={(e) => setFavoriteFlower(e.target.value)}
                  placeholder="उदा. गुलाब, मोगरा"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400 bg-slate-50/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  🍲 अन्नपदार्थ (Food)
                </label>
                <input
                  type="text"
                  value={favoriteFood}
                  onChange={(e) => setFavoriteFood(e.target.value)}
                  placeholder="उदा. लाडू, वरणभात"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400 bg-slate-50/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  ⚽ खेळ (Game/Sport)
                </label>
                <input
                  type="text"
                  value={favoriteGame}
                  onChange={(e) => setFavoriteGame(e.target.value)}
                  placeholder="उदा. लपंडाव, क्रिकेट"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400 bg-slate-50/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  🐘 प्राणी (Animal)
                </label>
                <input
                  type="text"
                  value={favoriteAnimal}
                  onChange={(e) => setFavoriteAnimal(e.target.value)}
                  placeholder="उदा. मांजर, कुत्रा, ससा"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400 bg-slate-50/40"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  📚 विषय (Subject)
                </label>
                <input
                  type="text"
                  value={favoriteSubject}
                  onChange={(e) => setFavoriteSubject(e.target.value)}
                  placeholder="उदा. भाषा, गणित, चित्रकला"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-400 bg-slate-50/40"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Hobbies Checkboxes (माझी आवड आहे) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <span>४. माझी आवड आहे... (My Interests / Hobbies)</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">
                (एकापेक्षा जास्त पर्याय निवडू शकता - ✓ अशी खूण करा)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {SELF_ASSESSMENT_OPTIONS.hobbiesList.map((hobby) => {
                const isChecked = selectedHobbies.includes(hobby);
                return (
                  <button
                    type="button"
                    key={hobby}
                    onClick={() => toggleHobby(hobby)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      isChecked
                        ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs"
                        : "bg-slate-50/50 hover:bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{hobby}</span>
                    <div
                      className={`size-4 rounded-md border flex items-center justify-center ${
                        isChecked ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="size-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedHobbies.includes("इतर") && (
              <div className="mt-3">
                <input
                  type="text"
                  value={otherHobby}
                  onChange={(e) => setOtherHobby(e.target.value)}
                  placeholder="इतर छंद किंवा आवडीविषयी स्पष्ट लिहा..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
                />
              </div>
            )}
          </div>

          {/* Section 5: Home Tasks & Reflections */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Home className="size-5 text-teal-600" />
                <span>५. घरातील कामे व जबाबदाऱ्या (Home Tasks with Family)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">कौटुंबिक सहभाग</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  इतर व्यक्तींसोबत (वडील, आई, पालक, भावंड इ.) घरातील खालील कामे नियमित करतो/करते:
                </label>
                <textarea
                  rows={2}
                  value={regularHomeChores}
                  onChange={(e) => setRegularHomeChores(e.target.value)}
                  placeholder="उदा. स्वतःची दप्तर व वस्तू नीट जागेवर ठेवणे, झाडांना पाणी देणे, घरातील साधी कामे आई-वडिलांसोबत करणे..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    विद्यार्थी स्वतःच्या प्रगतीविषयी नोंदी (Self-reflection notes):
                  </label>
                  <textarea
                    rows={3}
                    value={studentSelfReflection}
                    onChange={(e) => setStudentSelfReflection(e.target.value)}
                    placeholder="उदा. मला शाळेत यायला व मित्रांसोबत नवीन खेळ खेळायला खूप आवडते. वाचनाचा सराव अजून करायचा आहे."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    पालक-शिक्षक सहयोग नोंदी (Parent-Teacher Collaboration):
                  </label>
                  <textarea
                    rows={3}
                    value={parentCollaborationNotes}
                    onChange={(e) => setParentCollaborationNotes(e.target.value)}
                    placeholder="उदा. घरी रोज अर्धा तास गोष्टीची पुस्तके वाचून दाखवली जातात. गणिताच्या सरावासाठी पालकांचे उत्तम सहकार्य लाभत आहे."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM ACTION BAR ================= */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        {onBack && (
          <button
            onClick={onBack}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            मागे जा (Back)
          </button>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "a1" ? "a2" : "a1")}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {activeTab === "a1" ? "पुढील टॅब: भाग A(2) ➔" : "मागील टॅब: ⬅ भाग A(1)"}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-600/25 hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>माहिती सेव्ह करा (Save Profile)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
