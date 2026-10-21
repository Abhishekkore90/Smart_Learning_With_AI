import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  User,
  Building2,
  Sparkles,
  ExternalLink,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { updateMCQHomeworkShareDetails } from "@/services/mcqHomeworkService";

export interface MCQShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: {
    id: string;
    title: string;
    subject?: string;
    classId?: string;
  };
  initialTeacherName?: string;
  initialSchoolName?: string;
  onShareCompleted?: (teacher: string, school: string) => void;
}

export const MCQShareModal: React.FC<MCQShareModalProps> = ({
  isOpen,
  onClose,
  quiz,
  initialTeacherName = "",
  initialSchoolName = "",
  onShareCompleted,
}) => {
  const [teacherName, setTeacherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Explicit Save Information Button Handler
  const handleSaveInformation = async () => {
    setIsSaving(true);
    const t = teacherName.trim();
    const s = schoolName.trim();
    try {
      localStorage.setItem("mcq_share_teacher_name", t);
      localStorage.setItem("mcq_share_school_name", s);
      if (quiz?.id) {
        await updateMCQHomeworkShareDetails(quiz.id, t, s);
      }
      if (onShareCompleted) onShareCompleted(t, s);
      setIsSaved(true);
      toast.success("शिक्षक व शाळा माहिती यशस्वीपणे सेव्ह झाली! ✓");
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      toast.error("माहिती सेव्ह करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  // Load remembered teacher and school name for sharing
  useEffect(() => {
    if (isOpen) {
      const savedTeacher =
        localStorage.getItem("mcq_share_teacher_name") || initialTeacherName || "";
      const savedSchool =
        localStorage.getItem("mcq_share_school_name") || initialSchoolName || "";
      setTeacherName(savedTeacher);
      setSchoolName(savedSchool);
      setCopied(false);
    }
  }, [isOpen, initialTeacherName, initialSchoolName]);

  // Construct clean, compact shareable URL (without long Unicode encoded query strings)
  const shareableUrl = useMemo(() => {
    if (typeof window === "undefined" || !quiz?.id) return "";
    return `${window.location.origin}/mcq?id=${quiz.id}`;
  }, [quiz?.id]);

  // Save current values to localStorage and persist into Firestore quiz doc
  const saveShareProfile = () => {
    const t = teacherName.trim();
    const s = schoolName.trim();
    if (t) localStorage.setItem("mcq_share_teacher_name", t);
    if (s) localStorage.setItem("mcq_share_school_name", s);
    if (quiz?.id) {
      updateMCQHomeworkShareDetails(quiz.id, t, s);
    }
    if (onShareCompleted) onShareCompleted(t, s);
  };

  // WhatsApp share message
  const handleShareWhatsApp = () => {
    saveShareProfile();
    const t = teacherName.trim();
    const s = schoolName.trim();

    let text = `🎯 *स्मार्ट लर्निंग दैनिक MCQ स्वाध्याय*\n`;
    if (quiz.subject) text += `📚 *विषय:* ${quiz.subject} (${quiz.classId || "सर्व इयत्ता"})\n`;
    text += `📝 *शीर्षक:* ${quiz.title}\n`;
    if (t) text += `👨‍🏫 *वर्ग शिक्षक:* ${t}\n`;
    if (s) text += `🏫 *शाळा:* ${s}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👉 *खालील लिंकवर क्लिक करून विनामूल्य स्वाध्याय सोडवा व अधिकृत डिजिटल प्रमाणपत्र मिळवा:*\n${shareableUrl}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank");
    toast.success("WhatsApp उघडले जात आहे!");
  };

  // Copy link handler
  const handleCopyLink = async () => {
    saveShareProfile();
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      toast.success("स्वाध्याय लिंक कॉपी झाली! आपण आता कोणालाही पाठवू शकता.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("लिंक कॉपी करता आली नाही. कृपया मॅन्युअली कॉपी करा.");
    }
  };

  // Native Web Share
  const handleNativeShare = async () => {
    saveShareProfile();
    if (navigator.share) {
      try {
        await navigator.share({
          title: quiz.title,
          text: `🎯 स्मार्ट लर्निंग MCQ स्वाध्याय: ${quiz.title}${teacherName.trim() ? ` (वर्ग शिक्षक: ${teacherName.trim()})` : ""
            }`,
          url: shareableUrl,
        });
        toast.success("लिंक यशस्वीरीत्या शेअर केली!");
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }
    handleCopyLink();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Share2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">
                  स्वाध्याय लिंक शेअर करा (Share Quiz Link)
                </h3>
                <p className="text-xs text-indigo-100 font-medium">
                  विद्यार्थ्यांना ही लिंक पाठवल्यावर त्यांच्या प्रमाणपत्रावर आपले नाव दिसेल
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Quiz Title Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-0.5">
                स्वाध्याय शीर्षक
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">
                {quiz.title}
              </p>
              {quiz.subject && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  विषय: <span className="font-semibold">{quiz.subject}</span> • इयत्ता:{" "}
                  <span className="font-semibold">{quiz.classId || "सर्व"}</span>
                </p>
              )}
            </div>

            {/* Teacher Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>वर्गशिक्षकाचे नाव (Class Teacher Name)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">ऐच्छिक / Optional</span>
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="उदा. बाळासाहेब केंद्रे (किंवा आपले नाव)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-400">
                💡 हे नाव विद्यार्थ्याने सोडवलेल्या गुणवत्ता प्रमाणपत्रावर स्वाक्षरी म्हणून दिसेल.
              </p>
            </div>

            {/* School Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>शाळेचे नाव (School Name)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">ऐच्छिक / Optional</span>
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="उदा. जि. प. प्राथमिक शाळा, बोरगाव"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all text-slate-900 dark:text-white"
              />
              <p className="text-[11px] text-slate-400">
                💡 हे शाळेचे नाव प्रमाणपत्रावर वर्ग शिक्षकाच्या हुद्द्याखाली स्पष्टपणे छापले जाईल.
              </p>
            </div>

            {/* Explicit Save Information Button */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 gap-3">
              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-tight">
                <span>शिक्षक व शाळा नाव स्वाध्यायासोबत कायम सेव्ह करा:</span>
              </div>
              <button
                type="button"
                onClick={handleSaveInformation}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm shrink-0 ${isSaved
                    ? "bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none"
                    : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-200 dark:shadow-none"
                  }`}
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin text-white" />
                ) : isSaved ? (
                  <Check className="size-3.5 text-white" />
                ) : (
                  <Save className="size-3.5 text-indigo-200" />
                )}
                <span>{isSaving ? "सेव्ह होत आहे..." : isSaved ? "माहिती सेव्ह झाली ✓" : "माहिती सेव्ह करा (Save)"}</span>
              </button>
            </div>

            {/* Generated Link Preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                शेअरिंग लिंक (Direct MCQ Link)
              </span>
              <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  className="bg-transparent text-xs text-slate-600 dark:text-slate-300 outl
                  ine-none w-full font-mono truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "कॉपी झाले" : "कॉपी"}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle className="size-4" />
                <span>WhatsApp वर पाठवा</span>
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                <Share2 className="size-4" />
                <span>थेट शेअर / कॉपी करा</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
