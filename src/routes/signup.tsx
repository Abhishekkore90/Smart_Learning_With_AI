import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Shield,
  ArrowRight,
  BadgeCheck,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  Phone,
  MapPin,
  Calendar,
  Hash,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Compass,
  Info,
  Menu,
  X,
  BookOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

import loginBg from "@/assets/login-bg.jpg";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [{ title: "Student Registration Hub — SGK Brainova Smart Learning With AI" }],
  }),
  component: RegistrationPage,
});

const CLASSES = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];
const GENDERS = ["Male", "Female", "Other"];

function RegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  // Registration State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
    class: "5th",
    usid: "",
    birthdate: "",
    gender: "Male",
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password,
      );
      const user = userCredential.user;

      // Save comprehensive student profile to Firestore
      await setDoc(doc(db, "users", user.uid), {
        ...formData,
        role: "student",
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem("pp_student_registered", "true");
      toast.success("Welcome to the Academy! Please log in.");
      navigate({ to: "/login" });
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-700 relative overflow-hidden bg-slate-50">
      {/* Full-Screen Pure White Luminous Background with Peeking Soft Educational Image */}
      <div className="fixed inset-0 z-0 bg-white overflow-hidden select-none pointer-events-none">
        {/* Soft peeking educational image */}
        <img
          src={loginBg}
          alt="Classroom Background"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-25"
        />

        {/* Luminous soft white grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:40px_40px] z-10 pointer-events-none" />

        {/* Soft, beautiful radial colors to blend with the white theme */}
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/5 blur-[120px] z-10 pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/5 blur-[120px] z-10 pointer-events-none" />

        {/* Semi-translucent soft white overlay with blur for ultimate premium look */}
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[8px] z-10" />
      </div>

      {/* Premium Floating Menu Trigger */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-6 right-6 z-40 size-12 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 group"
      >
        <Menu className="size-5 text-slate-700 group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Futuristic Glassmorphic Sidebar Menu Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md"
            />

            {/* Sidebar Container */}
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-4 left-4 bottom-4 z-50 w-[85%] sm:w-[380px] bg-white border border-slate-200/80 p-6 py-8 rounded-[32px] shadow-2xl flex flex-col justify-between overflow-y-auto text-slate-900"
            >
              <div className="relative z-10 space-y-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
                      <Sparkles className="size-5 text-white animate-pulse" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-900">
                      SGK BRAINOVA SMART LEARNING WITH AI
                    </span>
                  </div>

                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="size-9 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all hover:rotate-90 active:scale-95"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Navigation Menu */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] ml-2 block mb-3">
                    {t.signup_navigation}
                  </span>
                  {[
                    { label: "Explore", to: "/", icon: Compass },
                    {
                      label: "Teacher",
                      to: "/teacher/login",
                      icon: GraduationCap,
                    },
                    { label: "Courses", to: "/courses", icon: BookOpen },
                    { label: "About", to: "/about", icon: Info },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={index}
                        to={item.to}
                        onClick={() => setIsSidebarOpen(false)}
                        className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all duration-300 group relative overflow-hidden"
                      >
                        <Icon className="size-5 text-slate-400 group-hover:text-slate-900 transition-all relative z-10" />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-900 tracking-wider relative z-10 transition-colors">
                          {item.label}
                        </span>
                        <ArrowRight className="size-4 ml-auto text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all relative z-10" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Footer Actions */}
              <div className="relative z-10 space-y-6 pt-6 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase mb-4">
                    {t.signup_already_configured}
                  </p>
                  <Link
                    to="/login"
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                  >
                    {t.signup_login_signin}
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 md:p-10 relative z-10 min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white border border-slate-200 p-6 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative py-10 text-slate-900"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-widest mb-6"
          >
            {t.signup_return_home}
          </Link>

          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center gap-3 mb-4">
              <div className="size-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                <Sparkles className="size-5 text-indigo-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">
                {t.signup_scholar_portal}
              </span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 italic">
              {t.signup_title}
            </h2>
            <p className="text-slate-500 mt-2 font-medium text-xs">
              {t.signup_subtitle}
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RegistrationField
                name="fullName"
                label={t.signup_full_name}
                icon={User}
                placeholder="Aarav Sharma"
                value={formData.fullName}
                onChange={handleChange}
              />
              <RegistrationField
                name="email"
                label={t.signup_email}
                icon={Mail}
                placeholder="aarav@smartlearning.edu"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              <RegistrationField
                name="usid"
                label={t.signup_usid}
                icon={Hash}
                placeholder="USID-2024-XXXX"
                value={formData.usid}
                onChange={handleChange}
              />
              <RegistrationField
                name="phone"
                label={t.signup_phone}
                icon={Phone}
                placeholder="+91 00000 00000"
                value={formData.phone}
                onChange={handleChange}
              />

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                  {t.signup_class}
                </label>
                <div className="relative">
                  <select
                    name="class"
                    value={formData.class}
                    onChange={handleChange}
                    className="w-full h-14 px-5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all appearance-none cursor-pointer shadow-inner animate-none"
                  >
                    {CLASSES.map((c) => (
                      <option
                        key={c}
                        value={c}
                        className="bg-white text-slate-900"
                      >
                        {c} {t.signup_standard}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <RegistrationField
                name="birthdate"
                label={t.signup_birthdate}
                icon={Calendar}
                type="date"
                value={formData.birthdate}
                onChange={handleChange}
                placeholder=""
              />

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                  {t.signup_gender}
                </label>
                <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200/80 shadow-inner h-14">
                  {[
                    { key: "Male", label: t.signup_male },
                    { key: "Female", label: t.signup_female },
                    { key: "Other", label: t.signup_other },
                  ].map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, gender: g.key }))
                      }
                      className={`flex-1 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all h-full ${formData.gender === g.key ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                {t.signup_address}
              </label>
              <div className="bg-slate-50 border border-slate-200/80 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 rounded-2xl flex items-start gap-4 px-5 py-4 shadow-inner">
                <MapPin className="size-4 text-slate-400 mt-0.5" />
                <textarea
                  name="address"
                  placeholder="Street, City, State, Country"
                  rows={2}
                  className="bg-transparent outline-none w-full text-xs font-bold text-slate-900 placeholder:text-slate-300 resize-none h-10"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <RegistrationField
                name="password"
                label={t.signup_password}
                icon={Lock}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={formData.password}
                onChange={handleChange}
              />
              <RegistrationField
                name="confirmPassword"
                label={t.signup_confirm_password}
                icon={Shield}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div className="flex items-center justify-between gap-6 pt-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="size-4 rounded border-slate-200 bg-slate-50 accent-slate-900"
                  required
                />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                  {t.signup_agree_terms}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[9px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 hover:underline transition-colors"
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}{" "}
                {showPassword ? t.signup_hide : t.signup_show}
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-md disabled:opacity-50 mt-6 uppercase text-[10px] tracking-[0.2em] group"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t.signup_submit
              )}
              {!loading && (
                <CheckCircle2 className="size-4 group-hover:scale-110 transition-transform text-white" />
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t.signup_has_account}{" "}
            <Link
              to="/login"
              className="text-slate-900 hover:underline transition-colors ml-1 font-black"
            >
              {t.signup_login}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function RegistrationField({
  label,
  icon: Icon,
  placeholder,
  type = "text",
  value,
  onChange,
  name,
}: {
  label: string;
  icon: any;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
        {label}
      </label>
      <div className="bg-slate-50 border border-slate-200/80 rounded-[1.5rem] flex items-center gap-4 px-6 h-16 focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/10 transition-all shadow-sm group">
        <Icon className="size-5 text-slate-300 group-focus-within:text-slate-900 transition-colors" />
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          className="bg-transparent outline-none w-full text-sm font-bold text-slate-900 placeholder:text-slate-300 h-full"
          value={value}
          onChange={onChange}
          required
        />
      </div>
    </div>
  );
}
