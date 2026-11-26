import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
// @ts-ignore
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { processRazorpayPayment } from "@/lib/razorpayService";
import { toast } from "sonner";
import { ArrowLeft, CreditCard, Loader2, Lock, ShieldCheck, X } from "lucide-react";

interface GlobalStudentMeta {
  id: string;
  className: string;
  sortKey: string;
}

interface CCEQuotaContextValue {
  totalTeacherStudents: number;
  freeQuota: number;
  perStudentPrice: number;
  effectiveQuota: number;
  remainingStudents: number;
  remainingAmount: number;
  isAdminGranted: boolean;
  unlockedStudentIds: Set<string>;
  isStudentUnlocked: (studentId?: string) => boolean;
  requireStudentAccess: (studentId?: string) => boolean;
  openPaymentAlert: () => void;
}

const CCEQuotaContext = createContext<CCEQuotaContextValue | null>(null);

export function useCCEQuota(): CCEQuotaContextValue {
  const ctx = useContext(CCEQuotaContext);
  if (!ctx) {
    return {
      totalTeacherStudents: 0,
      freeQuota: 5,
      perStudentPrice: 5,
      effectiveQuota: 5,
      remainingStudents: 0,
      remainingAmount: 0,
      isAdminGranted: true,
      unlockedStudentIds: new Set<string>(),
      isStudentUnlocked: () => true,
      requireStudentAccess: () => true,
      openPaymentAlert: () => {},
    };
  }
  return ctx;
}

