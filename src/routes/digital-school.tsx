import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Monitor,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Wifi,
  WifiOff,
  User,
  Mail,
  Phone,
  School,
  FileText,
  MapPin,
  Send,
  Loader2,
  Clock,
  ShieldCheck,
  Check,
  Users,
  Award,
  CreditCard,
  Lock,
  ArrowRight,
  Eye,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { useLanguage } from "@/hooks/use-language";
import { showToast as toast } from "@/lib/custom-toast";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { processRazorpayPayment } from "@/lib/razorpayService";
import { saveInquiry } from "@/lib/digitalSchoolInquiryService";

export const Route = createFileRoute("/digital-school")({
  head: () => ({ meta: [{ title: "Digital School Platform — SMART LEARNING" }] }),
  component: DigitalSchoolPage,
});

interface SchoolPlan {
  id: string;
  badge: string;
  badgeBg: string;
  title: string;
  studentsCount: string;
  price: string;
  amount: number;
  period: string;
  isDemo?: boolean;
  features: string[];
}

const SCHOOL_PLANS: SchoolPlan[] = [
  {
    id: "free-demo",
    badge: "FREE DEMO",
    badgeBg: "bg-[#f97316] text-white",
    title: "Free Demo",
    studentsCount: "",
    price: "₹0",
    amount: 0,
    period: "/ Demo",
    isDemo: true,
    features: [],
  },
  {
    id: "starter-100",
    badge: "STARTER",
    badgeBg: "bg-slate-600 text-white",
    title: "100 Students Plan",
    studentsCount: "100 Students",
    price: "₹5,000",
    amount: 5000,
    period: "/ year",
    features: [
      "Up to 100 Students Limit",
      "Student Record & Registration",
      "Bonafide Certificate Generation",
      "Leaving Certificate (LC / TC)",
      "Student Identity Cards",
      "Standard Reports & Export",
    ],
  },
  {
    id: "basic-250",
    badge: "BASIC",
    badgeBg: "bg-sky-500 text-white",
    title: "250 Students Plan",
    studentsCount: "250 Students",
    price: "₹10,000",
    amount: 10000,
    period: "/ year",
    features: [
      "Up to 250 Students Limit",
      "Student Record & Registration",
      "Bonafide Certificate Generation",
      "Leaving Certificate (LC / TC)",
      "Student Identity Cards",
      "Standard Reports & Export",
    ],
  },
  {
    id: "popular-500",
    badge: "POPULAR",
    badgeBg: "bg-amber-500 text-white",
    title: "500 Students Plan",
    studentsCount: "500 Students",
    price: "₹15,000",
    amount: 15000,
    period: "/ year",
    features: [
      "Up to 500 Students Limit",
      "All Basic Features",
      "Fee Management & Receipts",
      "Daily Student Attendance",
      "Staff & Teacher Attendance",
      "Fee Due SMS & Notifications",
    ],
  },
  {
    id: "growth-750",
    badge: "GROWTH",
    badgeBg: "bg-orange-500 text-white",
    title: "750 Students Plan",
    studentsCount: "750 Students",
    price: "₹20,000",
    amount: 20000,
    period: "/ year",
    features: [
      "Up to 750 Students Limit",
      "All 500 Plan Features",
      "Exam & Marksheet System",
      "Progress Report Card Generator",
      "Daily Attendance & SMS",
      "Standard & Custom Reports",
    ],
  },
  {
    id: "advanced-1000",
    badge: "ADVANCED",
    badgeBg: "bg-blue-600 text-white",
    title: "1000 Students Plan",
    studentsCount: "1000 Students",
    price: "₹25,000",
    amount: 25000,
    period: "/ year",
    features: [
      "Up to 1000 Students Limit",
      "All 750 Plan Features",
      "Exam & Marksheet System",
      "Class Rank & Analytics",
      "Custom Report Templates",
      "Priority Technical Support",
    ],
  },
  {
    id: "premium-1500",
    badge: "PREMIUM",
    badgeBg: "bg-purple-700 text-white",
    title: "1500 Students Plan",
    studentsCount: "1500 Students",
    price: "₹35,000",
    amount: 35000,
    period: "/ year",
    features: [
      "Up to 1500 Students Limit",
      "All Advanced Features",
      "Poshanahar (Midday Meal) Reports",
      "Daily Meal Inventory & Stock",
      "Government Compliance Export",
      "Priority Dedicated Support",
    ],
  },
  {
    id: "ultimate-2000",
    badge: "ULTIMATE",
    badgeBg: "bg-emerald-600 text-white",
    title: "2000 Students Plan",
    studentsCount: "2000 Students",
    price: "₹45,000",
    amount: 45000,
    period: "/ year",
    features: [
      "Up to 2000 Students Limit",
      "Complete All-in-One School Suite",
      "Full Poshanahar (Midday Meal) System",
      "Custom Report Templates",
      "Government Compliance Export",
      "24/7 Dedicated Priority Support",
    ],
  },
];

