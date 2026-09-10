import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  KeyRound,
  Mail,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";

import loginBg from "@/assets/teacher login.avif";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Password Reset — SGK Brainova Smart Learning With AI" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = inputVal.trim();

    if (!cleanInput) {
      toast.error(
        lang === "mr"
          ? "कृपया नोंदणीकृत ईमेल आयडी किंवा UDISE कोड टाका."
          : "Please enter your registered Email or UDISE code."
      );
      return;
    }

    setLoading(true);

    try {
      let resolvedEmail = cleanInput;
      let targetDocRef: any = null;

      // If input is UDISE or USID (no @ sign)
      if (!cleanInput.includes("@")) {
        // Query teachers collection
        const qTeacher = query(
          collection(db, "teachers"),
          where("udise", "==", cleanInput)
        );
        const snapTeacher = await getDocs(qTeacher);

        if (!snapTeacher.empty) {
          resolvedEmail = snapTeacher.docs[0].data().email;
          targetDocRef = doc(db, "teachers", snapTeacher.docs[0].id);
        } else {
          // Query users collection
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
                ? "दिलेल्या UDISE / USID कोडशी संबंधित कोणताही युजर आढळला नाही."
                : "No account found matching this identifier code."
            );
          }
        }
      } else {
        // Find doc by email
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
            ? "वैध ईमेल आयडी आढळला नाही. कृपया योग्य माहिती तपासा."
            : "No valid email address registered for this account."
        );
      }

      // Execute Firebase Authentication Password Reset Email
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

      setSentEmail(resolvedEmail);
      setSubmitted(true);
      toast.success(
        lang === "mr"
          ? "पासवर्ड रिसेट लिंक ईमेलवर पाठवण्यात आली आहे!"
          : "Password reset link sent to your email!"
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(
        error.message ||
          (lang === "mr"
            ? "पासवर्ड रिसेट करण्यात अडचण आली. कृपया माहिती तपासा."
            : "Failed to send reset link. Please check your info.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col font-sans relative overflow-y-auto bg-slate-900 selection:bg-primary/20 selection:text-primary">
      {/* Top Back Navigation Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          to="/login"
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer active:scale-95 shadow-md group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>{lang === "mr" ? "लॉगिनवर परत जा" : "Back to Login"}</span>
        </Link>
      </div>

      {/* Background Image & Overlay */}
      <div className="fixed inset-0 z-0 bg-slate-900 overflow-hidden select-none pointer-events-none">
        <img
          src={loginBg}
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-950/90 z-10" />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative z-10 w-full max-w-lg mx-auto py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-slate-950/80 backdrop-blur-3xl border border-white/15 p-6 sm:p-10 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.6)] text-white"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg mb-4 border border-white/20">
              <KeyRound className="size-7" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white italic">
              {lang === "mr" ? "पासवर्ड विसरलात?" : "Forgot Password?"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-2 leading-relaxed max-w-xs mx-auto">
              {lang === "mr"
                ? "तुमचा नोंदणीकृत ईमेल आयडी किंवा UDISE कोड टाका. आम्ही पासवर्ड रिसेट लिंक पाठवू."
                : "Enter your registered Email address or UDISE code to receive a password reset link."}
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 ml-1">
                  {lang === "mr"
                    ? "ईमेल आयडी किंवा UDISE कोड"
                    : "Email ID or UDISE Code"}
                </label>
                <div className="bg-slate-900/90 border border-slate-700/70 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 rounded-2xl flex items-center gap-3 px-4 h-14 transition-all shadow-inner">
                  <Mail className="size-4 text-indigo-400 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder={
                      lang === "mr"
                        ? "उदा. teacher@gmail.com किंवा 27250100101"
                        : "e.g. user@gmail.com or 27250100101"
                    }
                    className="bg-transparent outline-none w-full text-xs sm:text-sm font-bold text-white placeholder:text-slate-500 h-full border-none"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 uppercase text-xs tracking-[0.15em] shadow-lg cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {lang === "mr"
                        ? "पासवर्ड रिसेट लिंक पाठवा"
                        : "Send Reset Password Link"}
                    </span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4"
            >
              <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-inner">
                <CheckCircle2 className="size-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">
                  {lang === "mr" ? "ईमेल पाठवला आहे!" : "Reset Link Sent!"}
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1.5">
                  {lang === "mr"
                    ? `पासवर्ड रिसेट लिंक **${sentEmail}** वर पाठवण्यात आली आहे. तुमचा ईमेल इनबॉक्स किंवा स्पॅम फोल्डर तपासा.`
                    : `Password reset instructions have been sent to **${sentEmail}**. Please check your inbox or spam folder.`}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/login" })}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  {lang === "mr" ? "लॉगिनवर परत जा" : "Return to Login"}
                </button>
              </div>
            </motion.div>
          )}

          <div className="mt-8 text-center pt-6 border-t border-slate-800/80">
            <Link
              to="/login"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span>{lang === "mr" ? "लॉगिन पानावर परत जा" : "Back to Login Portal"}</span>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