export function CCEQuotaProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const teacherId = getTeacherId(user, profile);

  const [globalStudents, setGlobalStudents] = useState<GlobalStudentMeta[]>([]);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [perStudentPrice, setPerStudentPrice] = useState<number>(5);
  const [freeQuota, setFreeQuota] = useState<number>(5);
  const [isAdminGranted, setIsAdminGranted] = useState<boolean>(false);

  const [modalStep, setModalStep] = useState<"closed" | "alert" | "payment">("closed");
  const [paying, setPaying] = useState<boolean>(false);

  useEffect(() => {
    if (!teacherId) return;

    let unsubPayment: (() => void) | undefined;
    let unsubPricing: (() => void) | undefined;
    let unsubAccess: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;
    let unsubStudents: (() => void) | undefined;

    const userKeys = Array.from(
      new Set(
        [
          teacherId,
          user?.uid,
          user?.email,
          profile?.id,
          profile?.email,
          localStorage.getItem("teacher_email"),
          localStorage.getItem("user_email"),
        ].filter((k): k is string => Boolean(k))
      )
    );

    const mergeGlobalStudents = (uMap: Map<string, GlobalStudentMeta>, sMap: Map<string, GlobalStudentMeta>) => {
      const combined = new Map<string, GlobalStudentMeta>([...uMap.entries(), ...sMap.entries()]);
      const list = Array.from(combined.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      setGlobalStudents(list);
    };

    try {
      unsubPayment = onSnapshot(doc(db, "teacher_module_payments", `${teacherId}_cce-result`), (snap) => {
        setPaymentRecord(snap.exists() ? snap.data() : null);
      });

      let isPaywallDisabled = false;
      unsubPricing = onSnapshot(doc(db, "cce_module_pricing", "cce-result"), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.perStudentPrice === "number") setPerStudentPrice(data.perStudentPrice);
          if (typeof data.freeStudentQuota === "number") setFreeQuota(data.freeStudentQuota);
          if (data.enabled === false || data.price === 0 || data.perStudentPrice === 0) {
            isPaywallDisabled = true;
            setIsAdminGranted(true);
          }
        }
      });

      unsubAccess = onSnapshot(collection(db, "teacher_module_access"), (snap) => {
        const isGranted = snap.docs.some((docSnap) => {
          const data = docSnap.data();
          const matchesUser = data && userKeys.some((k) => k === data.teacherId || k === data.teacherEmail);
          const matchesMod = data.moduleId === "cce-result" || data.moduleId === "ALL";
          return matchesUser && matchesMod && data.status === "GRANTED";
        });
        const isSuperAdmin = (user as any)?.role === "admin" || localStorage.getItem("is_super_admin") === "true";
        setIsAdminGranted(isGranted || isSuperAdmin || isPaywallDisabled);
      });

      const qUsers = query(collection(db, "users"), where("role", "==", "student"));
      unsubUsers = onSnapshot(qUsers, (snapUsers) => {
        const uMap = new Map<string, GlobalStudentMeta>();
        snapUsers.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const sTeacher = data.teacherId || data.createdById || data.userId;
          if (sTeacher && userKeys.includes(sTeacher)) {
            const ts = String(data.createdAt || data.updatedAt || docSnap.id);
            uMap.set(docSnap.id, {
              id: docSnap.id,
              className: String(data.class || data.className || ""),
              sortKey: `${ts}_${docSnap.id}`,
            });
          }
        });

        const qStudents = query(collection(db, "students"));
        unsubStudents = onSnapshot(qStudents, (snapStudents) => {
          const sMap = new Map<string, GlobalStudentMeta>();
          snapStudents.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const sTeacher = data.teacherId || data.createdById || data.userId;
            if (sTeacher && userKeys.includes(sTeacher)) {
              const ts = String(data.createdAt || data.updatedAt || docSnap.id);
              sMap.set(docSnap.id, {
                id: docSnap.id,
                className: String(data.class || data.className || ""),
                sortKey: `${ts}_${docSnap.id}`,
              });
            }
          });
          mergeGlobalStudents(uMap, sMap);
        });
      });
    } catch (e) {
      console.warn("CCEQuotaProvider listener error:", e);
    }

    return () => {
      if (unsubPayment) unsubPayment();
      if (unsubPricing) unsubPricing();
      if (unsubAccess) unsubAccess();
      if (unsubUsers) unsubUsers();
      if (unsubStudents) unsubStudents();
    };
  }, [teacherId, user, profile]);

  const totalTeacherStudents = globalStudents.length;
  const isPaidUser = paymentRecord && paymentRecord.status === "SUCCESS";
  const paidQuota = isPaidUser
    ? (paymentRecord.paidQuota || paymentRecord.studentsCount || Math.floor((paymentRecord.amount || 0) / (perStudentPrice || 5)) || 0)
    : 0;
  const effectiveQuota = isPaidUser ? Math.max(freeQuota, paidQuota) : freeQuota;

  const unlockedStudentIds = useMemo(() => {
    const set = new Set<string>();
    globalStudents.slice(0, effectiveQuota).forEach((s) => set.add(s.id));
    return set;
  }, [globalStudents, effectiveQuota]);

  const remainingStudents = Math.max(0, totalTeacherStudents - effectiveQuota);
  const remainingAmount = remainingStudents * perStudentPrice;

  const isStudentUnlocked = (studentId?: string): boolean => {
    if (isAdminGranted || !studentId) return true;
    return unlockedStudentIds.has(studentId);
  };

  const requireStudentAccess = (studentId?: string): boolean => {
    if (isStudentUnlocked(studentId)) return true;
    setModalStep("alert");
    return false;
  };

  const openPaymentAlert = () => {
    setModalStep("alert");
  };

  const handlePayNow = async () => {
    if (remainingStudents <= 0 || remainingAmount <= 0 || paying) {
      setModalStep("closed");
      return;
    }
    setPaying(true);
    try {
      const teacherName = localStorage.getItem("teacher_name") || localStorage.getItem("user_name") || "शिक्षक";
      const teacherEmail = localStorage.getItem("teacher_email") || "";
      const teacherPhone = localStorage.getItem("teacher_phone") || "";

      await processRazorpayPayment({
        amount: remainingAmount,
        moduleId: "cce-result",
        moduleTitle: `अतिरिक्त ${remainingStudents} विद्यार्थी कोटा`,
        teacherName,
        teacherEmail,
        teacherPhone,
        onSuccess: async (paymentId) => {
          try {
            const paymentDocKey = `${teacherId}_cce-result`;
            const newQuota = Math.max(totalTeacherStudents, effectiveQuota + remainingStudents);
            const newAmount = (paymentRecord?.amount || 0) + remainingAmount;

            await setDoc(
              doc(db, "teacher_module_payments", paymentDocKey),
              {
                id: paymentDocKey,
                teacherId,
                teacherName,
                teacherEmail,
                teacherPhone,
                moduleId: "cce-result",
                moduleTitle: "CCE निकाल (CCE Result)",
                paidQuota: newQuota,
                studentsCount: newQuota,
                amount: newAmount,
                lastPaymentAmount: remainingAmount,
                lastUpgradeAt: new Date().toISOString(),
                status: "SUCCESS",
                freeQuota,
                perStudentRate: perStudentPrice,
                paymentMethod: "RAZORPAY",
                razorpayPaymentId: paymentId,
              },
              { merge: true }
            );
            toast.success(`₹${remainingAmount} पेमेंट यशस्वी! सर्व ${newQuota} विद्यार्थी आता अनलॉक झाले आहेत.`);
            setModalStep("closed");
          } catch (err: any) {
            toast.error("पेमेंट सेव्ह करताना त्रुटी आली: " + err.message);
          } finally {
            setPaying(false);
          }
        },
        onError: (err) => {
          setPaying(false);
          toast.error(typeof err === "string" ? err : "पेमेंट रद्द किंवा अयशस्वी झाले.");
        },
      });
    } catch (err: any) {
      setPaying(false);
      toast.error(err?.message || "पेमेंट प्रक्रिया सुरू होऊ शकली नाही.");
    }
  };

  return (
    <CCEQuotaContext.Provider
      value={{
        totalTeacherStudents,
        freeQuota,
        perStudentPrice,
        effectiveQuota,
        remainingStudents,
        remainingAmount,
        isAdminGranted,
        unlockedStudentIds,
        isStudentUnlocked,
        requireStudentAccess,
        openPaymentAlert,
      }}
    >
      {children}

      {/* Per-Student Alert -> Proceed -> Payment Window */}
      {modalStep !== "closed" && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans select-none">
          {modalStep === "alert" ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-6 text-center relative">
                <button
                  type="button"
                  onClick={() => setModalStep("closed")}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl border border-white/30 mb-2 text-2xl">
                  👨‍🎓
                </div>
                <h3 className="text-xl font-black tracking-tight">
                  तुम्ही एकूण {totalTeacherStudents} विद्यार्थी जोडले आहेत!
                </h3>
                <p className="text-xs text-amber-50 font-bold mt-1">
                  You added {totalTeacherStudents} students in total
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-sm text-slate-800 font-bold leading-relaxed">
                  <p>
                    🎁 पहिले <span className="text-emerald-700 font-black">{freeQuota} विद्यार्थी</span> सर्व मॉड्यूल्समध्ये पूर्णपणे मोफत आहेत.
                    {effectiveQuota > freeQuota && (
                      <> (आधीचे अनलॉक केलेले मिळून <span className="text-blue-700 font-black">{effectiveQuota} विद्यार्थी</span> अनलॉक आहेत.)</>
                    )}
                  </p>
                  <p>
                    तुम्ही एकूण <span className="text-slate-950 font-black">{totalTeacherStudents} विद्यार्थी</span> जोडले आहेत, त्यामुळे उर्वरित{" "}
                    <span className="text-blue-700 font-black">{remainingStudents} विद्यार्थ्यांसाठी</span> तुम्हाला{" "}
                    <span className="text-emerald-700 font-black text-base">₹{remainingAmount}</span> ({remainingStudents} × ₹{perStudentPrice}) भरावे लागतील.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <span className="text-[11px] font-bold text-slate-500 block">एकूण विद्यार्थी</span>
                    <span className="text-lg font-black text-slate-900">{totalTeacherStudents}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <span className="text-[11px] font-bold text-emerald-700 block">मोफत / अनलॉक</span>
                    <span className="text-lg font-black text-emerald-700">{effectiveQuota}</span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                    <span className="text-[11px] font-bold text-blue-700 block">देय रक्कम</span>
                    <span className="text-lg font-black text-blue-700">₹{remainingAmount}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalStep("closed")}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl cursor-pointer"
                  >
                    मागे जा
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStep("payment")}
                    className="flex-1 py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-[0.99]"
                  >
                    पुढे जा — ₹{remainingAmount} भरा (Proceed)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 text-white p-6 text-center relative">
                <button
                  type="button"
                  onClick={() => setModalStep("alert")}
                  className="absolute top-4 left-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>मागे जा</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalStep("closed")}
                  className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
                >
                  <X className="size-4" />
                </button>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl border border-white/20 mb-2">
                  <Lock className="size-7 text-amber-300" />
                </div>
                <h3 className="text-xl font-black">पेमेंट विंडो (CCE विद्यार्थी अनलॉक)</h3>
                <p className="text-xs text-blue-100 font-medium mt-1">
                  {remainingStudents} अतिरिक्त विद्यार्थी × ₹{perStudentPrice} = ₹{remainingAmount}
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 block">एकूण देय रक्कम</span>
                    <span className="text-2xl font-black text-emerald-700">₹{remainingAmount}</span>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-600">
                    <div>एकूण विद्यार्थी: {totalTeacherStudents}</div>
                    <div>अनलॉक कोटा: {effectiveQuota} → {totalTeacherStudents}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold justify-center">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>१००% सुरक्षित Razorpay पेमेंट (UPI / कार्ड / नेटबँकिंग)</span>
                </div>

                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                  <span>{paying ? "पेमेंट सुरू आहे..." : `₹${remainingAmount} आता भरा (Pay Now)`}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </CCEQuotaContext.Provider>
  );
}
