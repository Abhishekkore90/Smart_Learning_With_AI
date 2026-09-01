import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Search,
  ChevronLeft,
  Loader2,
  Trash2,
  Clock,
  Send,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  User,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contact-messages")({
  head: () => ({ meta: [{ title: "Website Contact Messages — Super Admin" }] }),
  component: ContactMessagesAdmin,
});

interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  type: string;
  message: string;
  createdAt: string;
  status?: string;
}

function ContactMessagesAdmin() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/contact-messages", role: "admin" } as any,
      });
      return;
    }
    fetchInquiries();
  }, [navigate]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "contact_inquiries"));
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ContactInquiry[];
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setInquiries(list);
    } catch (err) {
      console.error("Error fetching contact inquiries:", err);
      toast.error("Failed to load contact messages.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, "contact_inquiries", id));
      setInquiries((prev) => prev.filter((item) => item.id !== id));
      toast.success("Message deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete message.");
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch =
      !searchTerm ||
      inq.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inq.message?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || inq.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827]">
      <Header />

      <main className="max-w-[1600px] mx-auto px-8 pt-16 pb-24">
        {/* Navigation & Header */}
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-sm font-black text-[#6B7280] hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Hub
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest">
                <MessageSquare className="size-4" />
                <span>Customer Communications ({inquiries.length})</span>
              </div>
              <h1 className="text-5xl font-black tracking-tighter">
                Website <span className="text-indigo-600">Contact Messages.</span>
              </h1>
              <p className="text-[#6B7280] text-sm font-medium">
                Dedicated inbox for customer inquiries, feedback, and support requests submitted via website Contact Us form.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search messages by name, email, text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-6 py-4 bg-white border border-black/5 rounded-[1.5rem] outline-none focus:border-indigo-600/30 transition-all text-sm font-medium w-80 shadow-sm"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-6 py-4 bg-white border border-black/5 rounded-[1.5rem] outline-none focus:border-indigo-600/30 text-xs font-black uppercase tracking-wider shadow-sm appearance-none cursor-pointer"
              >
                <option value="all">All Inquiry Types</option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Institutional Partnership">Partnerships</option>
                <option value="Technical Support">Technical Support</option>
                <option value="Career Opportunities">Careers</option>
              </select>
            </div>
          </div>
        </div>

        {/* Messages List / Cards */}
        <div className="bg-white rounded-[3.5rem] border border-black/5 shadow-soft p-8 md:p-12">
          {loading ? (
            <div className="p-32 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                <Loader2 className="size-16 animate-spin text-indigo-600 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Mail className="size-6 text-indigo-600" />
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600 animate-pulse">
                Fetching Customer Messages...
              </p>
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="p-24 text-center space-y-4">
              <div className="size-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Mail className="size-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">No Messages Found</h3>
              <p className="text-slate-500 text-sm font-medium">
                अद्याप एकही संदेश आलेला नाही किंवा फिल्टर जुळत नाही. (No customer messages received yet matching your search.)
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {filteredInquiries.map((inq, idx) => (
                  <motion.div
                    key={inq.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-slate-50 border border-slate-200/80 rounded-[2.2rem] p-7 flex flex-col justify-between gap-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center text-sm shadow-md">
                            {inq.name ? inq.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-base leading-tight">
                              {inq.name}
                            </h3>
                            <a
                              href={`mailto:${inq.email}`}
                              className="text-xs font-bold text-indigo-600 hover:underline tracking-tight block mt-0.5"
                            >
                              {inq.email}
                            </a>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteInquiry(inq.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="Delete Message"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-100/70 border border-indigo-200/60 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                        <span>{inq.type || "General Inquiry"}</span>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-inner">
                        <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                          "{inq.message}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-3 border-t border-slate-200/80">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        <span>{inq.createdAt ? new Date(inq.createdAt).toLocaleString() : "Recently"}</span>
                      </div>
                      <a
                        href={`mailto:${inq.email}?subject=Re: ${inq.type || 'SGK Brainova Inquiry'}`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Send className="size-3" /> Reply Email
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
