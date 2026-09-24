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
  Play,
  ExternalLink,
  X,
  Film,
  Tv,
  GraduationCap,
  Utensils,
  Calculator,
  CalendarDays,
  Package,
  ClipboardList,
  Building2,
  Receipt,
  KeyRound,
  PenTool,
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

function YoutubeIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

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

export interface DemoVideo {
  id: string;
  youtubeId: string;
  title: string;
  marathiTitle: string;
  description: string;
  url: string;
}

export const OFFLINE_DEMO_VIDEOS: DemoVideo[] = [
  {
    id: "vid-1",
    youtubeId: "FkAC45CR978",
    title: "Digital School Software Demo - Part 1",
    marathiTitle: "भाग १ : डिजिटल स्कूल सॉफ्टवेअर प्रात्यक्षिक",
    description: "जनरल रजिस्टर, विद्यार्थी नोंदणी व मुख्य सुविधांचे सादरीकरण.",
    url: "https://youtu.be/FkAC45CR978?si=ZKkyTjMaQeZV_07",
  },
  {
    id: "vid-2",
    youtubeId: "kipaqnem6jA",
    title: "Digital School Software Demo - Part 2",
    marathiTitle: "भाग २ : दाखला, बोनाफाईड व विविध प्रमाणपत्रे",
    description: "शाळा सोडल्याचा दाखला (LC), बोनाफाईड व इतर दाखले निर्मिती प्रणाली.",
    url: "https://youtu.be/kipaqnem6jA?si=NFTWBOmWTgUMx66R",
  },
  {
    id: "vid-3",
    youtubeId: "lso6ocwXkiM",
    title: "Digital School Software Demo - Part 3",
    marathiTitle: "भाग ३ : शालेय पोषण आहार (MDM) व हिशोब",
    description: "शालेय पोषण आहार दैनिक नोंद, कीर्द खतावणी व लेजर हिशोब प्रणाली.",
    url: "https://youtu.be/lso6ocwXkiM?si=MQJspuuYt9nvbQEM",
  },
  {
    id: "vid-4",
    youtubeId: "wdlgftkkB24",
    title: "Digital School Software Demo - Part 4",
    marathiTitle: "भाग ४ : गुणपत्रिका, निकाल व वेळापत्रक",
    description: "विद्यार्थी निकालपत्रक (Result Sheet), शिक्षक वेळापत्रक व संपूर्ण १००% ऑफलाईन कार्य.",
    url: "https://youtu.be/wdlgftkkB24?si=ZH5amuP85l4IUetH",
  },
];

