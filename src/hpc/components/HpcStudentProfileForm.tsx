import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  Trash2,
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
  Scale,
  CreditCard,
  FileText,
  BadgeCheck,
  MapPin,
  HeartHandshake,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { compressImageToDataUrl } from "@/lib/imageCompress";
import {
  HpcStudentProfile,
  HpcStageId,
} from "../types/hpc";
import {
  DIVISION_OPTIONS,
  CASTE_OPTIONS,
  MAHARASHTRA_DISTRICTS,
  TALUKA_OPTIONS,
  getTalukasForDistrict,
  PARENT_EDUCATION_OPTIONS,
  MOTHER_OCCUPATION_OPTIONS,
  FATHER_OCCUPATION_OPTIONS,
  MOTHER_TONGUE_OPTIONS,
  SmartOption,
} from "../data/studentProfileOptions";
import {
  getHpcStudentById,
  getHpcStudentProfile,
  saveHpcStudentProfile,
  deleteHpcStudentPhoto,
  getHpcSchoolSettings,
  getHpcStudentAttendance,
  getHpcClassWorkingDays,
  saveHpcClassWorkingDays,
  StudentInfoSummary,
} from "../services/hpcService";

interface HpcStudentProfileFormProps {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  initialTab?: "a1" | "a2";
  onBack?: () => void;
  onSaved?: () => void;
  onProceedToPartB?: () => void;
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
  { key: "may", labelMarathi: "मे", defaultWorkingDays: 0, term: 2 },
];

export const BLOOD_GROUPS = ["-- निवडा --", "A+", "B+", "AB+", "O+", "A-", "B-", "AB-", "O-", "माहित नाही"];
export const GENDERS = [
  { id: "female", label: "मुलगी (Girl)" },
  { id: "male", label: "मुलगा (Boy)" },
  { id: "other", label: "इतर (Other)" },
];

export const CATEGORIES = [
  "खुला (OPEN)",
  "SC (अनुसूचित जाती)",
  "ST (अनुसूचित जमाती)",
  "OBC (इतर मागास वर्ग)",
  "VJNT (विमुक्त जाती व भटक्या जमाती)",
  "SBC (विशेष मागास प्रवर्ग)",
  "SEBC (सामाजिक व शैक्षणिक मागास)",
  "EWS (आर्थिक दुर्बल घटक)",
];

export const RELIGIONS = [
  "हिंदू (Hindu)",
  "मुस्लिम (Muslim)",
  "बौद्ध (Buddhist)",
  "जैन (Jain)",
  "ख्रिश्चन (Christian)",
  "शीख (Sikh)",
  "इतर (Other)",
];

export const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली" },
  { id: "2nd", label: "इयत्ता २ री" },
  { id: "3rd", label: "इयत्ता ३ री" },
  { id: "4th", label: "इयत्ता ४ थी" },
  { id: "5th", label: "इयत्ता ५ वी" },
  { id: "6th", label: "इयत्ता ६ वी" },
  { id: "7th", label: "इयत्ता ७ वी" },
  { id: "8th", label: "इयत्ता ८ वी" },
];

export const HOBBIES_LIST = [
  "वाचन",
  "सर्जनशील लेखन",
  "नृत्य",
  "गायन",
  "वाद्य वाजवणे",
  "बागकाम",
  "योग",
  "चित्रकला",
  "हस्तकला",
  "खेळ",
  "स्वयंपाक",
  "घरकामात सहभाग",
];

export const COLOR_OPTIONS = [
  { label: "निळा (Blue)", value: "निळा" },
  { label: "गुलाबी (Pink)", value: "गुलाबी" },
  { label: "लाल (Red)", value: "लाल" },
  { label: "पिवळा (Yellow)", value: "पिवळा" },
  { label: "हिरवा (Green)", value: "हिरवा" },
  { label: "केशरी / नारंगी (Orange)", value: "केशरी" },
  { label: "जांभळा (Purple)", value: "जांभळा" },
  { label: "पांढरा (White)", value: "पांढरा" },
  { label: "काळा (Black)", value: "काळा" },
  { label: "आकाशी (Sky Blue)", value: "आकाशी" },
  { label: "सोनेरी (Golden)", value: "सोनेरी" },
  { label: "तपकिरी / चॉकलेटी (Brown)", value: "तपकिरी" },
];

export const FOOD_OPTIONS = [
  { label: "पुरणपोळी (Puran Poli)", value: "पुरणपोळी" },
  { label: "वरण-भात व तूप (Varan Bhaat)", value: "वरण-भात" },
  { label: "भाजी-भाकरी (Bhaji Bhakri)", value: "भाजी-भाकरी" },
  { label: "पोहे (Pohe)", value: "पोहे" },
  { label: "शिरा (Sheera / Halwa)", value: "शिरा" },
  { label: "लाडू (Laddoo)", value: "लाडू" },
  { label: "मोदक (Modak)", value: "मोदक" },
  { label: "इडली-डोसा (Idli Dosa)", value: "इडली-डोसा" },
  { label: "गुलाबजाम (Gulab Jamun)", value: "गुलाबजाम" },
  { label: "खिचडी (Khichdi)", value: "खिचडी" },
  { label: "पावभाजी (Pav Bhaji)", value: "पावभाजी" },
  { label: "पिठलं-भाकरी (Pithla Bhakri)", value: "पिठलं-भाकरी" },
  { label: "फळे व दूध (Fruits & Milk)", value: "फळे व दूध" },
];

export const FLOWER_OPTIONS = [
  { label: "गुलाब (Rose)", value: "गुलाब" },
  { label: "मोगरा (Jasmine)", value: "मोगरा" },
  { label: "झेंडू (Marigold)", value: "झेंडू" },
  { label: "चाफा (Champa)", value: "चाफा" },
  { label: "कमळ (Lotus)", value: "कमळ" },
  { label: "जास्वंद (Hibiscus)", value: "जास्वंद" },
  { label: "सूर्यफूल (Sunflower)", value: "सूर्यफूल" },
  { label: "पारिजात (Parijat)", value: "पारिजात" },
  { label: "सदाफुली (Periwinkle)", value: "सदाफुली" },
  { label: "जुई / जाई (Jui / Jai)", value: "जुई" },
  { label: "निशिगंध (Tuberose)", value: "निशिगंध" },
  { label: "शेवंती (Chrysanthemum)", value: "शेवंती" },
];

export const GAME_OPTIONS = [
  { label: "खो-खो (Kho-Kho)", value: "खो-खो" },
  { label: "कबड्डी (Kabaddi)", value: "कबड्डी" },
  { label: "लंगडी (Langadi)", value: "लंगडी" },
  { label: "क्रिकेट (Cricket)", value: "क्रिकेट" },
  { label: "लपंडाव / अंधळी कोशिंबीर (Hide & Seek)", value: "लपंडाव" },
  { label: "कॅरम (Carrom)", value: "कॅरम" },
  { label: "बुद्धिबळ (Chess)", value: "बुद्धिबळ" },
  { label: "फुटबॉल (Football)", value: "फुटबॉल" },
  { label: "दोरीच्या उड्या (Skipping)", value: "दोरीच्या उड्या" },
  { label: "विटी-दांडू (Gilli Danda)", value: "विटी-दांडू" },
  { label: "धावणे / शर्यत (Running)", value: "धावणे" },
  { label: "सायकल चालवणे (Cycling)", value: "सायकल चालवणे" },
  { label: "बॅडमिंटन (Badminton)", value: "बॅडमिंटन" },
];