type DigitalSchoolView = "cards" | "inquiry" | "inquiry_success" | "plans_selection" | "payment_success";

function DigitalSchoolPage() {
  const { lang } = useLanguage();

  // State: 'cards' | 'inquiry' | 'inquiry_success' | 'plans_selection' | 'payment_success'
  const [view, setView] = useState<DigitalSchoolView>("cards");

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [udiseNo, setUdiseNo] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Stored state for returning inquiry user
  const [hasSubmittedInquiry, setHasSubmittedInquiry] = useState(false);
  const [savedInquiry, setSavedInquiry] = useState<any>(null);

  // Plan selection state for returning users
  const [selectedPlanId, setSelectedPlanId] = useState<string>("popular-500");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [lastPaymentDetails, setLastPaymentDetails] = useState<any>(null);

  const selectedPlan = SCHOOL_PLANS.find((p) => p.id === selectedPlanId) || SCHOOL_PLANS[3];

  useEffect(() => {
    // Check if user has already filled the inquiry form
    const isSubmitted = localStorage.getItem("digital_school_inquiry_submitted") === "true";
    const savedDataStr = localStorage.getItem("digital_school_inquiry_data");
    if (savedDataStr) {
      try {
        const data = JSON.parse(savedDataStr);
        setSavedInquiry(data);
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.udiseNo) setUdiseNo(data.udiseNo);
        if (data.schoolAddress) setSchoolAddress(data.schoolAddress);
      } catch (e) {
        console.error("Error parsing saved inquiry data", e);
      }
    }
    setHasSubmittedInquiry(isSubmitted);
  }, []);

  const handleOnlineClick = () => {
    toast.info("ऑनलाईन डिजिटल स्कूल पोर्टल उघडत आहे...");
    window.location.href = "https://digitalschool.sgkbrainova.com/";
  };

  const handleOfflineClick = () => {
    // If user has ALREADY submitted their inquiry form, directly show them the active plans & payment screen!
    if (hasSubmittedInquiry) {
      setView("plans_selection");
    } else {
      setView("inquiry");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("कृपया आपले नाव भरा");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      toast.error("कृपया 10 अंकी वैध मोबाईल नंबर भरा");
      return;
    }
    if (!schoolName.trim()) {
      toast.error("कृपया शाळेचे नाव भरा");
      return;
    }
    if (!udiseNo.trim() || udiseNo.trim().length < 11) {
      toast.error("कृपया 11 अंकी युडायस (UDISE) क्रमांक भरा");
      return;
    }
    if (!schoolAddress.trim()) {
      toast.error("कृपया शाळेचा पत्ता भरा");
      return;
    }

    setSubmitting(true);
    const inquiryPayload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      schoolName: schoolName.trim(),
      udiseNo: udiseNo.trim(),
      schoolAddress: schoolAddress.trim(),
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = await saveInquiry(inquiryPayload);
      setHasSubmittedInquiry(true);
      setSavedInquiry(saved);

      toast.success("चौकशी अर्ज यशस्वीरित्या पाठवला गेला आहे!");
      setView("inquiry_success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Error submitting offline inquiry:", err);
      toast.error("अर्ज सबमिट करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMakePayment = async () => {
    // If Free Demo, activate immediately
    if (selectedPlan.id === "free-demo" || selectedPlan.amount === 0) {
      toast.success("मोफत डेमो ऍक्टिव्हेट करण्यात आला आहे! आमची टीम आपल्याशी संपर्क साधेल.");
      setView("payment_success");
      setLastPaymentDetails({
        paymentId: "DEMO_" + Date.now(),
        plan: selectedPlan,
        schoolName: schoolName || savedInquiry?.schoolName || "School",
        amount: 0,
      });
      return;
    }

    setProcessingPayment(true);
    try {
      await processRazorpayPayment({
        amount: selectedPlan.amount,
        moduleId: `digital-school-${selectedPlan.id}`,
        moduleTitle: `Digital School — ${selectedPlan.title}`,
        teacherName: name || savedInquiry?.name || "School Incharge",
        teacherEmail: email || savedInquiry?.email || "",
        teacherPhone: phone || savedInquiry?.phone || "",
        onSuccess: async (paymentId: string, orderId?: string) => {
          try {
            await addDoc(collection(db, "digital_school_payments"), {
              planId: selectedPlan.id,
              planTitle: selectedPlan.title,
              amount: selectedPlan.amount,
              schoolName: schoolName || savedInquiry?.schoolName || "",
              udiseNo: udiseNo || savedInquiry?.udiseNo || "",
              customerName: name || savedInquiry?.name || "",
              phone: phone || savedInquiry?.phone || "",
              email: email || savedInquiry?.email || "",
              paymentId,
              orderId: orderId || null,
              status: "success",
              createdAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn("Could not record payment log to Firestore:", e);
          }

          setLastPaymentDetails({
            paymentId,
            orderId,
            plan: selectedPlan,
            schoolName: schoolName || savedInquiry?.schoolName || "",
            amount: selectedPlan.amount,
          });

          setView("payment_success");
          toast.success("पेमेंट यशस्वी झाले! आपला प्लॅन ऍक्टिव्हेट झाला आहे.");
          window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: (err: any) => {
          toast.error(typeof err === "string" ? err : "पेमेंट रद्द केले किंवा अयशस्वी झाले.");
        },
      });
    } catch (err: any) {
      console.error("Razorpay process error:", err);
      toast.error(err?.message || "पेमेंट प्रक्रिया सुरू करताना त्रुटी आली.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827] flex flex-col justify-between">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-20 w-full flex-1">
        {/* Navigation Breadcrumb / Back Button */}
        <div className="mb-6 flex items-center justify-between">
          {view === "cards" ? (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
            >
              <ArrowLeft className="size-4" />
              <span>{lang === "mr" ? "मुख्यपृष्ठावर परत जा" : "Back to Home"}</span>
            </Link>
          ) : view === "plans_selection" ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => {
                  setView("inquiry");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 text-xs font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
              >
                <ArrowLeft className="size-4" />
                <span>चौकशी अर्जावर परत जा (Back to Inquiry Form)</span>
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer hidden md:inline"
              >
                (किंवा प्लॅटफॉर्म निवड)
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView("cards")}
              className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>{lang === "mr" ? "प्लॅटफॉर्म निवडीकडे परत जा" : "Back to Platforms"}</span>
            </button>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider">
            <Sparkles className="size-3.5 text-indigo-600" />
            <span>Digital School</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: DUAL PLATFORM CHOICE CARDS (ONLINE vs OFFLINE)                    */}
        {/* ========================================================================= */}
        {view === "cards" && (
          <div className="space-y-12">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {lang === "mr" ? "डिजिटल स्कूल प्लॅटफॉर्म" : "Digital School Platform"}
              </h1>
              <p className="text-slate-600 font-semibold text-sm sm:text-base md:text-lg">
                {lang === "mr"
                  ? "आपल्या शाळेच्या गरजेनुसार खालीलपैकी योग्य प्लॅटफॉर्म निवडा:"
                  : "Please select your preferred digital school learning solution below:"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* CARD 1: ONLINE PLATFORM */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-indigo-100 shadow-xl shadow-indigo-100/50 hover:border-indigo-500 hover:shadow-2xl transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="size-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                      <Globe className="size-8" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black tracking-wider">
                      <Wifi className="size-3.5" />
                      <span>ONLINE</span>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      1. Online Platform
                    </h2>
                    <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest mt-1">
                      (ऑनलाईन डिजिटल स्कूल)
                    </p>
                  </div>

                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    {lang === "mr"
                      ? "इंटरनेट कनेक्टिव्हिटीसह थेट वेब ब्राउझरवर चालणारे डिजिटल स्कूल सॉफ्टवेअर. क्लाउड डेटा सिंक आणि थेट ऑनलाईन सुविधा."
                      : "Direct cloud-connected web portal with real-time synchronization, anywhere access, and interactive resources."}
                  </p>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <span>थेट वेब ब्राउझरवर उपलब्ध (No Installation)</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <span>क्लाउड डेटा सिंक व रिअल-टाईम अपडेट्स</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <span>कोणत्याही डिव्हाइसवरून थेट ऍक्सेस</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-6 relative z-10">
                  <button
                    onClick={handleOnlineClick}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🌐 Online Platform उघडा</span>
                  </button>
                </div>
              </motion.div>

              {/* CARD 2: OFFLINE PLATFORM */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-violet-100 shadow-xl shadow-violet-100/50 hover:border-violet-500 hover:shadow-2xl transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="size-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-300 group-hover:scale-105 transition-transform">
                      <Monitor className="size-8 text-amber-400" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black tracking-wider">
                      <WifiOff className="size-3.5" />
                      <span>OFFLINE</span>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      2. Offline Platform
                    </h2>
                    <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest mt-1">
                      (ऑफलाईन डिजिटल स्कूल सॉफ्टवेअर)
                    </p>
                  </div>

                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    {lang === "mr"
                      ? "इंटरनेटशिवाय शाळेतील संगणकावर/लॅपटॉपवर चालणारे संपूर्ण डिजिटल स्कूल सॉफ्टवेअर. मोफत डेमो आणि सर्वसमावेशक प्लॅन्स."
                      : "Standalone offline desktop school software running 100% locally without internet connectivity. Includes free demo & full software support."}
                  </p>

                  <div className="space-y-2.5 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="size-4 text-amber-500 shrink-0" />
                      <span>इंटरनेटशिवाय 100% ऑफलाईन कार्य</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="size-4 text-amber-500 shrink-0" />
                      <span>स्थानिक संगणक/लॅपटॉपवर सुरक्षित डेटा</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="size-4 text-amber-500 shrink-0" />
                      <span>मोफत लाईव्ह डेमो + टीमद्वारे प्रत्यक्ष मार्गदर्शन</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-6 relative z-10 space-y-2">
                  <button
                    onClick={handleOfflineClick}
                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-slate-300 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {hasSubmittedInquiry
                        ? "💻 डिजिटल स्कूल प्लॅन्स व पेमेंट उघडा"
                        : "💻 Offline Inquiry & Demo अर्ज"}
                    </span>
                  </button>

                  {hasSubmittedInquiry && (
                    <p className="text-[11px] text-center text-emerald-600 font-bold">
                      ✓ आपण आधीच चौकशी अर्ज भरला आहे. थेट प्लॅन्स व पेमेंट उपलब्ध!
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: INITIAL VISIT — INQUIRY FORM ONLY (PLANS SHOWN AS PREVIEW ONLY)   */}
        {/* ========================================================================= */}
        {view === "inquiry" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-12 max-w-6xl mx-auto"
          >
            {/* Header */}
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-black uppercase tracking-wider">
                <Monitor className="size-3.5" />
                <span>Offline Software Inquiry Form</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                ऑफलाईन डिजिटल स्कूल चौकशी अर्ज
              </h1>
              <p className="text-slate-600 text-sm sm:text-base font-medium">
                कृपया खालील चौकशी फॉर्म भरा. आमची टीम आपल्याशी संपर्क साधून संपूर्ण मार्गदर्शन व डेमो देईल. समाधान झाल्यानंतर आपण आपल्या आवडीचा प्लॅन निवडून पेमेंट करू शकाल.
              </p>

              {/* Shortcut for returning user */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView("plans_selection");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>आधीच चौकशी अर्ज भरला आहे का? येथे क्लिक करून थेट प्लॅन निवडा व पेमेंट करा.</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitInquiry} className="space-y-10">
              {/* Form Input Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 border border-slate-200 shadow-xl shadow-slate-100/60 space-y-6">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <User className="size-5 text-indigo-600" />
                      <span>१. संपर्क व शाळेची माहिती</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      सर्व माहिती काळजीपूर्वक भरा जेणेकरून आमची टीम योग्य संपर्क करू शकेल.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <User className="size-3.5 text-indigo-600" />
                      <span>आपले पूर्ण नाव <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="आपले पूर्ण नाव प्रविष्ट करा"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Mail className="size-3.5 text-indigo-600" />
                      <span>ईमेल पत्ता</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ईमेल पत्ता प्रविष्ट करा"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Phone className="size-3.5 text-indigo-600" />
                      <span>मोबाईल / संपर्क क्रमांक <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="१० अंकी मोबाईल नंबर प्रविष्ट करा"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>

                  {/* School Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <School className="size-3.5 text-indigo-600" />
                      <span>शाळेचे नाव <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="शाळेचे नाव प्रविष्ट करा"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>

                  {/* UDISE No */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <FileText className="size-3.5 text-indigo-600" />
                      <span>युडायस क्रमांक (UDISE No.) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={udiseNo}
                      onChange={(e) => setUdiseNo(e.target.value.replace(/\D/g, ""))}
                      placeholder="११ अंकी युडायस नंबर प्रविष्ट करा"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-mono"
                    />
                  </div>

                  {/* School Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-indigo-600" />
                      <span>शाळेचा पत्ता (तालुका, जिल्हा व पिनकोडसह) <span className="text-rose-500">*</span></span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={schoolAddress}
                      onChange={(e) => setSchoolAddress(e.target.value)}
                      placeholder="शाळेचा संपूर्ण पत्ता प्रविष्ट करा"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Submit Inquiry Button */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                    चौकशी सबमिट केल्यावर आमची टीम १ दिवसात संपर्क करून डेमो देईल.
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-200 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>अर्ज पाठवत आहे...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        <span>चौकशी अर्ज सबमिट करा (Submit Inquiry)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Downside Section: Free Demo Card Preview ONLY (Features Removed) */}
              <div className="space-y-6 pt-6 border-t border-slate-200">
                <div className="text-center space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                    <Sparkles className="size-3.5 text-orange-600" />
                    <span>मोफत डेमो (Free Demo Preview)</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                    <Award className="size-6 text-amber-500" />
                    <span>डिजिटल स्कूल मोफत लाईव्ह डेमो</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-semibold max-w-xl mx-auto">
                    चौकशी अर्ज भरल्यानंतर आमच्या तज्ज्ञ टीमद्वारे आपल्या शाळेसाठी मोफत प्रात्यक्षिक (Live Demo) दिले जाईल.
                  </p>
                </div>

                {/* Only Free Demo Card Without Features */}
                <div className="flex justify-center">
                  <div className="w-full max-w-[280px] sm:max-w-[300px] bg-white rounded-[32px] p-6 border-[3px] border-[#f97316] shadow-xl shadow-orange-500/10 flex flex-col items-center text-center space-y-5 relative">
                    <span className="px-5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-[#ea580c] text-white shadow-sm shadow-orange-300">
                      FREE DEMO
                    </span>

                    <div className="space-y-1">
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                        Free Demo
                      </h4>
                    </div>

                    <div className="py-3 w-full border-y border-slate-100 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-black text-[#ea580c] tracking-tight">
                        ₹0
                      </span>
                      <span className="text-sm font-bold text-slate-600">
                        / Demo
                      </span>
                    </div>

                    <div className="w-full pt-2">
                      <div className="w-full py-3 bg-[#ea580c] text-white font-black text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 shadow-md shadow-orange-300">
                        <span className="size-3.5 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="size-1.5 rounded-full bg-white" />
                        </span>
                        <span>Selected Plan</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: INQUIRY SUBMITTED CONFIRMATION SCREEN                             */}
        {/* ========================================================================= */}
        {view === "inquiry_success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl mx-auto space-y-8 text-center"
          >
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-2xl shadow-emerald-50 space-y-6">
              <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle2 className="size-10 stroke-[2.5]" />
              </div>

              <div className="space-y-3">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-200">
                  Inquiry Submitted Successfully
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                  आपला ऑफलाईन चौकशी अर्ज यशस्वीरित्या प्राप्त झाला आहे!
                </h2>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 font-extrabold text-base sm:text-lg flex items-center justify-center gap-2">
                  <Clock className="size-5 text-amber-600 shrink-0" />
                  <span>आमची टीम एका दिवसात (२४ तासांच्या आत) आपल्याशी संपर्क साधेल.</span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  आमची टीम आपल्याशी संपर्क साधून संपूर्ण सॉफ्टवेअर डेमो देईल. त्यानंतर आपण थेट आपल्या आवडीचा प्लॅन निवडून पेमेंट करू शकाल.
                </p>
              </div>

              {/* Company Contact Details Card */}
              <div className="pt-6 border-t border-slate-100 text-left space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider text-center">
                  कंपनी संपर्क माहिती (Company Contact Details)
                </h3>

                <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  {/* Phone */}
                  <a
                    href="tel:9730784233"
                    className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group"
                  >
                    <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Phone className="size-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">मोबाईल / WhatsApp</span>
                      <strong className="text-sm font-black text-slate-900">9730784233</strong>
                    </div>
                  </a>

                  {/* Email */}
                  <a
                    href="mailto:sgkbrainova@gmail.com"
                    className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group"
                  >
                    <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Mail className="size-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ईमेल आयडी</span>
                      <strong className="text-xs font-black text-slate-900 break-all">sgkbrainova@gmail.com</strong>
                    </div>
                  </a>

                  {/* Address */}
                  <div className="sm:col-span-2 flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <div className="size-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <MapPin className="size-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">कंपनीचा अधिकृत पत्ता</span>
                      <p className="text-xs font-bold text-slate-800 leading-relaxed mt-0.5">
                        SGK Brainova — 145/A, 194/A/2, PL NO 100, SHREE CAPITAL-2, WARNALI, WILLINGDON COLLEGE SANGLI, MIRAJ, SANGLI, MAHARASHTRA - 416415
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setView("plans_selection");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md text-center cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>प्लॅन्स व पेमेंट पर्यायांकडे जा</span>
                  <ArrowRight className="size-4" />
                </button>
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center"
                >
                  मुख्यपृष्ठावर जा (Home)
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: RETURNING USER — PLANS SELECTION & PAYMENT METHOD INTEGRATION     */}
        {/* ========================================================================= */}
        {view === "plans_selection" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-10 max-w-6xl mx-auto"
          >
            {/* Header with Returning User Welcome */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                  <CheckCircle2 className="size-3.5" />
                  <span>चौकशी नोंदणीकृत (Inquiry Verified)</span>
                </span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {savedInquiry?.schoolName || schoolName ? (
                    <span>{savedInquiry?.schoolName || schoolName} — प्लॅन निवडा व पेमेंट करा</span>
                  ) : (
                    <span>आपला डिजिटल स्कूल प्लॅन निवडा व पेमेंट करा</span>
                  )}
                </h2>
                <p className="text-xs text-slate-300 font-medium">
                  {savedInquiry?.name ? `नाव: ${savedInquiry.name}` : ""}
                  {savedInquiry?.udiseNo ? ` · UDISE: ${savedInquiry.udiseNo}` : ""}
                  {savedInquiry?.phone ? ` · संपर्क: ${savedInquiry.phone}` : ""}
                </p>
              </div>

              {/* Option to re-enter or go back to inquiry form */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setView("inquiry");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/30 flex items-center gap-2 cursor-pointer shadow-md active:scale-98"
                >
                  <ArrowLeft className="size-4" />
                  <span>चौकशी अर्जावर परत जा (Back to Inquiry Form)</span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid with Interactive Selection */}
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                  <Award className="size-6 text-amber-500" />
                  <span>प्लॅन निवडा आणि थेट ऑनलाईन ऍक्टिव्हेट करा</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                  खालीलपैकी एका प्लॅनवर क्लिक करून सुरक्षित Razorpay पेमेंट करा. शाळेची माहिती बदलायची असल्यास{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView("inquiry");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-black underline cursor-pointer"
                  >
                    येथे क्लिक करून चौकशी अर्जावर परत जा
                  </button>
                  .
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {SCHOOL_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
                        isSelected
                          ? plan.isDemo
                            ? "border-orange-500 shadow-xl shadow-orange-100 scale-[1.02] ring-2 ring-orange-500/20"
                            : "border-blue-600 shadow-xl shadow-blue-100 scale-[1.02] ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg"
                      }`}
                    >
                      <div className="flex justify-center mb-3">
                        <span
                          className={`px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${plan.badgeBg}`}
                        >
                          {plan.badge}
                        </span>
                      </div>

                      <div className="text-center space-y-1">
                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          {plan.title}
                        </h4>
                        {!plan.isDemo && plan.studentsCount && (
                          <div className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            <Users className="size-3 text-slate-600" />
                            <span>{plan.studentsCount}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-center my-4 py-2 border-y border-slate-100">
                        <span className={`text-2xl font-black tracking-tight ${plan.isDemo ? "text-[#ea580c]" : "text-blue-600"}`}>
                          {plan.price}
                        </span>
                        <span className="text-xs font-bold text-slate-500 ml-1">
                          {plan.period}
                        </span>
                      </div>

                      {!plan.isDemo && plan.features && plan.features.length > 0 && (
                        <div className="space-y-2 flex-1 mb-6">
                          {plan.features.map((feat, fIdx) => (
                            <div key={fIdx} className="flex items-start gap-1.5 text-xs text-slate-700 font-medium leading-tight">
                              <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
                        <div
                          className={`w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                            isSelected
                              ? plan.isDemo
                                ? "bg-[#ea580c] text-white shadow-md shadow-orange-200"
                                : "bg-blue-600 text-white shadow-md shadow-blue-200"
                              : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                          }`}
                        >
                          <span className={`size-3.5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-white bg-white" : "border-slate-400"}`}>
                            {isSelected && <span className={`size-1.5 rounded-full ${plan.isDemo ? "bg-[#ea580c]" : "bg-blue-600"}`} />}
                          </span>
                          <span>{isSelected ? "Selected Plan" : "Select Plan"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Action Box */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-bold">
                  <span>निवडलेला प्लॅन :</span>
                  <strong className="text-white font-black">{selectedPlan.title}</strong>
                </div>
                <h4 className="text-2xl sm:text-3xl font-black text-white">
                  {selectedPlan.price} {selectedPlan.period}
                </h4>
                <p className="text-xs text-slate-300 font-medium">
                  {selectedPlan.isDemo
                    ? "मोफत लाईव्ह डेमो + संपूर्ण डिजिटल स्कूल सॉफ्टवेअर प्रात्यक्षिक."
                    : `शाळा: ${savedInquiry?.schoolName || schoolName || "नोंदणीकृत शाळा"} · क्षमता: ${selectedPlan.studentsCount}`}
                </p>
                <div className="flex items-center justify-center md:justify-start gap-3 pt-1 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Lock className="size-3 text-emerald-400" />
                    <span>256-bit Secure Razorpay Payment</span>
                  </span>
                  <span>·</span>
                  <span>UPI, Cards, NetBanking, Wallet</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMakePayment}
                disabled={processingPayment}
                className="w-full md:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    <span>पेमेंट सुरू होत आहे...</span>
                  </>
                ) : selectedPlan.id === "free-demo" ? (
                  <>
                    <CheckCircle className="size-5" />
                    <span>मोफत डेमो ऍक्टिव्हेट करा (Start Free Demo)</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="size-5" />
                    <span>Pay {selectedPlan.price} Securely (ऑनलाईन पेमेंट करा)</span>
                  </>
                )}
              </button>
            </div>

            {/* Additional return link at bottom */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setView("inquiry");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-indigo-600 uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-4" />
                <span>चौकशी अर्जाकडे परत जा (Back to Inquiry Form)</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: PAYMENT SUCCESS SCREEN                                            */}
        {/* ========================================================================= */}
        {view === "payment_success" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto space-y-8 text-center"
          >
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-300 shadow-2xl shadow-emerald-50 space-y-6">
              <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle2 className="size-10 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider border border-emerald-200">
                  Payment & Plan Activated
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  अभिनंदन! आपला डिजिटल स्कूल प्लॅन यशस्वीरित्या सक्रिय झाला आहे!
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  आपल्या पेमेंटची नोंद झाली असून सॉफ्टवेअर ऍक्टिव्हेशन किल्ली व सहाय्यासाठी आमची टीम आपल्याशी तत्काळ संपर्क साधेल.
                </p>
              </div>

              {/* Receipt Summary */}
              {lastPaymentDetails && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">Transaction ID:</span>
                    <strong className="font-mono text-slate-900">{lastPaymentDetails.paymentId}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">प्लॅन:</span>
                    <strong className="text-slate-900">{lastPaymentDetails.plan?.title}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-bold">शाळेचे नाव:</span>
                    <strong className="text-slate-900">{lastPaymentDetails.schoolName}</strong>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500 font-bold">रक्कम:</span>
                    <strong className="text-sm font-black text-emerald-700">₹{lastPaymentDetails.amount}</strong>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  to="/"
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md text-center"
                >
                  मुख्यपृष्ठावर जा (Home)
                </Link>
                <button
                  onClick={() => setView("plans_selection")}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-center cursor-pointer"
                >
                  प्लॅन्सकडे परत जा
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
