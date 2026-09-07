import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
// @ts-ignore
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { processRazorpayPayment } from "@/lib/razorpayService";
import {
  Lock,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Sparkles,
  CreditCard,
  Loader2,
  AlertCircle,
  Clock,
  Star,
  Award,
  QrCode,
  Copy,
  Smartphone,
  Check,
  Send,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ModulePaywallProps {
  moduleId: string;
  defaultTitle?: string;
  children: React.ReactNode;
  totalStudentsCount?: number;
  isPaidTab?: boolean;
  selectedMonth?: string;
}

interface ModulePricing {
  id: string;
  title: string;
  price: number;
  enabled: boolean;
  features?: string[];
  validityDays?: number;
  description?: string;
  upiId?: string;
  qrImageUrl?: string;
  perStudentPrice?: number;
  monthlyPrice?: number;
  yearlyPrice?: number;
}

const MONTH_OPTIONS = [
  { code: "06", label: "जून" },
  { code: "07", label: "जुलै" },
  { code: "08", label: "ऑगस्ट" },
  { code: "09", label: "सप्टेंबर" },
  { code: "10", label: "ऑक्टोबर" },
  { code: "11", label: "नोव्हेंबर" },
  { code: "12", label: "डिसेंबर" },
  { code: "01", label: "जानेवारी" },
  { code: "02", label: "फेब्रुवारी" },
  { code: "03", label: "मार्च" },
  { code: "04", label: "एप्रिल" },
  { code: "05", label: "मे" },
];

const MONTH_NAMES_MAP: Record<string, string> = {
  "06": "जून",
  "07": "जुलै",
  "08": "ऑगस्ट",
  "09": "सप्टेंबर",
  "10": "ऑक्टोबर",
  "11": "नोव्हेंबर",
  "12": "डिसेंबर",
  "01": "जानेवारी",
  "02": "फेब्रुवारी",
  "03": "मार्च",
  "04": "एप्रिल",
  "05": "मे",
};

export function ModulePaywall({
  moduleId,
  defaultTitle,
  children,
  totalStudentsCount = 0,
  isPaidTab = true,
  selectedMonth,
}: ModulePaywallProps) {
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [pricing, setPricing] = useState<ModulePricing | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  const [meetingPlan, setMeetingPlan] = useState<"monthly" | "yearly">("monthly");
  const [targetMonth, setTargetMonth] = useState<string>(
    selectedMonth || String(new Date().getMonth() + 1).padStart(2, "0")
  );

  useEffect(() => {
    if (selectedMonth) {
      setTargetMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const { user, profile } = useAuth();
  const teacherId = getTeacherId(user, profile) || "teacher_guest";

  useEffect(() => {
    let unsubPricing: () => void;
    let unsubPayment: () => void;
    let unsubAccess: () => void;

    const userKeys = Array.from(
      new Set(
        [
          teacherId,
          user?.uid,
          user?.email,
          profile?.id,
          profile?.email,
          localStorage.getItem("teacher_email"),
          localStorage.getItem("user_email"),
        ].filter((k): k is string => Boolean(k))
      )
    );

    // Super Admin check -> Instant free access to everything
    if (
      (user as any)?.role === "admin" ||
      (profile as any)?.role === "admin" ||
      localStorage.getItem("is_super_admin") === "true" ||
      sessionStorage.getItem("is_super_admin") === "true"
    ) {
      setIsUnlocked(true);
      setLoading(false);
      return;
    }

    const checkAccess = async () => {
      setLoading(true);
      try {
        // 1. Listen to pricing doc for this module
        unsubPricing = onSnapshot(doc(db, "cce_module_pricing", moduleId), (snap) => {
          if (snap.exists()) {
            setPricing(snap.data() as ModulePricing);
          } else {
            setPricing({
              id: moduleId,
              title: defaultTitle || moduleId,
              price: 149,
              enabled: true,
              features: [
                "अन्लिमिटेड CCE डेटा जनरेशन",
                "A4 HD PDF रिपोर्ट डाऊनलोड",
                "सुरक्षित क्लाऊड बॅकअप",
              ],
              validityDays: 365,
              upiId: "smartlearning@upi",
            });
          }
        });

        // 2. Listen to admin-granted access collection in real time
        unsubAccess = onSnapshot(collection(db, "teacher_module_access"), (snap: any) => {
          let granted = false;
          let grantData: any = null;

          snap.docs.forEach((docSnap: any) => {
            const data = docSnap.data();
            if (data && data.status === "GRANTED") {
              const matchesUser =
                userKeys.includes(data.teacherId) ||
                userKeys.includes(data.teacherEmail) ||
                (data.id && userKeys.some((k) => data.id.startsWith(k)));

              const matchesModule =
                data.moduleId === "ALL" || data.moduleId === moduleId;

              if (matchesUser && matchesModule) {
                granted = true;
                grantData = data;
              }
            }
          });

          if (granted) {
            setIsUnlocked(true);
            setPaymentInfo({ ...grantData, grantedByAdmin: true });
            setLoading(false);
          } else {
            // Check paid records if admin grant not found
            checkPaidRecords();
          }
        });

        // 3. Helper to check user payments if admin grant doc not present
        const checkPaidRecords = () => {
          unsubPayment = onSnapshot(collection(db, "teacher_module_payments"), (snap: any) => {
            let paid = false;
            let paidData: any = null;

            snap.docs.forEach((docSnap: any) => {
              const data = docSnap.data();
              if (data && data.status === "SUCCESS") {
                const matchesUser =
                  userKeys.includes(data.teacherId) ||
                  userKeys.includes(data.teacherEmail) ||
                  (data.id && userKeys.some((k) => data.id.startsWith(k)));

                const matchesModule =
                  data.moduleId === "ALL" || data.moduleId === moduleId;

                if (matchesUser && matchesModule) {
                  if (isMonthlyOptionModule) {
                    const cutoff = isMdmModule ? 299 : 700;
                    const isFullYear =
                      data.paymentType === "FULL_YEAR" ||
                      data.amount >= cutoff ||
                      (!data.unlockedMonth && !data.unlockedMonths && !data.paymentType);
                    const activeMonthCode =
                      selectedMonth || targetMonth || String(new Date().getMonth() + 1).padStart(2, "0");
                    const unlockedList =
                      data.unlockedMonths || (data.unlockedMonth ? [data.unlockedMonth] : []);

                    if (isFullYear || unlockedList.includes(activeMonthCode)) {
                      paid = true;
                      paidData = data;
                    }
                  } else if (data.expiresAt) {
                    if (new Date(data.expiresAt) > new Date()) {
                      paid = true;
                      paidData = data;
                    }
                  } else {
                    paid = true;
                    paidData = data;
                  }
                }
              }
            });

            if (paid) {
              setIsUnlocked(true);
              setPaymentInfo(paidData);
            } else {
              setIsUnlocked(false);
            }
            setLoading(false);
          });
        };
      } catch (err) {
        console.error("Paywall access check error:", err);
        setLoading(false);
      }
    };

    checkAccess();
    return () => {
      if (unsubPricing) unsubPricing();
      if (unsubPayment) unsubPayment();
      if (unsubAccess) unsubAccess();
    };
  }, [moduleId, teacherId, user, profile]);

  // Compute dynamic price for CCE result (per-student) vs meeting/mdm register vs fixed module price
  const isMdmModule = moduleId === "mdm-register";
  const isMeetingModule = moduleId === "meeting-register";
  const isMonthlyOptionModule = isMeetingModule || isMdmModule;

  const defaultMonthly = isMdmModule ? 50 : 100;
  const defaultYearly = isMdmModule ? 299 : 700;

  const isPerStudentModule = moduleId === "cce-result" || (pricing && pricing.perStudentPrice !== undefined);
  const perStudentRate = pricing?.perStudentPrice ?? 5;
  const effectiveStudentsCount = totalStudentsCount > 0 ? totalStudentsCount : 1;
  
  const monthlyRate = pricing?.monthlyPrice ?? pricing?.price ?? defaultMonthly;
  const yearlyRate = pricing?.yearlyPrice ?? defaultYearly;

  let targetPrice = 149;
  if (isPerStudentModule) {
    targetPrice = Math.max(1, effectiveStudentsCount) * perStudentRate;
  } else if (isMonthlyOptionModule) {
    targetPrice = meetingPlan === "yearly" ? yearlyRate : monthlyRate;
  } else {
    targetPrice = pricing?.price || 149;
  }

  // If this tab is explicitly marked as FREE (e.g. School settings or Student Progress in CCE)
  if (!isPaidTab) {
    return <>{children}</>;
  }

  // Handle Razorpay Online Gateway Checkout
  const handlePayNow = async () => {
    if (!pricing || targetPrice <= 0) return;
    setPaying(true);

    const handleFocus = () => {
      setTimeout(() => {
        setPaying(false);
        window.removeEventListener("focus", handleFocus);
      }, 1500);
    };
    window.addEventListener("focus", handleFocus);

    try {
      const teacherName = localStorage.getItem("teacher_name") || localStorage.getItem("user_name") || "शिक्षक";
      const teacherEmail = localStorage.getItem("teacher_email") || "";
      const teacherPhone = localStorage.getItem("teacher_phone") || "";

      await processRazorpayPayment({
        amount: targetPrice,
        moduleId: pricing.id,
        moduleTitle: pricing.title || defaultTitle || moduleId,
        teacherName,
        teacherEmail,
        teacherPhone,
        onSuccess: async (paymentId, orderId) => {
          try {
            const paymentDocKey = isMonthlyOptionModule
              ? meetingPlan === "yearly"
                ? `${teacherId}_${moduleId}_FULL_YEAR`
                : `${teacherId}_${moduleId}_MONTH_${targetMonth}`
              : `${teacherId}_${moduleId}`;

            const validityDays = pricing.validityDays || 365;
            const paidAt = new Date();
            let expiresAt = new Date();

            if (moduleId === "special-day" || moduleId === "paripath" || moduleId === "daily-assembly" || (isMonthlyOptionModule && meetingPlan === "yearly")) {
              // School Academic Year expiry: June 1st to May 31st of next year
              const currentMonth = paidAt.getMonth();
              const academicEndYear = currentMonth >= 5 ? paidAt.getFullYear() + 1 : paidAt.getFullYear();
              expiresAt = new Date(academicEndYear, 4, 31, 23, 59, 59, 999);
            } else {
              expiresAt.setDate(paidAt.getDate() + validityDays);
            }

            const quota = totalStudentsCount > 0 ? totalStudentsCount : 1;
            const record = {
              id: paymentDocKey,
              teacherId,
              teacherName,
              teacherEmail,
              teacherPhone,
              moduleId: pricing.id,
              moduleTitle: isMonthlyOptionModule
                ? meetingPlan === "yearly"
                  ? `${pricing.title || defaultTitle || moduleId} (वार्षिक - संपूर्ण वर्ष)`
                  : `${pricing.title || defaultTitle || moduleId} (मासिक - ${MONTH_NAMES_MAP[targetMonth] || targetMonth} महिना)`
                : (pricing.title || defaultTitle || moduleId),
              amount: targetPrice,
              paymentMethod: "RAZORPAY",
              razorpayPaymentId: paymentId,
              razorpayOrderId: orderId || "",
              status: "SUCCESS",
              paidAt: paidAt.toISOString(),
              expiresAt: expiresAt.toISOString(),
              studentsCount: quota,
              paidQuota: quota,
              perStudentRate: isPerStudentModule ? perStudentRate : undefined,
              paymentType: isMonthlyOptionModule ? (meetingPlan === "yearly" ? "FULL_YEAR" : "MONTHLY") : "FULL",
              unlockedMonth: isMonthlyOptionModule && meetingPlan === "monthly" ? targetMonth : undefined,
              unlockedMonths: isMonthlyOptionModule
                ? meetingPlan === "yearly"
                  ? ["06", "07", "08", "09", "10", "11", "12", "01", "02", "03", "04", "05"]
                  : [targetMonth]
                : undefined,
            };

            await setDoc(doc(db, "teacher_module_payments", paymentDocKey), record, { merge: true });
            
            // Promote user to Teacher role upon purchasing any module
            try {
              if (teacherId && teacherId !== "teacher_guest") {
                await setDoc(doc(db, "users", teacherId), { role: "teacher", is_teacher: true, isTeacher: true }, { merge: true });
                await setDoc(doc(db, "teachers", teacherId), { role: "teacher", is_teacher: true, email: teacherEmail, fullName: teacherName }, { merge: true });
              }
            } catch (roleErr) {
              console.warn("User role upgrade error:", roleErr);
            }

            setIsUnlocked(true);
            setPaying(false);
            toast.success("अभिनंदन! हे मॉड्यूल यशस्वीरित्या अनलॉक झाले आहे!");
          } catch (e: any) {
            console.error("Payment save error:", e);
            toast.error("पेमेंट रेकॉर्ड जतन करताना अडचण आली.");
            setPaying(false);
          }
        },
        onError: (err) => {
          setPaying(false);
          const msg = typeof err === "string" ? err : "पेमेंट प्रक्रिया रद्द किंवा अयशस्वी झाली.";
          toast.error(msg);
        },
      });
    } catch (err: any) {
      setPaying(false);
      toast.error(err.message || "पेमेंट प्रक्रिया सुरू होऊ शकली नाही.");
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">मॉड्यूल माहिती व परमिशन तपासत आहे...</p>
      </div>
    );
  }

  // Free or Paywall disabled by Admin OR already unlocked by Teacher OR non-paid tab
  const isFree = !pricing || !pricing.enabled || targetPrice <= 0;
  if (isFree || isUnlocked || !isPaidTab) {
    return <>{children}</>;
  }

  // Generate dynamic UPI QR URL if no custom image set
  const upiId = pricing?.upiId || "smartlearning@upi";
  const upiPayload = `upi://pay?pa=${upiId}&pn=${encodeURIComponent("Smart Learning AI")}&am=${targetPrice}&cu=INR&tn=${encodeURIComponent(pricing?.title || moduleId)}`;
  const qrCodeUrl = pricing?.qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiPayload)}`;

  // ── PAYWALL UNLOCK DASHBOARD (STRICT BLOCKING) ──
  return (
    <div className="max-w-4xl mx-auto my-8 p-4 font-sans select-none">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/80 via-indigo-100/40 to-transparent rounded-bl-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-amber-100/80 via-emerald-100/30 to-transparent rounded-tr-full pointer-events-none" />

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 text-white p-8 sm:p-10 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 mb-4 shadow-inner">
            <Lock className="size-10 text-amber-300 animate-pulse" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {pricing?.title || defaultTitle || "प्रीमियम मॉड्यूल अनलॉक करा"}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 font-medium mt-2 max-w-xl mx-auto">
            {pricing?.description || "हे मॉड्यूल वापरण्यासाठी खालील स्कॅनरवरून QR कोड स्कॅन करा किंवा ऑनलाइन पेमेंट करून त्वरित ॲक्सेस मिळवा."}
          </p>
        </div>

        {/* Main Content Area */}
        <div className="p-6 sm:p-10 relative z-10 space-y-8">
          
          {/* Per-Student Fee Breakdown Banner */}
          {isPerStudentModule && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border-2 border-amber-200/80 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                  ₹
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider bg-amber-100 px-2 py-0.5 rounded-full">
                      CCE प्रति विद्यार्थी दर रचना
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                    ₹{perStudentRate} प्रति विद्यार्थी × {totalStudentsCount > 0 ? totalStudentsCount : 1} विद्यार्थी
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {totalStudentsCount > 0
                      ? `तुमच्या खात्यात एकूण ${totalStudentsCount} विद्यार्थी जोडलेले आहेत.`
                      : "नुकतीच सुरुवात! (न्यूनतम १ विद्यार्थी दर)"}
                  </p>
                </div>
              </div>

              <div className="text-right bg-white px-5 py-3 rounded-2xl border border-amber-200/80 shadow-xs shrink-0 w-full sm:w-auto">
                <span className="text-[11px] text-slate-500 font-extrabold block">एकूण देय रक्कम</span>
                <span className="text-2xl font-black text-emerald-600">₹{targetPrice}</span>
              </div>
            </div>
          )}

          {/* Meeting / MDM Register Plan Selection Banner */}
          {isMonthlyOptionModule && (
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 rounded-3xl border border-indigo-500/30 text-white space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-400" /> प्लॅन व ॲक्सेस प्रकार निवडा (Choose Access Plan):
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Monthly (Admin configured price) */}
                <div
                  onClick={() => setMeetingPlan("monthly")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    meetingPlan === "monthly"
                      ? "border-amber-400 bg-amber-500/20 text-white shadow-lg ring-2 ring-amber-400/40"
                      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-amber-200">मासिक ॲक्सेस (१ महिना)</span>
                    <span className="font-black text-amber-300 text-lg bg-amber-400/20 px-3 py-1 rounded-xl border border-amber-400/40">₹{monthlyRate}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    निवडलेल्या १ महिन्यासाठी सर्व ७ समित्या आणि अहवाल पूर्णपणे अनलॉक करा.
                  </p>
                </div>

                {/* Option 2: Full Year (Admin configured price) */}
                <div
                  onClick={() => setMeetingPlan("yearly")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    meetingPlan === "yearly"
                      ? "border-emerald-400 bg-emerald-500/20 text-white shadow-lg ring-2 ring-emerald-400/40"
                      : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-emerald-200">संपूर्ण वर्ष (वार्षिक)</span>
                      <span className="text-[9px] font-black uppercase bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">बेस्ट ऑफर</span>
                    </div>
                    <span className="font-black text-emerald-300 text-lg bg-emerald-400/20 px-3 py-1 rounded-xl border border-emerald-400/40">₹{yearlyRate}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    संपूर्ण शैक्षणिक वर्षाचे (जून ते मे) सर्व १२ महिने व सर्व समित्या एकदम अनलॉक करा.
                  </p>
                </div>
              </div>

              {meetingPlan === "monthly" && (
                <div className="pt-2 flex flex-wrap items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                  <label className="text-xs font-bold text-amber-300">अनलॉक करायचा महिना निवडा:</label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-amber-300 font-black text-xs outline-none cursor-pointer focus:border-amber-400"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.label} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* SINGLE SECURE RAZORPAY PAYMENT CARD (Includes UPI QR, GPay, PhonePe, Cards, NetBanking) */}
          <div className="bg-gradient-to-br from-slate-50 via-purple-50/50 to-indigo-50/60 rounded-3xl p-6 sm:p-10 border border-purple-100/80 shadow-md space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-100 text-purple-900 rounded-full text-xs font-black uppercase tracking-wider border border-purple-200">
                <ShieldCheck className="size-4 text-purple-600" /> 100% सुरक्षित Razorpay पेमेंट
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                QR कोड स्कॅन करा किंवा UPI / कार्ड द्वारे भरणा करा
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-lg mx-auto">
                खालील बटणावर क्लिक करा - Razorpay च्या सुरक्षित विंडोमध्ये GPay, PhonePe, Paytm QR स्कॅनर व इतर सर्व पर्याय उपलब्ध आहेत.
              </p>
            </div>

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-lg space-y-6 text-center max-w-xl mx-auto">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">एकूण देय रक्कम</span>
                <div className="text-3xl sm:text-4xl font-black text-purple-700">
                  ₹{targetPrice}
                </div>
              </div>

              {/* Supported Payment Options Badges */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">सपोर्टेड पेमेंट पर्याय:</p>
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-black text-slate-700">
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-1">
                    <QrCode className="size-3.5 text-emerald-600" /> QR कोड स्कॅनर (GPay/PhonePe/Paytm)
                  </span>
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200">
                    UPI ID
                  </span>
                  <span className="px-3 py-1.5 bg-purple-50 text-purple-800 rounded-xl border border-purple-200">
                    डेबिट / क्रेडिट कार्ड
                  </span>
                  <span className="px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200">
                    नेटबँकिंग
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayNow}
                disabled={paying}
                className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-98 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-purple-500/25 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
              >
                {paying ? (
                  <>
                    <Loader2 className="size-6 animate-spin" />
                    <span>पेमेंट विंडो उघडत आहे...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="size-6 text-amber-300" />
                    <span>₹{targetPrice} भरून आताच अनलॉक करा (Pay Now)</span>
                  </>
                )}
              </button>

              <p className="text-[11.5px] text-slate-500 font-bold">
                🔒 पेमेंट यशस्वी होताच हे मॉड्यूल आपोआप अनलॉक होईल.
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-4 pt-2">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Award className="size-4 text-blue-600" /> या मॉड्यूलमध्ये समाविष्ट वैशिष्ट्ये:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(pricing?.features && pricing.features.length > 0
                ? pricing.features
                : [
                    "अन्लिमिटेड डेटा एंट्री आणि ऑटोमॅटिक कॅल्क्युलेशन",
                    "A4 साईझ उच्च दर्जाची PDF डायरेक्ट डाऊनलोड",
                    "एक्सेल शीट रिपोर्ट इम्पोर्ट व एक्स्पोर्ट सुविधा",
                    "शिक्षक आयसोलेशनसह 100% डेटा सुरक्षितता",
                    "मोबाईल, टॅबलेट आणि पीसी वर सुलभ वापर",
                    "24/7 व्हॉट्सॲप आणि फोन सपोर्ट सुविधा",
                  ]
              ).map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs"
                >
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs font-extrabold text-slate-700 leading-snug">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="size-4" /> 100% सुरक्षित एनक्रिप्टेड पेमेंट
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-blue-600">
              <Zap className="size-4" /> इन्स्टंट ऑटोमॅटिक अनलॉक
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
