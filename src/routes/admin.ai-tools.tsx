import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Brain,
  Cpu,
  Zap,
  Settings,
  ChevronLeft,
  Plus,
  Search,
  ArrowUp,
  MessageSquare,
  Menu,
  X,
  User,
  Trash2,
  Paperclip,
  CheckCircle,
  ChevronDown,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  Bot,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

export const Route = createFileRoute("/admin/ai-tools")({
  head: () => ({
    meta: [{ title: "SMART LEARNING — Generative AI Workspace" }],
  }),
  component: AIChatWorkspace,
});

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  fileName?: string;
  fileSize?: string;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

const INITIAL_CHATS: Chat[] = [];

type ModelKey = "gpt3" | "gpt4" | "sora";

interface ModelConfig {
  name: string;
  version: string;
  color: string;
  badge: string;
  avatar: string;
  dot: string;
  accent: string;
  gradient: string;
}

const MODEL_CONFIGS: Record<ModelKey, ModelConfig> = {
  gpt3: {
    name: "ChatGPT",
    version: "3.5",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    avatar: "bg-emerald-600 border-emerald-500 text-white",
    dot: "bg-emerald-500 shadow-[0_0_10px_#10b981]",
    accent: "focus-within:border-emerald-500/30",
    gradient: "from-emerald-600 to-teal-500",
  },
  gpt4: {
    name: "SMART LEARNING GPT-4",
    version: "Intelligence Node",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    badge: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    avatar: "bg-violet-600 border-violet-500 text-white",
    dot: "bg-violet-500 shadow-[0_0_10px_#8b5cf6]",
    accent: "focus-within:border-violet-500/30",
    gradient: "from-violet-600 to-indigo-500",
  },
  sora: {
    name: "Sora Media AI",
    version: "Motion Node v2",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    badge: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    avatar: "bg-rose-600 border-rose-500 text-white",
    dot: "bg-rose-500 shadow-[0_0_10px_#f43f5e]",
    accent: "focus-within:border-rose-500/30",
    gradient: "from-rose-600 to-pink-500",
  },
};

