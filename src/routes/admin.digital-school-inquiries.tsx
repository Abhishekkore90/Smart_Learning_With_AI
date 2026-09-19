import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Search,
  ChevronLeft,
  Loader2,
  Trash2,
  Clock,
  Phone,
  Mail,
  School,
  FileText,
  MapPin,
  CheckCircle2,
  User,
  Check,
  PhoneCall,
  Calendar,
  AlertCircle,
  Sparkles,
  Award,
  Users,
  ChevronDown,
  ChevronUp,
  Eye,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import {
  fetchAllInquiries,
  updateInquiryStatus,
  deleteInquiryItem,
  type OfflineSchoolInquiry,
} from "@/lib/digitalSchoolInquiryService";

export const Route = createFileRoute("/admin/digital-school-inquiries")({
  head: () => ({ meta: [{ title: "Digital School Offline Inquiries — Super Admin" }] }),
  component: DigitalSchoolInquiriesAdmin,
});

function DigitalSchoolInquiriesAdmin() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<OfflineSchoolInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "contacted">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  useEffect(() => {
    const isAdmin = sessionStorage.getItem("is_super_admin");
    if (!isAdmin) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/digital-school-inquiries", role: "admin" } as any,
      });
      return;
    }
    fetchInquiries();
  }, [navigate]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const list = await fetchAllInquiries();
      setInquiries(list);
    } catch (err) {
      console.error("Error fetching offline school inquiries:", err);
      toast.error("Failed to load offline school inquiries.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkContacted = async (id: string, currentStatus: "pending" | "contacted") => {
    setUpdatingId(id);
    const newStatus = currentStatus === "contacted" ? "pending" : "contacted";
    const contactedAt = newStatus === "contacted" ? new Date().toISOString() : undefined;

    try {
      await updateInquiryStatus(id, newStatus, contactedAt);

      setInquiries((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus, contactedAt: contactedAt } : item
        )
      );

      if (newStatus === "contacted") {
        toast.success("This inquiry is contacted successfully!");
      } else {
        toast.info("Status marked as pending.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update inquiry status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inquiry?")) return;
    try {
      await deleteInquiryItem(id);
      setInquiries((prev) => prev.filter((item) => item.id !== id));
      toast.success("Inquiry deleted successfully.");
    } catch (err) {
      console.error("Error deleting inquiry:", err);
      toast.error("Failed to delete inquiry.");
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      inq.name?.toLowerCase().includes(term) ||
      inq.schoolName?.toLowerCase().includes(term) ||
      inq.phone?.includes(term) ||
      inq.udiseNo?.includes(term) ||
      inq.email?.toLowerCase().includes(term) ||
      inq.selectedPlan?.title?.toLowerCase().includes(term);

    const matchesStatus = filterStatus === "all" || inq.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = inquiries.filter((i) => i.status !== "contacted").length;
  const contactedCount = inquiries.filter((i) => i.status === "contacted").length;

  return (
    <div className="min-h-screen bg-[#FDFDFF] text-[#111827] flex flex-col justify-between">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-24 w-full flex-1">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="size-4" />
            <span>Admin Command Center</span>
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-black uppercase tracking-wider">
            <Monitor className="size-3.5" />
            <span>Digital School Offline</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Digital School Offline Inquiries</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                  {inquiries.length}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
                Manage inquiries, school details, and plan selections submitted for Offline Digital School.
              </p>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-extrabold flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-600" />
                <span>Pending: <strong>{pendingCount}</strong></span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                <span>Contacted: <strong>{contactedCount}</strong></span>
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by school name, contact person, phone, UDISE, or plan..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pending", "contacted"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    filterStatus === st
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {st === "all" ? "All" : st === "pending" ? "Pending" : "Contacted"}
                </button>
              ))}

              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  filteredInquiries.forEach((i) => (all[i.id] = true));
                  setExpandedIds(all);
                }}
                className="px-2.5 py-2 rounded-xl text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer hidden md:flex items-center gap-1"
                title="Expand All to Big Cards"
              >
                <Maximize2 className="size-3.5" />
                <span>सर्व उघडा (Expand All)</span>
              </button>

              <button
                type="button"
                onClick={() => setExpandedIds({})}
                className="px-2.5 py-2 rounded-xl text-[11px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer hidden md:flex items-center gap-1"
                title="Collapse All to Small Cards"
              >
                <Minimize2 className="size-3.5" />
                <span>सर्व संक्षिप्त (Collapse All)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loading offline school inquiries...
            </p>
          </div>
        ) : filteredInquiries.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3 max-w-md mx-auto my-12 shadow-sm">
            <div className="size-14 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center">
              <School className="size-7" />
            </div>
            <h3 className="text-base font-black text-slate-900">No Inquiries Found</h3>
            <p className="text-xs text-slate-500 font-medium">
              {searchTerm || filterStatus !== "all"
                ? "No inquiries match your current search or filter criteria."
                : "No offline school inquiries have been submitted yet."}
            </p>
          </div>
        ) : (
          /* Inquiries List (Small cards by default, Click to show Big card) */
          <div className="space-y-4">
            {filteredInquiries.map((inq) => {
              const isContacted = inq.status === "contacted";
              const isUpdating = updatingId === inq.id;
              const isExpanded = !!expandedIds[inq.id];

              return (
                <motion.div
                  key={inq.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl border-2 transition-all shadow-sm overflow-hidden ${
                    isContacted
                      ? "border-emerald-500/80 shadow-emerald-50"
                      : "border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {/* ========================================================= */}
                  {/* 1. COMPACT / SMALL CARD VIEW (DEFAULT)                    */}
                  {/* ========================================================= */}
                  {!isExpanded ? (
                    <div
                      onClick={() => toggleExpand(inq.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors group"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-black font-mono">
                            UDISE: {inq.udiseNo || "N/A"}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center gap-1 ${
                              isContacted
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-amber-100 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {isContacted ? (
                              <>
                                <Check className="size-3 stroke-[3]" />
                                <span>Contacted</span>
                              </>
                            ) : (
                              <>
                                <Clock className="size-3" />
                                <span>Pending Call</span>
                              </>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-400 font-bold ml-1">
                            {new Date(inq.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${isContacted ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-600"}`}>
                            <School className="size-4" />
                          </div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                            {inq.schoolName}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600 font-semibold pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <User className="size-3.5 text-slate-400" />
                            <strong className="text-slate-800">{inq.name}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3.5 text-slate-400" />
                            <span>{inq.phone}</span>
                          </span>
                          {inq.selectedPlan && (
                            <span className="flex items-center gap-1 text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Award className="size-3 text-amber-500" />
                              <span>{inq.selectedPlan.title}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(inq.id);
                          }}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <span>सविस्तर पहा (View Details)</span>
                          <ChevronDown className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ========================================================= */
                    /* 2. EXPANDED / BIG CARD VIEW (SHOWN WHEN USER CLICKS)      */
                    /* ========================================================= */
                    <div className="space-y-0">
                      {/* === SUCCESS BANNER ABOVE OF THAT FORM AS REQUESTED BY USER === */}
                      {isContacted && (
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-inner">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                              <Check className="size-4 stroke-[3] text-white" />
                            </div>
                            <div>
                              <strong className="text-xs sm:text-sm font-black tracking-wide block">
                                This inquiry is contacted successfully
                              </strong>
                              <span className="text-[10px] text-emerald-100 font-semibold block">
                                या चौकशीसाठी शाळेला कॉल/संपर्क यशस्वीरित्या केला गेला आहे.
                              </span>
                            </div>
                          </div>

                          {inq.contactedAt && (
                            <div className="text-[10px] font-bold bg-white/15 px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                              <Calendar className="size-3" />
                              <span>Contacted on: {new Date(inq.contactedAt).toLocaleString("en-IN")}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Top Collapse Bar */}
                      <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                          <Eye className="size-3.5 text-indigo-600" />
                          <span>सविस्तर माहिती (Full Detailed View)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpand(inq.id)}
                          className="px-3 py-1 bg-white hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-black flex items-center gap-1.5 border border-slate-200 shadow-sm cursor-pointer transition-colors"
                        >
                          <span>संक्षिप्त करा (Collapse)</span>
                          <ChevronUp className="size-3.5" />
                        </button>
                      </div>

                      {/* Main Inquiry Card Body */}
                      <div className="p-6 sm:p-8 space-y-6">
                        {/* Top Row: School & Plan Info */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-black font-mono">
                                UDISE: {inq.udiseNo || "N/A"}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase ${
                                  isContacted
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-amber-100 text-amber-800 border border-amber-300"
                                }`}
                              >
                                {isContacted ? "Contacted" : "Pending Call"}
                              </span>
                            </div>

                            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
                              <School className="size-5 text-indigo-600 shrink-0" />
                              <span>{inq.schoolName}</span>
                            </h2>

                            <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                              <Clock className="size-3.5 text-slate-400" />
                              <span>Submitted on: {new Date(inq.createdAt).toLocaleString("en-IN")}</span>
                            </p>
                          </div>

                          {/* Selected Plan Badge */}
                          {inq.selectedPlan && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:text-right min-w-[200px] space-y-1">
                              <div className="flex items-center sm:justify-end gap-1.5">
                                <Award className="size-3.5 text-amber-500" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  Selected Plan
                                </span>
                              </div>
                              <div className="font-black text-slate-900 text-sm">
                                {inq.selectedPlan.title}
                              </div>
                              <div className="text-xs font-black text-blue-600">
                                {inq.selectedPlan.price} {inq.selectedPlan.period}
                              </div>
                              {inq.selectedPlan.studentsCount && (
                                <div className="text-[10px] text-slate-500 font-bold">
                                  Capacity: {inq.selectedPlan.studentsCount}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Person Name */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <User className="size-3 text-indigo-600" />
                              <span>Contact Person</span>
                            </span>
                            <p className="text-xs font-black text-slate-900">{inq.name}</p>
                          </div>

                          {/* Phone Number with Click-to-Call */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Phone className="size-3 text-indigo-600" />
                              <span>Phone / Mobile</span>
                            </span>
                            <p className="text-xs font-black text-slate-900 font-mono select-all">
                              {inq.phone}
                            </p>
                          </div>

                          {/* Email Address */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Mail className="size-3 text-indigo-600" />
                              <span>Email Address</span>
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {inq.email ? (
                                <a href={`mailto:${inq.email}`} className="hover:text-indigo-600 hover:underline">
                                  {inq.email}
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">Not provided</span>
                              )}
                            </p>
                          </div>

                          {/* School Address */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 sm:col-span-2 lg:col-span-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="size-3 text-indigo-600" />
                              <span>School Address</span>
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-relaxed">
                              {inq.schoolAddress}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Actions Row */}
                        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                          {/* User Call & Contacted Button */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMarkContacted(inq.id, inq.status)}
                              disabled={isUpdating}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                                isContacted
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                              }`}
                            >
                              {isUpdating ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : isContacted ? (
                                <CheckCircle2 className="size-3.5 text-emerald-600" />
                              ) : (
                                <PhoneCall className="size-3.5" />
                              )}
                              <span>
                                {isContacted ? "Mark as Pending" : "Mark as Contacted (संपर्क झाला)"}
                              </span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            {/* Collapse Button */}
                            <button
                              onClick={() => toggleExpand(inq.id)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ChevronUp className="size-3.5" />
                              <span>कमी करा (Collapse)</span>
                            </button>

                            {/* Delete Inquiry Button */}
                            <button
                              onClick={() => handleDeleteInquiry(inq.id)}
                              className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
