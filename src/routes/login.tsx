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
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
} from "firebase/auth";
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

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

  // Helper to find educator / account by Email, UDISE or USID across collections
  const resolveEmailFromIdentifier = async (rawIdentifier: string): Promise<{ email: string; docRef?: any; data?: any }> => {
    const cleanId = rawIdentifier.trim();
    if (!cleanId) {
      throw new Error(lang === "mr" ? "कृपया ईमेल आयडी किंवा UDISE कोड टाका." : "Please enter your Email or UDISE Code.");
    }

    if (cleanId.includes("@")) {
      // Find document by email
      try {
        const qTeacherEmail = query(collection(db, "teachers"), where("email", "==", cleanId));
        const snapTE = await getDocs(qTeacherEmail);
        if (!snapTE.empty) {
          return { email: cleanId, docRef: doc(db, "teachers", snapTE.docs[0].id), data: snapTE.docs[0].data() };
        }
        const qUserEmail = query(collection(db, "users"), where("email", "==", cleanId));
        const snapUE = await getDocs(qUserEmail);
        if (!snapUE.empty) {
          return { email: cleanId, docRef: doc(db, "users", snapUE.docs[0].id), data: snapUE.docs[0].data() };
        }
      } catch (_e) {}
      return { email: cleanId };
    }

    // It's a UDISE code or USID - search systematically
    // 1. Query 'teachers' by udise (string)
    try {
      const qTeacher = query(collection(db, "teachers"), where("udise", "==", cleanId));
      const snapTeacher = await getDocs(qTeacher);
      if (!snapTeacher.empty && snapTeacher.docs[0].data()?.email) {
        return {
          email: snapTeacher.docs[0].data().email.trim(),
          docRef: doc(db, "teachers", snapTeacher.docs[0].id),
          data: snapTeacher.docs[0].data()
        };
      }
    } catch (_e) {}

    // 2. Query 'teachers' by udise (numeric) if numeric
    if (!isNaN(Number(cleanId))) {
      try {
        const qTeacherNum = query(collection(db, "teachers"), where("udise", "==", Number(cleanId)));
        const snapTeacherNum = await getDocs(qTeacherNum);
        if (!snapTeacherNum.empty && snapTeacherNum.docs[0].data()?.email) {
          return {
            email: snapTeacherNum.docs[0].data().email.trim(),
            docRef: doc(db, "teachers", snapTeacherNum.docs[0].id),
            data: snapTeacherNum.docs[0].data()
          };
        }
      } catch (_e) {}
    }

    // 3. Query 'users' by udise (string)
    try {
      const qUserUdise = query(collection(db, "users"), where("udise", "==", cleanId));
      const snapUserUdise = await getDocs(qUserUdise);
      if (!snapUserUdise.empty && snapUserUdise.docs[0].data()?.email) {
        return {
          email: snapUserUdise.docs[0].data().email.trim(),
          docRef: doc(db, "users", snapUserUdise.docs[0].id),
          data: snapUserUdise.docs[0].data()
        };
      }
    } catch (_e) {}

    // 4. Query 'users' by udise (numeric)
    if (!isNaN(Number(cleanId))) {
      try {
        const qUserNum = query(collection(db, "users"), where("udise", "==", Number(cleanId)));
        const snapUserNum = await getDocs(qUserNum);
        if (!snapUserNum.empty && snapUserNum.docs[0].data()?.email) {
          return {
            email: snapUserNum.docs[0].data().email.trim(),
            docRef: doc(db, "users", snapUserNum.docs[0].id),
            data: snapUserNum.docs[0].data()
          };
        }
      } catch (_e) {}
    }

    // 5. Query 'teachers' by udiseNumber
    try {
      const qTeacherNumField = query(collection(db, "teachers"), where("udiseNumber", "==", cleanId));
      const snapUdiseNum = await getDocs(qTeacherNumField);
      if (!snapUdiseNum.empty && snapUdiseNum.docs[0].data()?.email) {
        return {
          email: snapUdiseNum.docs[0].data().email.trim(),
          docRef: doc(db, "teachers", snapUdiseNum.docs[0].id),
          data: snapUdiseNum.docs[0].data()
        };
      }
    } catch (_e) {}

    // 6. Query 'users' by usid (student or user identifier)
    try {
      const qUsid = query(collection(db, "users"), where("usid", "==", cleanId));
      const snapUsid = await getDocs(qUsid);
      if (!snapUsid.empty && snapUsid.docs[0].data()?.email) {
        return {
          email: snapUsid.docs[0].data().email.trim(),
          docRef: doc(db, "users", snapUsid.docs[0].id),
          data: snapUsid.docs[0].data()
        };
      }
    } catch (_e) {}

    // 7. Check direct doc ID in 'teachers' or 'users'
    try {
      const tDoc = await getDoc(doc(db, "teachers", cleanId));
      if (tDoc.exists() && tDoc.data()?.email) {
        return {
          email: tDoc.data().email.trim(),
          docRef: doc(db, "teachers", cleanId),
          data: tDoc.data()
        };
      }
      const uDoc = await getDoc(doc(db, "users", cleanId));
      if (uDoc.exists() && uDoc.data()?.email) {
        return {
          email: uDoc.data().email.trim(),
          docRef: doc(db, "users", cleanId),
          data: uDoc.data()
        };
      }
    } catch (_e) {}

    throw new Error(
      lang === "mr"
        ? "दिलेल्या UDISE कोडशी संबंधित कोणतेही खाते आढळले नाही. कृपया UDISE कोड तपासा किंवा नवीन नोंदणी करा."
        : "No educator record found with this UDISE code. Please verify your UDISE code or register first."
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearUnlockedPinSections();
    try {
      if (activeRole === "admin") {
        if (identifier.trim() === "superadmin123@gmail.com" && password === "123456") {
          sessionStorage.setItem("is_super_admin", "true");
          toast.success("Super Admin Authenticated.");
          window.location.href = "/admin";
          return;
        } else {
          throw new Error("Invalid Administrative Credentials.");
        }
      }

      const { email, data: resolvedData } = await resolveEmailFromIdentifier(identifier);

      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
      } catch (authErr: any) {
        console.error("Firebase auth error:", authErr);
        if (
          authErr?.code === "auth/invalid-credential" ||
          authErr?.code === "auth/wrong-password"
        ) {
          throw new Error(
            lang === "mr"
              ? "पासवर्ड चुकीचा आहे. कृपया योग्य पासवर्ड प्रविष्ट करा किंवा 'Sign in with Google' वापरा."
              : "Incorrect password for this account. If you registered via Google, please click 'Sign in with Google'."
          );
        } else if (authErr?.code === "auth/user-not-found") {
          throw new Error(
            lang === "mr"
              ? "या खात्याची नोंदणी सापडली नाही. कृपया नवीन नोंदणी करा."
              : "Account not registered in authentication system. Please register first."
          );
        } else if (authErr?.code === "auth/too-many-requests") {
          throw new Error(
            lang === "mr"
              ? "खूप वेळा चुकीचा प्रयत्न केला आहे. कृपया थोड्या वेळाने प्रयत्न करा किंवा पासवर्ड रिसेट करा."
              : "Too many failed attempts. Please try again later or reset your password."
          );
        }
        throw authErr;
      }

      const user = userCredential.user;

      let userDoc = await getDoc(doc(db, "teachers", user.uid));
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, "users", user.uid));
      }

      const userData = userDoc && userDoc.exists() ? userDoc.data() : (resolvedData || {});

      const effectiveUdise = userData.udise || userData.udiseNumber || (identifier.includes("@") ? "" : identifier.trim());

      if (effectiveUdise) {
        localStorage.setItem("teacher_udise", effectiveUdise);
      }
      localStorage.setItem("sqaaf_teacher_profile", JSON.stringify({
        fullName: userData.fullName || user.displayName || "Educator",
        email: userData.email || user.email || email,
        udise: effectiveUdise,
        schoolName: userData.schoolName || "",
        address: userData.address || "",
        role: "teacher"
      }));

      // Log every login to Firestore for admin tracking
      try {
        await setDoc(doc(db, "logged_users", user.uid), {
          uid: user.uid,
          email: user.email || email,
          fullName: userData.fullName || user.displayName || "Unknown",
          udise: effectiveUdise || "",
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    clearUnlockedPinSections();
    try {
      if (!auth) {
        throw new Error("Authentication service is temporarily unavailable.");
      }

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) {
        throw new Error("Google authentication failed. No user record returned.");
      }

      // Check existing teacher or user record
      let teacherDoc = await getDoc(doc(db, "teachers", user.uid));
      let userDoc = await getDoc(doc(db, "users", user.uid));

      let userData: any = teacherDoc.exists()
        ? teacherDoc.data()
        : userDoc.exists()
          ? userDoc.data()
          : null;

      // If not found by UID, check if an existing record has this email
      if (!userData && user.email) {
        try {
          const qTeacher = query(
            collection(db, "teachers"),
            where("email", "==", user.email)
          );
          const snapTeacher = await getDocs(qTeacher);
          if (!snapTeacher.empty) {
            userData = snapTeacher.docs[0].data();
          } else {
            const qUser = query(
              collection(db, "users"),
              where("email", "==", user.email)
            );
            const snapUser = await getDocs(qUser);
            if (!snapUser.empty) {
              userData = snapUser.docs[0].data();
            }
          }
        } catch (_lookupErr) {
          console.warn("Secondary email lookup note:", _lookupErr);
        }
      }

      // If user does not exist yet (brand new signup via Google), create profile
      if (!userData) {
        userData = {
          fullName: user.displayName || "Educator",
          email: user.email || "",
          udise: "",
          schoolName: "",
          address: "",
          state: "Maharashtra",
          board: "Maharashtra ZP Teacher",
          role: "teacher",
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL || "",
          verified: false,
        };

        // Persist to teachers and users
        try {
          await setDoc(doc(db, "teachers", user.uid), userData, { merge: true });
          await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        } catch (_docErr) {
          console.warn("Firestore user creation note:", _docErr);
        }
      } else {
        // Ensure profile has role and displayName if missing
        if (!userData.role) userData.role = "teacher";
        if (!userData.fullName && user.displayName) userData.fullName = user.displayName;
      }

      // Set localStorage for app-wide persistence
      if (userData.udise) {
        localStorage.setItem("teacher_udise", userData.udise);
      }
      localStorage.setItem(
        "sqaaf_teacher_profile",
        JSON.stringify({
          fullName: userData.fullName || user.displayName || "Educator",
          email: userData.email || user.email || "",
          udise: userData.udise || "",
          schoolName: userData.schoolName || "",
          address: userData.address || "",
          role: userData.role || "teacher",
        })
      );

      // Log login session for admin monitoring
      try {
        await setDoc(
          doc(db, "logged_users", user.uid),
          {
            uid: user.uid,
            email: user.email || "",
            fullName: userData.fullName || user.displayName || "Educator",
            udise: userData.udise || "",
            schoolName: userData.schoolName || "",
            phone: userData.phone || user.phoneNumber || "",
            lastLoginAt: serverTimestamp(),
            loginCount: (userData.loginCount || 0) + 1,
            role: userData.role || "teacher",
            provider: "google",
          },
          { merge: true }
        );
      } catch (_e) {
        // Non-critical
      }

      toast.success(
        lang === "mr"
          ? "Google द्वारे यशस्वीरित्या प्रवेश केला!"
          : "Signed in with Google successfully!"
      );

      if (redirect) {
        window.location.href = redirect;
      } else {
        window.location.href = "/teacher";
      }
    } catch (error: any) {
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      console.error("Google sign in error:", error);
      toast.error(
        error.message ||
          (lang === "mr"
            ? "Google प्रमाणीकरण अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा."
            : "Google sign-in failed. Please try again.")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setFacebookLoading(true);
    clearUnlockedPinSections();
    try {
      if (!auth) {
        throw new Error("Authentication service is temporarily unavailable.");
      }

      const provider = new FacebookAuthProvider();
      provider.addScope("email");
      provider.addScope("public_profile");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user) {
        throw new Error("Facebook authentication failed. No user record returned.");
      }

      // Check existing teacher or user record
      let teacherDoc = await getDoc(doc(db, "teachers", user.uid));
      let userDoc = await getDoc(doc(db, "users", user.uid));

      let userData: any = teacherDoc.exists()
        ? teacherDoc.data()
        : userDoc.exists()
          ? userDoc.data()
          : null;

      // If not found by UID, check if an existing record has this email
      if (!userData && user.email) {
        try {
          const qTeacher = query(
            collection(db, "teachers"),
            where("email", "==", user.email)
          );
          const snapTeacher = await getDocs(qTeacher);
          if (!snapTeacher.empty) {
            userData = snapTeacher.docs[0].data();
          } else {
            const qUser = query(
              collection(db, "users"),
              where("email", "==", user.email)
            );
            const snapUser = await getDocs(qUser);
            if (!snapUser.empty) {
              userData = snapUser.docs[0].data();
            }
          }
        } catch (_lookupErr) {
          console.warn("Secondary email lookup note:", _lookupErr);
        }
      }

      // If brand-new user via Facebook, create profile
      if (!userData) {
        userData = {
          fullName: user.displayName || "Educator",
          email: user.email || "",
          udise: "",
          schoolName: "",
          address: "",
          state: "Maharashtra",
          board: "Maharashtra ZP Teacher",
          role: "teacher",
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL || "",
          verified: false,
        };

        try {
          await setDoc(doc(db, "teachers", user.uid), userData, { merge: true });
          await setDoc(doc(db, "users", user.uid), userData, { merge: true });
        } catch (_docErr) {
          console.warn("Firestore user creation note:", _docErr);
        }
      } else {
        if (!userData.role) userData.role = "teacher";
        if (!userData.fullName && user.displayName) userData.fullName = user.displayName;
      }

      if (userData.udise) {
        localStorage.setItem("teacher_udise", userData.udise);
      }
      localStorage.setItem(
        "sqaaf_teacher_profile",
        JSON.stringify({
          fullName: userData.fullName || user.displayName || "Educator",
          email: userData.email || user.email || "",
          udise: userData.udise || "",
          schoolName: userData.schoolName || "",
          address: userData.address || "",
          role: userData.role || "teacher",
        })
      );

      try {
        await setDoc(
          doc(db, "logged_users", user.uid),
          {
            uid: user.uid,
            email: user.email || "",
            fullName: userData.fullName || user.displayName || "Educator",
            udise: userData.udise || "",
            schoolName: userData.schoolName || "",
            phone: userData.phone || user.phoneNumber || "",
            lastLoginAt: serverTimestamp(),
            loginCount: (userData.loginCount || 0) + 1,
            role: userData.role || "teacher",
            provider: "facebook",
          },
          { merge: true }
        );
      } catch (_e) {
        // Non-critical
      }

      toast.success(
        lang === "mr"
          ? "Facebook द्वारे यशस्वीरित्या प्रवेश केला!"
          : "Signed in with Facebook successfully!"
      );

      if (redirect) {
        window.location.href = redirect;
      } else {
        window.location.href = "/teacher";
      }
    } catch (error: any) {
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      console.error("Facebook sign in error:", error);
      if (error?.code === "auth/account-exists-with-different-credential") {
        toast.error(
          lang === "mr"
            ? "हा ईमेल आधीच दुसऱ्या पर्यायाने (उदा. Google ने) जोडलेला आहे. कृपया Google ने लॉगिन करा."
            : "An account already exists with the same email address. Please sign in with Google or password."
        );
      } else {
        toast.error(
          error.message ||
            (lang === "mr"
              ? "Facebook प्रमाणीकरण अयशस्वी झाले. कृपया पुन्हा प्रयत्न करा."
              : "Facebook sign-in failed. Please try again.")
        );
      }
    } finally {
      setFacebookLoading(false);
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
      const { email: resolvedEmail, docRef: targetDocRef } = await resolveEmailFromIdentifier(cleanInput);

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
                  type="submit"
                  disabled={loading || googleLoading}
                  className={`w-full h-14 bg-gradient-to-r ${roleConfig.color} text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-6 uppercase text-xs tracking-[0.15em] relative group overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer`}
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

                {/* Divider */}
                <div className="flex items-center my-4 gap-3">
                  <div className="flex-1 h-px bg-white/15" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t.login_or || "OR"}
                  </span>
                  <div className="flex-1 h-px bg-white/15" />
                </div>

                {/* Google Sign In / Sign Up Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading || facebookLoading}
                  className="w-full h-13 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 text-xs tracking-wider shadow-md hover:shadow-lg cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {googleLoading ? (
                    <Loader2 className="size-5 animate-spin text-white" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span className="font-black uppercase text-[11px] sm:text-xs tracking-wider">
                        {t.login_google || "Sign in with Google"}
                      </span>
                    </>
                  )}
                </button>

                {/* Facebook Sign In Button */}
                <button
                  type="button"
                  onClick={handleFacebookSignIn}
                  disabled={loading || googleLoading || facebookLoading}
                  className="w-full h-13 mt-2.5 bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/40 hover:border-[#1877F2]/60 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 text-xs tracking-wider shadow-md hover:shadow-lg cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[#1877F2]/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {facebookLoading ? (
                    <Loader2 className="size-5 animate-spin text-white" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span className="font-black uppercase text-[11px] sm:text-xs tracking-wider">
                        {lang === "mr" ? "Facebook सह लॉगिन करा" : "Sign in with Facebook"}
                      </span>
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
