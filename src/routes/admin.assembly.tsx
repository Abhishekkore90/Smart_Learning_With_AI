import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  FileText,
  Copy,
  Calendar,
  Sun,
  Moon,
  MessageSquare,
  BookOpen,
  HelpCircle,
  User,
  Music,
  Edit,
  Save,
  Keyboard,
  Globe,
  Loader2,
  Delete,
  ArrowUp,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { showToast as toast } from "@/lib/custom-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ASSEMBLY_TRANSLATIONS, DEFAULT_FORM_DATA, DEFAULT_ASSEMBLY_ITEMS, Language } from "@/lib/assemblyTranslations";

export const Route = createFileRoute("/admin/assembly")({
  head: () => ({ meta: [{ title: "Daily Assembly Builder — Super Admin" }] }),
  component: AssemblyBookAdmin,
});

function AssemblyBookAdmin() {
  const navigate = useNavigate();
  const [saveLoading, setSaveLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [language, setLanguage] = useState<Language>("mr");

  // Form State
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA.mr);

  // Active keyboard tracking
  const [activeFieldName, setActiveFieldName] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [keyboardLang, setKeyboardLang] = useState<"mr" | "en">("mr");
  const [isShift, setIsShift] = useState<boolean>(false);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [assemblyItems, setAssemblyItems] = useState(DEFAULT_ASSEMBLY_ITEMS.mr);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/assembly", role: "admin" } as any,
      });
      return;
    }

    loadParipath(language);
  }, [navigate, language]);

  // Load saved Paripath from Firestore
  const loadParipath = async (lang: Language) => {
    setPageLoading(true);
    try {
      const docRef = doc(db, "admin_settings", `current_paripath_${lang}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.creator === "गिरीश दारूंटे, मनमाड") {
          data.creator = "balasaheb kendhare";
        }
        setFormData(data as any);
        if (data.assemblyItems) setAssemblyItems(data.assemblyItems);
      } else {
        // Use defaults if no document exists
        setFormData(DEFAULT_FORM_DATA[lang]);
        setAssemblyItems(DEFAULT_ASSEMBLY_ITEMS[lang]);
      }
    } catch (error) {
      console.error("Error loading Paripath:", error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const docRef = doc(db, "admin_settings", `current_paripath_${language}`);
      await setDoc(docRef, { ...formData, assemblyItems });
      toast.success("Paripath changes saved successfully! 💾");
    } catch (error: any) {
      console.error("Error saving Paripath:", error);
      toast.error(error?.message || "Failed to save Paripath.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFocus = (name: string) => {
    setActiveFieldName(name);
  };

  const getFormattedText = () => {
    const t = ASSEMBLY_TRANSLATIONS[language];
    
    return `${assemblyItems.map((item) => `${item.emoji} *${item.label}*\n${item.content}`).join('\n┅━═▣◆★✧★◆▣═━┅\n')}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.panchang}* 
${t.day} : ${formData.day}, ${t.month} : ${formData.month},
${t.paksha} : ${formData.paksha}, ${t.tithi} : ${formData.tithi},
${t.nakshatra} : ${formData.nakshatra}, ${t.yog} : ${formData.yog}
${t.sunrise} : ${formData.sunrise}
${t.sunset} : ${formData.sunset}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.thoughtTitle.split(' ')[0]}* 
${formData.thought}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.proverbTitle}*
*${t.proverb}* : ${formData.proverb}
*${t.proverbMeaning}* : ${formData.proverbMeaning}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${formData.dateMonth} ${t.daySpecialStr}*
${t.yearDayStr.replace('${yearDay}', formData.yearDay)}
*🪀 ${t.importantEvents}*
${formData.events}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.birthdays}*
${formData.birthdays}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.deaths}*
${formData.deaths}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.patrioticSongTitle}*
*${formData.songTitle}*
${formData.patrioticSong}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.storyTitle}*
*${formData.storyTitle}*
${formData.story}
*${t.moral} :* ${formData.moral}
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.gkTitle}*
१) ${formData.gkQ1}
${t.ans} : *${formData.gkA1}*
२) ${formData.gkQ2}
${t.ans} : *${formData.gkA2}*
३) ${formData.gkQ3}
${t.ans} : *${formData.gkA3}*
४) ${formData.gkQ4}
${t.ans} : *${formData.gkA4}*
┅━═▣◆★✧★◆▣═━┅
*🪀 ${t.personalityTitle}*
*${formData.personalityTitle}*
${formData.personality}
┅━═▣◆★✧★◆▣═━┅
     *🔹 ${t.creatorInfo} 🔹*