export const ANIMAL_OPTIONS = [
  { label: "कुत्रा (Dog)", value: "कुत्रा" },
  { label: "मांजर (Cat)", value: "मांजर" },
  { label: "गाय / वासरू (Cow / Calf)", value: "गाय" },
  { label: "ससा (Rabbit)", value: "ससा" },
  { label: "घोडा (Horse)", value: "घोडा" },
  { label: "पोपट (Parrot)", value: "पोपट" },
  { label: "मोर (Peacock)", value: "मोर" },
  { label: "हत्ती (Elephant)", value: "हत्ती" },
  { label: "हरीण (Deer)", value: "हरीण" },
  { label: "वाघ / सिंह (Tiger / Lion)", value: "वाघ" },
  { label: "शेळी / मेंढी (Goat / Sheep)", value: "शेळी" },
  { label: "खारुताई (Squirrel)", value: "खारुताई" },
];

export const SUBJECT_OPTIONS = [
  { label: "गणित (Mathematics)", value: "गणित" },
  { label: "मराठी (Marathi)", value: "मराठी" },
  { label: "इंग्रजी (English)", value: "इंग्रजी" },
  { label: "परिसर अभ्यास / विज्ञान (EVS / Science)", value: "परिसर अभ्यास / विज्ञान" },
  { label: "चित्रकला व हस्तकला (Drawing & Art)", value: "चित्रकला" },
  { label: "खेळ व शारीरिक शिक्षण (Sports & PE)", value: "खेळ व शारीरिक शिक्षण" },
  { label: "संगीत व गायन (Music & Singing)", value: "संगीत" },
  { label: "कार्यशिक्षण (Work Education)", value: "कार्यशिक्षण" },
  { label: "संगणक (Computer)", value: "संगणक" },
  { label: "इतिहास व नागरिकशास्त्र (History & Civics)", value: "इतिहास" },
  { label: "भूगोल (Geography)", value: "भूगोल" },
];

export const ASPIRATION_OPTIONS = [
  { label: "शिक्षक / शिक्षिका (Teacher)", value: "शिक्षक" },
  { label: "डॉक्टर (Doctor)", value: "डॉक्टर" },
  { label: "पोलीस अधिकारी (Police Officer)", value: "पोलीस" },
  { label: "सैनिक / फौजी (Army / Soldier)", value: "सैनिक" },
  { label: "शास्त्रज्ञ / वैज्ञानिक (Scientist)", value: "शास्त्रज्ञ" },
  { label: "इंजिनिअर / अभियंता (Engineer)", value: "इंजिनिअर" },
  { label: "खेळाडू / क्रीडापटू (Athlete / Sports Person)", value: "खेळाडू" },
  { label: "चित्रकार / कलाकार (Artist)", value: "चित्रकार" },
  { label: "गायक / संगीतकार (Singer / Musician)", value: "गायक" },
  { label: "पायलट / वैमानिक (Pilot)", value: "पायलट" },
  { label: "शेतकरी / आधुनिक कृषी तज्ज्ञ (Smart Farmer)", value: "शेतकरी" },
  { label: "सनदी अधिकारी (Collector / IAS / IPS)", value: "अधिकारी (IAS/IPS)" },
  { label: "वकील / न्यायाधीश (Lawyer / Judge)", value: "वकील" },
  { label: "उद्योजक / व्यावसायिक (Entrepreneur)", value: "उद्योजक" },
  { label: "नर्स / परिचारिका (Nurse / Healthcare)", value: "नर्स" },
  { label: "संगणक तज्ज्ञ / सॉफ्टवेअर इंजिनिअर (Software Engineer)", value: "सॉफ्टवेअर इंजिनिअर" },
];