function AIChatWorkspace() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelKey>("gpt4");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId]);

  if (!showWorkspace) {
    return <AILandingPage onStart={() => setShowWorkspace(true)} />;
  }

  const currentModel = MODEL_CONFIGS[activeModel];
  const activeChat =
    chats.find((c) => c.id === activeChatId) ||
    (chats.length > 0 ? chats[0] : null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      toast.success(`${t.ai_attach_toast} ${file.name}`);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !attachedFile) return;
    if (isGenerating) return;

    let currentChatId = activeChatId;
    if (!currentChatId) {
      const newChatId = Date.now().toString();
      const newChat: Chat = {
        id: newChatId,
        title: inputValue.slice(0, 30) || attachedFile?.name || "New Chat",
        messages: [],
      };
      setChats([newChat]);
      setActiveChatId(newChatId);
      currentChatId = newChatId;
    }

    const userMessage = inputValue;
    const currentFile = attachedFile;
    setInputValue("");
    setAttachedFile(null);

    const messageText = currentFile
      ? `[File: ${currentFile.name}] ${userMessage}`.trim()
      : userMessage;

    setChats((prev) =>
      prev.map((c) =>
        c.id === currentChatId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  id: Date.now().toString(),
                  sender: "user",
                  text: messageText,
                  fileName: currentFile?.name,
                  fileSize: currentFile
                    ? (currentFile.size / 1024).toFixed(1) + " KB"
                    : undefined,
                } as any,
              ],
            }
          : c,
      ),
    );
    simulateAIResponse(messageText, currentChatId);
  };

  const simulateAIResponse = (userText: string, chatId: string) => {
    setIsGenerating(true);
    let response =
      lang === "en"
        ? "I have processed your request with " +
          MODEL_CONFIGS[activeModel].name +
          ". How else can I help?"
        : lang === "mr"
          ? "मी " +
            MODEL_CONFIGS[activeModel].name +
            " सह तुमची विनंती पूर्ण केली आहे. मी अजून काय मदत करू शकतो?"
          : "मैंने " +
            MODEL_CONFIGS[activeModel].name +
            " के साथ आपके अनुरोध को प्रोसेस किया है। मैं आपकी और क्या सहायता कर सकता हूँ?";

    const aiMessageId = `ai-${Date.now()}`;

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: [
                ...c.messages,
                { id: aiMessageId, sender: "ai", text: "" },
              ],
            }
          : c,
      ),
    );

    let i = 0;
    const interval = setInterval(() => {
      i += 5;
      if (i >= response.length) {
        i = response.length;
        clearInterval(interval);
        setIsGenerating(false);
      }
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMessageId
                    ? { ...m, text: response.slice(0, i) }
                    : m,
                ),
              }
            : c,
        ),
      );
    }, 20);
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="h-screen w-full flex bg-white dark:bg-[#0d0d0d] text-slate-900 dark:text-[#ececec] font-sans overflow-hidden">
        <main className="flex-1 flex flex-col h-full">
          <header className="h-16 px-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowWorkspace(false)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-black tracking-tighter text-lg uppercase">
                {t.ai_workspace_header}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                {isDark ? <Zap size={18} /> : <Settings size={18} />}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-20 lg:px-40 space-y-8">
            {!activeChat || activeChat.messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="size-20 rounded-[2.5rem] bg-indigo-500 flex items-center justify-center shadow-2xl text-white">
                  <Brain size={40} />
                </div>
                <h2 className="text-4xl font-bold">{t.ai_new_exploration}</h2>
                <p className="text-slate-500">{t.ai_select_model}</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-10">
                {activeChat.messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-6 rounded-3xl ${msg.sender === "user" ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}
                    >
                      {msg.fileName && (
                        <div className="flex items-center gap-3 mb-3 p-3 bg-white/10 rounded-2xl border border-white/10">
                          <div className="size-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                            <Paperclip size={18} />
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-bold truncate max-w-[150px]">
                              {msg.fileName}
                            </p>
                            <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
                              {msg.fileSize}
                            </p>
                          </div>
                        </div>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 max-w-3xl w-full mx-auto">
            <AnimatePresence>
              {attachedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-4 p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                      <Paperclip size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold truncate max-w-[200px]">
                        {attachedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {(attachedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="p-2 hover:bg-slate-50 rounded-lg text-slate-400"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="absolute left-3 top-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`size-10 rounded-full flex items-center justify-center transition-all ${attachedFile ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  <Paperclip size={18} />
                </button>
              </div>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  isGenerating
                    ? t.ai_thinking
                    : attachedFile
                      ? t.ai_ask_file
                      : t.ai_placeholder
                }
                className="w-full h-16 pl-16 pr-20 bg-slate-50 border border-slate-200 rounded-[2rem] focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
              <button
                type="submit"
                className="absolute right-3 top-3 size-10 bg-slate-900 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                <ArrowUp size={20} />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

function AILandingPage({ onStart }: { onStart: () => void }) {
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100">
      <nav className="h-20 px-8 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Sparkles size={18} />
          </div>
          <span className="font-bold text-lg tracking-tight">
            {t.ai_landing_title}
          </span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
          <a
            href="#"
            className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px] font-black"
          >
            {t.ai_landing_title}
          </a>
          <a
            href="#"
            className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[10px] font-black"
          >
            Blog
          </a>
        </div>
      </nav>

      <header className="pt-20 pb-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-[0.9]">
              {t.ai_landing_title}
            </h1>
            <p className="text-xl text-slate-500 font-medium max-w-md">
              {t.ai_landing_subtitle}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onStart}
              className="px-10 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
            >
              {t.ai_landing_get_started}
            </button>
            <button className="px-10 py-4 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-all">
              {t.ai_landing_sign_in}
            </button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <img
            src="https://images.unsplash.com/photo-1454165833767-027ffea9e51b?auto=format&fit=crop&q=80"
            alt="AI Learning"
            className="rounded-[3rem] shadow-2xl"
          />
          <div className="absolute -bottom-10 -left-10 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-4">
            <div className="size-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Brain size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {lang === "mr" ? "वैयक्तिकृत" : "Personalized"}
              </p>
              <p className="font-bold tracking-tight">
                {lang === "mr" ? "अनुकूलन शिक्षण" : "Adaptive Learning"}
              </p>
            </div>
          </div>
        </motion.div>
      </header>

      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-8 text-center space-y-16">
          <div className="space-y-4">
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
              {lang === "mr"
                ? "स्टडी बडी तुम्हाला मदत करू शकते:"
                : "StudyBuddy can help you:"}
            </p>
            <h2 className="text-4xl font-black tracking-tight">
              {t.ai_help_title}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12 text-left">
            {[
              {
                icon: BookOpen,
                title: t.ai_potential_title,
                desc: t.ai_potential_desc,
              },
              {
                icon: Cpu,
                title: t.ai_teaching_title,
                desc: t.ai_teaching_desc,
              },
              { icon: Zap, title: t.ai_adapts_title, desc: t.ai_adapts_desc },
            ].map((f, i) => (
              <div key={i} className="space-y-6">
                <div className="size-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 border border-slate-200">
                  <f.icon size={24} />
                </div>
                <h3 className="text-xl font-bold tracking-tight">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {f.desc}
                </p>
                <a
                  href="#"
                  className="text-indigo-600 font-bold text-xs flex items-center gap-2 hover:gap-3 transition-all uppercase tracking-widest"
                >
                  {lang === "mr" ? "अधिक जाणून घ्या" : "Learn more"}{" "}
                  <ArrowRight size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
        <div className="order-2 lg:order-1 relative">
          <img
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80"
            alt="Learning Formats"
            className="rounded-[3rem] shadow-2xl"
          />
          <div className="absolute top-10 -right-10 bg-indigo-600 p-8 rounded-3xl text-white shadow-2xl max-w-[200px]">
            <MessageSquare size={32} className="mb-4" />
            <p className="font-bold tracking-tight">
              {lang === "mr"
                ? "कोणत्याही स्त्रोताकडून स्वयंचलित माहिती."
                : "Automated extraction from any source."}
            </p>
          </div>
        </div>
        <div className="order-1 lg:order-2 space-y-10">
          <div className="space-y-4">
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
              {lang === "mr"
                ? "सर्व प्रकारचे साहित्य अपलोड करा"
                : "Upload all kinds of learning materials."}
            </p>
            <h2 className="text-5xl font-black tracking-tight">
              {t.ai_format_title}
            </h2>
            <p className="text-slate-500 font-medium">{t.ai_format_subtitle}</p>
          </div>
          <div className="space-y-8">
            {[
              {
                icon: Sparkles,
                title:
                  lang === "mr" ? "तुमच्या नोट्स सुधारा" : "Enhance Your Notes",
                desc: "Convert raw text into structured knowledge.",
              },
              {
                icon: BookOpen,
                title:
                  lang === "mr"
                    ? "संशोधन पेपर्स सोपे करा"
                    : "Simplify Research Papers",
                desc: "Break down complex documents into insights.",
              },
              {
                icon: Bot,
                title:
                  lang === "mr"
                    ? "कोणत्याही व्हिडिओ मधून शिका"
                    : "Learn From Any Video",
                desc: "Grasp key concepts from shared video links.",
              },
              {
                icon: Globe,
                title:
                  lang === "mr" ? "वेब नॉलेज मिळवा" : "Navigate Web Knowledge",
                desc: "Transform online resources into study materials.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="size-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-lg tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
        <div className="space-y-10">
          <div className="space-y-4">
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px]">
              {lang === "mr"
                ? "शिक्षणाचे भविष्य अनुभवा"
                : "Experience the future of education"}
            </p>
            <h2 className="text-5xl font-black tracking-tight">
              {t.ai_powered_title}
            </h2>
            <p className="text-slate-500 font-medium">{t.ai_powered_desc}</p>
          </div>
          <div className="space-y-8">
            {[
              {
                icon: User,
                title:
                  lang === "mr" ? "वैयक्तिक एआय ट्यूटर" : "Personal AI Tutor",
                desc: "Get instant help with any subject.",
              },
              {
                icon: Cpu,
                title:
                  lang === "mr"
                    ? "स्मार्ट फ्लॅशकार्ड क्रिएटर"
                    : "Smart Flashcard Creator",
                desc: "Transform content into effective tools.",
              },
              {
                icon: BookOpen,
                title:
                  lang === "mr"
                    ? "नोट्स असिस्टंट"
                    : "Comprehensive Notes Assistant",
                desc: "Organize your knowledge efficiently.",
              },
              {
                icon: Bot,
                title:
                  lang === "mr"
                    ? "अ‍ॅडॉप्टिव्ह क्विझ बिल्डर"
                    : "Adaptive Quiz Builder",
                desc: "Test yourself with AI questions.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-6">
                <div className="size-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-lg tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80"
            alt="AI Powered"
            className="rounded-[3rem] shadow-2xl"
          />
          <div className="absolute -top-10 -left-10 bg-white p-8 rounded-3xl shadow-2xl flex items-center gap-4">
            <div className="size-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
              <Bot size={32} />
            </div>
            <p className="font-black text-xl tracking-tight">24/7 AI Tutor</p>
          </div>
        </div>
      </section>

      <footer className="py-24 bg-indigo-600 text-white text-center rounded-[4rem] mx-8 mb-8 overflow-hidden relative">
        <div className="relative z-10 space-y-10">
          <div className="space-y-4">
            <h2 className="text-5xl font-black tracking-tight">
              {t.ai_cta_ready}
            </h2>
            <p className="text-indigo-100 text-xl font-medium">
              {t.ai_cta_free}
            </p>
          </div>
          <button
            onClick={onStart}
            className="px-12 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-all shadow-2xl"
          >
            {t.ai_landing_get_started}
          </button>
        </div>
      </footer>
    </div>
  );
}

function MarkdownMessage({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-4">
      {parts.map((part, i) =>
        part.startsWith("```") ? (
          <CodeBlock
            key={i}
            language={part.match(/```(\w*)\n/)?.[1] || "code"}
            code={part.replace(/```[\w]*\n|```/g, "")}
          />
        ) : (
          <FormattedText key={i} text={part} />
        ),
      )}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  const highlight = (raw: string) => {
    let html = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    html = html.replace(
      /(\/\/.*)/g,
      '<span class="text-slate-500 dark:text-stone-500 font-normal italic">$1</span>',
    );
    const kw =
      /\b(const|let|var|function|return|import|export|from|class|await|async|interface|type|default|extends|new|try|catch|finally|if|else|for|while|do|switch|case|break)\b/g;
    html = html.replace(kw, '<span class="text-pink-500 font-bold">$1</span>');
    html = html.replace(
      /(["'`])([\s\S]*?)\1/g,
      '<span class="text-emerald-400 font-medium">"$2"</span>',
    );
    const hooks =
      /\b(useState|useEffect|useRef|useAuth|useNavigate|createFileRoute|onAuthStateChanged|getDoc|doc|setDoc|query|collection|addDoc|deleteDoc|toast|success|error|info)\b/g;
    html = html.replace(
      hooks,
      '<span class="text-sky-400 font-bold">$1</span>',
    );
    return <code dangerouslySetInnerHTML={{ __html: html }} />;
  };
  return (
    <div className="my-4 rounded-2xl bg-[#090909] border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#141414] border-b border-slate-200 dark:border-white/5">
        <span className="text-[10px] font-black uppercase text-slate-500 dark:text-stone-500 flex items-center gap-1.5">
          <Terminal size={12} className="text-emerald-500" />{" "}
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2.5 py-1 hover:bg-slate-100 dark:bg-white/5 rounded-lg text-[9px] font-black text-slate-600 dark:text-stone-400 hover:text-slate-900"
        >
          {copied ? (
            <Check size={11} className="text-emerald-500" />
          ) : (
            <Copy size={11} />
          )}{" "}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto text-[12px] font-mono text-slate-900 dark:text-[#ececec] bg-black/40">
        {highlight(code)}
      </pre>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        if (line.startsWith("* ") || line.startsWith("- ")) {
          const content = line.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-4">
              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
              <span className="text-[#dcdcdc] text-[13px]">
                {renderInlineStyles(content)}
              </span>
            </div>
          );
        }
        const numMatch = line.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-4">
              <span className="text-emerald-500 font-bold text-xs shrink-0 mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="text-[#dcdcdc] text-[13px]">
                {renderInlineStyles(numMatch[2])}
              </span>
            </div>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="text-sm font-black text-white mt-4 mb-2 border-l-2 border-emerald-500 pl-2"
            >
              {renderInlineStyles(line.slice(4))}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-base font-black text-white mt-5 mb-2">
              {renderInlineStyles(line.slice(3))}
            </h3>
          );
        }
        return (
          <p key={idx} className="text-[#dcdcdc] text-[13px]">
            {renderInlineStyles(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineStyles(text: string) {
  const boldParts: React.ReactNode[] = [];
  const splitBold = text.split(/(\*\*.*?\*\*)/g);
  splitBold.forEach((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      boldParts.push(
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>,
      );
    } else {
      boldParts.push(part);
    }
  });
  const final: React.ReactNode[] = [];
  boldParts.forEach((part, i) => {
    if (typeof part === "string") {
      const splitCode = part.split(/(`.*?`)/g);
      splitCode.forEach((c, j) => {
        if (c.startsWith("`") && c.endsWith("`")) {
          final.push(
            <code
              key={`c-${i}-${j}`}
              className="px-1.5 py-0.5 bg-[#252525] border border-slate-200 dark:border-white/5 rounded-md text-[11px] font-mono text-emerald-400 font-bold mx-0.5"
            >
              {c.slice(1, -1)}
            </code>,
          );
        } else {
          final.push(c);
        }
      });
    } else {
      final.push(part);
    }
  });
  return <>{final}</>;
}
