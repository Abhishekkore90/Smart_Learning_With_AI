import { Link } from "@tanstack/react-router";
import { Sparkles, Globe, Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { DICTIONARY } from "@/lib/translations";
import logoImg from "@/assets/logo.jpeg";

export function Footer() {
  const { lang } = useLanguage();
  const t = DICTIONARY[lang] as any;

  return (
    <footer className="bg-slate-950 text-slate-300 py-16 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3.5 group">
              <div className="relative">
                <img
                  src={logoImg}
                  alt="SGK Brainova Logo"
                  className="size-10 rounded-2xl object-cover group-hover:rotate-[10deg] transition-all duration-500"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tighter text-white leading-none">
                  SGK Brainova
                </span>
                <span className="text-[8px] font-bold tracking-[0.2em] text-primary uppercase mt-1">
                  Smart Learning With AI
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              {t.footer_desc}
            </p>
            <div className="flex items-center gap-4">
              {[Globe, Globe, Globe, Globe].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="size-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-white transition-all text-slate-400"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">
              {t.footer_platform}
            </h4>
            <ul className="space-y-3">
              {[
                { label: t.footer_home, to: "/" },
                { label: t.footer_about, to: "/about" },
                { label: t.footer_courses, to: "/courses" },
                { label: t.footer_contact, to: "/contact" },
              ].map((link, i) => (
                <li key={i}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">
              {t.footer_contact_title}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-slate-400">
                <MapPin className="size-5 text-primary shrink-0" />
                <span>145/A, 194/A/2, PL NO 100, SHREE CAPITAL-2, WARNALI, WILLINGDON COLLEGE SANGLI, MIRAJ, SANGLI, MAHARASHTRA - 416415</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Phone className="size-5 text-primary shrink-0" />
                <span>9422778992</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-400">
                <Mail className="size-5 text-primary shrink-0" />
                <span>brgkendre86@gmail.com</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-6">
            <h4 className="text-sm font-black text-white uppercase tracking-widest">
              {t.footer_newsletter}
            </h4>
            <p className="text-sm text-slate-400">{t.footer_newsletter_desc}</p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder={t.footer_email_placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              />
              <button className="bg-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
                <Sparkles className="size-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>
            © {new Date().getFullYear()} SGK Brainova Smart Learning With AI.{" "}
            {t.footer_copyright}
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-white transition-colors">
              {t.footer_privacy}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t.footer_terms}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t.footer_cookies}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
