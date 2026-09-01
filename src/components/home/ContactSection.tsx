import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  MessageSquare,
  Globe,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { showToast as toast } from "@/lib/custom-toast";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export function ContactPage() {
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    type: "General Inquiry",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("कृपया सर्व माहिती प्रविष्ट करा.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "contact_inquiries"), {
        ...formData,
        createdAt: new Date().toISOString(),
        status: "UNREAD",
      });
      setLoading(false);
      toast.success(lang === "mr" ? "तुमचा संदेश यशस्वीरित्या प्राप्त झाला आहे! आम्ही लवकरच संपर्क साधू." : "Message dispatched successfully! We will contact you soon.");
      setFormData({ name: "", email: "", type: "General Inquiry", message: "" });
    } catch (err) {
      console.error("Form error:", err);
      setLoading(false);
      toast.error("संदेश पाठवताना अडचण आली. कृपया पुन्हा प्रयत्न करा.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-text dark:bg-transparent dark:text-slate-100 relative border-t border-border">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50 blur-[120px] pointer-events-none" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center text-text dark:text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-feature-purple border border-border text-primary dark:bg-indigo-950/50 dark:border-indigo-900/50 dark:text-teal-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8"
          >
            <Sparkles className="size-4 animate-pulse" />
            <span>{t.contact_badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter text-heading dark:text-white mb-6 leading-none"
          >
            {(t.contact_hero_title || "").split(" ").slice(0, -1).join(" ")}{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-light to-primary dark:from-teal-400 dark:via-indigo-400 dark:to-teal-400 animate-gradient-x">
              {(t.contact_hero_title || "").split(" ").slice(-1)}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto text-lg text-text dark:text-slate-300 font-medium leading-relaxed"
          >
            {t.contact_hero_subtitle}
          </motion.p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card-bg dark:bg-slate-900/60 backdrop-blur-md p-8 md:p-12 rounded-[3rem] border border-border dark:border-white/10 shadow-premium text-text dark:text-white"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="size-12 rounded-2xl bg-feature-purple border border-border text-primary dark:bg-teal-950/50 dark:border-teal-900/30 dark:text-teal-400 flex items-center justify-center">
                  <MessageSquare className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-heading dark:text-white">
                    {t.contact_form_title}
                  </h2>
                  <p className="text-xs font-bold text-light-text dark:text-slate-300 uppercase tracking-widest mt-1">
                    {t.contact_form_badge}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text dark:text-slate-300 ml-2">
                      {t.contact_form_name}
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 border border-border rounded-2xl focus:border-primary/50 focus:bg-white focus:text-slate-900 dark:bg-slate-900/50 dark:border-white/10 dark:focus:bg-slate-900 dark:focus:border-teal-500/30 dark:focus:text-white transition-all outline-none text-text dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text dark:text-slate-300 ml-2">
                      {t.contact_form_email}
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full px-6 py-4 bg-slate-50 border border-border rounded-2xl focus:border-primary/50 focus:bg-white focus:text-slate-900 dark:bg-slate-900/50 dark:border-white/10 dark:focus:bg-slate-900 dark:focus:border-teal-500/30 dark:focus:text-white transition-all outline-none text-text dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text dark:text-slate-300 ml-2">
                    {t.contact_form_type}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border border-border rounded-2xl focus:border-primary/50 focus:bg-white focus:text-slate-900 dark:bg-slate-900/50 dark:border-white/10 dark:focus:bg-slate-900 dark:focus:border-teal-500/30 dark:focus:text-white transition-all outline-none text-text dark:text-white font-bold appearance-none"
                  >
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">{t.contact_type_general}</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">{t.contact_type_partners}</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">{t.contact_type_support}</option>
                    <option className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white">{t.contact_type_careers}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-light-text dark:text-slate-300 ml-2">
                    {t.contact_form_message}
                  </label>
                  <textarea
                    required
                    placeholder="..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    className="w-full px-6 py-4 bg-slate-50 border border-border rounded-2xl focus:border-primary/50 focus:bg-white focus:text-slate-900 dark:bg-slate-900/50 dark:border-white/10 dark:focus:bg-slate-900 dark:focus:border-teal-500/30 dark:focus:text-white transition-all outline-none text-text dark:text-white font-bold resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full py-6 bg-button-gradient text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-button-hover hover:scale-[1.02] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    t.contact_form_sending
                  ) : (
                    <>
                      <Send className="size-4" />
                      {t.contact_form_submit}
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Contact Information */}
            <div className="space-y-12 py-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-3xl font-black text-heading dark:text-white mb-4 tracking-tighter">
                    {t.contact_info_title}
                  </h3>
                  <p className="text-text dark:text-slate-300 font-medium leading-relaxed">
                    {t.contact_info_desc}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {[
                    {
                      icon: MapPin,
                      title: t.contact_info_location,
                      detail: "145/A, 194/A/2, PL NO 100, SHREE CAPITAL-2, WARNALI, WILLINGDON COLLEGE SANGLI, MIRAJ, SANGLI, MAHARASHTRA - 416415",
                      sub: "Main Office",
                    },
                    {
                      icon: Mail,
                      title: t.contact_info_email,
                      detail: "sgkbrainova@gmail.com",
                      sub: "Email Support",
                    },
                    {
                      icon: Phone,
                      title: t.contact_info_phone,
                      detail: "9730784233",
                      sub: "Contact Number",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 10 }}
                      className="flex items-start gap-6 group"
                    >
                      <div className="size-14 rounded-3xl bg-stats-icon-bg border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white dark:bg-white/5 dark:border-white/10 dark:text-white transition-all duration-500 shrink-0 shadow-sm">
                        <item.icon className="size-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-light-text dark:text-slate-300 uppercase tracking-widest mb-1">
                          {item.title}
                        </p>
                        <p className="text-lg font-bold text-heading dark:text-white leading-tight mb-1">
                          {item.detail}
                        </p>
                        <p className="text-xs text-light-text dark:text-slate-300 font-medium">
                          {item.sub}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>



              <div className="flex items-center gap-6 px-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                  <ShieldCheck className="size-4" />
                  {t.contact_gdpr}
                </div>
                <div className="size-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                  <Globe className="size-4" />
                  {t.contact_support}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
