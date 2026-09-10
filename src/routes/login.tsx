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
  KeyRound,
  Mail,
  CheckCircle2,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import { clearUnlockedPinSections } from "@/components/teacher/PinGate";

import loginBg from "@/assets/teacher login.avif";

export const Route = createFileRoute("/login")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; role?: string } => ({
    redirect: search.redirect as string | undefined,
    role: search.role as string | undefined,
  }),
  head: () => ({ meta: [{ title: "Institutional Gateway — SGK Brainova Smart Learning With AI" }] }),
  component: UnifiedLoginPortal,
});

type AuthRole = "teacher" | "admin";

const ROLE_CONFIG = {
  id: "teacher" as AuthRole,
  icon: School,
  color: "from-teal-500 to-emerald-500",
  ring: "ring-teal-500/40",
  labelKey: "login_teacher",
  badgeKey: "login_teacher_badge",
  identifierLabelKey: "login_email_udise",
  identifierPlaceholderKey: "login_email_udise_placeholder",
  descKey: "login_teacher_desc",
};

function UnifiedLoginPortal() {
  const { redirect, role: urlRole } = Route.useSearch();
  // Only admin is allowed via URL param, everything else is teacher
  const activeRole: AuthRole = urlRole === "admin" ? "admin" : "teacher";
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;
  const roleConfig = {
    ...ROLE_CONFIG,
    label: t[ROLE_CONFIG.labelKey],
    badge: t[ROLE_CONFIG.badgeKey],
    identifierLabel: t[ROLE_CONFIG.identifierLabelKey],
    identifierPlaceholder: t[ROLE_CONFIG.identifierPlaceholderKey],
    desc: t[ROLE_CONFIG.descKey],
  };

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetEmailSentTo, setResetEmailSentTo] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    clearUnlockedPinSections();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearUnlockedPinSections();
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

      if (!identifier.includes("@")) {
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

      let userDoc = await getDoc(doc(db, "teachers", user.uid));
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, "users", user.uid));
      }

      const userData = userDoc && userDoc.exists() ? userDoc.data() : {};

      if (userData.udise) {
        localStorage.setItem("teacher_udise", userData.udise);
        localStorage.setItem("sqaaf_teacher_profile", JSON.stringify({
          fullName: userData.fullName || user.displayName || "Educator",
          email: userData.email || user.email,
          udise: userData.udise,
          schoolName: userData.schoolName || "",
          address: userData.address || "",
          role: "teacher"
        }));
      }

      // Log every login to Firestore for admin tracking
      try {
        await setDoc(doc(db, "logged_users", user.uid), {
          uid: user.uid,
          email: user.email || email,
          fullName: userData.fullName || user.displayName || "Unknown",
          udise: userData.udise || "",
          schoolName: userData.schoolName || "",
          phone: userData.phone || userData.mobile || "",
          lastLoginAt: serverTimestamp(),
          loginCount: (userData.loginCount || 0) + 1,
          role: "teacher",
        }, { merge: true });
      } catch (_e) {
        // Non-critical: don't block login if logging fails
      }

      toast.success(`Identity Verified. Welcome back!`);

      if (redirect) {
        window.location.href = redirect;
      } else {
        window.location.href = "/teacher";
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = forgotInput.trim();
    if (!cleanInput) {
      toast.error(
        lang === "mr"
          ? "कृपया नोंदणीकृत ईमेल आयडी किंवा UDISE कोड टाका."
          : "Please enter your Email or UDISE code."
      );
      return;
    }
    setForgotLoading(true);
    setForgotSuccess(false);

    try {
      let resolvedEmail = cleanInput;
      let targetDocRef: any = null;

      // If input is UDISE or USID (no @ symbol)
      if (!cleanInput.includes("@")) {
        const qTeacher = query(
          collection(db, "teachers"),
          where("udise", "==", cleanInput)
        );
        const snapTeacher = await getDocs(qTeacher);

        if (!snapTeacher.empty) {
          resolvedEmail = snapTeacher.docs[0].data().email;
          targetDocRef = doc(db, "teachers", snapTeacher.docs[0].id);
        } else {
          const qUser = query(
            collection(db, "users"),
            where("usid", "==", cleanInput)
          );
          const snapUser = await getDocs(qUser);
          if (!snapUser.empty) {
            resolvedEmail = snapUser.docs[0].data().email;
            targetDocRef = doc(db, "users", snapUser.docs[0].id);
          } else {
            throw new Error(
              lang === "mr"
                ? "दिलेल्या UDISE / USID कोडशी संबंधित खाते आढळले नाही."
                : "No account record found for this identifier code."
            );
          }
        }
      } else {
        const qTeacherEmail = query(
          collection(db, "teachers"),
          where("email", "==", cleanInput)
        );
        const snapTE = await getDocs(qTeacherEmail);
        if (!snapTE.empty) {
          targetDocRef = doc(db, "teachers", snapTE.docs[0].id);
        } else {
          const qUserEmail = query(
            collection(db, "users"),
            where("email", "==", cleanInput)
          );
          const snapUE = await getDocs(qUserEmail);
          if (!snapUE.empty) {
            targetDocRef = doc(db, "users", snapUE.docs[0].id);
          }
        }
      }

      if (!resolvedEmail || !resolvedEmail.includes("@")) {
        throw new Error(
          lang === "mr"
            ? "वैध ईमेल आयडी आढळला नाही. कृपया माहिती तपासा."
            : "No valid email address registered for this account."
        );
      }

      // Execute Password Reset via Firebase Auth
      await sendPasswordResetEmail(auth, resolvedEmail);

      // Sync Firestore timestamp
      if (targetDocRef) {
        try {
          await updateDoc(targetDocRef, {
            passwordResetRequestedAt: new Date().toISOString(),
            lastPasswordResetEmail: resolvedEmail,
          });
        } catch (docErr) {
          console.warn("Firestore timestamp update note:", docErr);
        }
      }

      setResetEmailSentTo(resolvedEmail);
      setForgotSuccess(true);
      toast.success(
        lang === "mr"
          ? "पासवर्ड रिसेट लिंक पाठवली आहे!"
          : "Password reset email sent!"
      );
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error(
        error.message ||
          (lang === "mr"
            ? "पासवर्ड रिसेट करण्यात अडचण आली. कृपया माहिती तपासा."
            : "Failed to send reset link. Please check your info.")
      );
    } finally {
      setForgotLoading(false);
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
                    <button
                      type="button"
                      onClick={() => {
                        setForgotInput(identifier);
                        setShowForgotModal(true);
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-indigo-400 hover:text-white hover:underline cursor-pointer transition-colors"
                    >
                      {t.login_forgot || "Forgot?"}
                    </button>
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
              <p className="mt-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                {t.login_new_educator}{" "}
                <Link
                  to="/teacher/signup"
                  className="text-white/70 hover:text-white hover:underline ml-1 font-black transition-all"
                >
                  {t.login_register_here}
                </Link>
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-slate-950/95 border border-white/20 p-6 sm:p-8 rounded-[2rem] shadow-2xl text-white relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSuccess(false);
                }}
                className="absolute top-5 right-5 size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X className="size-4" />
              </button>

              <div className="text-center mb-6">
                <div className="size-12 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/40 mb-3 shadow-inner">
                  <KeyRound className="size-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white italic">
                  {lang === "mr" ? "पासवर्ड विसरलात?" : "Forgot Password?"}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed max-w-xs mx-auto">
                  {lang === "mr"
                    ? "तुमचा ईमेल आयडी किंवा UDISE/USID कोड टाका. पासवर्ड रिसेट लिंक पाठवली जाईल."
                    : "Enter your registered Email or UDISE/USID code. A password reset link will be sent to your email."}
                </p>
              </div>

              {!forgotSuccess ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                      {lang === "mr" ? "ईमेल आयडी किंवा UDISE कोड" : "Email ID or UDISE Code"}
                    </label>
                    <div className="bg-slate-900 border border-slate-700/80 focus-within:border-indigo-500 rounded-2xl flex items-center gap-3 px-4 h-13 transition-all">
                      <Mail className="size-4 text-indigo-400 shrink-0" />
                      <input
                        type="text"
                        required
                        placeholder={lang === "mr" ? "उदा. email@gmail.com किंवा UDISE" : "e.g. email@gmail.com or UDISE"}
                        className="bg-transparent outline-none w-full text-xs font-bold text-white placeholder:text-slate-500 h-full border-none"
                        value={forgotInput}
                        onChange={(e) => setForgotInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-wider shadow-lg cursor-pointer mt-2"
                  >
                    {forgotLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <span>{lang === "mr" ? "रिसेट लिंक पाठवा" : "Send Reset Link"}</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center space-y-3">
                  <div className="size-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {lang === "mr" ? "ईमेल पाठवला आहे!" : "Link Sent!"}
                    </h4>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">
                      {lang === "mr"
                        ? `पासवर्ड रिसेट लिंक **${resetEmailSentTo}** वर पाठवली आहे. तुमचे ईमेल इनबॉक्स तपासा.`
                        : `Password reset link sent to **${resetEmailSentTo}**. Please check your email inbox.`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSuccess(false);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer mt-2"
                  >
                    {lang === "mr" ? "बंद करा" : "Close"}
                  </button>
                </div>
              )}

              <div className="mt-5 text-center pt-4 border-t border-slate-800">
                <Link
                  to="/forgot-password"
                  onClick={() => setShowForgotModal(false)}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1"
                >
                  <span>{lang === "mr" ? "सविस्तर रिसेट पेजवर जा" : "Go to Standalone Reset Page"} →</span>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-6 left-0 right-0 text-center z-10 pointer-events-none">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400/60">
          © 2026 SGK BRAINOVA SMART LEARNING WITH AI. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
