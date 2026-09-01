import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Book,
  GraduationCap,
  MapPin,
  Calendar,
  Edit3,
  ShieldCheck,
  Award,
  BookOpen,
  Clock,
  LogOut,
  Star,
  Loader2,
  School,
  Send,
  CheckCircle,
  Table,
  ClipboardList,
  BookCheck,
  Users2,
  FileText,
  PieChart as ChartPie,
  Utensils,
  CalendarDays,
  Calculator,
  Cake,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { StudentBirthdaySystem } from "@/components/StudentBirthdaySystem";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { useLanguage } from "@/hooks/use-language";

import { getUnifiedSchoolProfile, saveUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "My Profile — SMART LEARNING" }] }),
  component: () => (
    <ProtectedRoute>
      <Page />
    </ProtectedRoute>
  ),
});

const SCHOOL_RESOURCES = [
  { m: "वेळापत्रक", e: "Timetable", icon: CalendarDays },
  { m: "दिनविशेष", e: "Paripath (Daily Assembly)", icon: Star },
  { m: "टेम्पलेट", e: "Template", icon: FileText },
  {
    m: "वार्षिक मासिक नियोजन",
    e: "Annual & Monthly Planning & Question Bank",
    icon: BookCheck,
  },
  { m: "प्रश्नपेढी", e: "Question Bank", icon: ClipboardList },
  { m: "होमवर्क", e: "Homework", icon: BookOpen },
  { m: "मासिक सभा", e: "Monthly Meeting (Masik Sabha)", icon: Users2 },
  { m: "एमडीएम", e: "Mid-Day Meal (MDM)", icon: Utensils },
  { m: "शिक्षक संख्यिका", e: "Teacher Statistics", icon: ChartPie },
  { m: "विद्यार्थी संख्यिका", e: "Student Statistics", icon: Users2 },
  { m: "परिपाठ नोंदवही", e: "Paripath Nondvahi (Daily Activity Record Book)", icon: Table },
  { m: "एसक्यूएफ मूल्यांकन", e: "SQAAF Evaluation", icon: Calculator },
  { m: "टाचन वही", e: "Tachanvahi (Teaching Record Notebook)", icon: Edit3 },
];

