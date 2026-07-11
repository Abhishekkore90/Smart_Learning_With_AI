import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Smart Learning With AI" }] }),
  component: Page,
});

const tiers = [
  {
    name: "Scholar",
    price: 29,
    desc: "Perfect to start your journey.",
    feats: ["Access to 50 courses", "Community forum", "Monthly mentor AMA"],
  },
  {
    name: "Visionary",
    price: 99,
    desc: "For serious career builders.",
    feats: [
      "All 500+ courses",
      "1-on-1 mentorship hours",
      "Project reviews",
      "Certificates",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    price: 299,
    desc: "For teams scaling expertise.",
    feats: [
      "Unlimited seats",
      "Dedicated success manager",
      "Custom learning paths",
      "SSO & analytics",
    ],
  },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="text-center py-16 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold"
        >
          Invest in <span className="text-gradient">Your Future</span>
        </motion.h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Flexible plans for every visionary. Cancel anytime.
        </p>
      </section>
      <section className="px-6 max-w-6xl mx-auto pb-20 grid md:grid-cols-3 gap-6">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -8 }}
            className={`rounded-3xl p-8 ${t.popular ? "bg-gradient-cta text-primary-foreground shadow-glow scale-105" : "bg-card shadow-card"}`}
          >
            {t.popular && (
              <div className="text-xs font-semibold uppercase tracking-widest mb-2">
                ★ Most Popular
              </div>
            )}
            <h3 className="text-2xl font-bold">{t.name}</h3>
            <p
              className={`text-sm mt-1 ${t.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {t.desc}
            </p>
            <div className="mt-6">
              <span className="text-5xl font-bold">${t.price}</span>
              <span
                className={
                  t.popular
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                }
              >
                /mo
              </span>
            </div>
            <Link
              to="/signup"
              className={`mt-6 block text-center py-3 rounded-full font-semibold ${t.popular ? "bg-card text-foreground" : "bg-gradient-cta text-primary-foreground"}`}
            >
              Get Started
            </Link>
            <ul className="mt-6 space-y-3 text-sm">
              {t.feats.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="size-4 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </section>
      <Footer />
    </div>
  );
}