function SmartDropdownField({
  label,
  value,
  onChange,
  options,
  placeholder = "-- यादीतून निवडा किंवा खाली लिहा --",
  customPlaceholder = "येथे स्वतःचे उत्तर टाईप करा... (उदा. स्वतःचे नाव किंवा शब्द)",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: (SmartOption | { label: string; value: string } | string)[];
  placeholder?: string;
  customPlaceholder?: string;
}) {
  const normalizedOptions: SmartOption[] = useMemo(() => {
    return options.map((opt) => (typeof opt === "string" ? { label: opt, value: opt } : opt));
  }, [options]);

  const isPreset = normalizedOptions.some((opt) => opt.value === value);
  const [isCustom, setIsCustom] = useState<boolean>(() => Boolean(value && !isPreset));

  // Sync isCustom when value arrives from outside (e.g. loaded student profile)
  useEffect(() => {
    if (value && !isPreset) {
      setIsCustom(true);
    }
  }, [value, isPreset]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsCustom(false);
            }}
            className="text-[10px] text-slate-400 hover:text-red-600 font-bold transition-colors cursor-pointer"
          >
            रिसेट
          </button>
        )}
      </div>

      <div className="space-y-2">
        <select
          value={isCustom ? "__custom__" : isPreset ? value : ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__custom__") {
              setIsCustom(true);
            } else {
              setIsCustom(false);
              onChange(val);
            }
          }}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
        >
          <option value="">{placeholder}</option>
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          <option value="__custom__">✍️ इतर (स्वतः टाईप करा / Type Custom)</option>
        </select>

        {isCustom && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-150">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={customPlaceholder}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-500 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 bg-emerald-50/40 placeholder:text-slate-400 shadow-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function HpcStudentProfileForm({
  studentId,
  academicYear,
  stageId,
  classId,
  initialTab = "a1",
  onBack,
  onSaved,
  onProceedToPartB,
}: HpcStudentProfileFormProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"a1" | "a2">(initialTab);

  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---------------- SECTION 1: मूलभूत ओळख व शालेय नोंद ----------------
  const [fullName, setFullName] = useState("");
  const [englishName, setEnglishName] = useState("");
  const [gender, setGender] = useState("female");
  const [rollNo, setRollNo] = useState("");
  const [grNo, setGrNo] = useState("");
  const [studentClass, setStudentClass] = useState(classId || "1st");
  const [division, setDivision] = useState("अ");
  const [teacherName, setTeacherName] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // School context info
  const [schoolName, setSchoolName] = useState("");
  const [udiseNumber, setUdiseNumber] = useState("");
  const [pincode, setPincode] = useState("");
  const [cluster, setCluster] = useState("");
  const [taluka, setTaluka] = useState("");
  const [district, setDistrict] = useState("");
  const [headmasterName, setHeadmasterName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherIdNumber, setTeacherIdNumber] = useState("");

  // ---------------- SECTION 2: उंची व वजन (सर्व सत्रे) ----------------
  const [term1Height, setTerm1Height] = useState("");
  const [term1Weight, setTerm1Weight] = useState("");
  const [term2Height, setTerm2Height] = useState("");
  const [term2Weight, setTerm2Weight] = useState("");

  // ---------------- SECTION 3: शासकीय व ओळख क्रमांक ----------------
  const [aparId, setAparId] = useState("");
  const [penNo, setPenNo] = useState("");
  const [saralId, setSaralId] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [udidNo, setUdidNo] = useState("");
  const [regNo, setRegNo] = useState("");

  // ---------------- SECTION 4: सामाजिक व वैयक्तिक माहिती ----------------
  const [religion, setReligion] = useState("हिंदू (Hindu)");
  const [caste, setCaste] = useState("");
  const [category, setCategory] = useState("खुला (OPEN)");
  const [minority, setMinority] = useState("नाही");
  const [cwsn, setCwsn] = useState("नाही");
  const [bpl, setBpl] = useState("नाही");
  const [birthPlace, setBirthPlace] = useState("");
  const [studentTaluka, setStudentTaluka] = useState("");
  const [studentDistrict, setStudentDistrict] = useState("");

  // Dynamically filter talukas based on selected district
  const availableStudentTalukas = useMemo(() => {
    if (!studentDistrict || !studentDistrict.trim()) return [];
    return getTalukasForDistrict(studentDistrict);
  }, [studentDistrict]);

  const handleDistrictChange = (newDistrict: string) => {
    setStudentDistrict(newDistrict);
    const talukas = getTalukasForDistrict(newDistrict);
    const exists = talukas.some((t) => t.value === studentTaluka);
    if (!exists && studentTaluka) {
      setStudentTaluka("");
    }
  };

  // ---------------- SECTION 5: कुटुंब व संपर्क माहिती ----------------
  const [motherName, setMotherName] = useState("");
  const [motherEducation, setMotherEducation] = useState("");
  const [motherOccupation, setMotherOccupation] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherEducation, setFatherEducation] = useState("");
  const [fatherOccupation, setFatherOccupation] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelation, setGuardianRelation] = useState("");
  const [siblingCount, setSiblingCount] = useState("");
  const [siblingAge, setSiblingAge] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [fatherPhone, setFatherPhone] = useState("");
  const [motherPhone, setMotherPhone] = useState("");
  const [areaType, setAreaType] = useState("");
  const [motherTongue, setMotherTongue] = useState("");
  const [mediumOfInstruction, setMediumOfInstruction] = useState("");

  // ---------------- SECTION 6: बँक खाते माहिती ----------------
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");

  // ---------------- SECTION 7: HPC विशेष: आवडीनिवडी व परिसर ----------------
  const [favoriteColor, setFavoriteColor] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteFlower, setFavoriteFlower] = useState("");
  const [favoriteGame, setFavoriteGame] = useState("");
  const [favoriteAnimal, setFavoriteAnimal] = useState("");
  const [favoriteSubject, setFavoriteSubject] = useState("");
  const [ambition, setAmbition] = useState("");
  const [bestFriend1, setBestFriend1] = useState("");
  const [bestFriend2, setBestFriend2] = useState("");
  const [bestFriend3, setBestFriend3] = useState("");

  // ---------------- SECTION 8: माझी आवड (Interests) ----------------
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [otherHobby, setOtherHobby] = useState("");

  // Additional Chores & Reflections
  const [regularHomeChores, setRegularHomeChores] = useState("");
  const [studentSelfReflection, setStudentSelfReflection] = useState("");
  const [parentCollaborationNotes, setParentCollaborationNotes] = useState("");

  // Attendance State
  const [workingDays, setWorkingDays] = useState<Record<string, number>>(() =>
    Object.fromEntries(ATTENDANCE_MONTHS.map((m) => [m.key, m.defaultWorkingDays]))
  );
  const [attendedDays, setAttendedDays] = useState<Record<string, number>>(() =>
    Object.fromEntries(ATTENDANCE_MONTHS.map((m) => [m.key, 0]))
  );
  const [attendanceReason1, setAttendanceReason1] = useState("");
  const [attendanceReason2, setAttendanceReason2] = useState("");

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
        if (schoolSettings.pincode) setPincode(String(schoolSettings.pincode));
        const rawTId = (schoolSettings as any).teacherIdNumber || (schoolSettings as any).shalarthId || "";
        if (rawTId) setTeacherIdNumber(String(rawTId));
      }

      // 2. Fetch Student Summary
      const st = await getHpcStudentById(studentId);
      if (!isMounted) return;
      setStudent(st);

      if (st) {
        setFullName(st.fullName || st.name || "");
        setRollNo(st.rollNo || "1");
        setGrNo(st.grNo || "");
        setDivision(st.division || "अ");
        setGender(st.gender || "female");
        setDob(st.dob || "");
        if (st.age) setAge(String(st.age));
        setStudentClass(st.class || classId || "1st");
        setBloodGroup(st.bloodGroup || "");
        setCaste(st.caste || "");
        setCategory(st.category || "");
        setSaralId(st.saralId || "");
        setAadhaar(st.aadhaar || "");
        setAparId(st.aparId || "");
        setAddressLine1(st.address || "");
        setFatherName(st.parentName || st.fatherName || "");
        setParentPhone(st.parentPhone || st.phone || "");
        setMotherName(st.motherName || "");
        if (st.photoUrl) setPhotoUrl(st.photoUrl);
      }

      // 3. Fetch Attendance Record & Class Working Days
      const [attData, classWd] = await Promise.all([
        getHpcStudentAttendance(classId, academicYear, studentId),
        getHpcClassWorkingDays(classId, academicYear),
      ]);

      if (isMounted) {
        if (classWd && Object.keys(classWd).length > 0) {
          setWorkingDays((prev) => ({ ...prev, ...classWd }));
        } else if (attData && (attData as any).workingDays) {
          setWorkingDays((prev) => ({ ...prev, ...(attData as any).workingDays }));
        }

        if (attData) {
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
            loadedAttended.may = (attData.term2 as any).may || 0;
          }
          setAttendedDays((prev) => ({ ...prev, ...loadedAttended }));
        }
      }

      // 4. Fetch Existing HPC Student Profile
      const existing = await getHpcStudentProfile(studentId, academicYear);
      if (!isMounted) return;

      if (existing) {
        // Section 1: Basic Identity
        if (existing.fullName) setFullName(existing.fullName);
        if (existing.englishName) setEnglishName(existing.englishName);
        if (existing.gender) setGender(existing.gender);
        if (existing.rollNo) setRollNo(existing.rollNo);
        if (existing.grNo) setGrNo(existing.grNo);
        if (existing.classId) setStudentClass(existing.classId);
        if (existing.division) setDivision(existing.division);
        if (existing.teacherName) setTeacherName(existing.teacherName);
        if (existing.dob) setDob(existing.dob);
        if (existing.age) setAge(existing.age);
        if (existing.bloodGroup) setBloodGroup(existing.bloodGroup);
        if (existing.photoUrl) setPhotoUrl(existing.photoUrl);

        // Section 2: Physical Measurements
        if (existing.term1Height) setTerm1Height(existing.term1Height);
        if (existing.term1Weight) setTerm1Weight(existing.term1Weight);
        if (existing.term2Height) setTerm2Height(existing.term2Height);
        if (existing.term2Weight) setTerm2Weight(existing.term2Weight);

        // Section 3: Official IDs
        if (existing.aparId) setAparId(existing.aparId);
        if (existing.penNo) setPenNo(existing.penNo);
        if (existing.saralId) setSaralId(existing.saralId);
        if (existing.udiseNumber) setUdiseNumber(existing.udiseNumber);
        if (existing.teacherIdNumber) setTeacherIdNumber(existing.teacherIdNumber);
        if (existing.aadhaar) setAadhaar(existing.aadhaar);
        if (existing.udidNo) setUdidNo(existing.udidNo);
        if (existing.regNo) setRegNo(existing.regNo);
        if (existing.pincode) setPincode(existing.pincode);
        if (existing.headmasterName) setHeadmasterName(existing.headmasterName);

        // Section 4: Social & Category
        if (existing.religion) setReligion(existing.religion);
        if (existing.caste) setCaste(existing.caste);
        if (existing.category) setCategory(existing.category);
        if (existing.minority) setMinority(existing.minority);
        if (existing.cwsn) setCwsn(existing.cwsn);
        if (existing.bpl) setBpl(existing.bpl);
        if (existing.birthPlace) setBirthPlace(existing.birthPlace);
        if (existing.studentTaluka) setStudentTaluka(existing.studentTaluka);
        if (existing.studentDistrict) setStudentDistrict(existing.studentDistrict);

        // Section 5: Family & Contact
        if (existing.motherName) setMotherName(existing.motherName);
        if (existing.motherEducation) setMotherEducation(existing.motherEducation);
        if (existing.motherOccupation) setMotherOccupation(existing.motherOccupation);
        if (existing.fatherName) setFatherName(existing.fatherName);
        if (existing.fatherEducation) setFatherEducation(existing.fatherEducation);
        if (existing.fatherOccupation) setFatherOccupation(existing.fatherOccupation);
        if (existing.guardianName) setGuardianName(existing.guardianName);
        if (existing.guardianRelation) setGuardianRelation(existing.guardianRelation);
        if (existing.siblingCount) setSiblingCount(existing.siblingCount);
        if (existing.siblingAge) setSiblingAge(existing.siblingAge);
        if (existing.addressLine1) setAddressLine1(existing.addressLine1);
        if (existing.addressLine2) setAddressLine2(existing.addressLine2);
        if (existing.parentPhone) setParentPhone(existing.parentPhone);
        if (existing.fatherPhone) setFatherPhone(existing.fatherPhone);
        if (existing.motherPhone) setMotherPhone(existing.motherPhone);
        if (existing.areaType) setAreaType(existing.areaType);
        if (existing.motherTongue) setMotherTongue(existing.motherTongue);
        if (existing.mediumOfInstruction) setMediumOfInstruction(existing.mediumOfInstruction);

        // Section 6: Bank Account
        if (existing.bankName) setBankName(existing.bankName);
        if (existing.bankAccountNo) setBankAccountNo(existing.bankAccountNo);
        if (existing.bankIfscCode) setBankIfscCode(existing.bankIfscCode);

        // Section 7: HPC Specials & Favorites
        if (existing.favoriteColor) setFavoriteColor(existing.favoriteColor);
        if (existing.favoriteFood) setFavoriteFood(existing.favoriteFood);
        if (existing.favoriteFlower) setFavoriteFlower(existing.favoriteFlower);
        if (existing.favoriteGame) setFavoriteGame(existing.favoriteGame);
        if (existing.favoriteAnimal) setFavoriteAnimal(existing.favoriteAnimal);
        if (existing.favoriteSubject) setFavoriteSubject(existing.favoriteSubject);
        if (existing.ambition) setAmbition(existing.ambition);
        if (existing.bestFriend1) setBestFriend1(existing.bestFriend1);
        if (existing.bestFriend2) setBestFriend2(existing.bestFriend2);
        if (existing.bestFriend3) setBestFriend3(existing.bestFriend3);
        if (!existing.bestFriend1 && existing.friends && existing.friends.length > 0) {
          setBestFriend1(existing.friends[0] || "");
          setBestFriend2(existing.friends[1] || "");
          setBestFriend3(existing.friends[2] || "");
        }

        // Section 8: Hobbies
        if (existing.hobbies) setSelectedHobbies(existing.hobbies);
        if (existing.otherHobby) setOtherHobby(existing.otherHobby);

        // Attendance & Reflections
        if (existing.monthlyAttendance) {
          setAttendedDays((prev) => ({ ...prev, ...existing.monthlyAttendance }));
        }
        if (classWd && Object.keys(classWd).length > 0) {
          setWorkingDays((prev) => ({ ...prev, ...classWd }));
        } else if (existing.monthlyWorkingDays) {
          setWorkingDays((prev) => ({ ...prev, ...existing.monthlyWorkingDays }));
        }
        if (existing.regularHomeChores) setRegularHomeChores(existing.regularHomeChores);
        if (existing.studentSelfReflection) setStudentSelfReflection(existing.studentSelfReflection);
        if (existing.parentCollaborationNotes) setParentCollaborationNotes(existing.parentCollaborationNotes);
        if (existing.attendanceReason1) setAttendanceReason1(existing.attendanceReason1);
        if (existing.attendanceReason2) setAttendanceReason2(existing.attendanceReason2);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToDataUrl(file, 600, 0.78);
      setPhotoUrl(compressed);
      toast.success("विद्यार्थी फोटो यशस्वीरीत्या निवडला!");
    } catch {
      toast.error("फोटो लोड करताना त्रुटी आली");
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("तुम्हाला खात्री आहे का? हा विद्यार्थी फोटो कायमचा काढून टाकायचा आहे?")) {
      return;
    }
    setDeletingPhoto(true);
    try {
      setPhotoUrl("");
      setStudent((prev) => (prev ? { ...prev, photoUrl: "" } : prev));
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (fileInputRef2.current) fileInputRef2.current.value = "";

      await deleteHpcStudentPhoto(studentId, academicYear);
      toast.success("विद्यार्थी फोटो यशस्वीरीत्या काढला व डेटाबेसमधून हटवला गेला!");
    } catch (err: any) {
      console.error("Photo delete error:", err);
      toast.error("फोटो हटवताना त्रुटी: " + (err?.message || ""));
    } finally {
      setDeletingPhoto(false);
    }
  };

  const handleWorkingDaysChange = (monthKey: string, valStr: string) => {
    const clean = valStr.replace(/[^0-9]/g, "");
    if (clean === "") {
      setWorkingDays((prev) => ({ ...prev, [monthKey]: 0 }));
      return;
    }
    const num = Math.min(31, Math.max(0, parseInt(clean, 10) || 0));
    setWorkingDays((prev) => {
      const next = { ...prev, [monthKey]: num };
      // Bounded attended days if exceeded
      setAttendedDays((aPrev) => {
        if ((aPrev[monthKey] || 0) > num) {
          return { ...aPrev, [monthKey]: num };
        }
        return aPrev;
      });
      return next;
    });
  };

  const handleFillDefaultWorkingDays = () => {
    const defaultMap = Object.fromEntries(
      ATTENDANCE_MONTHS.map((m) => [m.key, m.defaultWorkingDays])
    );
    setWorkingDays(defaultMap);
    toast.success("सर्व महिन्यांचे प्रमाणभूत कामकाज दिवस (Default Working Days) भरले!");
  };

  const handleAttendanceChange = (monthKey: string, valStr: string) => {
    const totalAllowed = workingDays[monthKey] !== undefined ? workingDays[monthKey] : 31;
    const clean = valStr.replace(/[^0-9]/g, "");
    if (clean === "") {
      setAttendedDays((prev) => ({ ...prev, [monthKey]: 0 }));
      return;
    }
    const num = parseInt(clean, 10) || 0;
    const bounded = Math.min(totalAllowed, Math.max(0, num));
    setAttendedDays((prev) => ({ ...prev, [monthKey]: bounded }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const friendsList = [bestFriend1, bestFriend2, bestFriend3].filter(Boolean);

      const profileData: HpcStudentProfile = {
        studentId,
        academicYear,
        stageId,
        classId: studentClass || classId,
        division,

        // Section 1: Basic Identity
        fullName,
        englishName,
        rollNo,
        grNo,
        gender,
        dob,
        age,
        bloodGroup,
        photoUrl,

        // School context
        schoolName,
        udiseNumber,
        pincode,
        cluster,
        taluka,
        district,
        headmasterName,
        teacherName,
        teacherPhone,
        teacherIdNumber,

        // Section 2: Physical Measurements
        term1Height,
        term1Weight,
        term2Height,
        term2Weight,

        // Section 3: Official IDs
        aparId,
        penNo,
        saralId,
        aadhaar,
        udidNo,
        regNo,

        // Section 4: Social & Category
        religion,
        caste,
        category,
        minority,
        cwsn,
        bpl,
        birthPlace,
        studentTaluka,
        studentDistrict,

        // Section 5: Family & Contact
        motherName,
        motherEducation,
        motherOccupation,
        fatherName,
        fatherEducation,
        fatherOccupation,
        guardianName,
        guardianRelation,
        siblingCount,
        siblingAge,
        addressLine1,
        addressLine2,
        parentPhone,
        fatherPhone,
        motherPhone,
        areaType,
        motherTongue,
        mediumOfInstruction,
        parentName: fatherName || motherName,
        parentOccupation: fatherOccupation || motherOccupation,
        parentEducation: fatherEducation || motherEducation,
        homeAddress: addressLine1 + (addressLine2 ? `, ${addressLine2}` : ""),

        // Section 6: Bank Account
        bankName,
        bankAccountNo,
        bankIfscCode,

        // Section 7: HPC Favorites & Friends
        favoriteColor,
        favoriteFlower,
        favoriteFood,
        favoriteGame,
        favoriteAnimal,
        favoriteSubject,
        ambition,
        bestFriend1,
        bestFriend2,
        bestFriend3,
        friends: friendsList,

        // Section 8: Hobbies & Reflection
        hobbies: selectedHobbies,
        otherHobby,
        regularHomeChores,
        studentSelfReflection,
        parentCollaborationNotes,

        // Attendance Record
        monthlyAttendance: attendedDays,
        monthlyWorkingDays: workingDays,
        attendanceReason1,
        attendanceReason2,
      };

      await saveHpcStudentProfile(profileData);
      await saveHpcClassWorkingDays(classId, academicYear, workingDays);

      if (activeTab === "a1") {
        toast.success("भाग A(1) ची माहिती जतन झाली! आता पुढील भाग A(2) (उपस्थिती व आवड) उघडले आहे.");
        setActiveTab("a2");
        window.scrollTo({ top: 160, behavior: "smooth" });
      } else {
        toast.success("भाग A यशस्वीरीत्या जतन झाले! आता भाग ब (सत्रनिहाय मूल्यमापन) उघडत आहे...");
        if (onProceedToPartB) {
          onProceedToPartB();
        } else if (onSaved) {
          onSaved();
        } else {
          navigate({
            to: "/teacher/hpc/assessment/$studentId",
            params: { studentId },
            search: { session: "session1", tab: "assessment" } as any,
          });
        }
      }
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
        <Loader2 className="size-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी माहिती लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* ================= TOP BACK BUTTON ================= */}
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

      {/* ================= TOP PROFILE HEADER CARD ================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-800 text-white flex items-center justify-center font-black text-2xl shadow-md overflow-hidden flex-shrink-0 border-2 border-emerald-100">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : student?.photoUrl ? (
                <img src={student.photoUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                fullName?.charAt(0) || "वि"
              )}
            </div>
            {(photoUrl || student?.photoUrl) && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={deletingPhoto}
                title="विद्यार्थी फोटो हटवा (Delete Photo)"
                className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
              >
                {deletingPhoto ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {fullName || student?.fullName || student?.name}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              शाळा, शिक्षक, उपस्थिती व वैयक्तिक आवडीनिवडी (Part A1 & A2)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0f6b4d] hover:bg-[#0c593f] text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>
            {activeTab === "a1"
              ? "नोंद सेव्ह करा (Save Profile)"
              : "नोंद सेव्ह करा आणि भाग ब वर जा →"}
          </span>
        </button>
      </div>

      {/* ================= TAB SWITCHER ================= */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="inline-flex items-center p-1.5 bg-white sm:bg-slate-100 rounded-full border border-slate-200/90 shadow-xs gap-1 sm:gap-2">
          {/* Tab 1: भाग A(1) - शाळा व शिक्षक / मूलभूत माहिती */}
          <button
            type="button"
            onClick={() => setActiveTab("a1")}
            className={`px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold sm:font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "a1"
                ? "bg-[#0f6b4d] text-white shadow-md shadow-emerald-950/20"
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
                ? "bg-[#0f6b4d] text-white shadow-md shadow-emerald-950/20"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/70"
            }`}
          >
            <CalendarCheck className="size-4" />
            <span>भाग A(2) - उपस्थिती व आवड</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: भाग A(1) - मूलभूत ओळख, उंची-वजन, ओळख क्रमांक, सामाजिक, कुटुंब, बँक
      ========================================================================= */}
      {activeTab === "a1" && (
        <div className="space-y-6">
          {/* SECTION 1: १. मूलभूत ओळख व शालेय नोंद */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <FileText className="size-5" />
                <span>१. मूलभूत ओळख व शालेय नोंद</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                आवश्यक माहिती
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              {/* Row 1: Name मराठी, Name इंग्रजी, लिंग */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    विद्यार्थ्याचे नाव (मराठी) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="उदा. तनिष्का प्रभू"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    विद्यार्थ्याचे नाव (इंग्रजी)
                  </label>
                  <input
                    type="text"
                    value={englishName}
                    onChange={(e) => setEnglishName(e.target.value)}
                    placeholder="उदा. Tanishka Prabhu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    लिंग <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    {GENDERS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Roll No, GR No, इयत्ता, तुकडी, वर्गशिक्षक */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    हजेरी क्र. (Roll No)
                  </label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="उदा. 14"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    जन. रजि. नं. (GR No)
                  </label>
                  <input
                    type="text"
                    value={grNo}
                    onChange={(e) => setGrNo(e.target.value)}
                    placeholder="उदा. 586"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    इयत्ता
                  </label>
                  <select
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    {CLASSES_LIST.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <SmartDropdownField
                    label="तुकडी (Section)"
                    value={division}
                    onChange={setDivision}
                    options={DIVISION_OPTIONS}
                    placeholder="-- तुकडी निवडा --"
                    customPlaceholder="उदा. अ, ब, क किंवा स्वतः लिहा..."
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    वर्गशिक्षक
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="शिक्षकांचे नाव"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Row 3: जन्मतारीख, वय, रक्तगट, विद्यार्थी फोटो */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    जन्मतारीख (Date of Birth)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    वय (Age)
                  </label>
                  <input
                    type="text"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="उदा. 7 वर्षे"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    रक्तगट (Blood Group)
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg === "-- निवडा --" ? "" : bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>विद्यार्थी फोटो</span>
                    {(photoUrl || student?.photoUrl) && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        फोटो जोडला आहे ✓
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label
                      className="cursor-pointer size-10 rounded-xl border-2 border-dashed border-sky-400 bg-sky-50 hover:bg-sky-100 flex items-center justify-center text-sky-700 transition-colors flex-shrink-0"
                      title="नवीन फोटो निवडा"
                    >
                      <Camera className="size-5" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    <input
                      ref={fileInputRef2}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-xs text-slate-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer flex-1 min-w-[140px]"
                    />
                    {(photoUrl || student?.photoUrl) && (
                      <div className="flex items-center gap-2 bg-rose-50/80 px-2.5 py-1.5 rounded-xl border border-rose-200/80">
                        <div className="size-7 rounded-lg overflow-hidden border border-rose-300 bg-white shrink-0">
                          <img
                            src={photoUrl || student?.photoUrl}
                            alt="विद्यार्थी फोटो"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          disabled={deletingPhoto}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                          title="फोटो पूर्णपणे काढून टाका व डेटाबेसमधून हटवा"
                        >
                          {deletingPhoto ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                          <span>फोटो काढा (Delete)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: २. उंची व वजन (सर्व सत्रे - Physical Measurements) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <Scale className="size-5" />
                <span>२. उंची व वजन (सर्व सत्रे - Physical Measurements)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                HPC & सातत्यपूर्ण मूल्यमापन दोन्हीसाठी आवश्यक
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-4">
              {/* Info notice bar matching image */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-200 text-sky-900 text-xs font-semibold">
                <span className="text-sky-600 font-black text-sm">ℹ</span>
                <span>
                  येथे भरलेली उंची व वजन ही माहिती HPC समग्र प्रगतिपत्रक (पान २) आणि सातत्यपूर्ण मूल्यमापन प्रगतिपुस्तक या दोन्ही ठिकाणी आपोआप वापरली जाते.
                </span>
              </div>

              {/* Term 1 & Term 2 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Term 1 Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-emerald-200/90 bg-emerald-50/30 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-900 border-b border-emerald-200/60 pb-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>सत्र १ (पहिले सत्र / Term 1)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        सत्र १ उंची (सें.मी.)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={term1Height}
                          onChange={(e) => setTerm1Height(e.target.value)}
                          placeholder="उदा. 108.5"
                          className="w-full pl-3.5 pr-12 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                        />
                        <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">
                          सेंमी
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        सत्र १ वजन (कि.ग्रॅ.)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={term1Weight}
                          onChange={(e) => setTerm1Weight(e.target.value)}
                          placeholder="उदा. 17.0"
                          className="w-full pl-3.5 pr-12 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                        />
                        <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">
                          किग्रॅ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Term 2 Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-teal-200/90 bg-teal-50/30 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-black text-teal-900 border-b border-teal-200/60 pb-2">
                    <CheckCircle2 className="size-4 text-teal-600" />
                    <span>सत्र २ (दुसरे सत्र / Term 2)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        सत्र २ उंची (सें.मी.)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={term2Height}
                          onChange={(e) => setTerm2Height(e.target.value)}
                          placeholder="उदा. 112.0"
                          className="w-full pl-3.5 pr-12 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                        />
                        <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">
                          सेंमी
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        सत्र २ वजन (कि.ग्रॅ.)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={term2Weight}
                          onChange={(e) => setTerm2Weight(e.target.value)}
                          placeholder="उदा. 18.5"
                          className="w-full pl-3.5 pr-12 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:border-emerald-600"
                        />
                        <span className="absolute right-3 text-xs font-bold text-slate-500 pointer-events-none">
                          किग्रॅ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ३. शासकीय व ओळख क्रमांक (Official IDs) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <Shield className="size-5" />
                <span>३. शासकीय व ओळख क्रमांक (Official IDs)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                अधिकृत क्रमांक
              </span>
            </div>

            <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  APAAR ID (अपार आय.डी. - १२ कप्पे)
                </label>
                <input
                  type="text"
                  value={aparId}
                  onChange={(e) => setAparId(e.target.value)}
                  placeholder="उदा. 123456789012"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Student PEN (पेन क्रमांक)
                </label>
                <input
                  type="text"
                  value={penNo}
                  onChange={(e) => setPenNo(e.target.value)}
                  placeholder="उदा. 20123456789"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SARAL ID (सरल आय. डी.)
                </label>
                <input
                  type="text"
                  value={saralId}
                  onChange={(e) => setSaralId(e.target.value)}
                  placeholder="उदा. 20212725..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  युडायस नंबर (UDISE No - ११ कप्पे)
                </label>
                <input
                  type="text"
                  value={udiseNumber}
                  onChange={(e) => setUdiseNumber(e.target.value)}
                  placeholder="उदा. 27250100101"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  अंगणवाडी सेविका / शिक्षक आय.डी. (HPC पान २)
                </label>
                <input
                  type="text"
                  value={teacherIdNumber}
                  onChange={(e) => setTeacherIdNumber(e.target.value)}
                  placeholder="उदा. शालार्थ आय.डी. / शिक्षक आय.डी."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  आधार क्रमांक (Aadhaar No - १२ कप्पे)
                </label>
                <input
                  type="text"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="१२ अंकी आधार क्रमांक"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  UDID (दिव्यांग युडीआयडी)
                </label>
                <input
                  type="text"
                  value={udidNo}
                  onChange={(e) => setUdidNo(e.target.value)}
                  placeholder="दिव्यांग असल्यास युडीआयडी"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  नोंदणी क्रमांक (Reg. No)
                </label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="शालेय नोंदणी क्रमांक"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  मुख्याध्यापक / शाळाप्रमुख नाव (HPC स्वाक्षरी)
                </label>
                <input
                  type="text"
                  value={headmasterName}
                  onChange={(e) => setHeadmasterName(e.target.value)}
                  placeholder="मुख्याध्यापकांचे नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: ४. सामाजिक व वैयक्तिक माहिती (Social & Category) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <Users className="size-5" />
                <span>४. सामाजिक व वैयक्तिक माहिती (Social & Category)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                सामाजिक तपशील
              </span>
            </div>

            <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  धर्म (Religion)
                </label>
                <select
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  {RELIGIONS.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <SmartDropdownField
                  label="जात (Caste)"
                  value={caste}
                  onChange={setCaste}
                  options={CASTE_OPTIONS}
                  placeholder="-- जात निवडा --"
                  customPlaceholder="उदा. मराठा, कुणबी, बौद्ध किंवा स्वतःची जात लिहा..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  प्रवर्ग (Category)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  अल्पसंख्याक (Minority)
                </label>
                <select
                  value={minority}
                  onChange={(e) => setMinority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="नाही">नाही</option>
                  <option value="होय">होय</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  दिव्यांग (Handicap / CWSN)
                </label>
                <select
                  value={cwsn}
                  onChange={(e) => setCwsn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="नाही">नाही</option>
                  <option value="होय">होय</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  दारिद्र्यरेषेखालील (BPL)
                </label>
                <select
                  value={bpl}
                  onChange={(e) => setBpl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option value="नाही">नाही</option>
                  <option value="होय">होय</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  जन्मगाव / ठिकाण
                </label>
                <input
                  type="text"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  placeholder="गावाचे नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              {/* १. प्रथम जिल्हा निवडा */}
              <div>
                <SmartDropdownField
                  label="जिल्हा (प्रथम जिल्हा निवडा)"
                  value={studentDistrict}
                  onChange={handleDistrictChange}
                  options={MAHARASHTRA_DISTRICTS}
                  placeholder="-- जिल्हा निवडा --"
                  customPlaceholder="उदा. पुणे, सांगली, सातारा किंवा स्वतः जिल्हा लिहा..."
                />
              </div>

              {/* २. निवडलेल्या जिल्ह्यानुसार तालुका निवडा */}
              <div>
                <SmartDropdownField
                  label="तालुका (निवडलेल्या जिल्ह्याचे तालुके)"
                  value={studentTaluka}
                  onChange={setStudentTaluka}
                  options={availableStudentTalukas}
                  placeholder={
                    studentDistrict
                      ? `-- ${studentDistrict} मधील तालुका निवडा --`
                      : "-- आधी जिल्हा निवडा --"
                  }
                  customPlaceholder="उदा. तासगाव, मिरज, हवेली किंवा स्वतः तालुका लिहा..."
                />
                {!studentDistrict && (
                  <p className="text-[11px] font-bold text-amber-600 mt-1">
                    ℹ️ तालुक्यांची यादी पाहण्यासाठी कृपया आधी वरील जिल्हा निवडा.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5: ५. कुटुंब व संपर्क माहिती (Family & Contact) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <HeartHandshake className="size-5" />
                <span>५. कुटुंब व संपर्क माहिती (Family & Contact)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                पालक संपर्क
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              {/* Mother Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    आईचे नाव
                  </label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    placeholder="आईचे पूर्ण नाव"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <SmartDropdownField
                    label="आईचे शिक्षण"
                    value={motherEducation}
                    onChange={setMotherEducation}
                    options={PARENT_EDUCATION_OPTIONS}
                    placeholder="-- आईचे शिक्षण निवडा --"
                    customPlaceholder="उदा. १० वी, पदवी किंवा स्वतः शिक्षण लिहा..."
                  />
                </div>

                <div>
                  <SmartDropdownField
                    label="आईचा व्यवसाय"
                    value={motherOccupation}
                    onChange={setMotherOccupation}
                    options={MOTHER_OCCUPATION_OPTIONS}
                    placeholder="-- आईचा व्यवसाय निवडा --"
                    customPlaceholder="उदा. गृहिणी, नोकरी, शेती किंवा व्यवसाय लिहा..."
                  />
                </div>
              </div>

              {/* Father Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    वडिलांचे नाव
                  </label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="वडिलांचे पूर्ण नाव"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <SmartDropdownField
                    label="वडिलांचे शिक्षण"
                    value={fatherEducation}
                    onChange={setFatherEducation}
                    options={PARENT_EDUCATION_OPTIONS}
                    placeholder="-- वडिलांचे शिक्षण निवडा --"
                    customPlaceholder="उदा. १२ वी, पदवी किंवा स्वतः शिक्षण लिहा..."
                  />
                </div>

                <div>
                  <SmartDropdownField
                    label="वडिलांचा व्यवसाय"
                    value={fatherOccupation}
                    onChange={setFatherOccupation}
                    options={FATHER_OCCUPATION_OPTIONS}
                    placeholder="-- वडिलांचा व्यवसाय निवडा --"
                    customPlaceholder="उदा. शेती, नोकरी, व्यवसाय किंवा काम लिहा..."
                  />
                </div>
              </div>

              {/* Guardian, Relation, Siblings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    पालकाचे नाव (इतर)
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="लागू असल्यास"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    नाते
                  </label>
                  <input
                    type="text"
                    value={guardianRelation}
                    onChange={(e) => setGuardianRelation(e.target.value)}
                    placeholder="उदा. आजोबा, काका"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    भावंडे संख्या
                  </label>
                  <input
                    type="text"
                    value={siblingCount}
                    onChange={(e) => setSiblingCount(e.target.value)}
                    placeholder="उदा. 1, 2"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    भावंडांचे वय
                  </label>
                  <input
                    type="text"
                    value={siblingAge}
                    onChange={(e) => setSiblingAge(e.target.value)}
                    placeholder="उदा. 8 वर्षे"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Address Lines & Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    पत्ता - ओळ १
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="घराचा क्रमांक, गल्ली / वाडी"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    पत्ता - ओळ २
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="गावाचे नाव, पोस्ट"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    पिन कोड (६ कप्पे - HPC पान २)
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="उदा. 416416"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Phones, Area, Medium */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    भ्रमणध्वनी (फोन)
                  </label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="१० अंकी क्रमांक"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    वडिलांचा मोबाईल
                  </label>
                  <input
                    type="text"
                    value={fatherPhone}
                    onChange={(e) => setFatherPhone(e.target.value)}
                    placeholder="१० अंकी क्रमांक"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    आईचा मोबाईल
                  </label>
                  <input
                    type="text"
                    value={motherPhone}
                    onChange={(e) => setMotherPhone(e.target.value)}
                    placeholder="१० अंकी क्रमांक"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    परिसर प्रकार
                  </label>
                  <select
                    value={areaType}
                    onChange={(e) => setAreaType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="ग्रामीण">ग्रामीण (Rural)</option>
                    <option value="शहरी">शहरी (Urban)</option>
                  </select>
                </div>

                <div>
                  <SmartDropdownField
                    label="मातृभाषा"
                    value={motherTongue}
                    onChange={setMotherTongue}
                    options={MOTHER_TONGUE_OPTIONS}
                    placeholder="-- मातृभाषा निवडा --"
                    customPlaceholder="उदा. मराठी, हिंदी किंवा मातृभाषा लिहा..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    शिक्षणाचे माध्यम
                  </label>
                  <select
                    value={mediumOfInstruction}
                    onChange={(e) => setMediumOfInstruction(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  >
                    <option value="मराठी">मराठी</option>
                    <option value="सेमी इंग्रजी">सेमी इंग्रजी</option>
                    <option value="इंग्रजी">इंग्रजी</option>
                    <option value="उर्दू">उर्दू</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: ६. बँक खाते माहिती (Bank Account) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <CreditCard className="size-5" />
                <span>६. बँक खाते माहिती (Bank Account)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                DBT व योजना
              </span>
            </div>

            <div className="p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  बँकेचे नाव
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="उदा. स्टेट बँक ऑफ इंडिया"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  बँक खाते क्रमांक
                </label>
                <input
                  type="text"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder="उदा. 12345678901"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  IFSC कोड
                </label>
                <input
                  type="text"
                  value={bankIfscCode}
                  onChange={(e) => setBankIfscCode(e.target.value)}
                  placeholder="उदा. SBIN0001234"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* Part A(1) Bottom Actions */}
          <div className="pt-4 flex items-center justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0f6b4d] hover:bg-[#0c593f] text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>जतन करा आणि पुढील भाग A(2) (उपस्थिती व आवड) वर जा →</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: भाग A(2) - उपस्थिती अहवाल, आवडीनिवडी (पान ३), माझी आवड (१२ उपक्रम)
      ========================================================================= */}
      {activeTab === "a2" && (
        <div className="space-y-6">
          {/* Section: वार्षिक उपस्थिती अहवाल */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CalendarCheck className="size-5 text-emerald-700" />
                  <span>वार्षिक उपस्थिती अहवाल (Annual Attendance Report)</span>
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

            {/* Working Days & Attendance Quick Info & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="size-5 text-emerald-700 shrink-0" />
                <div>
                  <span className="text-xs font-black text-emerald-950 block">
                    प्रत्येक महिन्याचे 'कामाचे दिवस' व 'हजर दिवस' थेट भरा
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-800 block">
                    (हे भरलेले कामकाज दिवस वर्ग पातळीवर सेव्ह होतात व सर्व विद्यार्थ्यांसाठी उपलब्ध राहतात)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFillDefaultWorkingDays}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer self-start sm:self-auto shrink-0"
                title="महाराष्ट्र शासनाचे मानक कामकाज दिवस भरा"
              >
                <Sparkles className="size-3.5 text-emerald-600" />
                <span>मानक कामकाज दिवस भरा (Auto-fill Standard Days)</span>
              </button>
            </div>

            {/* Term 1 Attendance Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-md">
                  सत्र १ (पहिले सत्र - Term 1)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  एकूण: <b className="text-blue-800">{term1Summary.present}</b> / {term1Summary.working} दिवस
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {ATTENDANCE_MONTHS.filter((m) => m.term === 1).map((m) => {
                  const workingVal = workingDays[m.key] !== undefined ? workingDays[m.key] : 0;
                  const presentVal = attendedDays[m.key] ?? 0;
                  return (
                    <div
                      key={m.key}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-300 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/60">
                        <span className="text-xs font-black text-slate-800">{m.labelMarathi}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          workingVal > 0 && presentVal > 0
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white text-slate-400 border-slate-200"
                        }`}>
                          {workingVal > 0 ? `${Math.round((presentVal / workingVal) * 100)}%` : "—"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">कामाचे दिवस</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={workingVal === 0 ? "" : workingVal}
                            onChange={(e) => handleWorkingDaysChange(m.key, e.target.value)}
                            placeholder="22"
                            className="w-full px-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 block mb-1">हजर दिवस</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={presentVal === 0 ? "" : presentVal}
                            onChange={(e) => handleAttendanceChange(m.key, e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-xs font-black text-slate-900 bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Term 1 Summary Box */}
                <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 flex flex-col justify-center text-center">
                  <span className="text-[11px] font-bold text-blue-800">सत्र १ उपस्थिती</span>
                  <span className="text-base font-black text-blue-950 mt-0.5">
                    {term1Summary.present} / {term1Summary.working} दिवस
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    ({term1Summary.working > 0 ? Math.round((term1Summary.present / term1Summary.working) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Term 2 Attendance Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md">
                  सत्र २ (दुसरे सत्र - Term 2)
                </span>
                <span className="text-xs font-bold text-slate-500">
                  एकूण: <b className="text-purple-800">{term2Summary.present}</b> / {term2Summary.working} दिवस
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {ATTENDANCE_MONTHS.filter((m) => m.term === 2).map((m) => {
                  const workingVal = workingDays[m.key] !== undefined ? workingDays[m.key] : 0;
                  const presentVal = attendedDays[m.key] ?? 0;
                  return (
                    <div
                      key={m.key}
                      className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:border-purple-300 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200/60">
                        <span className="text-xs font-black text-slate-800">{m.labelMarathi}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                          workingVal > 0 && presentVal > 0
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-white text-slate-400 border-slate-200"
                        }`}>
                          {workingVal > 0 ? `${Math.round((presentVal / workingVal) * 100)}%` : "—"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-left">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">कामाचे दिवस</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={workingVal === 0 ? "" : workingVal}
                            onChange={(e) => handleWorkingDaysChange(m.key, e.target.value)}
                            placeholder="22"
                            className="w-full px-2 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-700 block mb-1">हजर दिवस</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={presentVal === 0 ? "" : presentVal}
                            onChange={(e) => handleAttendanceChange(m.key, e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 text-xs font-black text-slate-900 bg-white border border-slate-200 rounded-xl text-center focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Term 2 Summary Box */}
                <div className="p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 flex flex-col justify-center text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-purple-800">सत्र २ उपस्थिती</span>
                  <span className="text-base font-black text-purple-950 mt-0.5">
                    {term2Summary.present} / {term2Summary.working} दिवस
                  </span>
                  <span className="text-[10px] text-purple-600 font-semibold">
                    ({term2Summary.working > 0 ? Math.round((term2Summary.present / term2Summary.working) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>

            {/* HPC Page 2: उपस्थिती कमी असल्यास त्याची कारणे */}
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/90 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <span className="text-amber-700">✍️</span>
                  <span>उपस्थिती कमी असल्यास त्याची कारणे (Reasons for Low Attendance — HPC पान २)</span>
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  (लागू असल्यास भरावे)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    कारण १ (Reason 1)
                  </label>
                  <input
                    type="text"
                    value={attendanceReason1}
                    onChange={(e) => setAttendanceReason1(e.target.value)}
                    placeholder="उदा. आजारपण / कौटुंबिक अडचणी"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    कारण २ (Reason 2)
                  </label>
                  <input
                    type="text"
                    value={attendanceReason2}
                    onChange={(e) => setAttendanceReason2(e.target.value)}
                    placeholder="उदा. प्रवासाची गैरसोय / स्थलांतर"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: ७. HPC विशेष: आवडीनिवडी व परिसर (HPC पान ३) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <Heart className="size-5" />
                <span>७. HPC विशेष: आवडीनिवडी व परिसर (HPC पान ३)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                माझा परिसर व मित्र
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-5">
              {/* Favorites row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <SmartDropdownField
                  label="आवडता रंग"
                  value={favoriteColor}
                  onChange={setFavoriteColor}
                  options={COLOR_OPTIONS}
                  placeholder="-- आवडता रंग निवडा --"
                />

                <SmartDropdownField
                  label="आवडता अन्नपदार्थ"
                  value={favoriteFood}
                  onChange={setFavoriteFood}
                  options={FOOD_OPTIONS}
                  placeholder="-- आवडता अन्नपदार्थ निवडा --"
                />

                <SmartDropdownField
                  label="आवडते फूल"
                  value={favoriteFlower}
                  onChange={setFavoriteFlower}
                  options={FLOWER_OPTIONS}
                  placeholder="-- आवडते फूल निवडा --"
                />
              </div>

              {/* Favorites row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <SmartDropdownField
                  label="आवडता खेळ"
                  value={favoriteGame}
                  onChange={setFavoriteGame}
                  options={GAME_OPTIONS}
                  placeholder="-- आवडता खेळ निवडा --"
                />

                <SmartDropdownField
                  label="आवडता प्राणी"
                  value={favoriteAnimal}
                  onChange={setFavoriteAnimal}
                  options={ANIMAL_OPTIONS}
                  placeholder="-- आवडता प्राणी निवडा --"
                />

                <SmartDropdownField
                  label="आवडता विषय"
                  value={favoriteSubject}
                  onChange={setFavoriteSubject}
                  options={SUBJECT_OPTIONS}
                  placeholder="-- आवडता विषय निवडा --"
                />
              </div>

              {/* Ambition (मोठे होऊन मला काय व्हायचे आहे?) */}
              <div>
                <SmartDropdownField
                  label="मोठे होऊन मला काय व्हायचे आहे? (स्वप्न / Aspiration)"
                  value={ambition}
                  onChange={setAmbition}
                  options={ASPIRATION_OPTIONS}
                  placeholder="-- मोठे होऊन काय व्हायचे आहे ते निवडा --"
                />
              </div>

              {/* Close Friends 1, 2, 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    जवळचा मित्र/मैत्रीण १
                  </label>
                  <input
                    type="text"
                    value={bestFriend1}
                    onChange={(e) => setBestFriend1(e.target.value)}
                    placeholder="मित्राचे नाव १"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    जवळचा मित्र/मैत्रीण २
                  </label>
                  <input
                    type="text"
                    value={bestFriend2}
                    onChange={(e) => setBestFriend2(e.target.value)}
                    placeholder="मित्राचे नाव २"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    जवळचा मित्र/मैत्रीण ३
                  </label>
                  <input
                    type="text"
                    value={bestFriend3}
                    onChange={(e) => setBestFriend3(e.target.value)}
                    placeholder="मित्राचे नाव ३"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 8: ८. माझी आवड (Interests - HPC पान ३) */}
          <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm bg-white">
            <div className="bg-[#0f6b4d] text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <Sparkles className="size-5" />
                <span>८. माझी आवड (Interests - HPC पान ३)</span>
              </div>
              <span className="text-[11px] font-black uppercase px-3 py-1 rounded-full bg-white text-[#0f6b4d] shadow-xs">
                १२ उपक्रम पर्याय
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-4">
              <p className="text-xs font-bold text-slate-500">
                विद्यार्थ्याला आवडणारे किंवा आनंद देणारे घटक निवडा (एक किंवा अनेक):
              </p>

              {/* 12 Checkbox Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {HOBBIES_LIST.map((hobby) => {
                  const isChecked = selectedHobbies.includes(hobby);
                  return (
                    <button
                      type="button"
                      key={hobby}
                      onClick={() => toggleHobby(hobby)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                        isChecked
                          ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs"
                          : "bg-slate-50/50 hover:bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{hobby}</span>
                      <div
                        className={`size-4 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-[#0f6b4d] border-[#0f6b4d] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isChecked && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Other Hobbies Input */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  इतर आवड (Other Interests):
                </label>
                <input
                  type="text"
                  value={otherHobby}
                  onChange={(e) => setOtherHobby(e.target.value)}
                  placeholder="इतर आवड असल्यास येथे स्पष्ट लिहा... उदा. सायकल चालवणे, अभिनय, इ."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section: घरातील सहभाग व स्व-मूल्यांकन */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Home className="size-5 text-indigo-700" />
                <span>घरातील सहभाग व स्व-प्रतिबिंब (Home Chores & Self Reflection)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-400">HPC पान ३</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  इतर व्यक्तींसोबत घरातील खालील कामे नियमित करतो/करते:
                </label>
                <input
                  type="text"
                  value={regularHomeChores}
                  onChange={(e) => setRegularHomeChores(e.target.value)}
                  placeholder="उदा. झाडांना पाणी घालणे, वस्तू जागेवर ठेवणे, ताट उचलणे..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  विद्यार्थी स्वतःच्या प्रगतीविषयी नोंदी (Student Reflection)
                </label>
                <textarea
                  rows={2}
                  value={studentSelfReflection}
                  onChange={(e) => setStudentSelfReflection(e.target.value)}
                  placeholder="मला काय शिकायला जास्त आवडते, मला काय सोपे जाते..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 bg-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  पालक-शिक्षक सहयोग व विशेष अभिप्राय
                </label>
                <textarea
                  rows={2}
                  value={parentCollaborationNotes}
                  onChange={(e) => setParentCollaborationNotes(e.target.value)}
                  placeholder="पालकांनी नोंदवलेले निरीक्षणे किंवा शिक्षकांच्या सूचना..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-600 bg-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Part A(2) Bottom Action Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setActiveTab("a1");
                window.scrollTo({ top: 160, behavior: "smooth" });
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ← मागील: भाग A(1)
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 rounded-2xl bg-[#0f6b4d] hover:bg-[#0c593f] text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>जतन करा आणि भाग ब (सत्रनिहाय मूल्यमापन) वर जा →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