function Page() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    location: "Mumbai, India",
    major: "General Science",
    gpa: "A+",
    dob: "",
    studentClass: "",
    rollNo: "",
    schoolName: "",
    udise: "",
    kendra: "",
    taluka: "",
    district: "",
    headmaster: "",
  });
  const [saving, setSaving] = useState(false);
  const [schoolStatus, setSchoolStatus] = useState<
    "none" | "pending" | "accepted"
  >("none");
  const [udiseCode, setUdiseCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const unified = getUnifiedSchoolProfile();
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        let firestoreData: any = {};
        if (docSnap.exists()) {
          firestoreData = docSnap.data();
          setProfile(firestoreData);
          if (firestoreData.schoolConnection)
            setSchoolStatus(firestoreData.schoolConnection.status);
        }
        setFormData({
          fullName: firestoreData.fullName || firestoreData.teacherName || unified.teacherName || "",
          location: firestoreData.location || "Mumbai, India",
          major: firestoreData.major || "General Science",
          gpa: firestoreData.gpa || "A+",
          dob: firestoreData.dob || "",
          studentClass: firestoreData.studentClass || "",
          rollNo: firestoreData.rollNo || "",
          schoolName: firestoreData.schoolName || unified.schoolName || "",
          udise: firestoreData.udise || unified.udise || "",
          kendra: firestoreData.kendra || unified.kendra || "",
          taluka: firestoreData.taluka || unified.taluka || "",
          district: firestoreData.district || firestoreData.jilha || unified.district || "",
          headmaster: firestoreData.headmaster || unified.headmaster || "",
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, "users", user.uid);
      const updatePayload = {
        ...profile,
        ...formData,
        jilha: formData.district,
        teacherName: formData.fullName,
      };
      await setDoc(docRef, updatePayload, { merge: true });
      setProfile(updatePayload);

      // Save to unified local storage keys across MDM, Paripath and Reports
      saveUnifiedSchoolProfile({
        schoolName: formData.schoolName,
        udise: formData.udise,
        kendra: formData.kendra,
        taluka: formData.taluka,
        jilha: formData.district,
        district: formData.district,
        headmaster: formData.headmaster,
        teacherName: formData.fullName,
      });

      setIsEditing(false);
      toast.success("प्रोफाईल आणि शाळेची माहिती सर्व रिपार्ट्ससाठी अपडेट झाली!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const fade = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827]">
      <Header />

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-24">
        {/* Header Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-black text-[#6B7280] hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            ← {lang === "mr" ? "मुख्यपृष्ठावर परत जा" : "Back to Home"}
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left Profile Card */}
          <motion.div {...fade} className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[3rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="size-28 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-4xl font-black mb-5 shadow-lg shadow-indigo-200">
                {formData.fullName?.[0] || user?.email?.[0]?.toUpperCase()}
              </div>

              {isEditing ? (
                <input
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center font-black text-lg w-full"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Full Name"
                />
              ) : (
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {profile?.fullName || user?.displayName || "User"}
                </h2>
              )}

              <p className="text-indigo-600 font-extrabold text-xs flex items-center gap-1.5 mt-2 uppercase tracking-wider bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                <ShieldCheck className="size-4 text-indigo-600" />
                <span>
                  {profile?.role === "teacher" || localStorage.getItem("teacher_udise")
                    ? "Educator Profile"
                    : profile?.role === "admin"
                    ? "Administrator Profile"
                    : "Learner Profile"}
                </span>
              </p>

              <div className="w-full mt-8 space-y-3.5">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Mail className="size-5 text-indigo-500 shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Email Address
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full mt-6 space-y-3">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                >
                  {isEditing ? (
                    "रद्द करा (Cancel)"
                  ) : (
                    <>
                      <Edit3 className="size-4" /> माहिती बदला (Edit Profile)
                    </>
                  )}
                </button>

                {isEditing && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "जतन करा (Save Changes)"
                    )}
                  </button>
                )}

                <button
                  onClick={async () => {
                    await auth.signOut();
                    toast.success("Signed out successfully.");
                    window.location.href = "/";
                  }}
                  className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-red-100 transition-all active:scale-95"
                >
                  <LogOut className="size-4" /> बाहेर पडा (Sign Out)
                </button>
              </div>
            </div>
          </motion.div>

          {/* Right Main Info Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  <School className="size-6 text-indigo-600" /> प्रोफाइल व शाळा माहिती (User Profile Details)
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <Edit3 className="size-4" /> {isEditing ? "Cancel" : "Edit Info"}
                </button>
              </div>

              {/* User / School Info Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/80 p-6 rounded-[2rem] border border-slate-200/80">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">शाळेचे नाव (School Name)</label>
                  {isEditing ? (
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.schoolName}
                      onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                      placeholder="शाळेचे नाव प्रविष्ट करा (Enter School Name)"
                    />
                  ) : (
                    <div className="text-sm font-extrabold text-slate-900 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                      {formData.schoolName || "माहिती भरलेली नाही"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">युडायस नंबर (UDISE Code)</label>
                  {isEditing ? (
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.udise}
                      onChange={(e) => setFormData({ ...formData, udise: e.target.value })}
                      placeholder="11 अंकी UDISE कोड प्रविष्ट करा"
                    />
                  ) : (
                    <div className="text-xs font-bold text-slate-900 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                      {formData.udise || "माहिती भरलेली नाही"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">केंद्र (Kendra / Center)</label>
                  {isEditing ? (
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.kendra}
                      onChange={(e) => setFormData({ ...formData, kendra: e.target.value })}
                      placeholder="केंद्र नाव प्रविष्ट करा"
                    />
                  ) : (
                    <div className="text-xs font-bold text-slate-900 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                      {formData.kendra || "माहिती भरलेली नाही"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">तालुका (Taluka)</label>
                  {isEditing ? (
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.taluka}
                      onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                      placeholder="तालुका प्रविष्ट करा"
                    />
                  ) : (
                    <div className="text-xs font-bold text-slate-900 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                      {formData.taluka || "माहिती भरलेली नाही"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">जिल्हा (District)</label>
                  {isEditing ? (
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      placeholder="जिल्हा प्रविष्ट करा"
                    />
                  ) : (
                    <div className="text-xs font-bold text-slate-900 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                      {formData.district || "माहिती भरलेली नाही"}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1">मुख्याध्यापक नाव (Headmaster Name)</label>
                  {isEditing ? (
                    <input
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.headmaster}
                      onChange={(e) => setFormData({ ...formData, headmaster: e.target.value })}
                      placeholder="मुख्याध्यापक नाव प्रविष्ट करा"
                    />
                  ) : (
                    <div className="text-xs font-bold text-slate-900 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                      {formData.headmaster || "माहिती भरलेली नाही"}
                    </div>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : "जतन करा (Save Info)"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
