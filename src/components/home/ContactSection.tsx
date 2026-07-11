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

export function ContactPage() {
  const [loading, setLoading] = useState(false);
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(t.success);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-teal-50/50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-50" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/5 border border-slate-900/10 text-teal-600 text-[10px] font-black uppercase tracking-[0.3em] mb-8"
          >
            <Sparkles className="size-4 animate-pulse" />
            <span>{t.contact_badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 leading-none"
          >
            {(t.contact_hero_title || "").split(" ").slice(0, -1).join(" ")}{" "}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-indigo-600 to-teal-600 animate-gradient-x">
              {(t.contact_hero_title || "").split(" ").slice(-1)}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed"
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
              className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-premium"
            >
              <div className="flex items-center gap-4 mb-10">
                <div className="size-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <MessageSquare className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {t.contact_form_title}
                  </h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {t.contact_form_badge}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                      {t.contact_form_name}
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-teal-500/30 focus:bg-white transition-all outline-none text-slate-900 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                      {t.contact_form_email}
                    </label>
                    <input
                      required
                      type="email"
                      placeholder="john@example.com"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-teal-500/30 focus:bg-white transition-all outline-none text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                    {t.contact_form_type}
                  </label>
                  <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-teal-500/30 focus:bg-white transition-all outline-none text-slate-900 font-bold appearance-none">
                    <option>{t.contact_type_general}</option>
                    <option>{t.contact_type_partners}</option>
                    <option>{t.contact_type_support}</option>
                    <option>{t.contact_type_careers}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
                    {t.contact_form_message}
                  </label>
                  <textarea
                    required
                    placeholder="..."
                    rows={5}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-teal-500/30 focus:bg-white transition-all outline-none text-slate-900 font-bold resize-none"
                  />
                </div>

                <button
                  disabled={loading}
                  className="w-full py-6 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-teal-600 hover:scale-[1.02] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
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
                  <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">
                    {t.contact_info_title}
                  </h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
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
                      detail: "brgkendre86@gmail.com",
                      sub: "Email Support",
                    },
                    {
                      icon: Phone,
                      title: t.contact_info_phone,
                      detail: "9422778992",
                      sub: "Contact Number",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ x: 10 }}
                      className="flex items-start gap-6 group"
                    >
                      <div className="size-14 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shrink-0 shadow-sm">
                        <item.icon className="size-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
                          {item.title}
                        </p>
                        <p className="text-lg font-bold text-slate-900 leading-none mb-1">
                          {item.detail}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          {item.sub}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-8 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden group shadow-2xl"
              >
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Globe className="size-32" />
                </div>
                <div className="relative z-10">
                  <h4 className="text-2xl font-black mb-4">
                    {t.contact_enterprise_title}
                  </h4>
                  <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                    {t.contact_enterprise_desc}
                  </p>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 hover:text-white transition-colors group">
                    {t.contact_enterprise_btn}{" "}
                    <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </motion.div>

              <div className="flex items-center gap-6 px-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <ShieldCheck className="size-4" />
                  {t.contact_gdpr}
                </div>
                <div className="size-1 rounded-full bg-slate-200" />
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
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
