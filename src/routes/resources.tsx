import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Video, FileText, Mic } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/resources")({
  head: () => ({ meta: [{ title: "Resources — Smart Learning With AI" }] }),
  component: Page,
});

const items = [
  { i: BookOpen, t: "eBooks Library", d: "200+ titles from leading authors." },
  {
    i: Video,
    t: "Masterclasses",
    d: "Recorded sessions with industry pioneers.",
  },
  { i: FileText, t: "Whitepapers", d: "Cutting-edge research and insights." },
  {
    i: Mic,
    t: "Podcast Archive",
    d: "Conversations with the architects of tomorrow.",
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
          <span className="text-gradient">Resources</span> for Visionaries
        </motion.h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Curated knowledge to fuel your evolution.
        </p>
      </section>
      <section className="px-6 max-w-6xl mx-auto pb-20 grid md:grid-cols-2 gap-6">
        {items.map((r, i) => (
          <motion.div
            key={r.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-card rounded-3xl p-8 shadow-card flex gap-5"
          >
            <div className="size-14 rounded-2xl bg-gradient-cta flex items-center justify-center shrink-0">
              <r.i className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-xl">{r.t}</h3>
              <p className="text-muted-foreground mt-2">{r.d}</p>
              <button className="mt-4 text-primary font-semibold text-sm">
                Explore →
              </button>
            </div>
          </motion.div>
        ))}
      </section>
      <Footer />
    </div>
  );
}
