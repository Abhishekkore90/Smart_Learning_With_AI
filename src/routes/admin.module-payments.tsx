import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
  Search,
  Filter,
  Users,
  Calendar,
  Sparkles,
  Award,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/module-payments")({
  component: AdminModulePaymentsPage,
});

interface ModulePricing {
  id: string;
  title: string;
  price: number;
  enabled: boolean;
  features?: string[];
  validityDays?: number;
  description?: string;
  upiId?: string;
  qrImageUrl?: string;
}

interface TeacherPaymentRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhone: string;
  moduleId: string;
  moduleTitle: string;
  amount: number;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  paymentMethod?: string;
  utrNumber?: string;
  status: string;
  paidAt: string;
  expiresAt?: string;
}

const DEFAULT_MODULES: { id: string; title: string; defaultPrice: number }[] = [
  { id: "cce-result", title: "सातत्यपूर्ण सर्वंकष मूल्यांकन नोंदवही (CCE Evaluation)", defaultPrice: 199 },
  { id: "mdm-register", title: "माध्यान्ह भोजन योजना नोंदवही (MDM Register)", defaultPrice: 149 },
  { id: "meeting-register", title: "माता-पालक व शिक्षक सभा नोंदवही (Meeting Register)", defaultPrice: 99 },
  { id: "sqaf-register", title: "शालेय गुणवत्ता आश्वासन व प्रमाणीकरण (SQAAF)", defaultPrice: 299 },
  { id: "question-bank", title: "प्रश्नपेढी व्यवस्थापन (Question Bank Generator)", defaultPrice: 149 },
  { id: "academic-planning", title: "वार्षिक व मासिक नियोजन (Academic Planning)", defaultPrice: 99 },
  { id: "paripath", title: "दैनिक परिपाठ (Daily Assembly)", defaultPrice: 0 },
  { id: "timetable", title: "वेळापत्रक व्यवस्थापन (School Timetable)", defaultPrice: 0 },
];

