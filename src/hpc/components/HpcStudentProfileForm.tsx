import React, { useState, useEffect } from "react";
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

export function HpcStudentProfileForm({
  studentId,
  academicYear,
  stageId,
  classId,
  onBack,
  onSaved,
}: HpcStudentProfileFormProps) {
  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [age, setAge] = useState("");
  const [birthday, setBirthday] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [familyDescription, setFamilyDescription] = useState("");
  const [ambition, setAmbition] = useState("");
  const [friendsText, setFriendsText] = useState("");

  const [favoriteColor, setFavoriteColor] = useState("");
  const [favoriteFlower, setFavoriteFlower] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [favoriteGame, setFavoriteGame] = useState("");
  const [favoriteAnimal, setFavoriteAnimal] = useState("");
  const [favoriteSubject, setFavoriteSubject] = useState("");

  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [otherHobby, setOtherHobby] = useState("");
  const [regularHomeChores, setRegularHomeChores] = useState("");
  const [studentSelfReflection, setStudentSelfReflection] = useState("");
  const [parentCollaborationNotes, setParentCollaborationNotes] = useState("");

  // Load existing profile & student
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const st = await getHpcStudentById(studentId);
      if (!isMounted) return;
      setStudent(st);

      // Defaults from student details
      if (st) {
        setBirthday(st.dob || "");
        setHomeAddress(st.address || "");
      }

      const existing = await getHpcStudentProfile(studentId, academicYear);
      if (!isMounted) return;

      if (existing) {
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
  }, [studentId, academicYear]);

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
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
        age,
        birthday,
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
      toast.success("भाग अ: विद्यार्थी वैयक्तिक माहिती यशस्वीरीत्या जतन झाली!");
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error("माहिती जतन करताना त्रुटी आली: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी माहिती लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="size-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md overflow-hidden">
            {student?.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              student?.name?.charAt(0) || "वि"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                भाग अ (२)
              </span>
              <span className="text-xs font-bold text-slate-500">
                हजेरी क्र: <b className="text-slate-800">{student?.rollNo}</b>
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {student?.fullName || student?.name}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              मी व माझा परिसर — वैयक्तिक माहिती व आवडीनिवडी
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>नोंद सेव्ह करा (Save Profile)</span>
        </button>
      </div>

      {/* Part A Form Sections */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        {/* Section 1: Basic Profile Bubbles */}
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Smile className="size-5 text-indigo-600" />
            <span>१. वैयक्तिक ओळख व परिसर (Personal Profile)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
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

        {/* Section 2: Favorites (माझा आवडता) */}
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Heart className="size-5 text-rose-500" />
            <span>२. माझा आवडता... (My Favorites)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-5">
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

        {/* Section 3: Hobbies Checkboxes (माझी आवड आहे) */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              <span>३. माझी आवड आहे... (My Interests / Hobbies)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              (एकापेक्षा जास्त पर्याय निवडू शकता - ✓ अशी खूण करा)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
            {SELF_ASSESSMENT_OPTIONS.hobbiesList.map((hobby) => {
              const isChecked = selectedHobbies.includes(hobby);
              return (
                <button
                  type="button"
                  key={hobby}
                  onClick={() => toggleHobby(hobby)}
                  className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all text-left cursor-pointer ${
                    isChecked
                      ? "bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs"
                      : "bg-slate-50/50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  <span>{hobby}</span>
                  <div
                    className={`size-4 rounded-md border flex items-center justify-center ${
                      isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
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

        {/* Section 4: Home Chores & Family Collaboration */}
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Home className="size-5 text-teal-600" />
            <span>४. घरातील कामे व जबाबदाऱ्या (Home Tasks with Family)</span>
          </h3>

          <div className="mt-4 space-y-4">
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

        {/* Bottom Save Action */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          {onBack && (
            <button
              onClick={onBack}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              रद्द करा (Cancel)
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span>माहिती सेव्ह करा (Save Part A)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
