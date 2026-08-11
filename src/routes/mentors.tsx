import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search, Star, Clock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import q from "@/assets/course-quantum.jpg";
import n from "@/assets/course-neural.jpg";
import d from "@/assets/course-data.jpg";

export const Route = createFileRoute("/mentors")({
  head: () => ({
    meta: [
      { title: "Futuristic Learning — Mentors | Smart Learning With AI" },
      {
        name: "description",
        content:
          "Accelerate your intelligence with 128 curated paths led by world-class mentors.",
      },
    ],
  }),
  component: Page,
});

const courses = [
  {
    img: q,
    lvl: "Advanced",
    lvlColor: "bg-primary",
    title: "Quantum Algorithm Synthesis",
    mentor: "Dr. Aris Thorne",
    rating: 4.9,
    hours: 48,
    price: 299,
  },
  {
    img: n,
    lvl: "Intermediate",
    lvlColor: "bg-purple-600",
    title: "Neural Architecture & Ethics",
    mentor: "Prof. Elena Vance",
    rating: 4.8,
    hours: 32,
    price: 185,
  },
  {
    img: d,
    lvl: "Expert",
    lvlColor: "bg-teal-700",
    title: "Data Cartography 2.0",
    mentor: "Dr. Julian Saro",
    rating: 5.0,
    hours: 60,
    price: 420,
  },
];

function Page() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-card rounded-2xl p-3 shadow-card flex items-center gap-2">
            <Search className="size-4 text-muted-foreground ml-2" />
            <input
              className="bg-transparent outline-none text-sm w-full py-1"
              placeholder="Search courses…"
            />
          </div>
          <div className="bg-card rounded-full p-1 shadow-card grid grid-cols-2 text-sm">
            <button className="bg-gradient-cta text-primary-foreground rounded-full py-2 font-semibold">
              Online
            </button>
            <button className="text-muted-foreground rounded-full py-2 font-semibold">
              Offline
            </button>
          </div>

          <div>
            <h4 className="font-bold mb-3">Categories</h4>
            <div className="space-y-2 text-sm">
              {[
                ["Quantum Computing", false],
                ["Neural Networks", true],
                ["Bio-Engineering", false],
                ["Digital Ethics", false],
              ].map(([l, c]) => (
                <label
                  key={l as string}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    defaultChecked={c as boolean}
                    className="size-4 rounded accent-primary"
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3">Min Rating</h4>
            <input
              type="range"
              min="1"
              max="5"
              defaultValue="3"
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.0</span>
              <span>5.0</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3">Skill Level</h4>
            <div className="flex flex-wrap gap-2">
              {[
                ["Beginner", false],
                ["Advanced", true],
                ["Expert", false],
              ].map(([l, a]) => (
                <button
                  key={l as string}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${a ? "border-primary text-primary bg-accent" : "border-border text-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-3">Price Range</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Min"
              />
              <input
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
                placeholder="Max"
              />
            </div>
          </div>
        </aside>

        {/* Main */}
        <main>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold text-gradient"
              >
                Futuristic Learning
              </motion.h1>
              <p className="text-muted-foreground mt-2">
                Accelerate your intelligence with 128 curated paths.
              </p>
            </div>
            <button className="bg-card border border-border rounded-xl px-4 py-2 text-sm font-medium">
              ≡ Recommended
            </button>
          </div>

          <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -8 }}
                className="bg-card rounded-3xl overflow-hidden shadow-card flex flex-col"
              >
                <div className="relative">
                  <img
                    src={c.img}
                    alt={c.title}
                    loading="lazy"
                    width={640}
                    height={400}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <span
                    className={`absolute top-4 left-4 ${c.lvlColor} text-white text-xs px-3 py-1 rounded-full font-semibold`}
                  >
                    {c.lvl}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between gap-2">
                    <h3 className="text-xl font-bold leading-tight">
                      {c.title}
                    </h3>
                    <div className="flex items-center gap-1 text-primary text-sm font-semibold whitespace-nowrap">
                      <Star className="size-4 fill-current" />
                      {c.rating}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="size-8 rounded-full bg-gradient-primary" />
                    <span className="text-sm">{c.mentor}</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      {c.hours} Hours
                    </div>
                    <div className="text-primary font-bold text-lg">
                      ${c.price}
                    </div>
                  </div>
                  <button className="mt-5 w-full py-2.5 rounded-full text-sm font-semibold bg-accent text-primary hover:bg-gradient-cta hover:text-primary-foreground transition-all">
                    Enroll Now
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
