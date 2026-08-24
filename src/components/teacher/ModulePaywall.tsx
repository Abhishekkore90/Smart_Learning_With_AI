import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
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
}

export function ModulePaywall({ moduleId, defaultTitle, children }: ModulePaywallProps) {
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [pricing, setPricing] = useState<ModulePricing | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  
  // Payment Mode Tab: "qr" (Scanner) vs "razorpay" (Card/NetBanking/Online)
  const [paymentTab, setPaymentTab] = useState<"qr" | "razorpay">("qr");
  
  // Manual UTR submission state
  const [utrNumber, setUtrNumber] = useState("");
  const [copiedUpi, setCopiedUpi] = useState(false);

  const teacherId = getTeacherId() || "teacher_guest";

  useEffect(() => {
    let unsubPricing: () => void;
    let unsubPayment: () => void;
    let unsubAccess: () => void;
    let unsubAllAccess: () => void;

    const checkAccess = async () => {
      setLoading(true);
      try {
        // 1. Listen to pricing doc for this module
        unsubPricing = onSnapshot(doc(db, "cce_module_pricing", moduleId), (snap) => {
          if (snap.exists()) {
            setPricing(snap.data() as ModulePricing);
          } else {
            // Default pricing if admin hasn't configured yet
            setPricing({
              id: moduleId,
              title: defaultTitle || moduleId,
              price: 149,
              enabled: false, // Default false until admin explicitly enables paywall
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

        // 2. Listen to teacher payment doc
        const paymentDocKey = `${teacherId}_${moduleId}`;
        unsubPayment = onSnapshot(doc(db, "teacher_module_payments", paymentDocKey), (snap) => {
          if (snap.exists() && snap.data().status === "SUCCESS") {
            const pData = snap.data();
            // Check expiry if set
            if (pData.expiresAt) {
              const expDate = new Date(pData.expiresAt);
              if (expDate > new Date()) {
                setIsUnlocked(true);
                setPaymentInfo(pData);
              } else {
                setIsUnlocked(false);
              }
            } else {
              setIsUnlocked(true);
              setPaymentInfo(pData);
            }
          }
          // Don't set isUnlocked=false here — admin access check below may grant it
        });

        // 3. Listen to admin-granted free access (per-module OR all-modules)
        const accessDocKey = `${teacherId}_${moduleId}`;
        const allAccessDocKey = `${teacherId}_ALL`;
        let moduleAccessGranted = false;
        let allAccessGranted = false;

        unsubAccess = onSnapshot(doc(db, "teacher_module_access", accessDocKey), (snap) => {
          if (snap.exists() && snap.data().status === "GRANTED") {
            moduleAccessGranted = true;
            setIsUnlocked(true);
            setPaymentInfo({ ...snap.data(), grantedByAdmin: true });
          } else {
            moduleAccessGranted = false;
            if (!allAccessGranted) {
              // Only keep locked if ALL access also not granted
            }
          }
          if (!allAccessGranted && !moduleAccessGranted) {
            // Will be resolved by allAccess listener
          }
          setLoading(false);
        });

        // 4. Listen to ALL-modules access grant (admin gave access to ALL sections)
        unsubAllAccess = onSnapshot(doc(db, "teacher_module_access", allAccessDocKey), (snap) => {
          if (snap.exists() && snap.data().status === "GRANTED") {
            allAccessGranted = true;
            setIsUnlocked(true);
            setPaymentInfo({ ...snap.data(), grantedByAdmin: true, allAccess: true });
          } else {
            allAccessGranted = false;
            if (!moduleAccessGranted) {
              // Neither module nor all access granted — stay locked (payment check already ran)
            }
          }
          setLoading(false);
        });
      } catch (err) {
        console.error("Paywall error:", err);
        setLoading(false);
      }
    };

    checkAccess();
    return () => {
      if (unsubPricing) unsubPricing();
      if (unsubPayment) unsubPayment();
      if (unsubAccess) unsubAccess();
      if (unsubAllAccess) unsubAllAccess();
    };
  }, [moduleId, teacherId]);

  // Handle Razorpay Online Gateway Checkout
  const handlePayNow = async () => {
    if (!pricing || pricing.price <= 0) return;
    setPaying(true);
    try {
      const teacherName = localStorage.getItem("teacher_name") || localStorage.getItem("user_name") || "शिक्षक";
      const teacherEmail = localStorage.getItem("teacher_email") || "";
      const teacherPhone = localStorage.getItem("teacher_phone") || "";

      await processRazorpayPayment({
        amount: pricing.price,
        moduleId: pricing.id,
        moduleTitle: pricing.title || defaultTitle || moduleId,
        teacherName,
        teacherEmail,
        teacherPhone,
        onSuccess: async (paymentId, orderId) => {
          try {
            const paymentDocKey = `${teacherId}_${moduleId}`;
            const validityDays = pricing.validityDays || 365;
            const paidAt = new Date();
            const expiresAt = new Date();
            expiresAt.setDate(paidAt.getDate() + validityDays);

            const record = {
              id: paymentDocKey,
              teacherId,
              teacherName,
              teacherEmail,
              teacherPhone,
              moduleId: pricing.id,
              moduleTitle: pricing.title || defaultTitle || moduleId,
              amount: pricing.price,
              paymentMethod: "RAZORPAY",
              razorpayPaymentId: paymentId,
              razorpayOrderId: orderId || "",
              status: "SUCCESS",
              paidAt: paidAt.toISOString(),
              expiresAt: expiresAt.toISOString(),
            };

            await setDoc(doc(db, "teacher_module_payments", paymentDocKey), record, { merge: true });
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
          toast.error(typeof err === "string" ? err : "पेमेंट अयशस्वी झाले.");
        },
      });
    } catch (err: any) {
      setPaying(false);
      toast.error(err.message || "पेमेंट प्रक्रिया सुरू होऊ शकली नाही.");
    }
  };

  // Handle UTR Reference Submission (when paying via UPI QR Scanner)
  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.trim().length < 6) {
      toast.error("कृपया वैध 12 अंकी UTR / Transaction Reference Number टाका.");
      return;
    }

    setSubmittingUtr(true);
    try {
      const teacherName = localStorage.getItem("teacher_name") || localStorage.getItem("user_name") || "शिक्षक";
      const teacherEmail = localStorage.getItem("teacher_email") || "";
      const teacherPhone = localStorage.getItem("teacher_phone") || "";
      const paymentDocKey = `${teacherId}_${moduleId}`;
      const validityDays = pricing?.validityDays || 365;
      const paidAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(paidAt.getDate() + validityDays);

      const record = {
        id: paymentDocKey,
        teacherId,
        teacherName,
        teacherEmail,
        teacherPhone,
        moduleId: pricing?.id || moduleId,
        moduleTitle: pricing?.title || defaultTitle || moduleId,
        amount: pricing?.price || 0,
        paymentMethod: "UPI_QR",
        utrNumber: utrNumber.trim(),
        razorpayPaymentId: `UTR_${utrNumber.trim()}`,
        status: "SUCCESS", // Auto unlock on submission or instant verify
        paidAt: paidAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      await setDoc(doc(db, "teacher_module_payments", paymentDocKey), record, { merge: true });
      setIsUnlocked(true);
      setSubmittingUtr(false);
      toast.success("UTR व्हॅलिडेट झाले! हे मॉड्यूल यशस्वीरित्या अनलॉक झाले आहे!");
    } catch (err: any) {
      console.error("UTR Submission error:", err);
      toast.error("UTR जतन करताना अडचण आली: " + err.message);
      setSubmittingUtr(false);
    }
  };

  const copyUpiId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedUpi(true);
    toast.success("UPI ID क्लिपबोर्डवर कॉपी झाला!");
    setTimeout(() => setCopiedUpi(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">मॉड्यूल माहिती व परमिशन तपासत आहे...</p>
      </div>
    );
  }

  // Free or Paywall disabled by Admin OR already unlocked by Teacher
  const isFree = !pricing || !pricing.enabled || pricing.price <= 0;
  if (isFree || isUnlocked) {
    return <>{children}</>;
  }

  // Generate dynamic UPI QR URL if no custom image set
  const upiId = pricing?.upiId || "smartlearning@upi";
  const targetPrice = pricing?.price || 149;
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
          
          {/* Payment Method Selector Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-md mx-auto">
            <button
              onClick={() => setPaymentTab("qr")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                paymentTab === "qr"
                  ? "bg-white text-blue-700 shadow-md border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <QrCode className="size-4.5 text-blue-600" />
              <span>QR कोड स्कॅनर (Direct UPI)</span>
            </button>

            <button
              onClick={() => setPaymentTab("razorpay")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                paymentTab === "razorpay"
                  ? "bg-white text-purple-700 shadow-md border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="size-4.5 text-purple-600" />
              <span>Razorpay गेटवे</span>
            </button>
          </div>

          {/* TAB 1: DIRECT QR SCANNER (PROMINENT SCANNER CARD) */}
          {paymentTab === "qr" && (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/60 rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider">
                  <Sparkles className="size-3.5 text-emerald-600" /> त्वरित UPI पेमेंट स्कॅनर
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  स्कॅन करा आणि ₹{targetPrice} भरा
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Google Pay, PhonePe, Paytm, BHIM किंवा कोणत्याही UPI ॲपने स्कॅन करा
                </p>
              </div>

              {/* QR Code Scanner Box */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md">
                <div className="relative group">
                  <div className="w-56 h-56 p-3 bg-white rounded-2xl border-4 border-blue-600/20 shadow-xl flex items-center justify-center relative overflow-hidden">
                    <img
                      src={qrCodeUrl}
                      alt="Payment UPI QR Code"
                      className="w-full h-full object-contain rounded-xl"
                    />
                    {/* Scanner Overlay Line Effect */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent top-0 animate-pulse" />
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 inline-block">
                      ₹{targetPrice} (1 Year Validity)
                    </span>
                  </div>
                </div>

                {/* UPI Details & Copy Box */}
                <div className="space-y-4 max-w-xs text-center sm:text-left">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">UPI ID:</p>
                    <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-mono font-black text-slate-800 text-sm truncate flex-1">
                        {upiId}
                      </span>
                      <button
                        onClick={() => copyUpiId(upiId)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg transition-all cursor-pointer shrink-0"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Payment Apps Badges */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-slate-500">सपोर्टेड UPI ॲप्स:</p>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap text-[11px] font-black text-slate-700">
                      <span className="px-2.5 py-1 bg-blue-100/70 text-blue-800 rounded-lg border border-blue-200">
                        Google Pay
                      </span>
                      <span className="px-2.5 py-1 bg-purple-100/70 text-purple-800 rounded-lg border border-purple-200">
                        PhonePe
                      </span>
                      <span className="px-2.5 py-1 bg-sky-100/70 text-sky-800 rounded-lg border border-sky-200">
                        Paytm
                      </span>
                      <span className="px-2.5 py-1 bg-orange-100/70 text-orange-800 rounded-lg border border-orange-200">
                        BHIM
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual UTR Submit Form */}
              <form onSubmit={handleSubmitUtr} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="size-5 text-blue-600 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-black text-slate-800">
                    पेमेंट केल्यानंतर UTR / Transaction Ref No. येथे टाका:
                  </h4>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="उदा. 12 अंकी UTR नंबर (Ref No)"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingUtr}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingUtr ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span>वेरीफाय करा</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  * स्कॅन करून भरणा केल्यानंतर युपीआय ॲप मधील 12 डिजिट Reference Number टाकून अनलॉक करा.
                </p>
              </form>
            </div>
          )}

          {/* TAB 2: RAZORPAY GATEWAY CHECKOUT */}
          {paymentTab === "razorpay" && (
            <div className="bg-gradient-to-br from-slate-50 to-purple-50/60 rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="size-3.5 text-purple-600" /> Razorpay ऑनलाइन गेटवे
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  कार्ड / नेटबँकिंग / युपीआय द्वारे भरणा करा
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Razorpay च्या 100% सुरक्षित पेमेंट गेटवेद्वारे त्वरित ॲक्सेस मिळवा
                </p>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4 text-center">
                <div className="text-3xl font-black text-purple-700">
                  ₹{targetPrice} <span className="text-xs font-bold text-slate-500">/ 1 Year</span>
                </div>
                <p className="text-xs font-bold text-slate-600">
                  सर्व डेबिट कार्ड्स, क्रेडिट कार्ड्स, नेटबँकिंग, व्हॉलेट आणि UPI पेमेंट पर्याय उपलब्ध.
                </p>

                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-98 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-purple-500/25 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <Loader2 className="size-6 animate-spin" />
                      <span>पेमेंट प्रक्रिया सुरू आहे...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="size-6 text-amber-300" />
                      <span>₹{targetPrice} देऊन आताच अनलॉक करा (Pay via Razorpay)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

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
