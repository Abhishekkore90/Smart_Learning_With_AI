import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User,
  GraduationCap,
  ArrowRight,
  Loader2,
  Sparkles,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  School,
  Menu,
  X,
  BookOpen,
  Compass,
  Info,
  ShieldCheck,
  Database,
  Award,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";
import teacherLoginBg from "@/assets/teacher login.avif";

export const Route = createFileRoute("/teacher/signup")({
  head: () => ({
    meta: [{ title: "Join Educator Network — SGK Brainova Smart Learning With AI" }],
  }),
  component: TeacherSignupPage,
});

function TeacherSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [udise, setUdise] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, { displayName: name });

      // Save educator profile in users collection
      await setDoc(doc(db, "users", userCredential.user.uid), {
        fullName: name,
        email: email,
        phone: phone,
        address: address,
        udise: udise,
        schoolName: schoolName,
        role: "teacher",
        createdAt: new Date().toISOString(),
        verified: false,
      });

      // Save educator profile in teachers collection for dashboard lookups
      await setDoc(doc(db, "teachers", userCredential.user.uid), {
        fullName: name,
        email: email,
        udise: udise,
        schoolName: schoolName,
        address: address,
        state: "Maharashtra",
        board: "Maharashtra ZP Teacher",
        verified: false,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem("teacher_udise", udise);
      localStorage.setItem("sqaaf_teacher_profile", JSON.stringify({
        fullName: name,
        email: email,
        udise: udise,
        schoolName: schoolName,
        address: address,
        state: "Maharashtra",
        board: "Maharashtra ZP Teacher",
        role: "teacher"
      }));
      toast.success("Educator account created successfully!");
      window.location.href = "/teacher";
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans selection:bg-teal-500/30 selection:text-teal-900 overflow-hidden relative">
      {/* Dynamic Float Keyframe injection */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-slow 7s ease-in-out infinite;
          animation-delay: 3.5s;
        }
        .animate-pulse-soft {
          animation: pulse-soft 8s ease-in-out infinite;
        }
      `}</style>

      {/* Background Graphic Engine */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        {/* Background Image with Original Colors */}
        <img
          src={teacherLoginBg}
          alt="Educator Background"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-100 z-0 scale-105"
        />

        {/* Subtle dark overlay to ensure the white form remains readable */}
        <div className="absolute inset-0 bg-slate-900/40 z-10" />
      </div>

      {/* Main Single-Column Workspace */}
      <div className="flex-1 flex w-full min-h-screen relative z-10">
        {/* Centered Form Container */}
        <div className="flex-1 flex flex-col justify-center items-center p-4 md:p-12 lg:p-16 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", damping: 20 }}
            className="w-full max-w-xl bg-slate-950/60 backdrop-blur-3xl border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative overflow-hidden"
          >
            {/* Glowing Accent Blobs behind Card */}
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-teal-500/20 rounded-full blur-[60px] pointer-events-none animate-pulse" />
            <div
              className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-emerald-500/20 rounded-full blur-[60px] pointer-events-none animate-pulse"
              style={{ animationDelay: "4s" }}
            />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
              >
                ← Home
              </Link>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-full animate-pulse shadow-sm">
                <Sparkles className="size-3.5 text-teal-400" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-teal-300">
                  Educator Portal
                </span>
              </div>
            </div>

            <div className="mb-8 text-center relative z-10">
              <h2 className="text-3xl font-black tracking-tight text-white italic">
                Teacher Registration
              </h2>
              <p className="text-slate-300 mt-1.5 font-semibold text-[11px]">
                Join our verified network of professional educators.
              </p>
            </div>

            <form
              className="space-y-4.5 relative z-10"
              onSubmit={handleSignup}
              autoComplete="on"
            >
              {/* 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Legal Name */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                    Full Legal Name
                  </label>
                  <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner group">
                    <User className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                      name="fullname"
                      id="fullname"
                      type="text"
                      autoComplete="name"
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Institutional Email */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                    Institutional Email
                  </label>
                  <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner group">
                    <Mail className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                      name="email"
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Contact Number */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                    Contact Number
                  </label>
                  <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner group">
                    <Phone className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                      name="phone"
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* School UDISE Code */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                    School UDISE Code
                  </label>
                  <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner group">
                    <School className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                      name="udise"
                      id="udise"
                      type="text"
                      autoComplete="off"
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full font-mono border-none"
                      value={udise}
                      onChange={(e) => setUdise(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* School Name */}
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                    School Name
                  </label>
                  <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner group">
                    <School className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                    <input
                      name="schoolName"
                      id="schoolName"
                      type="text"
                      autoComplete="off"
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* School Address */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                  School Address
                </label>
                <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner group">
                  <MapPin className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                  <input
                    name="address"
                    id="address"
                    type="text"
                    autoComplete="street-address"
                    className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Secure Password */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1.5">
                  Secure Password
                </label>
                <div className="bg-slate-950/50 border border-slate-700/50 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-3 px-4 h-12 transition-all shadow-inner relative group">
                  <Lock className="size-3.5 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
                  <input
                    name="password"
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-500 hover:text-teal-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Glowing Gradient Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] shadow-[0_10px_35px_rgba(13,148,136,0.3)] hover:shadow-[0_15px_45px_rgba(13,148,136,0.5)] flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 mt-8 relative group overflow-hidden"
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin text-slate-950" />
                ) : (
                  <>
                    Register As Educator
                    <ArrowRight
                      size={12}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[10px] text-slate-400 mt-6 font-black uppercase tracking-widest relative z-10">
              Already verified?{" "}
              <Link
                to="/login"
                search={{ role: "teacher" } as any}
                className="text-teal-400 hover:text-teal-300 hover:underline font-black transition-all"
              >
                Sign In Gateway
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
