import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  GraduationCap,
  School,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CloudUpload,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

import loginBg from "@/assets/teacher login.avif";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; role?: string } => ({
    redirect: search.redirect as string | undefined,
    role: search.role as string | undefined,
  }),
<<<<<<< HEAD
  head: () => ({ meta: [{ title: "Institutional Gateway — SGK Brainova Smart Learning With AI" }] }),
=======
  head: () => ({
    meta: [
      { title: "Institutional Gateway — SGK Brainova Smart Learning With AI" },
    ],
  }),
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
  component: UnifiedLoginPortal,
});

type AuthRole = "teacher" | "admin" | "uploader" | "student";

const ROLE_CONFIGS: {
  id: AuthRole;
  icon: React.ElementType;
  color: string;
  ring: string;
  labelKey: string;
  badgeKey: string;
  identifierLabelKey: string;
  identifierPlaceholderKey: string;
  descKey: string;
}[] = [
  {
    id: "student",
    icon: GraduationCap,
    color: "from-sky-500 to-indigo-500",
    ring: "ring-sky-500/40",
    labelKey: "login_student",
    badgeKey: "login_student_badge",
    identifierLabelKey: "login_email_usid",
    identifierPlaceholderKey: "login_email_usid_placeholder",
    descKey: "login_student_desc",
  },
  {
    id: "teacher",
    icon: School,
    color: "from-teal-500 to-emerald-500",
    ring: "ring-teal-500/40",
    labelKey: "login_teacher",
    badgeKey: "login_teacher_badge",
    identifierLabelKey: "login_email_udise",
    identifierPlaceholderKey: "login_email_udise_placeholder",
    descKey: "login_teacher_desc",
  },
  {
    id: "admin",
    icon: ShieldCheck,
    color: "from-rose-500 to-pink-500",
    ring: "ring-rose-500/40",
    labelKey: "login_admin",
    badgeKey: "login_admin_badge",
    identifierLabelKey: "login_admin_email",
    identifierPlaceholderKey: "login_email_usid_placeholder",
    descKey: "login_admin_desc",
  },
  {
    id: "uploader",
    icon: CloudUpload,
    color: "from-violet-500 to-purple-500",
    ring: "ring-violet-500/40",
    labelKey: "login_uploader",
    badgeKey: "login_uploader_badge",
    identifierLabelKey: "login_creator_email",
    identifierPlaceholderKey: "login_creator_email_placeholder",
    descKey: "login_uploader_desc",
  },
];