export function AdminModulePaymentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pricing" | "history">("pricing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pricings, setPricings] = useState<Record<string, ModulePricing>>({});
  const [payments, setPayments] = useState<TeacherPaymentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // 1. Fetch module pricing
    const unsubPricing = onSnapshot(collection(db, "cce_module_pricing"), (snap) => {
      const map: Record<string, ModulePricing> = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data() as ModulePricing;
      });

      // Fill defaults if missing
      DEFAULT_MODULES.forEach((mod) => {
        if (!map[mod.id]) {
          map[mod.id] = {
            id: mod.id,
            title: mod.title,
            price: mod.defaultPrice,
            enabled: mod.defaultPrice > 0,
            features: [
              "अन्लिमिटेड CCE डेटा जनरेशन",
              "PDF & एक्सेल रिपोर्ट डाऊनलोड",
              "सुरक्षित क्लाऊड बॅकअप",
            ],
            validityDays: 365,
          };
        }
      });
      setPricings(map);
      setLoading(false);
    });

    // 2. Fetch teacher payment records
    const unsubPayments = onSnapshot(collection(db, "teacher_module_payments"), (snap) => {
      const list: TeacherPaymentRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TeacherPaymentRecord[];

      list.sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime());
      setPayments(list);
    });

    return () => {
      unsubPricing();
      unsubPayments();
    };
  }, []);

  const handlePriceChange = (id: string, price: number) => {
    setPricings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        price: Math.max(0, price),
        enabled: price > 0 ? (prev[id]?.enabled ?? true) : false,
      },
    }));
  };

  const handleToggleEnable = (id: string, enabled: boolean) => {
    setPricings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        enabled,
      },
    }));
  };

  const handleSavePricing = async (modId: string) => {
    const item = pricings[modId];
    if (!item) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "cce_module_pricing", modId), item, { merge: true });
      toast.success(`'${item.title}' चे दर यशस्वीरित्या जतन झाले!`);
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const handleSaveAllPricing = async () => {
    setSaving(true);
    try {
      for (const [modId, item] of Object.entries(pricings)) {
        await setDoc(doc(db, "cce_module_pricing", modId), item, { merge: true });
      }
      toast.success("सर्व मॉड्यूल्सचे दर यशस्वीरित्या जतन झाले!");
    } catch (err: any) {
      toast.error("जतन अयशस्वी: " + err.message);
    }
    setSaving(false);
  };

  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.teacherName || "").toLowerCase().includes(term) ||
      (p.teacherPhone || "").toLowerCase().includes(term) ||
      (p.moduleTitle || "").toLowerCase().includes(term) ||
      (p.razorpayPaymentId || "").toLowerCase().includes(term)
    );
  });

  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 font-sans p-4 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: "/admin" })}
              className="p-3 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl transition-all cursor-pointer text-white flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="size-6" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <CreditCard className="size-8 text-amber-300" /> पर्याय व पेमेंट व्यवस्थापन
              </h1>
              <p className="text-xs sm:text-sm text-blue-200 font-medium mt-1">
                शिक्षक विभागातील मॉड्यूल्सची किंमत ठरवा व पेमेंट इतिहास पहा
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 text-center">
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">एकूण जमा रक्कम</p>
            <p className="text-2xl font-black text-amber-300 mt-0.5">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <button
            onClick={() => setActiveTab("pricing")}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "pricing"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <DollarSign className="size-4" />
            <span>मॉड्यूल किंमत ठरवा (Module Price Settings)</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "history"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="size-4" />
            <span>शिक्षक पेमेंट इतिहास ({payments.length})</span>
          </button>
        </div>

        {/* ── TAB 1: MODULE PRICING SETTINGS ── */}
        {activeTab === "pricing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h3 className="text-base font-black text-slate-800">मॉड्यूलनिहाय दर (Pricing Matrix)</h3>
                <p className="text-xs text-slate-500 font-medium">₹0 ठेवल्यास ते मॉड्यूल सर्व शिक्षकांना मोफत उपलब्ध राहील.</p>
              </div>
              <button
                onClick={handleSaveAllPricing}
                disabled={saving}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>सर्व दर जतन करा (Save All)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_MODULES.map((mod) => {
                const item = pricings[mod.id] || {
                  id: mod.id,
                  title: mod.title,
                  price: mod.defaultPrice,
                  enabled: mod.defaultPrice > 0,
                  validityDays: 365,
                };

                return (
                  <div
                    key={mod.id}
                    className={`p-6 bg-white rounded-3xl border transition-all space-y-4 shadow-sm ${
                      item.enabled && item.price > 0
                        ? "border-blue-300 ring-2 ring-blue-500/10"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            item.enabled && item.price > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.enabled && item.price > 0 ? (
                            <>
                              <Lock className="size-3" /> पेड सबस्क्रिप्शन
                            </>
                          ) : (
                            <>
                              <Unlock className="size-3" /> मोफत (FREE)
                            </>
                          )}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-1.5 leading-snug">{item.title}</h4>
                      </div>

                      {/* Toggle Paywall */}
                      <button
                        onClick={() => handleToggleEnable(mod.id, !item.enabled)}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                          item.enabled
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {item.enabled ? "पेवॉल चालू" : "पेवॉल बंद"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">दर (रु. मध्ये)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => handlePriceChange(mod.id, parseInt(e.target.value) || 0)}
                            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-extrabold text-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-extrabold text-slate-600 block mb-1">वैधता (दिवस)</label>
                        <input
                          type="number"
                          min="1"
                          value={item.validityDays || 365}
                          onChange={(e) =>
                            setPricings((prev) => ({
                              ...prev,
                              [mod.id]: { ...prev[mod.id], validityDays: parseInt(e.target.value) || 365 },
                            }))
                          }
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-extrabold text-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    {/* UPI ID Configuration */}
                    <div className="pt-1">
                      <label className="text-[11px] font-extrabold text-slate-600 block mb-1">UPI ID (QR स्कॅनर साठी)</label>
                      <input
                        type="text"
                        placeholder="उदा. example@upi, example@ybl"
                        value={item.upiId || ""}
                        onChange={(e) =>
                          setPricings((prev) => ({
                            ...prev,
                            [mod.id]: { ...prev[mod.id], upiId: e.target.value },
                          }))
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-extrabold text-slate-900 outline-none font-mono"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleSavePricing(mod.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="size-3.5" />
                        <span>जतन करा</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: TEACHER PAYMENTS HISTORY ── */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">शिक्षक सबस्क्रिप्शन व पेमेंट नोंदणी</h3>
                <p className="text-xs text-slate-500 font-medium">कोणत्या शिक्षकाने कोणत्या मॉड्यूलसाठी रेझरपे द्वारे पेमेंट केले आहे ते खालीलप्रमाणे:</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="शिक्षक नाव, फोन किंवा आयडी..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CreditCard className="size-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">कोणतीही पेमेंट नोंद आढळली नाही</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-medium">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <th className="p-3">#</th>
                      <th className="p-3">शिक्षकाचे नाव</th>
                      <th className="p-3">मॉड्यूल</th>
                      <th className="p-3">रक्कम</th>
                      <th className="p-3">पेमेंट पद्धत</th>
                      <th className="p-3">Ref / Payment ID</th>
                      <th className="p-3">दिनांक</th>
                      <th className="p-3">स्टेटस</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-semibold">
                    {filteredPayments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{p.teacherName || "शिक्षक"}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{p.teacherPhone || p.teacherEmail || p.teacherId}</p>
                        </td>
                        <td className="p-3 font-bold text-blue-900">{p.moduleTitle || p.moduleId}</td>
                        <td className="p-3 font-black text-emerald-700">₹{p.amount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                            p.paymentMethod === "UPI_QR" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                          }`}>
                            {p.paymentMethod === "UPI_QR" ? "UPI QR" : "Razorpay"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600">
                          {p.utrNumber ? `UTR: ${p.utrNumber}` : p.razorpayPaymentId}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("mr-IN") : "-"}
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-black inline-flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> यशस्वी
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
