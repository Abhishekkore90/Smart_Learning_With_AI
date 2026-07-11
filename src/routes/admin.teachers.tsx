import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  Award,
  Loader2,
  Calendar,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/admin/teachers")({
  head: () => ({ meta: [{ title: "Educator Network — Super Admin" }] }),
  component: TeachersAdmin,
});

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  createdAt: string;
  verified: boolean;
}

function TeachersAdmin() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/teachers", role: "admin" } as any,
      });
      return;
    }

    const fetchTeachers = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "teacher"),
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Teacher,
        );
        setTeachers(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeachers();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#111827]">
      <Header />
      <main className="max-w-[1440px] mx-auto px-6 pt-16 pb-24">
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-[#6C63FF] uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight">
                Educator <span className="text-amber-600">Network.</span>
              </h1>
              <p className="text-[#6B7280] font-medium">
                Verify credentials, monitor onboarding, and manage professional
                educator profiles.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="size-12 text-amber-500 animate-spin" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-400">
              Fetching Educator Data...
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
            {teachers.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10 }}
                className="bg-white rounded-[3rem] p-8 border border-black/5 shadow-soft group hover:border-amber-200 hover:shadow-glow transition-all"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-2xl font-black">
                      {t.fullName[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-tight text-[#111827]">
                        {t.fullName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <Award className="size-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Verified Educator
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-black/5">
                    <div className="flex items-center gap-3 text-slate-500">
                      <Mail className="size-4 text-amber-500" />
                      <span className="text-sm font-bold truncate">
                        {t.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Phone className="size-4 text-amber-500" />
                      <span className="text-sm font-bold">
                        {t.phone || "No contact provided"}
                      </span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-500">
                      <MapPin className="size-4 text-amber-500 mt-0.5" />
                      <span className="text-sm font-bold leading-relaxed">
                        {t.address || "Address not listed"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Calendar className="size-4 text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Joined:{" "}
                        {t.createdAt
                          ? new Date(t.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg hover:shadow-amber-500/20">
                    Review Credentials
                  </button>
                </div>
              </motion.div>
            ))}

            {teachers.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
                <GraduationCap className="size-12 text-slate-300 mx-auto mb-4" />
                <p className="text-lg font-black text-slate-400">
                  No teachers found in the global network.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
