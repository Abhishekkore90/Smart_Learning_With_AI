import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Search,
  ClipboardList,
  CheckCircle,
  HelpCircle,
  Copy,
  Info,
  Mic
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/admin/sqaf-config")({
  head: () => ({ meta: [{ title: "SQAF Evidences Config — Super Admin" }] }),
  component: SQAFConfigAdmin,
});

// A simplified fallback for standard description info to help admins configure options
const getStandardBrief = (num: number) => {
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  const toMarathi = (n: number): string =>
    n.toString().split("").map((digit) => marathiDigits[parseInt(digit)]).join("");

  return {
    code: `${num}`,
    mr: `शालेय गुणवत्ता निकष - मानक क्र. ${toMarathi(num)} अंतर्गत पुरावे सूची.`,
    en: `School Quality Evaluation under Standard No. ${num} evidence checklist.`
  };
};

function SQAFConfigAdmin() {
  const navigate = useNavigate();
  const [selectedStandard, setSelectedStandard] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  
  // Copy utility state
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceStandard, setCopySourceStandard] = useState<string>("");
  
  // Voice typing states and function
  const [isListening, setIsListening] = useState(false);
  const [recognitionLang, setRecognitionLang] = useState<"mr-IN" | "en-US">("mr-IN");

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error(
        "तुमच्या ब्राउझरमध्ये व्हॉइस टायपिंग सपोर्ट नाही. / Your browser does not support Voice typing."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = recognitionLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info(recognitionLang === "mr-IN" ? "बोलणे सुरू करा (मराठी)..." : "Start speaking (English)...");
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
      toast.error(
        recognitionLang === "mr-IN" 
          ? "व्हॉइस टायपिंगमध्ये त्रुटी आली: " + event.error
          : "Speech recognition error: " + event.error
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNewOptionText((prev) => {
        const cleanPrev = prev.trim();
        return cleanPrev ? `${cleanPrev} ${transcript}` : transcript;
      });
      toast.success(
        recognitionLang === "mr-IN"
          ? "व्हॉइस इनपुट यशस्वी!"
          : "Voice input successful!"
      );
    };

    recognition.start();
  };

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/sqaf-config", role: "admin" } as any,
      });
      return;
    }
  }, [navigate]);

  // Load configured options when selected standard changes
  useEffect(() => {
    const saved = localStorage.getItem(`sqaf_evidence_options_config_${selectedStandard}`);
    if (saved) {
      try {
        setOptions(JSON.parse(saved));
      } catch (e) {
        setOptions([]);
      }
    } else {
      setOptions([]);
    }
  }, [selectedStandard]);

  const handleAddOption = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = newOptionText.trim();
    if (!cleanText) return;
    if (options.includes(cleanText)) {
      toast.error("हा पर्याय आधीच जोडलेला आहे! / This option already exists!");
      return;
    }
    const updated = [...options, cleanText];
    setOptions(updated);
    setNewOptionText("");
  };

  const handleDeleteOption = (index: number) => {
    const updated = options.filter((_, idx) => idx !== index);
    setOptions(updated);
  };

  const handleSave = () => {
    localStorage.setItem(`sqaf_evidence_options_config_${selectedStandard}`, JSON.stringify(options));
    toast.success(`मानक ${selectedStandard} चे पुरावे पर्याय यशस्वीरित्या सेव्ह केले! / Saved standard ${selectedStandard} config successfully!`);
  };

  const handleCopyFromSource = () => {
    const sourceNum = parseInt(copySourceStandard);
    if (isNaN(sourceNum) || sourceNum < 1 || sourceNum > 128) {
      toast.error("कृपया १ ते १२८ दरम्यान वैध मानक क्रमांक टाका. / Please enter a valid standard number between 1 and 128.");
      return;
    }
    if (sourceNum === selectedStandard) {
      toast.error("स्वतःच स्वतःचे पर्याय कॉपी करू शकत नाही. / Cannot copy from the current standard itself.");
      return;
    }

    const savedSource = localStorage.getItem(`sqaf_evidence_options_config_${sourceNum}`);
    if (!savedSource) {
      toast.error(`मानक ${sourceNum} साठी कोणतेही पर्याय सेट केलेले नाहीत. / No evidence options configured for standard ${sourceNum}.`);
      return;
    }

    try {
      const sourceOptions = JSON.parse(savedSource);
      setOptions(sourceOptions);
      setShowCopyModal(false);
      setCopySourceStandard("");
      toast.success(`मानक ${sourceNum} वरून यशस्वीरित्या कॉपी केले! सेव्ह करण्यास विसरू नका. / Copied successfully from standard ${sourceNum}! Don't forget to save.`);
    } catch (e) {
      toast.error("कॉपी करण्यात त्रुटी आली. / Error copying configuration.");
    }
  };

  // Generate standards list 1 to 128
  const allStandardsList = Array.from({ length: 128 }, (_, i) => i + 1);

  // Filter standards list based on search
  const filteredStandards = allStandardsList.filter((num) => {
    const brief = getStandardBrief(num);
    const numStr = num.toString();
    const query = searchTerm.toLowerCase();
    return (
      numStr.includes(query) ||
      brief.mr.toLowerCase().includes(query) ||
      brief.en.toLowerCase().includes(query)
    );
  });

  const selectedBrief = getStandardBrief(selectedStandard);

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] font-sans antialiased">
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 pt-16 pb-24">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-pink-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
        </div>

        {/* Heading */}
        <div className="mb-12 space-y-4">
          <h1 className="text-5xl font-black tracking-tight leading-none">
            SQAF Evidences <span className="text-pink-600">Config.</span>
          </h1>
          <p className="text-[#6B7280] max-w-2xl font-medium text-base leading-relaxed">
            Manage evidence checklist requirements (blank lines/options) for each standard. Teachers will see these options as checkable tasks with specific file upload fields.
          </p>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left panel: Standards Sidebar */}
          <div className="lg:col-span-4 bg-white border border-black/5 shadow-soft rounded-[2.5rem] p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="मानक क्रमांक किंवा नाव शोधा... / Search standard..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
              {filteredStandards.map((num) => {
                const isCurrent = selectedStandard === num;
                const configSaved = localStorage.getItem(`sqaf_evidence_options_config_${num}`);
                const hasOptions = configSaved ? JSON.parse(configSaved).length > 0 : false;

                return (
                  <button
                    key={num}
                    onClick={() => setSelectedStandard(num)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl text-left border transition-all ${
                      isCurrent
                        ? "bg-pink-50 border-pink-200 text-pink-900 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-8 rounded-xl flex items-center justify-center font-black text-xs ${
                          isCurrent ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {num}
                      </span>
                      <span className="font-bold text-sm">
                        मानक क्र. {num}
                      </span>
                    </div>

                    {hasOptions && (
                      <CheckCircle className={`size-4 ${isCurrent ? "text-pink-600" : "text-emerald-500"}`} />
                    )}
                  </button>
                );
              })}

              {filteredStandards.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">
                  कोणतीही मानके सापडली नाहीत. / No standards found.
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Evidence config editor */}
          <div className="lg:col-span-8 bg-white border border-black/5 shadow-soft rounded-[2.5rem] p-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-xs font-black tracking-widest text-pink-600 uppercase">
                  Currently Configuring
                </span>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                  मानक क्र. {selectedStandard} (Standard {selectedStandard})
                </h2>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCopyModal(true)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <Copy className="size-3.5" />
                  Copy Options
                </button>
                
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-pink-600 transition-colors flex items-center gap-2 shadow-lg shadow-pink-500/20"
                >
                  <Save className="size-3.5" />
                  Save Changes
                </button>
              </div>
            </div>

            {/* Standard Description Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex items-start gap-4">
              <Info className="size-5 text-slate-400 mt-1 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-slate-800 text-sm font-extrabold leading-relaxed">
                  {selectedBrief.mr}
                </p>
                <p className="text-slate-500 text-xs font-bold leading-relaxed">
                  {selectedBrief.en}
                </p>
              </div>
            </div>

            {/* Config list */}
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="size-5 text-pink-500" />
                पुरावे तपासणी सूची (Evidence Checklist Checklist Options)
              </h3>

              <div className="space-y-3">
                {options.map((opt, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-[#F8FAFF] border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="size-6 bg-pink-100 text-pink-600 font-extrabold rounded-lg flex items-center justify-center text-xs flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-slate-800 font-bold text-sm truncate">{opt}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteOption(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="काढून टाका / Delete option"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </motion.div>
                ))}

                {options.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 bg-[#FAF9FC] border border-dashed border-slate-200 rounded-3xl text-center p-6">
                    <HelpCircle className="size-10 text-slate-300 mb-3" />
                    <p className="text-sm font-black text-slate-400">
                      कोणतेही पुरावे पर्याय सेट केलेले नाहीत. / No evidence options set yet.
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-1 max-w-sm">
                      खाली नवीन पर्याय जोडा. हे पर्याय शिक्षकांच्या पुरावे विभागात चेकबॉक्स आणि अपलोडर म्हणून दिसतील.
                    </p>
                  </div>
                )}
              </div>

              {/* Add form */}
              <form onSubmit={handleAddOption} className="flex gap-3 pt-4 border-t border-slate-100">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="नवीन पुरावे पर्याय जोडा (उदा. 'बैठक अहवाल' किंवा 'SMC उपस्थिती पत्रक')..."
                    value={newOptionText}
                    onChange={(e) => setNewOptionText(e.target.value)}
                    className="w-full pl-4 pr-24 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRecognitionLang(prev => prev === "mr-IN" ? "en-US" : "mr-IN")}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300/80 text-[10px] font-black uppercase text-slate-600 rounded-md transition-colors select-none"
                      title="व्हॉइस भाषा बदला / Change Voice Language"
                    >
                      {recognitionLang === "mr-IN" ? "मराठी" : "EN"}
                    </button>
                    <button
                      type="button"
                      onClick={startSpeechRecognition}
                      className={`p-2 rounded-xl transition-all ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-pink-600"
                      }`}
                      title={recognitionLang === "mr-IN" ? "मराठी व्हॉइसने टाईप करा / Type with Marathi Voice" : "Type with English Voice"}
                    >
                      <Mic className="size-4" />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 bg-[#111827] text-white hover:bg-slate-800 font-black rounded-2xl text-sm transition-colors flex items-center gap-2 whitespace-nowrap active:scale-95"
                >
                  <Plus className="size-4" />
                  पर्याय जोडा / Add Option
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Copy Modal */}
      <AnimatePresence>
        {showCopyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCopyModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Content card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white border border-slate-100 shadow-2xl rounded-[2.5rem] p-8 space-y-6 z-10"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  इतर मानकावरून कॉपी करा
                </h3>
                <p className="text-slate-500 text-sm font-medium">
                  तुम्ही इतर कोणत्याही मानकासाठी सेट केलेले पुरावे पर्याय सध्याच्या मानक क्र. {selectedStandard} वर कॉपी करू शकता.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-500">
                    स्त्रोत मानक क्रमांक (Source Standard Number)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="128"
                    placeholder="उदा. १"
                    value={copySourceStandard}
                    onChange={(e) => setCopySourceStandard(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCopyFromSource}
                  className="px-5 py-2.5 bg-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/10"
                >
                  Copy Options
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