function UnifiedLoginPortal() {
  const { redirect, role: urlRole } = Route.useSearch();
  const [activeRole, setActiveRole] = useState<AuthRole>(
    (urlRole as AuthRole) || "student",
  );
  const roleConfigRaw = ROLE_CONFIGS.find((r) => r.id === activeRole)!;
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;
  const roleConfig = {
    ...roleConfigRaw,
    label: t[roleConfigRaw.labelKey],
    badge: t[roleConfigRaw.badgeKey],
    identifierLabel: t[roleConfigRaw.identifierLabelKey],
    identifierPlaceholder: t[roleConfigRaw.identifierPlaceholderKey],
    desc: t[roleConfigRaw.descKey],
  };

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSwitch = (newRole: AuthRole) => {
    setActiveRole(newRole);
    setIdentifier("");
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeRole === "admin") {
        if (identifier === "superadmin123@gmail.com" && password === "123456") {
          sessionStorage.setItem("is_super_admin", "true");
          toast.success("Super Admin Authenticated.");
          window.location.href = "/admin";
          return;
        } else {
          throw new Error("Invalid Administrative Credentials.");
        }
      }

      let email = identifier;

      if (activeRole === "teacher" && !identifier.includes("@")) {
        const q = query(
          collection(db, "teachers"),
          where("udise", "==", identifier),
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty)
          throw new Error("No educator record found with this UDISE code.");
        email = snapshot.docs[0].data().email;
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      let userDoc;
      if (activeRole === "teacher") {
        userDoc = await getDoc(doc(db, "teachers", user.uid));
        if (!userDoc.exists()) {
          const fallbackDoc = await getDoc(doc(db, "users", user.uid));
          if (fallbackDoc.exists()) {
            userDoc = fallbackDoc;
          }
        }
      } else {
        userDoc = await getDoc(doc(db, "users", user.uid));
      }

      if (!userDoc || !userDoc.exists()) {
        await auth.signOut();
        throw new Error("User profile not found in database.");
      }

      const userData = userDoc.data();
<<<<<<< HEAD
      const userRole = activeRole === "teacher" && userDoc.ref.parent.id === "teachers" ? "teacher" : (userData.role || "student");
=======
      const userRole =
        activeRole === "teacher" && userDoc.ref.parent.id === "teachers"
          ? "teacher"
          : userData.role || "student";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

      if (userRole !== activeRole) {
        await auth.signOut();
        throw new Error(
          `Access Denied: You are registered as ${userRole}. Please select the correct login gateway.`,
        );
      }

      if (activeRole === "teacher" && userData.udise) {
        localStorage.setItem("teacher_udise", userData.udise);
<<<<<<< HEAD
        localStorage.setItem("sqaaf_teacher_profile", JSON.stringify({
          fullName: userData.fullName,
          email: userData.email,
          udise: userData.udise,
          schoolName: userData.schoolName,
          address: userData.address,
          role: "teacher"
        }));
=======
        localStorage.setItem(
          "sqaaf_teacher_profile",
          JSON.stringify({
            fullName: userData.fullName,
            email: userData.email,
            udise: userData.udise,
            schoolName: userData.schoolName,
            address: userData.address,
            role: "teacher",
          }),
        );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      }

      toast.success(`Identity Verified. Welcome back!`);

      if (activeRole === "student") {
        window.location.href = redirect || "/student";
      } else if (activeRole === "teacher") {
        window.location.href = redirect || "/teacher";
      } else if (activeRole === "uploader") {
        window.location.href = redirect || "/courses?action=upload";
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          "Authentication failed. Please verify your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col font-sans selection:bg-primary/20 selection:text-primary relative overflow-y-auto bg-slate-50">
      {/* Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-md group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>{lang === "mr" ? "मुख्यपृष्ठ" : "Home"}</span>
        </Link>
      </div>

      {/* Background */}
      <div className="fixed inset-0 z-0 bg-slate-900 overflow-hidden select-none pointer-events-none">
        <img
          src={loginBg}
          alt="Classroom Background"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-100"
        />
        <div className="absolute inset-0 bg-slate-900/45 z-10" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative z-10 w-full max-w-[1400px] mx-auto py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", damping: 20 }}
          className="w-full max-w-lg"
        >
          {/* Role Selector Card */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[1.8rem] p-2 mb-4 shadow-lg">
            <div className="grid grid-cols-4 gap-1.5">
              {ROLE_CONFIGS.map((r) => {
                const Icon = r.icon;
                const isActive = activeRole === r.id;
                return (
                  <motion.button
                    key={r.id}
                    onClick={() => handleRoleSwitch(r.id)}
                    whileTap={{ scale: 0.95 }}
                    className={`relative flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl text-center transition-all duration-300 overflow-hidden ${
                      isActive
                        ? "text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="roleTab"
                        className={`absolute inset-0 bg-gradient-to-br ${r.color} rounded-2xl`}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.5,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <Icon
                        className="size-4"
                        strokeWidth={isActive ? 2.5 : 1.5}
                      />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                        {t[r.labelKey]}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Login Form Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRole}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-slate-950/65 backdrop-blur-3xl border border-white/10 p-7 md:p-10 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-white"
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] mb-4 bg-gradient-to-r ${roleConfig.color} text-white shadow-lg`}
                >
                  <Sparkles size={11} />
                  {roleConfig.badge}
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight italic">
                  {t.login_welcome}
                </h2>
                <p className="text-slate-400 mt-1.5 font-medium text-xs leading-relaxed max-w-xs mx-auto">
                  {roleConfig.desc}
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Identifier Field */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                    {roleConfig.identifierLabel}
                  </label>
                  <div
                    className={`bg-slate-950/50 border border-slate-700/50 focus-within:border-transparent focus-within:ring-2 ${roleConfig.ring} focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-4 px-5 h-14 transition-all shadow-inner group`}
                  >
                    <User className="size-4 text-slate-500 group-focus-within:text-white shrink-0" />
                    <input
                      type="text"
                      placeholder={roleConfig.identifierPlaceholder}
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {t.login_password}
                    </label>
                    <a className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:underline cursor-pointer transition-colors">
                      {t.login_forgot}
                    </a>
                  </div>
                  <div
                    className={`bg-slate-950/50 border border-slate-700/50 focus-within:border-transparent focus-within:ring-2 ${roleConfig.ring} focus-within:bg-slate-900/80 rounded-2xl flex items-center gap-4 px-5 h-14 transition-all shadow-inner relative group`}
                  >
                    <Lock className="size-4 text-slate-500 group-focus-within:text-white shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  disabled={loading}
                  className={`w-full h-14 bg-gradient-to-r ${roleConfig.color} text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-6 uppercase text-xs tracking-[0.15em] relative group overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <>
                      {t.login_submit}{" "}
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              {(activeRole === "student" || activeRole === "uploader") && (
                <p className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t.login_no_account}{" "}
                  <Link
                    to={
                      activeRole === "uploader" ? "/uploader/signup" : "/signup"
                    }
                    className="text-white/70 hover:text-white hover:underline ml-1 font-black transition-all"
                  >
                    {t.login_create_one}
                  </Link>
                </p>
              )}
              {activeRole === "teacher" && (
                <p className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t.login_new_educator}{" "}
                  <Link
                    to="/teacher/signup"
                    className="text-white/70 hover:text-white hover:underline ml-1 font-black transition-all"
                  >
                    {t.login_register_here}
                  </Link>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>

      <div className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400/60">
          © 2026 SGK BRAINOVA SMART LEARNING WITH AI. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
