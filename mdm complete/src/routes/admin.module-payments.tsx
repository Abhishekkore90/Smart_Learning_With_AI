import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  ArrowLeft,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Lock,
  Unlock,
  Save,
  Search,
  Users,
  Sparkles,
  Award,
  Loader2,
  UserCheck,
  Shield,
  Trash2,
  Plus,
  X,
  ChevronRight,
  User,
  Sliders,
  Settings,
  Check,
  AlertCircle,
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

interface UniqueTeacher {
  teacherId: string;
  teacherName: string;
  teacherEmail?: string;
  teacherPhone?: string;
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

function AdminModulePaymentsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"pricing" | "history" | "access">("access");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pricings, setPricings] = useState<Record<string, ModulePricing>>({});
  const [payments, setPayments] = useState<TeacherPaymentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Access grant state
  const [accessRecords, setAccessRecords] = useState<any[]>([]);
  const [usersTeachers, setUsersTeachers] = useState<any[]>([]);
  const [accessSearchTerm, setAccessSearchTerm] = useState("");
  
  // Selected Teacher Modal State
  const [selectedTeacher, setSelectedTeacher] = useState<UniqueTeacher | null>(null);

  // New Teacher Add Form State
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [addingTeacher, setAddingTeacher] = useState(false);

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

    // 3. Fetch admin-granted access records
    const unsubAccess = onSnapshot(collection(db, "teacher_module_access"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAccessRecords(list);
    });

    // 4. Fetch registered teachers from users collection
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "teacher"));
        const snap = await getDocs(q);
        setUsersTeachers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Fetch users error:", e);
      }
    };
    fetchUsers();

    return () => {
      unsubPricing();
      unsubPayments();
      unsubAccess();
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

  // Compile list of unique teachers (grouped by teacherId / Email)
  const teacherMap = new Map<string, UniqueTeacher>();

  // From registered users
  usersTeachers.forEach((u) => {
    const id = u.id || u.email || u.uid;
    if (id) {
      teacherMap.set(id, {
        teacherId: id,
        teacherName: u.name || u.displayName || u.email || id,
        teacherEmail: u.email || "",
        teacherPhone: u.phone || u.phoneNumber || "",
      });
    }
  });

  // From access records
  accessRecords.forEach((a) => {
    if (a.teacherId) {
      const existing = teacherMap.get(a.teacherId);
      if (!existing) {
        teacherMap.set(a.teacherId, {
          teacherId: a.teacherId,
          teacherName: a.teacherName || a.teacherId,
          teacherEmail: a.teacherId.includes("@") ? a.teacherId : "",
        });
      } else if (a.teacherName && existing.teacherName === existing.teacherId) {
        existing.teacherName = a.teacherName;
      }
    }
  });

  // From payments
  payments.forEach((p) => {
    if (p.teacherId) {
      const existing = teacherMap.get(p.teacherId);
      if (!existing) {
        teacherMap.set(p.teacherId, {
          teacherId: p.teacherId,
          teacherName: p.teacherName || p.teacherId,
          teacherEmail: p.teacherEmail || (p.teacherId.includes("@") ? p.teacherId : ""),
          teacherPhone: p.teacherPhone || "",
        });
      }
    }
  });

  const allTeachers = Array.from(teacherMap.values());

  const filteredTeachers = allTeachers.filter((t) => {
    const term = accessSearchTerm.toLowerCase();
    return (
      (t.teacherName || "").toLowerCase().includes(term) ||
      (t.teacherId || "").toLowerCase().includes(term) ||
      (t.teacherEmail || "").toLowerCase().includes(term) ||
      (t.teacherPhone || "").toLowerCase().includes(term)
    );
  });

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

  // Check if specific module is granted to a teacher
  const isModuleGranted = (tId: string, mId: string) => {
    const isAll = accessRecords.some(
      (r) => r.teacherId === tId && r.moduleId === "ALL" && r.status === "GRANTED"
    );
    if (isAll) return true;
    return accessRecords.some(
      (r) => r.teacherId === tId && r.moduleId === mId && r.status === "GRANTED"
    );
  };

  // Check if ALL modules access is granted
  const isAllModulesGranted = (tId: string) => {
    return accessRecords.some(
      (r) => r.teacherId === tId && r.moduleId === "ALL" && r.status === "GRANTED"
    );
  };

  // Count active granted modules for a teacher
  const getActiveModuleCount = (tId: string) => {
    if (isAllModulesGranted(tId)) return DEFAULT_MODULES.length;
    return DEFAULT_MODULES.filter((m) => isModuleGranted(tId, m.id)).length;
  };

  // Toggle individual module access for a teacher
  const handleToggleModuleAccess = async (teacher: UniqueTeacher, moduleId: string, isCurrentlyOn: boolean) => {
    const tId = teacher.teacherId;
    const docKey = `${tId}_${moduleId}`;
    const allDocKey = `${tId}_ALL`;

    try {
      if (isCurrentlyOn) {
        // TURN OFF
        await deleteDoc(doc(db, "teacher_module_access", docKey));

        // If ALL access was ON, remove ALL doc and grant individual access to all OTHER modules
        const allSnap = await getDoc(doc(db, "teacher_module_access", allDocKey));
        if (allSnap.exists()) {
          await deleteDoc(doc(db, "teacher_module_access", allDocKey));
          for (const mod of DEFAULT_MODULES) {
            if (mod.id !== moduleId) {
              const mKey = `${tId}_${mod.id}`;
              await setDoc(doc(db, "teacher_module_access", mKey), {
                id: mKey,
                teacherId: tId,
                teacherName: teacher.teacherName,
                moduleId: mod.id,
                moduleTitle: mod.title,
                status: "GRANTED",
                grantedAt: new Date().toISOString(),
              });
            }
          }
        }
        toast.success(`'${DEFAULT_MODULES.find((m) => m.id === moduleId)?.title || moduleId}' ॲक्सेस बंद केला!`);
      } else {
        // TURN ON
        const modTitle = DEFAULT_MODULES.find((m) => m.id === moduleId)?.title || moduleId;
        await setDoc(doc(db, "teacher_module_access", docKey), {
          id: docKey,
          teacherId: tId,
          teacherName: teacher.teacherName,
          moduleId,
          moduleTitle: modTitle,
          status: "GRANTED",
          grantedAt: new Date().toISOString(),
        });
        toast.success(`'${modTitle}' ॲक्सेस चालू केला!`);
      }
    } catch (err: any) {
      toast.error("ॲक्सेस बदलताना त्रुटी: " + err.message);
    }
  };

  // Toggle ALL modules access for a teacher
  const handleToggleAllModules = async (teacher: UniqueTeacher, isCurrentlyAllOn: boolean) => {
    const tId = teacher.teacherId;
    const allDocKey = `${tId}_ALL`;

    try {
      if (isCurrentlyAllOn) {
        // TURN OFF ALL
        await deleteDoc(doc(db, "teacher_module_access", allDocKey));
        for (const mod of DEFAULT_MODULES) {
          const mKey = `${tId}_${mod.id}`;
          await deleteDoc(doc(db, "teacher_module_access", mKey));
        }
        toast.success(`'${teacher.teacherName}' चे सर्व मॉड्यूल्स बंद केले!`);
      } else {
        // TURN ON ALL
        await setDoc(doc(db, "teacher_module_access", allDocKey), {
          id: allDocKey,
          teacherId: tId,
          teacherName: teacher.teacherName,
          moduleId: "ALL",
          moduleTitle: "सर्व मॉड्यूल्स (All Sections)",
          status: "GRANTED",
          grantedAt: new Date().toISOString(),
        });

        for (const mod of DEFAULT_MODULES) {
          const mKey = `${tId}_${mod.id}`;
          await setDoc(doc(db, "teacher_module_access", mKey), {
            id: mKey,
            teacherId: tId,
            teacherName: teacher.teacherName,
            moduleId: mod.id,
            moduleTitle: mod.title,
            status: "GRANTED",
            grantedAt: new Date().toISOString(),
          });
        }
        toast.success(`'${teacher.teacherName}' ला सर्व मॉड्यूल्सचा मोफत ॲक्सेस दिला!`);
      }
    } catch (err: any) {
      toast.error("त्रुटी: " + err.message);
    }
  };

  // Add new teacher manually
  const handleAddNewTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherId.trim()) {
      toast.error("कृपया शिक्षक आयडी किंवा ई-मेल टाका.");
      return;
    }

    const tId = newTeacherId.trim();
    const tName = newTeacherName.trim() || tId;
    const newT: UniqueTeacher = {
      teacherId: tId,
      teacherName: tName,
      teacherEmail: tId.includes("@") ? tId : "",
    };

    setSelectedTeacher(newT);
    setNewTeacherId("");
    setNewTeacherName("");
    toast.success(`'${tName}' निवडला गेला आहे. आता खालील स्विचेसवरून ॲक्सेस चालू करा!`);
  };

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
                शिक्षकांच्या मॉड्यूल्सचा ॲक्सेस ठरवा, दर नियंत्रित करा व पेमेंट इतिहास पहा
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-3 text-center">
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">एकूण जमा रक्कम</p>
            <p className="text-2xl font-black text-amber-300 mt-0.5">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("access")}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "access"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Shield className="size-4" />
            <span>शिक्षकांचे ॲक्सेस व्यवस्थापन (Teacher Access)</span>
          </button>
          <button
            onClick={() => setActiveTab("pricing")}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "pricing"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <DollarSign className="size-4" />
            <span>मॉड्यूल किंमत सेटिंग्स</span>
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
            <span>पेमेंट इतिहास ({payments.length})</span>
          </button>
        </div>

        {/* ── TAB 1: TEACHER ACCESS MANAGEMENT (ON/OFF TOGGLES UI) ── */}
        {activeTab === "access" && (
          <div className="space-y-6">
            {/* Top Toolbar: Search & Add Teacher */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <UserCheck className="size-5 text-emerald-600" /> शिक्षक खातेनिहाय ॲक्सेस कंट्रोल
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    शिक्षकाच्या खात्यावर क्लिक करा आणि ON/OFF स्विचद्वारे हव्या त्या मॉड्यूल्सचा ॲक्सेस नियंत्रित करा.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="शिक्षक नाव, फोन किंवा ई-मेल शोधा..."
                    value={accessSearchTerm}
                    onChange={(e) => setAccessSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Add Custom Teacher Box */}
              <form
                onSubmit={handleAddNewTeacher}
                className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row items-center gap-3"
              >
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-black shrink-0">
                  <Plus className="size-4 text-emerald-600" />
                  <span>नवीन शिक्षक जोडा:</span>
                </div>
                <input
                  type="text"
                  placeholder="शिक्षक ई-मेल / आयडी (उदा. sanika@gmail.com)*"
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                />
                <input
                  type="text"
                  placeholder="शिक्षकाचे नाव (उदा. सानिका पाटील)"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 w-full"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0 w-full sm:w-auto"
                >
                  जोडा व ॲक्सेस द्या
                </button>
              </form>
            </div>

            {/* Teachers Cards List (UNIQUE 1 CARD PER TEACHER) */}
            <div className="space-y-3">
              {filteredTeachers.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                  <User className="size-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-600">कोणताही शिक्षक आढळला नाही</p>
                  <p className="text-xs text-slate-400 mt-1">वर दिलेल्या फॉर्ममधून नवीन शिक्षक आयडी जोडा.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTeachers.map((teacher) => {
                    const activeCount = getActiveModuleCount(teacher.teacherId);
                    const allGranted = isAllModulesGranted(teacher.teacherId);

                    return (
                      <div
                        key={teacher.teacherId}
                        onClick={() => setSelectedTeacher(teacher)}
                        className={`p-5 rounded-3xl border transition-all cursor-pointer bg-white hover:shadow-md flex items-center justify-between gap-4 group ${
                          allGranted
                            ? "border-emerald-300 bg-emerald-50/30"
                            : activeCount > 0
                            ? "border-blue-200"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`size-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-xs ${
                              allGranted
                                ? "bg-emerald-600 text-white"
                                : activeCount > 0
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {teacher.teacherName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <h4 className="font-black text-sm text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {teacher.teacherName}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-mono font-bold truncate">
                              {teacher.teacherEmail || teacher.teacherPhone || teacher.teacherId}
                            </p>

                            <div className="mt-1.5 flex items-center gap-2">
                              {allGranted ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Sparkles className="size-3" /> सर्व 8 मॉड्यूल्स मोफत ॲक्टिव्ह
                                </span>
                              ) : activeCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                                  <Check className="size-3" /> {activeCount} / 8 मॉड्यूल्स ॲक्टिव्ह
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">
                                  <Lock className="size-3" /> कोणताच ॲक्सेस नाही (Locked)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button className="px-3.5 py-2 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-700 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 shrink-0">
                          <span>व्यवस्थापित करा</span>
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: MODULE PRICING SETTINGS ── */}
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

        {/* ── TAB 3: TEACHER PAYMENTS HISTORY ── */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900">शिक्षक सबस्क्रिप्शन व पेमेंट नोंदणी</h3>
                <p className="text-xs text-slate-500 font-medium">कोणत्या शिक्षकाने कोणत्या मॉड्यूलसाठी पेमेंट केले आहे ते खालीलप्रमाणे:</p>
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

      {/* ── TEACHER ACCESS CONTROL MODAL (ON/OFF TOGGLE SWITCHES PANEL) ── */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl text-amber-300">
                  {selectedTeacher.teacherName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedTeacher.teacherName}</h3>
                  <p className="text-xs font-mono text-blue-200 font-medium">
                    ID: {selectedTeacher.teacherEmail || selectedTeacher.teacherId}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeacher(null)}
                className="p-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-xl transition-all text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Master All Modules Switch */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-200 flex items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full mb-1">
                    <Sparkles className="size-3 text-emerald-700" /> मास्टर कंट्रोल (Master Switch)
                  </span>
                  <h4 className="text-base font-black text-slate-900">सर्व मॉड्यूल्सचा मोफत ॲक्सेस</h4>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    हे चालू केल्यास या शिक्षकाला सर्व 8 मॉड्यूल्सचा पूर्ण मोफत ॲक्सेस मिळेल.
                  </p>
                </div>

                {/* Master Toggle Switch */}
                {(() => {
                  const isAllOn = isAllModulesGranted(selectedTeacher.teacherId);
                  return (
                    <button
                      onClick={() => handleToggleAllModules(selectedTeacher, isAllOn)}
                      className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                        isAllOn ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center font-bold text-[10px] text-slate-700">
                        {isAllOn ? "ON" : "OFF"}
                      </div>
                    </button>
                  );
                })()}
              </div>

              {/* Individual Module Switches Header */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    मॉड्यूलनिहाय ON / OFF स्विचेस (Module Access Toggles):
                  </h4>
                  <span className="text-xs font-black text-blue-700">
                    {getActiveModuleCount(selectedTeacher.teacherId)} / {DEFAULT_MODULES.length} चालू
                  </span>
                </div>

                {/* Modules Grid */}
                <div className="space-y-2.5">
                  {DEFAULT_MODULES.map((mod) => {
                    const isOn = isModuleGranted(selectedTeacher.teacherId, mod.id);
                    const pricing = pricings[mod.id];
                    const priceStr = pricing?.price ? `₹${pricing.price}` : "मोफत";

                    return (
                      <div
                        key={mod.id}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          isOn
                            ? "bg-emerald-50/40 border-emerald-200 shadow-xs"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {mod.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                                isOn
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {priceStr}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            {isOn ? "शिक्षकाला हा विभाग वापरासाठी उपलब्ध आहे" : "पेवॉल चालू (Locked)"}
                          </p>
                        </div>

                        {/* Interactive Toggle Switch Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              isOn ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {isOn ? "चालू (ON)" : "बंद (OFF)"}
                          </span>
                          <button
                            onClick={() => handleToggleModuleAccess(selectedTeacher, mod.id, isOn)}
                            className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer flex items-center ${
                              isOn ? "bg-emerald-600 justify-end" : "bg-slate-300 justify-start"
                            }`}
                          >
                            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-right shrink-0">
              <button
                onClick={() => setSelectedTeacher(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                पूर्ण झाले (Done)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
