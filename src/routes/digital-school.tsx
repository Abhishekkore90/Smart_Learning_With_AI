import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Globe, Monitor, ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { Footer } from "@/components/Footer";
import { useLanguage } from "@/hooks/use-language";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/digital-school")({
  head: () => ({ meta: [{ title: "Digital School Platform — SMART LEARNING" }] }),
  component: DigitalSchoolPage,
});

function DigitalSchoolPage() {
  const { lang } = useLanguage();

  const handlePlatformSelect = (platformName: string) => {
    toast.info(`${platformName} निवडला आहे.`);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827]">
      <main className="max-w-5xl mx-auto px-6 pt-12 pb-24">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>{lang === "mr" ? "मुख्यपृष्ठावर परत जा" : "Back to Home"}</span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="size-4 text-indigo-600" />
            <span>{lang === "mr" ? "डिजिटल स्कूल पोर्टल्स" : "Digital School Portals"}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            {lang === "mr" ? "डिजिटल स्कूल प्लॅटफॉर्म" : "Digital School Platform"}
          </h1>
          <p className="text-slate-600 font-medium text-base md:text-lg">
            {lang === "mr"
              ? "कृपया आपल्या सोयीनुसार प्लॅटफॉर्म निवडा:"
              : "Please select your preferred learning platform below:"}
          </p>
        </div>

        {/* 2 Platform Options Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 1. ONLINE PLATFORM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-xl shadow-slate-100 hover:border-indigo-300 hover:shadow-2xl transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[5rem] pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="size-16 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md">
                  <Globe className="size-8" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <Wifi className="size-3.5" />
                  <span>ONLINE</span>
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  1. ONLINE PLATFORM
                </h3>
                <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest mt-1">
                  (ऑनलाइन प्लॅटफॉर्म)
                </p>
              </div>

              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                {lang === "mr"
                  ? "इंटरनेट कनेक्टिव्हिटीसह ऑनलाईन ई-लर्निंग, थेट अपडेट्स आणि डिजिटल संसाधनांचा वापर करा."
                  : "Access cloud-connected digital portal, real-time sync, and online interactive tools."}
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>थेट इंटरनेट कनेक्टिव्हिटी</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>क्लाउड डेटा सिंक व रिअल-टाईम अपडेट्स</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 relative z-10">
              <button
                onClick={() => handlePlatformSelect("ONLINE PLATFORM")}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🌐 ONLINE PLATFORM उघडा</span>
              </button>
            </div>
          </motion.div>

          {/* 2. OFFLINE PLATFORM */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-xl shadow-slate-100 hover:border-violet-300 hover:shadow-2xl transition-all flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-bl-[5rem] pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="size-16 rounded-2xl bg-violet-50 text-violet-600 border border-violet-100 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all shadow-md">
                  <Monitor className="size-8" />
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  <WifiOff className="size-3.5" />
                  <span>OFFLINE</span>
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  2. OFFLINE PLATFORM
                </h3>
                <p className="text-xs font-extrabold text-violet-600 uppercase tracking-widest mt-1">
                  (ऑफलाईन प्लॅटफॉर्म)
                </p>
              </div>

              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                {lang === "mr"
                  ? "विना इंटरनेट ऑफलाईन डिजिटल स्कूल सॉफ्टवेअर, ऑफलाइन टूलकिट आणि स्थानिक संगणक संसाधने."
                  : "Run stand-alone offline school software without requiring continuous internet access."}
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="size-4 text-amber-500 shrink-0" />
                  <span>इंटरनेटशिवाय 100% ऑफलाईन कार्य</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="size-4 text-amber-500 shrink-0" />
                  <span>लोकल संगणक/लॅपटॉप सॉफ्टवेअर सपोर्ट</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 relative z-10">
              <button
                onClick={() => handlePlatformSelect("OFFLINE PLATFORM")}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>💻 OFFLINE PLATFORM उघडा</span>
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
