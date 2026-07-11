import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Search,
  GraduationCap,
  Monitor,
  Stethoscope,
  Wrench,
  Building2,
  ShoppingBag,
  Palette,
  Scale,
  Sprout,
  Hotel,
  Plane,
  Trophy,
  Hammer,
  Drama,
  Brain,
  Languages,
  ArrowRight,
  FlaskConical,
  Radio,
  Play,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { StudentHeader } from "@/components/student/StudentHeader";

export const Route = createFileRoute("/courses/catalog")({
  head: () => ({
    meta: [
      { title: "Course Catalog — SMART LEARNING" },
      {
        name: "description",
        content: "Explore specialized domains curated by industry veterans.",
      },
    ],
  }),
  component: () => (
    <ProtectedRoute>
      <CatalogPage />
    </ProtectedRoute>
  ),
});

const cats = [
  // Free Courses
  {
    i: GraduationCap,
    t: "Education",
    d: "Pedagogy, curriculum design, and modern teaching methodologies.",
    c: "142 Courses",
    isFree: true,
  },
  {
    i: Stethoscope,
    t: "Medical",
    d: "Healthcare management, clinical practices, and nursing.",
    c: "89 Courses",
    isFree: true,
  },
  {
    i: Building2,
    t: "Management",
    d: "Business administration, HR, and operations.",
    c: "176 Courses",
    isFree: true,
  },
  {
    i: Palette,
    t: "Arts & Design",
    d: "Fine arts, digital illustration, and graphic design.",
    c: "112 Courses",
    isFree: true,
  },
  {
    i: Scale,
    t: "Laws LLB",
    d: "Corporate law, litigation, and constitutional studies.",
    c: "67 Courses",
    isFree: true,
  },
  {
    i: FlaskConical,
    t: "Science",
    d: "Physics, Biology, and advanced research paths.",
    c: "300+ Labs",
    isFree: true,
    wide: true,
  },
  {
    i: Plane,
    t: "Tourism",
    d: "Destination management and sustainable travel.",
    c: "38 Courses",
    isFree: true,
  },
  {
    i: Hammer,
    t: "Skill Development",
    d: "Vocational training and professional upskilling.",
    c: "245 Courses",
    isFree: true,
  },

  // Paid Courses
  {
    i: Monitor,
    t: "Computer & IT",
    d: "Software development, AI, and Cloud computing.",
    c: "620+ Tracks",
    isFree: false,
    featured: true,
  },
  {
    i: Wrench,
    t: "Engineering",
    d: "Mechanical, Civil, and Electrical engineering.",
    c: "215 Courses",
    isFree: false,
  },
  {
    i: ShoppingBag,
    t: "Commerce",
    d: "Fintech, accounting, and international trade.",
    c: "98 Courses",
    isFree: false,
  },
  {
    i: Radio,
    t: "Social Media",
    d: "Digital reporting, content strategy, and journalism.",
    c: "45 Courses",
    isFree: false,
  },
  {
    i: Sprout,
    t: "Agriculture",
    d: "Sustainable farming and agricultural technology.",
    c: "54 Courses",
    isFree: false,
  },
  {
    i: Hotel,
    t: "Hotel Management",
    d: "Hospitality operations and global service standards.",
    c: "42 Courses",
    isFree: false,
  },
  {
    i: Trophy,
    t: "Sports & Fitness",
    d: "Kinesiology, coaching, and nutrition science.",
    c: "56 Courses",
    isFree: false,
  },
  {
    i: Drama,
    t: "Performing Arts",
    d: "Theater, music production, and modern choreography.",
    c: "71 Courses",
    isFree: false,
  },
  {
    i: Languages,
    t: "Language Study",
    d: "Linguistics, translation, and polyglot training.",
    c: "128 Courses",
    isFree: false,
  },
  {
    i: Sparkles,
    t: "Other/+",
    d: "Miscellaneous and niche fields of knowledge.",
    c: "Various",
    isFree: false,
  },
];

function CatalogPage() {
  const [activeType, setActiveType] = useState<"all" | "free" | "paid">("all");

  return (
    <div className="min-h-screen bg-white">
      <StudentHeader />

      <main className="pt-16 min-h-screen bg-slate-50/50">
        <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">
                Course Catalog
              </h1>
              <p className="text-slate-500 font-medium">
                Explore elite content across {cats.length} specialized domains.
              </p>
            </div>

            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
              {[
                { id: "all", label: "All Content" },
                { id: "free", label: "Free Access" },
                { id: "paid", label: "Premium" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveType(t.id as any)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeType === t.id ? "bg-indigo-600 text-white shadow-xl" : "text-slate-400 hover:text-slate-900"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cats
              .filter((c) => {
                if (activeType === "all") return true;
                return activeType === "free" ? c.isFree : !c.isFree;
              })
              .map((c, i) => (
                <Link
                  key={c.t}
                  to="/courses/$catId"
                  params={{ catId: c.t }}
                  className="h-full"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
                    whileHover={{ y: -8 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:border-indigo-500/20 flex flex-col h-full group transition-all"
                  >
                    <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                      <c.i className="size-7" />
                    </div>
                    <h3 className="font-black text-xl mb-3 group-hover:text-indigo-600 transition-colors italic tracking-tight">
                      {c.t}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-8 flex-1 leading-relaxed">
                      {c.d}
                    </p>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {c.c}
                      </span>
                      {c.isFree ? (
                        <span className="text-emerald-500 text-[10px] font-black tracking-widest uppercase">
                          Free
                        </span>
                      ) : (
                        <span className="text-indigo-600 text-[10px] font-black tracking-widest uppercase">
                          Premium
                        </span>
                      )}
                    </div>
                  </motion.div>
                </Link>
              ))}
          </div>
        </div>
      </main>
    </div>
  );
}
