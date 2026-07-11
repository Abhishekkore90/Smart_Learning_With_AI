import React, { useState, useEffect } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  School,
  User,
  UserCheck,
  MapPin,
  Milestone,
  GraduationCap,
  Save,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import { motion, AnimatePresence } from "framer-motion";

interface PinGateProps {
  sectionKey: string;
  children: React.ReactNode;
  enabled?: boolean;
}

export function PinGate({
  sectionKey,
  children,
  enabled = true,
}: PinGateProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"pin" | "setup">("pin");
  const [pin, setPin] = useState<string>("");
  const [showPin, setShowPin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // Profile setup states
  const [teacherName, setTeacherName] = useState<string>("");
  const [principalName, setPrincipalName] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");
  const [udiseNumber, setUdiseNumber] = useState<string>("");
  const [taluka, setTaluka] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [center, setCenter] = useState<string>("");

  const storageKey = `unlocked_section_${sectionKey}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const state = sessionStorage.getItem(storageKey);
      if (state === "true") {
        setIsUnlocked(true);
      }

      // Load saved setup values from localStorage
      setTeacherName(localStorage.getItem("teacher_name") || "");
      setPrincipalName(localStorage.getItem("teacher_principal_name") || "");
      setSchoolName(localStorage.getItem("teacher_school_name") || "");
      setUdiseNumber(localStorage.getItem("teacher_udise") || "");
      setTaluka(localStorage.getItem("teacher_taluka") || "");
      setDistrict(localStorage.getItem("teacher_district") || "");
      setCenter(localStorage.getItem("teacher_center") || "");
    }
  }, [storageKey]);

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const storedUdise = localStorage.getItem("teacher_udise") || "";
      const cleanedUdise = storedUdise.trim();
      const cleanedPin = pin.trim();

      // Access granted if PIN is 1234 or matches the saved UDISE code
      const isCorrect =
        cleanedPin === "1234" || (cleanedUdise && cleanedPin === cleanedUdise);

      if (isCorrect) {
        sessionStorage.setItem(storageKey, "true");
        setIsUnlocked(true);
        toast.success("प्रवेश मंजूर / Access Granted!");
      } else {
        setIsShaking(true);
        setPin("");
        toast.error("चुकीचा पिन / Invalid PIN!");
        setTimeout(() => setIsShaking(false), 500);
      }
      setLoading(false);
    }, 600);
  };

  const handleSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();

    localStorage.setItem("teacher_name", teacherName);
    localStorage.setItem("teacher_principal_name", principalName);
    localStorage.setItem("teacher_school_name", schoolName);
    localStorage.setItem("teacher_udise", udiseNumber);
    localStorage.setItem("teacher_taluka", taluka);
    localStorage.setItem("teacher_district", district);
    localStorage.setItem("teacher_center", center);

    toast.success("माहिती जतन केली / Setup Info Saved!");
    setActiveTab("pin"); // Switch back to login PIN
  };

  if (!enabled || isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <motion.div
        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-white border border-slate-200/85 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -z-10" />

        {/* Tab Selector */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-2xl mb-8">
          <button
            type="button"
            onClick={() => setActiveTab("pin")}
            className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all duration-300 ${
              activeTab === "pin"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            सुरक्षित प्रवेश / Login PIN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("setup")}
            className={`flex-1 py-3 text-xs font-black tracking-wider uppercase rounded-xl transition-all duration-300 ${
              activeTab === "setup"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            माहिती टॅब / School Setup
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "pin" ? (
            <motion.div
              key="pin-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-100 rounded-3xl blur-md scale-110 animate-pulse" />
                <div className="relative size-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Lock className="size-8 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  सुरक्षित विभाग प्रवेश (Secure Access)
                </h3>
                <p className="text-xs font-bold text-slate-500 max-w-xs leading-relaxed">
                  या विभागात प्रवेश करण्यासाठी तुमचा ४-अंकी सुरक्षा पिन किंवा
                  UDISE कोड टाका.
                  <br />
                  <span className="text-[10px] text-slate-400 font-semibold block mt-1">
                    (Enter your 4-digit security PIN or school UDISE code to
                    access this section.)
                  </span>
                </p>
              </div>

              <form
                onSubmit={handleSubmitPin}
                className="w-full space-y-4 pt-2"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="size-5" />
                  </div>
                  <input
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="पिन / UDISE कोड टाका"
                    className="w-full pl-12 pr-12 py-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-2xl text-center font-bold tracking-widest text-lg outline-none transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-400"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPin ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !pin}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-100 hover:shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <span>प्रवेश करा / Enter Section</span>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="setup-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col space-y-6"
            >
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-slate-800">
                  माहिती सेटअप / School Info Details
                </h3>
                <p className="text-[10px] text-slate-400 font-bold">
                  सदर माहिती थेट अहवाल व प्रमाणपत्रांवर आपोआप छापली जाईल.
                </p>
              </div>

              <form
                onSubmit={handleSaveSetup}
                className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar"
              >
                {/* 1. School Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    शाळेचे नाव (School Name)
                  </label>
                  <div className="relative">
                    <School className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="शाळेचे नाव टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 2. UDISE Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    UDISE NUMBER
                  </label>
                  <div className="relative">
                    <Milestone className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={udiseNumber}
                      onChange={(e) => setUdiseNumber(e.target.value)}
                      placeholder="११-अंकी UDISE कोड टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 3. Center */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    केंद्र (Center)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={center}
                      onChange={(e) => setCenter(e.target.value)}
                      placeholder="केंद्र टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 4. Taluka */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    तालुका (Taluka)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={taluka}
                      onChange={(e) => setTaluka(e.target.value)}
                      placeholder="तालुका टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 5. District */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    जिल्हा (District)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="जिल्हा टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 6. Teacher Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    शिक्षकाचे नाव (Teacher Name)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="शिक्षकाचे नाव टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 7. Principal Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    मुख्याध्यापकांचे नाव (Principal Name)
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value={principalName}
                      onChange={(e) => setPrincipalName(e.target.value)}
                      placeholder="मुख्याध्यापकांचे नाव टाका"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                      required
                    />
                  </div>
                </div>

                {/* 8. Default Academic Year (Locked to 2026-27 by default) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    शैक्षणिक वर्ष (Academic Year)
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3.5 size-4 text-slate-400" />
                    <input
                      type="text"
                      value="2026-27"
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs outline-none text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="size-4" />
                  <span>माहिती जतन करा / Save Info</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