*🥏 ${formData.creator}*
*MSP महाराष्ट्र शिक्षक पॅनल*
┅━═▣◆★✧★◆▣═━┅`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFormattedText());
    toast.success("Paripath template copied to clipboard! 📋");
  };

  // Keyboard helper
  const insertChar = (char: string) => {
    if (!activeFieldName) {
      toast.error("Please click on any input field first to start typing.");
      return;
    }
    const inputEl = document.getElementsByName(activeFieldName)[0] as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if (!inputEl) return;

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;
    const val = formData[activeFieldName as keyof typeof formData] || "";
    const newVal = val.slice(0, start) + char + val.slice(end);

    setFormData((prev) => ({
      ...prev,
      [activeFieldName]: newVal,
    }));

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  const handleBackspace = () => {
    if (!activeFieldName) return;
    const inputEl = document.getElementsByName(activeFieldName)[0] as
      | HTMLInputElement
      | HTMLTextAreaElement;
    if (!inputEl) return;

    const start = inputEl.selectionStart || 0;
    const end = inputEl.selectionEnd || 0;
    const val = formData[activeFieldName as keyof typeof formData] || "";

    if (start === 0 && end === 0) return;

    let newVal = "";
    let newCursorPos = start;
    if (start === end) {
      newVal = val.slice(0, start - 1) + val.slice(end);
      newCursorPos = start - 1;
    } else {
      newVal = val.slice(0, start) + val.slice(end);
      newCursorPos = start;
    }

    setFormData((prev) => ({
      ...prev,
      [activeFieldName]: newVal,
    }));

    setTimeout(() => {
      inputEl.focus();
      inputEl.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSpace = () => insertChar(" ");

  // Virtual Keyboard Layout Arrays
  const marathiVowels = [
    "अ",
    "आ",
    "इ",
    "ई",
    "उ",
    "ऊ",
    "ए",
    "ऐ",
    "ओ",
    "औ",
    "अं",
    "अः",
    "ऋ",
  ];
  const marathiModifiers = [
    "ा",
    "ि",
    "ी",
    "ु",
    "ू",
    "े",
    "ै",
    "ो",
    "ौ",
    "ं",
    "ः",
    "ॅ",
    "ॉ",
    "्",
    "ऱ",
  ];
  const marathiConsonants1 = ["क", "ख", "ग", "घ", "ङ", "च", "छ", "ज", "झ", "ञ"];
  const marathiConsonants2 = ["ट", "ठ", "ड", "ढ", "ण", "त", "थ", "द", "ध", "न"];
  const marathiConsonants3 = ["प", "फ", "ब", "भ", "म", "य", "र", "ल", "व", "श"];
  const marathiConsonants4 = ["ष", "स", "ह", "ळ", "क्ष", "ज्ञ", "।", "ॐ"];

  const englishRow1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
  const englishRow2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
  const englishRow3 = ["z", "x", "c", "v", "b", "n", "m"];

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col justify-between antialiased">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="size-12 text-[#6C63FF] animate-spin" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-400">
            परिपाठ डेटा लोड होत आहे...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const t = ASSEMBLY_TRANSLATIONS[language];

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827] font-sans antialiased pb-60">
      <Header />
      <main className="max-w-[1440px] mx-auto px-8 pt-16 pb-24">
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#6C63FF] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight flex items-center gap-4">
                Daily Assembly
              </h1>
            </div>
            
            {/* Language Selector */}
            <div className="flex bg-white border border-slate-200 rounded-full p-1 shadow-sm">
              {(["mr", "hi", "en"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    language === lang
                      ? "bg-[#6C63FF] text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {ASSEMBLY_TRANSLATIONS[lang].langName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Form Editor Card */}
          <div className="bg-white border border-black/5 rounded-[3rem] p-8 shadow-sm space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                <FileText className="size-6 text-[#6C63FF]" /> {t.editorTitle}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    showKeyboard
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Keyboard className="size-4" /> Keyboard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-full text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saveLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {t.saveChanges}
                </button>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-[#6C63FF] hover:bg-[#5b52e0] text-white rounded-full text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#6C63FF]/30 active:scale-95"
                >
                  <Copy className="size-3.5" /> {t.copy}
                </button>
              </div>
            </div>

            {/* Header Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Edit className="size-4 text-[#6C63FF]" /> {t.creatorInfo}
              </h3>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t.creator}
                </label>
                <input
                  type="text"
                  name="creator"
                  value={formData.creator}
                  onChange={handleChange}
                  onFocus={() => handleFocus("creator")}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Assembly Opening Items */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Music className="size-4 text-orange-500" /> {t.assemblyStart}
              </h3>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/60 rounded-2xl p-6 space-y-3">
                {assemblyItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white/80 backdrop-blur-sm rounded-xl border border-orange-100/60 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-4 px-5 py-3.5">
                      <span className="text-2xl">{item.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800">
                          {item.label}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {item.sub}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingItemIdx(editingItemIdx === idx ? null : idx)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          editingItemIdx === idx
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-orange-100 text-orange-600 hover:bg-orange-200"
                        }`}
                      >
                        {editingItemIdx === idx ? t.save : t.edit}
                      </button>
                    </div>
                    {item.content && (
                      <div className="px-5 pb-5 pt-2 border-t border-orange-100/60">
                        {editingItemIdx === idx ? (
                          <textarea
                            value={item.content}
                            onChange={(e) => {
                              const updated = [...assemblyItems];
                              updated[idx] = { ...updated[idx], content: e.target.value };
                              setAssemblyItems(updated);
                            }}
                            rows={12}
                            className="w-full px-4 py-3 bg-white border-2 border-orange-300 rounded-xl focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-700 leading-relaxed transition-all resize-y"
                          />
                        ) : (
                          <pre className="text-sm font-bold text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
                            {item.content}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Panchang Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="size-4 text-amber-500" /> {t.panchang}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.day}
                  </label>
                  <input
                    type="text"
                    name="day"
                    value={formData.day}
                    onChange={handleChange}
                    onFocus={() => handleFocus("day")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.month}
                  </label>
                  <input
                    type="text"
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    onFocus={() => handleFocus("month")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.paksha}
                  </label>
                  <input
                    type="text"
                    name="paksha"
                    value={formData.paksha}
                    onChange={handleChange}
                    onFocus={() => handleFocus("paksha")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.tithi}
                  </label>
                  <input
                    type="text"
                    name="tithi"
                    value={formData.tithi}
                    onChange={handleChange}
                    onFocus={() => handleFocus("tithi")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.nakshatra}
                  </label>
                  <input
                    type="text"
                    name="nakshatra"
                    value={formData.nakshatra}
                    onChange={handleChange}
                    onFocus={() => handleFocus("nakshatra")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.yog}
                  </label>
                  <input
                    type="text"
                    name="yog"
                    value={formData.yog}
                    onChange={handleChange}
                    onFocus={() => handleFocus("yog")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Sun className="size-3 text-amber-500" /> {t.sunrise}
                  </label>
                  <input
                    type="text"
                    name="sunrise"
                    value={formData.sunrise}
                    onChange={handleChange}
                    onFocus={() => handleFocus("sunrise")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <Moon className="size-3 text-indigo-500" /> {t.sunset}
                  </label>
                  <input
                    type="text"
                    name="sunset"
                    value={formData.sunset}
                    onChange={handleChange}
                    onFocus={() => handleFocus("sunset")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Thought and Proverb Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <MessageSquare className="size-4 text-emerald-500" /> सुविचार व
                म्हण
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.thought}
                  </label>
                  <textarea
                    name="thought"
                    value={formData.thought}
                    onChange={handleChange}
                    onFocus={() => handleFocus("thought")}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.proverb}
                  </label>
                  <input
                    type="text"
                    name="proverb"
                    value={formData.proverb}
                    onChange={handleChange}
                    onFocus={() => handleFocus("proverb")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.proverbMeaning}
                  </label>
                  <textarea
                    name="proverbMeaning"
                    value={formData.proverbMeaning}
                    onChange={handleChange}
                    onFocus={() => handleFocus("proverbMeaning")}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Dinvishesh Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="size-4 text-indigo-500" /> {t.eventsTitle}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    तारीख आणि महिना (उदा. ०९ जुलै)
                  </label>
                  <input
                    type="text"
                    name="dateMonth"
                    value={formData.dateMonth}
                    onChange={handleChange}
                    onFocus={() => handleFocus("dateMonth")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.yearDay}
                  </label>
                  <input
                    type="text"
                    name="yearDay"
                    value={formData.yearDay}
                    onChange={handleChange}
                    onFocus={() => handleFocus("yearDay")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.importantEvents}
                  </label>
                  <textarea
                    name="events"
                    value={formData.events}
                    onChange={handleChange}
                    onFocus={() => handleFocus("events")}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.birthdays}
                  </label>
                  <textarea
                    name="birthdays"
                    value={formData.birthdays}
                    onChange={handleChange}
                    onFocus={() => handleFocus("birthdays")}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.deaths}
                  </label>
                  <textarea
                    name="deaths"
                    value={formData.deaths}
                    onChange={handleChange}
                    onFocus={() => handleFocus("deaths")}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Patriotic Song Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Music className="size-4 text-rose-500" /> {t.patrioticSongTitle}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.songTitle}
                  </label>
                  <input
                    type="text"
                    name="songTitle"
                    value={formData.songTitle}
                    onChange={handleChange}
                    onFocus={() => handleFocus("songTitle")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.patrioticSongTitle}
                  </label>
                  <textarea
                    name="patrioticSong"
                    value={formData.patrioticSong}
                    onChange={handleChange}
                    onFocus={() => handleFocus("patrioticSong")}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Story Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <BookOpen className="size-4 text-emerald-500" /> {t.storyTitle}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.storyName}
                  </label>
                  <input
                    type="text"
                    name="storyTitle"
                    value={formData.storyTitle}
                    onChange={handleChange}
                    onFocus={() => handleFocus("storyTitle")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.storyTitle}
                  </label>
                  <textarea
                    name="story"
                    value={formData.story}
                    onChange={handleChange}
                    onFocus={() => handleFocus("story")}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.moral}
                  </label>
                  <input
                    type="text"
                    name="moral"
                    value={formData.moral}
                    onChange={handleChange}
                    onFocus={() => handleFocus("moral")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* General Knowledge Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <HelpCircle className="size-4 text-violet-500" /> {t.gkTitle}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.q1}
                    </label>
                    <input
                      type="text"
                      name="gkQ1"
                      value={formData.gkQ1}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ1")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.a1}
                    </label>
                    <input
                      type="text"
                      name="gkA1"
                      value={formData.gkA1}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA1")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.q2}
                    </label>
                    <input
                      type="text"
                      name="gkQ2"
                      value={formData.gkQ2}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ2")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      उत्तर २
                    </label>
                    <input
                      type="text"
                      name="gkA2"
                      value={formData.gkA2}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA2")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.q3}
                    </label>
                    <input
                      type="text"
                      name="gkQ3"
                      value={formData.gkQ3}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ3")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.a3}
                    </label>
                    <input
                      type="text"
                      name="gkA3"
                      value={formData.gkA3}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA3")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.q4}
                    </label>
                    <input
                      type="text"
                      name="gkQ4"
                      value={formData.gkQ4}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkQ4")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t.a4}
                    </label>
                    <input
                      type="text"
                      name="gkA4"
                      value={formData.gkA4}
                      onChange={handleChange}
                      onFocus={() => handleFocus("gkA4")}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Great Personality Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="size-4 text-cyan-500" /> {t.personalityTitle}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.personalityName}
                  </label>
                  <input
                    type="text"
                    name="personalityTitle"
                    value={formData.personalityTitle}
                    onChange={handleChange}
                    onFocus={() => handleFocus("personalityTitle")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t.personalityTitle}
                  </label>
                  <textarea
                    name="personality"
                    value={formData.personality}
                    onChange={handleChange}
                    onFocus={() => handleFocus("personality")}
                    rows={6}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#6C63FF] outline-none text-sm font-bold text-slate-800 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Persistent Floating On-Screen Keyboard Drawer */}
      <AnimatePresence>
        {showKeyboard && (
          <motion.div
            initial={{ y: 250, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 250, opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E293B] border-t border-slate-700 shadow-2xl p-4 md:p-6"
          >
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Keyboard Header Controls */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Keyboard className="size-4" /> Type Board
                  </span>
                  <div className="bg-slate-800 p-1 rounded-xl flex gap-1">
                    <button
                      onClick={() => setKeyboardLang("mr")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                        keyboardLang === "mr"
                          ? "bg-[#6C63FF] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      मराठी
                    </button>
                    <button
                      onClick={() => setKeyboardLang("en")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                        keyboardLang === "en"
                          ? "bg-[#6C63FF] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                    Active Field:{" "}
                    <span className="text-[#6C63FF] font-black">
                      {activeFieldName || "None"}
                    </span>
                  </span>
                  <button
                    onClick={() => setShowKeyboard(false)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                  >
                    Hide
                  </button>
                </div>
              </div>

              {/* Keyboard Layout Grid */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto no-scrollbar py-1">
                {keyboardLang === "mr" ? (
                  <div className="space-y-2">
                    {/* Vowels */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiVowels.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    {/* Modifiers */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiModifiers.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-indigo-950 hover:bg-indigo-900 active:scale-95 text-indigo-200 font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-indigo-900"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    {/* Consonants Rows */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants1.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants2.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants3.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {marathiConsonants4.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertChar(char)}
                          className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* English Row 1 */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {englishRow1.map((char) => {
                        const showChar = isShift ? char.toUpperCase() : char;
                        return (
                          <button
                            key={char}
                            onClick={() => insertChar(showChar)}
                            className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                          >
                            {showChar}
                          </button>
                        );
                      })}
                    </div>
                    {/* English Row 2 */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      {englishRow2.map((char) => {
                        const showChar = isShift ? char.toUpperCase() : char;
                        return (
                          <button
                            key={char}
                            onClick={() => insertChar(showChar)}
                            className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                          >
                            {showChar}
                          </button>
                        );
                      })}
                    </div>
                    {/* English Row 3 */}
                    <div className="flex flex-wrap gap-1 md:gap-1.5 justify-center">
                      <button
                        onClick={() => setIsShift(!isShift)}
                        className={`min-w-10 h-9 px-2 active:scale-95 font-bold rounded-lg text-xs transition-all flex items-center justify-center cursor-pointer border ${
                          isShift
                            ? "bg-[#6C63FF] text-white border-[#6C63FF]"
                            : "bg-slate-700 text-slate-300 border-slate-600"
                        }`}
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      {englishRow3.map((char) => {
                        const showChar = isShift ? char.toUpperCase() : char;
                        return (
                          <button
                            key={char}
                            onClick={() => insertChar(showChar)}
                            className="min-w-8 h-9 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-lg text-sm transition-all flex items-center justify-center cursor-pointer border border-slate-700"
                          >
                            {showChar}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Common Utilities Row */}
                <div className="flex gap-2 justify-center max-w-lg mx-auto pt-2">
                  <button
                    onClick={handleBackspace}
                    className="flex-1 h-10 px-4 bg-rose-950 hover:bg-rose-900 active:scale-95 text-rose-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 border border-rose-900"
                  >
                    <Delete className="size-4" /> Backspace
                  </button>
                  <button
                    onClick={handleSpace}
                    className="w-48 h-10 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center border border-slate-600"
                  >
                    Space
                  </button>
                  <button
                    onClick={() => {
                      if (activeFieldName) {
                        setFormData((prev) => ({
                          ...prev,
                          [activeFieldName]: "",
                        }));
                      }
                    }}
                    className="flex-1 h-10 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-400 font-bold rounded-xl text-xs transition-all flex items-center justify-center border border-slate-800"
                  >
                    Clear Field
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
}
