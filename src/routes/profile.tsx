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

import { useLanguage } from "@/hooks/use-language";

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
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile(data);
          setFormData({
            fullName: data.fullName || "",
            location: data.location || "Mumbai, India",
            major: data.major || "General Science",
            gpa: data.gpa || "A+",
            dob: data.dob || "",
            studentClass: data.studentClass || "",
            rollNo: data.rollNo || "",
          });
          if (data.schoolConnection)
            setSchoolStatus(data.schoolConnection.status);
        }
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
      await setDoc(docRef, { ...profile, ...formData }, { merge: true });
      setProfile({ ...profile, ...formData });
      setIsEditing(false);
      toast.success("Profile updated successfully!");
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
    <div className="min-h-screen bg-white">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Sidebar Info */}
            <motion.div {...fade} className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                <div className="size-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl font-black mb-6 shadow-xl shadow-indigo-100">
                  {formData.fullName?.[0] || user?.email?.[0]?.toUpperCase()}
                </div>

                {isEditing ? (
                  <input
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center font-black text-xl w-full"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                  />
                ) : (
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight italic">
                    {profile?.fullName || "Scholar"}
                  </h2>
                )}

                <p className="text-slate-400 font-bold text-xs flex items-center gap-2 mt-2 uppercase tracking-widest">
                  <ShieldCheck className="size-4 text-indigo-500" /> Verified
                  Student
                </p>

                <div className="w-full mt-10 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <Mail className="size-5 text-indigo-500" />
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Email
                      </p>
                      <p className="text-sm font-bold truncate max-w-[150px]">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <MapPin className="size-5 text-indigo-500" />
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Location
                      </p>
                      <p className="text-sm font-bold">{formData.location}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100"
                >
                  {isEditing ? (
                    "Cancel"
                  ) : (
                    <>
                      <Edit3 className="size-4" /> Edit Profile
                    </>
                  )}
                </button>
                {isEditing && (
                  <button
                    onClick={handleSave}
                    className="w-full mt-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                )}
              </div>

              <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
                <Award className="size-12 mb-4 opacity-50" />
                <h3 className="font-black text-xl italic">
                  Scholar Distinction
                </h3>
                <p className="text-indigo-100 text-sm font-medium mt-2">
                  You are performing exceptionally well. Keep up the excellence!
                </p>
              </div>
            </motion.div>

            {/* Main Content Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Birthday System Integration */}
              <StudentBirthdaySystem
                student={{
                  fullName: profile?.fullName || user?.displayName || "Student",
                  class: profile?.studentClass,
                  rollNo: profile?.rollNo,
                  dob: profile?.dob,
                }}
              />

              <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm space-y-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight italic flex items-center gap-3">
                  <Book className="size-6 text-indigo-500" /> Academic Profile
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    {
                      label: "Current Class",
                      value: formData.studentClass || "Not Set",
                      icon: GraduationCap,
                    },
                    {
                      label: "Roll Number",
                      value: formData.rollNo || "Not Set",
                      icon: ClipboardList,
                    },
                    {
                      label: "Performance",
                      value: formData.gpa || "A+",
                      icon: Star,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="p-6 bg-slate-50 rounded-3xl border border-slate-100"
                    >
                      <item.icon className="size-6 text-indigo-500 mb-3" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {item.label}
                      </p>
                      <p className="text-lg font-black text-slate-900 mt-1">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">
                    School Resources
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {SCHOOL_RESOURCES.slice(0, 4).map((res, i) => {
                      const keys = [
                        "timetable",
                        "special-day",
                        "template",
                        "annual-monthly-planning",
                      ];
                      const key = keys[i];
                      return (
                        <Link
                          key={i}
                          to="/school/resource/$resourceId"
                          params={{ resourceId: key }}
                          className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col items-center text-center gap-2 hover:border-indigo-200 transition-all cursor-pointer group"
                        >
                          <div className="size-10 rounded-xl bg-slate-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <res.icon className="size-5" />
                          </div>
                          <p className="text-[10px] font-black text-slate-900 leading-tight">
                            {lang === "en" ? res.e : res.m}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