export interface OnlineModuleItem {
  id: string;
  name: string;
  marathiName: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ONLINE_PLATFORM_MODULES: OnlineModuleItem[] = [
  { id: "student", name: "Student", marathiName: "विद्यार्थी नोंदणी व माहिती", icon: GraduationCap },
  { id: "attendance", name: "Attendance", marathiName: "दैनिक विद्यार्थी हजेरी", icon: ClipboardList },
  { id: "account", name: "Account", marathiName: "हिशोब व खाती", icon: Calculator },
  { id: "fee", name: "Fee", marathiName: "फी व्यवस्थापन व पावती", icon: Receipt },
  { id: "mdm", name: "MDM", marathiName: "शालेय पोषण आहार", icon: Utensils },
  { id: "result", name: "Result", marathiName: "गुणपत्रिका व निकाल", icon: FileText },
  { id: "icse-result", name: "ICSE Result", marathiName: "ICSE निकाल प्रणाली", icon: Award },
  { id: "payroll", name: "Payroll", marathiName: "शिक्षक व कर्मचारी वेतन", icon: CreditCard },
  { id: "exam", name: "Exam", marathiName: "परीक्षा व मूल्यमापन", icon: PenTool },
  { id: "timetable", name: "Time Table", marathiName: "शाळा व वर्ग वेळापत्रक", icon: CalendarDays },
  { id: "inventory", name: "Inventory", marathiName: "शालेय साहित्य व स्टॉक", icon: Package },
  { id: "permission", name: "permission", marathiName: "अधिकार व परवानग्या", icon: KeyRound },
  { id: "department", name: "Department", marathiName: "विभाग व्यवस्थापन", icon: Building2 },
];

type DigitalSchoolView = "cards" | "inquiry" | "inquiry_success" | "plans_selection" | "payment_success";

function DigitalSchoolPage() {
  const { lang } = useLanguage();

  // State: 'cards' | 'inquiry' | 'inquiry_success' | 'plans_selection' | 'payment_success'
  const [view, setView] = useState<DigitalSchoolView>("cards");

  // Video Demo State (Direct in-page embedded player + modal)
  const [activeOfflineVideo, setActiveOfflineVideo] = useState<DemoVideo>(OFFLINE_DEMO_VIDEOS[0]);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo>(OFFLINE_DEMO_VIDEOS[0]);

  const openVideoModal = (video?: DemoVideo) => {
    if (video) setSelectedVideo(video);
    setShowVideoModal(true);
  };

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

  // Online School Registration Modal State (7 Days Free Trial)
  const [showOnlineRegisterModal, setShowOnlineRegisterModal] = useState(false);
  const [regSchoolName, setRegSchoolName] = useState("");
  const [regUdiseNo, setRegUdiseNo] = useState("");
  const [regBoardType, setRegBoardType] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [onlineRegSuccess, setOnlineRegSuccess] = useState(false);
  const [registeredTrialData, setRegisteredTrialData] = useState<any>(null);

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
        if (data.schoolName) {
          setSchoolName(data.schoolName);
          setRegSchoolName(data.schoolName);
        }
        if (data.udiseNo) {
          setUdiseNo(data.udiseNo);
          setRegUdiseNo(data.udiseNo);
        }
        if (data.schoolAddress) setSchoolAddress(data.schoolAddress);
      } catch (e) {
        console.error("Error parsing saved inquiry data", e);
      }
    }
    setHasSubmittedInquiry(isSubmitted);
  }, []);

  const handleOnlineClick = () => {
    toast.info("शाळा नोंदणी (Register Your School) पोर्टल उघडत आहे...");
    window.location.href = "https://digitalschool.sgkbrainova.com/school-register";
  };

  const handleOnlineRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!regSchoolName.trim()) {
      toast.error("कृपया शाळेचे नाव प्रविष्ट करा (Please enter school name)");
      return;
    }
    if (!regUdiseNo.trim() || regUdiseNo.trim().length < 11) {
      toast.error("कृपया वैध 11 अंकी UDISE नंबर टाका (Please enter valid 11-digit UDISE number)");
      return;
    }
    if (!regBoardType) {
      toast.error("कृपया बोर्ड प्रकार निवडा (Please select Board Type)");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      toast.error("कृपया किमान 4 अंकी पासवर्ड टाका (Please enter a secure password)");
      return;
    }
    if (!regMobile.trim() || regMobile.trim().length < 10) {
      toast.error("कृपया वैध 10 अंकी मोबाईल नंबर टाका (Please enter valid 10-digit mobile number)");
      return;
    }

    setRegSubmitting(true);
    const trialDays = 7;
    const now = new Date();
    const expiryDate = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const payload = {
      schoolName: regSchoolName.trim(),
      udiseNo: regUdiseNo.trim(),
      boardType: regBoardType,
      mobile: regMobile.trim(),
      status: "active_trial",
      trialStartedAt: now.toISOString(),
      trialExpiresAt: expiryDate.toISOString(),
      createdAt: now.toISOString(),
    };

    try {
      await addDoc(collection(db, "digital_school_online_registrations"), payload);
      localStorage.setItem("digital_school_online_registered", JSON.stringify(payload));

      setRegisteredTrialData(payload);
      setOnlineRegSuccess(true);
      toast.success("शाळा नोंदणी यशस्वी! ७ दिवसांची मोफत ट्रायल सक्रिय झाली आहे.");
    } catch (err: any) {
      console.error("Error registering school:", err);
      // Fallback local save even if offline
      localStorage.setItem("digital_school_online_registered", JSON.stringify(payload));
      setRegisteredTrialData(payload);
      setOnlineRegSuccess(true);
      toast.success("शाळा नोंदणी यशस्वी! ७ दिवसांची मोफत ट्रायल सक्रिय झाली आहे.");
    } finally {
      setRegSubmitting(false);
    }
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

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
              {/* CARD 1: ONLINE PLATFORM */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-100 shadow-xl shadow-indigo-100/50 hover:border-indigo-500 hover:shadow-2xl transition-all flex flex-col justify-between h-full group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="space-y-4 relative z-10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="size-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                      <Globe className="size-7" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white border border-emerald-300 text-xs font-black tracking-wide shadow-sm shadow-emerald-200">
                        🎁 100% FREE
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black tracking-wider">
                        <Wifi className="size-3.5" />
                        <span>ONLINE</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      1. Online Platform
                    </h2>
                    <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest mt-0.5">
                      (ऑनलाईन डिजिटल स्कूल)
                    </p>
                  </div>

                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    {lang === "mr"
                      ? "इंटरनेट कनेक्टिव्हिटीसह थेट वेब ब्राउझरवर चालणारे डिजिटल स्कूल सॉफ्टवेअर. क्लाउड डेटा सिंक आणि थेट ऑनलाईन सुविधा."
                      : "Direct cloud-connected web portal with real-time synchronization, anywhere access, and interactive resources."}
                  </p>

                  {/* Free Online School Headline Banner */}
                  <div className="p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border-2 border-emerald-300/80 rounded-2xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-black text-slate-900">
                          {lang === "mr" ? "आता तुमची शाळा डिजिटल करा — मोफत! मोफत! मोफत!" : "Make Your School Digital — Free! Free! Free!"}
                        </p>
                        <p className="text-[10.5px] text-emerald-900 font-semibold mt-0.5">
                          {lang === "mr"
                            ? "कोणतेही शुल्क नाही • शाळेची मोफत नोंदणी करा व सर्व १३ फिचर्स वापरा"
                            : "No charges • Register your school for free and access all 13 features"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
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

                  {/* Available Online Modules Showcase Box (13 Features) */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="size-4 text-indigo-600" />
                        <span>
                          {lang === "mr"
                            ? "ऑनलाईन उपलब्ध प्रमुख मॉड्यूल्स व फिचर्स :"
                            : "Available Online Modules & Features:"}
                        </span>
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        १३ मॉड्यूल्स उपलब्ध
                      </span>
                    </div>

                    {/* Blue Button Tiles styled from images (Stable, No Scroll) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {ONLINE_PLATFORM_MODULES.map((mod) => {
                        const Icon = mod.icon;
                        return (
                          <div
                            key={mod.id}
                            className="group/btn p-1.5 rounded-xl bg-gradient-to-r from-[#4b9bf5] to-[#2b76df] text-white shadow-xs border border-blue-400/40 flex items-center gap-2 hover:from-[#3a8af0] hover:to-[#1d64cf] transition-all hover:scale-[1.02] cursor-default select-none"
                          >
                            <div className="size-6 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 text-white border border-white/30 group-hover/btn:scale-105 transition-transform">
                              <Icon className="size-3 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10.5px] font-black leading-tight tracking-tight text-white truncate">
                                {mod.name}
                              </p>
                              <p className="text-[8px] font-medium text-blue-100 truncate opacity-90">
                                {mod.marathiName}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto relative z-10">
                  <button
                    onClick={handleOnlineClick}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 active:scale-98 flex flex-col items-center justify-center gap-0.5 cursor-pointer group/btn"
                  >
                    <div className="flex items-center gap-2">
                      <span>🌐 Start Free Online School</span>
                      <ArrowRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-200 tracking-normal normal-case">
                      {lang === "mr"
                        ? "(ऑनलाईन डिजिटल स्कूल — मोफत नोंदणी सुरू करा)"
                        : "(Register Online School — 100% Free)"}
                    </span>
                  </button>
                </div>
              </motion.div>

              {/* CARD 2: OFFLINE PLATFORM */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-violet-100 shadow-xl shadow-violet-100/50 hover:border-violet-500 hover:shadow-2xl transition-all flex flex-col justify-between h-full group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                <div className="space-y-4 relative z-10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="size-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-300 group-hover:scale-105 transition-transform">
                      <Monitor className="size-7 text-amber-400" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-black tracking-wider">
                      <WifiOff className="size-3.5" />
                      <span>OFFLINE</span>
                    </span>
                  </div>

                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      2. Offline Platform
                    </h2>
                    <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest mt-0.5">
                      (ऑफलाईन डिजिटल स्कूल सॉफ्टवेअर)
                    </p>
                  </div>

                  <p className="text-slate-600 text-sm font-medium leading-relaxed">
                    {lang === "mr"
                      ? "इंटरनेटशिवाय शाळेतील संगणकावर/लॅपटॉपवर चालणारे संपूर्ण डिजिटल स्कूल सॉफ्टवेअर. मोफत डेमो आणि सर्वसमावेशक प्लॅन्स."
                      : "Standalone offline desktop school software running 100% locally without internet connectivity. Includes free demo & full software support."}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
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

                  {/* DIRECT IN-PAGE EMBEDDED VIDEO PLAYER */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5 mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <YoutubeIcon className="size-4 text-red-600" />
                        <span>डिजिटल स्कूल सॉफ्टवेअर व्हिडिओ डेमो :</span>
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        ४ व्हिडिओ उपलब्ध
                      </span>
                    </div>

                    {/* Direct Embedded 16:9 YouTube Video Player */}
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-md border border-slate-200">
                      <iframe
                        key={activeOfflineVideo.youtubeId}
                        src={`https://www.youtube.com/embed/${activeOfflineVideo.youtubeId}?rel=0`}
                        title={activeOfflineVideo.marathiTitle}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>

                    {/* Current Video Info & YouTube Link */}
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {activeOfflineVideo.marathiTitle}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {activeOfflineVideo.description}
                        </p>
                      </div>
                      <a
                        href={activeOfflineVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 transition-colors"
                        title="YouTube वर उघडा"
                      >
                        <ExternalLink className="size-3" />
                        <span>YouTube</span>
                      </a>
                    </div>

                    {/* 4 Video Parts Selector Switcher Tabs */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {OFFLINE_DEMO_VIDEOS.map((vid, idx) => {
                        const isSelected = activeOfflineVideo.id === vid.id;
                        return (
                          <button
                            key={vid.id}
                            type="button"
                            onClick={() => setActiveOfflineVideo(vid)}
                            className={`py-1.5 px-1 rounded-xl text-center transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                              isSelected
                                ? "bg-red-600 text-white border-red-600 shadow-sm font-black scale-[1.02]"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-bold"
                            }`}
                          >
                            <span className="text-[11px] leading-tight">
                              भाग {idx + 1}
                            </span>
                            <span className={`text-[8px] ${isSelected ? "text-red-100" : "text-slate-500"}`}>
                              {isSelected ? "▶ चालू आहे" : "बदला"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto relative z-10 space-y-2">
                  <button
                    onClick={handleOfflineClick}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-slate-300 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
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

              {/* Downside Section: Video Demos Showcase + Free Demo Preview */}
              <div className="space-y-8 pt-8 border-t border-slate-200">
                {/* YouTube Demo Videos Grid */}
                <div className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                      <YoutubeIcon className="size-3.5 text-red-600" />
                      <span>डिजिटल स्कूल सॉफ्टवेअर 👉</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center justify-center gap-2">
                      <Play className="size-5 fill-red-600 text-red-600" />
                      <span>सॉफ्टवेअरचे प्रात्यक्षिक व्हिडिओ पहा (YouTube Demo Videos)</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-semibold max-w-xl mx-auto">
                      सॉफ्टवेअर कसे कार्य करते, जनरल रजिस्टर, दाखले व पोषण आहार हिशोब कसा ठेवला जातो हे पाहण्यासाठी खालील व्हिडिओ पहा.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {OFFLINE_DEMO_VIDEOS.map((vid, idx) => (
                      <div
                        key={vid.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl hover:border-red-300 transition-all overflow-hidden flex flex-col justify-between group"
                      >
                        <div>
                          <div
                            onClick={() => openVideoModal(vid)}
                            className="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden"
                          >
                            <img
                              src={`https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`}
                              alt={vid.marathiTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <div className="size-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="size-5 fill-white text-white ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-black uppercase tracking-wider">
                              भाग {idx + 1}
                            </span>
                          </div>

                          <div className="p-4 space-y-1.5">
                            <h4 className="text-xs font-black text-slate-900 line-clamp-2">
                              {vid.marathiTitle}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium line-clamp-2">
                              {vid.description}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openVideoModal(vid)}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-red-200"
                          >
                            <Play className="size-3 fill-white" />
                            <span>प्ले करा</span>
                          </button>
                          <a
                            href={vid.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center justify-center shrink-0"
                            title="YouTube वर उघडा"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
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

              {/* Actions: Demo videos & back to inquiry */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openVideoModal()}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-red-400/40 flex items-center gap-2 cursor-pointer shadow-md active:scale-98"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>डेमो व्हिडिओ पहा</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setView("inquiry");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/30 flex items-center gap-2 cursor-pointer shadow-md active:scale-98"
                >
                  <ArrowLeft className="size-4" />
                  <span>चौकशी अर्ज (Back)</span>
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

        {/* ========================================================================= */}
        {/* YOUTUBE DEMO VIDEO PLAYER MODAL                                           */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {showVideoModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25 }}
                className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
              >
                {/* Modal Header */}
                <div className="px-5 py-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-900/40">
                      <YoutubeIcon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black truncate">
                        डिजिटल स्कूल सॉफ्टवेअर — प्रात्यक्षिक व्हिडिओ
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {selectedVideo.marathiTitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowVideoModal(false)}
                    className="size-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
                  {/* 16:9 Video Player */}
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-slate-800">
                    <iframe
                      key={selectedVideo.youtubeId}
                      src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0`}
                      title={selectedVideo.marathiTitle}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>

                  {/* Active Video Info & Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-black text-white">
                        {selectedVideo.marathiTitle}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        {selectedVideo.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <a
                        href={selectedVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-red-900/30 active:scale-98"
                      >
                        <YoutubeIcon className="size-3.5" />
                        <span>YouTube वर उघडा</span>
                        <ExternalLink className="size-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setShowVideoModal(false);
                          handleOfflineClick();
                        }}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-amber-900/30 active:scale-98 cursor-pointer"
                      >
                        <Monitor className="size-3.5" />
                        <span>चौकशी अर्ज भरा</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Video Playlist Selector */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Film className="size-3.5 text-red-500" />
                      <span>सर्व डेमो व्हिडिओंची यादी (All 4 Demos)</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {OFFLINE_DEMO_VIDEOS.map((vid, idx) => {
                        const isActive = selectedVideo.id === vid.id;
                        return (
                          <div
                            key={vid.id}
                            onClick={() => setSelectedVideo(vid)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group ${
                              isActive
                                ? "bg-slate-800 border-red-500 ring-2 ring-red-500/30"
                                : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80 hover:border-slate-600"
                            }`}
                          >
                            <div className="relative size-14 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-slate-700">
                              <img
                                src={`https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`}
                                alt={vid.marathiTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className={`absolute inset-0 flex items-center justify-center ${isActive ? "bg-red-600/60" : "bg-black/40 group-hover:bg-black/20"} transition-colors`}>
                                <Play className="size-4 fill-white text-white" />
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${isActive ? "bg-red-500 text-white" : "bg-slate-700 text-slate-300"}`}>
                                  भाग {idx + 1}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] text-amber-400 font-extrabold animate-pulse">
                                    ▶ चालू आहे
                                  </span>
                                )}
                              </div>
                              <h6 className="text-xs font-bold text-white truncate mt-1">
                                {vid.marathiTitle}
                              </h6>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {vid.description}
                              </p>
                            </div>

                            <a
                              href={vid.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="YouTube वर उघडा"
                              className="size-8 rounded-lg bg-slate-700/60 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ONLINE SCHOOL REGISTRATION MODAL (7 DAYS FREE TRIAL)                      */}
          {/* ========================================================================= */}
          {showOnlineRegisterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 my-8 relative"
              >
                {/* Blue Top Brand Bar matching Image */}
                <div className="bg-[#00529b] text-white px-5 sm:px-8 py-3.5 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                      <School className="size-4 text-amber-300" />
                    </div>
                    <span className="font-black text-sm sm:text-base tracking-wider uppercase">
                      SGK BRAINOVA
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOnlineRegisterModal(false)}
                    className="size-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {!onlineRegSuccess ? (
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="text-center space-y-1">
                      <h3 className="text-2xl sm:text-3xl font-black text-[#c5221f] tracking-tight">
                        Register Your School
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        {lang === "mr"
                          ? "७ दिवसांच्या मोफत ट्रायलसाठी शाळेची माहिती भरा"
                          : "Fill details to activate your 7-Day Free Trial instantly"}
                      </p>
                    </div>

                    <div className="grid md:grid-cols-12 gap-6 items-center">
                      {/* Left Column: Cute School Illustration matching Image 2 */}
                      <div className="hidden md:flex md:col-span-5 flex-col items-center justify-center space-y-4 p-4 bg-gradient-to-b from-amber-50/50 to-orange-50/50 rounded-2xl border border-amber-100/80">
                        <div className="relative size-36 flex items-center justify-center">
                          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
                            {/* Grass Lawn */}
                            <ellipse cx="100" cy="180" rx="90" ry="16" fill="#48bb78" />
                            <ellipse cx="100" cy="178" rx="80" ry="12" fill="#38a169" />
                            
                            {/* Steps */}
                            <rect x="70" y="160" width="60" height="12" rx="3" fill="#cbd5e1" />
                            <rect x="76" y="152" width="48" height="10" rx="2" fill="#94a3b8" />
                            
                            {/* School Building Base */}
                            <rect x="40" y="90" width="120" height="70" rx="4" fill="#fed7aa" stroke="#ea580c" strokeWidth="3" />
                            {/* Bricks texture lines */}
                            <line x1="40" y1="110" x2="160" y2="110" stroke="#fb923c" strokeWidth="1" strokeDasharray="6,4" />
                            <line x1="40" y1="130" x2="160" y2="130" stroke="#fb923c" strokeWidth="1" strokeDasharray="6,4" />
                            
                            {/* Doorway */}
                            <path d="M85 160 V 125 A 15 15 0 0 1 115 125 V 160 Z" fill="#78350f" />
                            <rect x="85" y="118" width="30" height="8" rx="2" fill="#d97706" />
                            <text x="100" y="124" fontSize="6" fontWeight="bold" fill="#ffffff" textAnchor="middle">SCHOOL</text>
                            
                            {/* Windows */}
                            <rect x="52" y="105" width="22" height="22" rx="2" fill="#60a5fa" stroke="#1e40af" strokeWidth="2" />
                            <line x1="63" y1="105" x2="63" y2="127" stroke="#ffffff" strokeWidth="1.5" />
                            <line x1="52" y1="116" x2="74" y2="116" stroke="#ffffff" strokeWidth="1.5" />
                            
                            <rect x="126" y="105" width="22" height="22" rx="2" fill="#60a5fa" stroke="#1e40af" strokeWidth="2" />
                            <line x1="137" y1="105" x2="137" y2="127" stroke="#ffffff" strokeWidth="1.5" />
                            <line x1="126" y1="116" x2="148" y2="116" stroke="#ffffff" strokeWidth="1.5" />
                            
                            {/* Main Roof */}
                            <polygon points="30,90 100,45 170,90" fill="#dc2626" stroke="#991b1b" strokeWidth="3" />
                            
                            {/* Bell Tower */}
                            <rect x="88" y="28" width="24" height="22" fill="#fed7aa" stroke="#ea580c" strokeWidth="2" />
                            <polygon points="82,28 100,10 118,28" fill="#dc2626" stroke="#991b1b" strokeWidth="2" />
                            
                            {/* Bell */}
                            <path d="M95 38 Q 100 32 105 38 L 107 44 L 93 44 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                            <circle cx="100" cy="46" r="2" fill="#d97706" />
                            
                            {/* Flag */}
                            <line x1="100" y1="10" x2="100" y2="2" stroke="#475569" strokeWidth="2" />
                            <polygon points="100,2 114,6 100,10" fill="#3b82f6" />
                          </svg>
                        </div>
                        <div className="text-center space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">
                            🎁 ७ दिवस मोफत
                          </span>
                          <p className="text-[11px] font-bold text-slate-600">
                            सर्व १३ ऑनलाईन मॉड्यूल्स अनलॉक होतील
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Registration Form */}
                      <form onSubmit={handleOnlineRegisterSubmit} className="md:col-span-7 space-y-3">
                        {/* School Name */}
                        <div className="space-y-1">
                          <label className="block text-xs font-black text-slate-800">
                            School Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={regSchoolName}
                              onChange={(e) => setRegSchoolName(e.target.value)}
                              placeholder="Enter school name"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* UDISE Number */}
                        <div className="space-y-1">
                          <label className="block text-xs font-black text-slate-800">
                            UDISE Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              maxLength={11}
                              value={regUdiseNo}
                              onChange={(e) => setRegUdiseNo(e.target.value.replace(/\D/g, ""))}
                              placeholder="Enter UDISE number"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* Board Type */}
                        <div className="space-y-1">
                          <label className="block text-xs font-black text-slate-800">
                            Board Type <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={regBoardType}
                              onChange={(e) => setRegBoardType(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all cursor-pointer"
                            >
                              <option value="">Select Board Type</option>
                              <option value="Maharashtra State Board">Maharashtra State Board (महाराष्ट्र राज्य मंडळ)</option>
                              <option value="CBSE">CBSE Board</option>
                              <option value="ICSE">ICSE Board</option>
                              <option value="Other">Other / इतर</option>
                            </select>
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                          <label className="block text-xs font-black text-slate-800">
                            Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="password"
                              required
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="Enter password"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* Mobile Number */}
                        <div className="space-y-1">
                          <label className="block text-xs font-black text-slate-800">
                            Mobile Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              required
                              maxLength={10}
                              value={regMobile}
                              onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ""))}
                              placeholder="Enter mobile number"
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-slate-400"
                            />
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={regSubmitting}
                            className="w-full py-3 bg-[#c5221f] hover:bg-[#a81c19] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-red-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                          >
                            {regSubmitting ? (
                              <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>नोंदणी होत आहे...</span>
                              </>
                            ) : (
                              <>
                                <span>Register & Start 7 Days Free Trial</span>
                                <ArrowRight className="size-4" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  /* Registration Success View */
                  <div className="p-6 sm:p-8 text-center space-y-6">
                    <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="size-10" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900">
                        शाळा नोंदणी यशस्वी झाली!
                      </h3>
                      <p className="text-xs font-bold text-emerald-600">
                        🎉 आपली ७ दिवसांची मोफत ऑनलाईन डिजिटल स्कूल ट्रायल सक्रिय करण्यात आली आहे.
                      </p>
                    </div>

                    <div className="max-w-md mx-auto p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-slate-500">शाळेचे नाव:</span>
                        <span className="font-black text-slate-900">{registeredTrialData?.schoolName}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-slate-500">UDISE क्रमांक:</span>
                        <span className="font-black text-slate-900">{registeredTrialData?.udiseNo}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-slate-500">बोर्ड प्रकार:</span>
                        <span className="font-black text-slate-900">{registeredTrialData?.boardType}</span>
                      </div>
                      <div className="flex justify-between text-amber-700">
                        <span className="font-bold">ट्रायल वैधता:</span>
                        <span className="font-black">७ दिवस मोफत (पूर्ण ऍक्सेस)</span>
                      </div>
                    </div>

                    <div className="space-y-2.5 max-w-md mx-auto pt-2">
                      <a
                        href="https://digitalschool.sgkbrainova.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                      >
                        <Globe className="size-4" />
                        <span>🌐 ऑनलाईन पोर्टल उघडा (Launch Portal)</span>
                        <ExternalLink className="size-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setShowOnlineRegisterModal(false)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        बंद करा (Close)
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
