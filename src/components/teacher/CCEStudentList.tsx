import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { ArrowLeft, Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { processRazorpayPayment } from "@/lib/razorpayService";

import { useAuth } from "@/hooks/use-auth";
// @ts-ignore
import { matchStudentClassAndMedium, isSemiMedium } from "@/result/firestoreMarksHelper";
// @ts-ignore
import { getTeacherId, matchStudentTeacherClassAndMedium } from "@/lib/teacherIsolationHelper";

interface Student {
  id: string;
  name?: string;
  fullName?: string;
  rollNo?: string;
  gender?: string;
  photoUrl?: string;
  class?: string;
}

// Floating label input component matching Image 3 style
function FloatInput({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  return (
    <div className="relative mb-4">
      <label
        className="absolute left-3 transition-all pointer-events-none font-bold z-10"
        style={{
          top: focused || filled ? "-11px" : "14px",
          fontSize: focused || filled ? "13px" : "14px",
          color: focused ? "#2563eb" : "#334155",
          background: "white",
          paddingLeft: "4px",
          paddingRight: "4px",
        }}
      >
        {label}{required && "*"}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? (placeholder || "") : ""}
        className="w-full px-4 py-4 rounded-xl text-sm font-medium outline-none transition-all"
        style={{
          background: "transparent",
          border: `1px solid ${focused ? "#3b82f6" : "#cbd5e1"}`,
          color: "#1e293b",
        }}
      />
    </div>
  );
}

// Image upload box matching Image 3 photo field
function ImageBox({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("फाइल 500KB पेक्षा लहान असावी");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="mb-4">
      <p className="text-sm font-medium mb-2 text-slate-600">{label}</p>
      <label className="cursor-pointer block" style={{ width: "160px" }}>
        <div
          className="rounded-xl flex items-center justify-center overflow-hidden transition-all"
          style={{
            height: "120px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
          }}
        >
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-cover" />
          ) : (
            <p className="text-xs text-center text-slate-400">Click to add image</p>
          )}
        </div>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </div>
  );
}

export function CCEStudentList({
  selectedClass,
  academicYear,
  onBack,
}: {
  selectedClass: string;
  academicYear: string;
  onBack: () => void;
  onViewReport?: (studentName: string) => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form view state: null = list view, "new" = add view, Student = edit view
  const [editingStudent, setEditingStudent] = useState<Student | null | "new">(null);

  // Form inputs
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [gender, setGender] = useState("male");
  const [photoUrl, setPhotoUrl] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);

  const { user, profile } = useAuth();
  const teacherId = getTeacherId(user, profile);

  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi">(() => {
    const stored = localStorage.getItem("cce_selected_medium");
    return isSemiMedium(stored) ? "semi" : "marathi";
  });

  useEffect(() => {
    const updateMed = () => {
      const stored = localStorage.getItem("cce_selected_medium");
      setSelectedMedium(isSemiMedium(stored) ? "semi" : "marathi");
    };
    window.addEventListener("cce_settings_updated", updateMed);
    window.addEventListener("storage", updateMed);
    return () => {
      window.removeEventListener("cce_settings_updated", updateMed);
      window.removeEventListener("storage", updateMed);
    };
  }, []);

  // Subscribe to students list
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "users"),
      where("role", "==", "student")
    );
    const unsub = onSnapshot(q, (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as (Student & { medium?: string; isSemiEnglish?: boolean; class?: string; currentClass?: string; teacherId?: string; createdById?: string })[];
      const list = raw.filter((s) => {
        return matchStudentTeacherClassAndMedium(s, teacherId, selectedClass, selectedMedium);
      });
      list.sort((a, b) => parseInt(a.rollNo || "999") - parseInt(b.rollNo || "999"));
      setStudents(list);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedClass, selectedMedium, teacherId]);

  // Quota & Payment Control States
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [perStudentPrice, setPerStudentPrice] = useState<number>(5);
  const [totalTeacherStudents, setTotalTeacherStudents] = useState<number>(0);
  const [isAdminGranted, setIsAdminGranted] = useState<boolean>(false);
  const [upgradingQuota, setUpgradingQuota] = useState<boolean>(false);
  const [showQuotaModal, setShowQuotaModal] = useState<boolean>(false);

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

    try {
      // 1. Listen to teacher payment record for cce-result
      unsubPayment = onSnapshot(doc(db, "teacher_module_payments", `${teacherId}_cce-result`), (snap) => {
        if (snap.exists()) {
          setPaymentRecord(snap.data());
        } else {
          setPaymentRecord(null);
        }
      });

      // 2. Listen to pricing for perStudentPrice
      unsubPricing = onSnapshot(doc(db, "cce_module_pricing", "cce-result"), (snap) => {
        if (snap.exists() && snap.data().perStudentPrice) {
          setPerStudentPrice(snap.data().perStudentPrice);
        }
      });

      // 3. Listen to access granted by admin
      unsubAccess = onSnapshot(collection(db, "teacher_module_access"), (snap) => {
        const isGranted = snap.docs.some((docSnap) => {
          const data = docSnap.data();
          const matchesUser = data && userKeys.some((k) => k === data.teacherId || k === data.teacherEmail);
          const matchesMod = data.moduleId === "cce-result" || data.moduleId === "ALL";
          return matchesUser && matchesMod && data.status === "GRANTED";
        });
        const isSuperAdmin = (user as any)?.role === "admin" || localStorage.getItem("is_super_admin") === "true";
        setIsAdminGranted(isGranted || isSuperAdmin);
      });

      // 4. Count total teacher students across ALL classes & mediums
      const qUsers = query(collection(db, "users"), where("role", "==", "student"));
      unsubUsers = onSnapshot(qUsers, (snapUsers) => {
        const userStudentIds = new Set<string>();
        snapUsers.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const sTeacher = data.teacherId || data.createdById || data.userId;
          if (sTeacher && userKeys.includes(sTeacher)) {
            userStudentIds.add(docSnap.id);
          }
        });

        const qStudents = query(collection(db, "students"));
        unsubStudents = onSnapshot(qStudents, (snapStudents) => {
          const studentDocsIds = new Set<string>();
          snapStudents.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const sTeacher = data.teacherId || data.createdById || data.userId;
            if (sTeacher && userKeys.includes(sTeacher)) {
              studentDocsIds.add(docSnap.id);
            }
          });

          const combinedCount = new Set([...Array.from(userStudentIds), ...Array.from(studentDocsIds)]).size;
          setTotalTeacherStudents(combinedCount);
        });
      });
    } catch (e) {
      console.warn("Quota listener error:", e);
    }

    return () => {
      if (unsubPayment) unsubPayment();
      if (unsubPricing) unsubPricing();
      if (unsubAccess) unsubAccess();
      if (unsubUsers) unsubUsers();
      if (unsubStudents) unsubStudents();
    };
  }, [teacherId, user, profile]);

  const isPaidUser = paymentRecord && paymentRecord.status === "SUCCESS";
  const paidQuota = isPaidUser
    ? (paymentRecord.paidQuota || paymentRecord.studentsCount || Math.floor((paymentRecord.amount || 0) / perStudentPrice) || 0)
    : 0;

  const isQuotaExceeded = isPaidUser && !isAdminGranted && totalTeacherStudents >= paidQuota;

  const handleUpgradeQuota = async () => {
    setUpgradingQuota(true);
    try {
      const teacherName = localStorage.getItem("teacher_name") || localStorage.getItem("user_name") || "शिक्षक";
      const teacherEmail = localStorage.getItem("teacher_email") || "";
      const teacherPhone = localStorage.getItem("teacher_phone") || "";

      await processRazorpayPayment({
        amount: perStudentPrice,
        moduleId: "cce-result",
        moduleTitle: "अतिरिक्त विद्यार्थी कोटा (+1 Student)",
        teacherName,
        teacherEmail,
        teacherPhone,
        onSuccess: async (paymentId) => {
          try {
            const paymentDocKey = `${teacherId}_cce-result`;
            const currentQuota = paidQuota > 0 ? paidQuota : totalTeacherStudents;
            const newQuota = currentQuota + 1;
            const currentAmount = paymentRecord?.amount || 0;
            const newAmount = currentAmount + perStudentPrice;

            await setDoc(
              doc(db, "teacher_module_payments", paymentDocKey),
              {
                paidQuota: newQuota,
                studentsCount: newQuota,
                amount: newAmount,
                lastUpgradeAt: new Date().toISOString(),
                status: "SUCCESS",
              },
              { merge: true }
            );

            toast.success(`अभिनंदन! १ अतिरिक्त विद्यार्थी कोटा वाढवला आहे (नवीन कोटा: ${newQuota} विद्यार्थी)!`);
            setShowQuotaModal(false);
            setUpgradingQuota(false);
            openAddInternal();
          } catch (e: any) {
            toast.error("कोटा अपडेट करताना त्रुटी आली: " + e.message);
            setUpgradingQuota(false);
          }
        },
        onError: (err) => {
          setUpgradingQuota(false);
          toast.error(typeof err === "string" ? err : "पेमेंट प्रक्रिया रद्द किंवा अयशस्वी झाली.");
        },
      });
    } catch (err: any) {
      setUpgradingQuota(false);
      toast.error(err.message || "पेमेंट प्रक्रिया सुरू होऊ शकली नाही.");
    }
  };

  const openAddInternal = () => {
    const nextRoll =
      students.length > 0
        ? (Math.max(...students.map((s) => parseInt(s.rollNo || "0") || 0)) + 1).toString()
        : "1";
    setName("");
    setRollNo(nextRoll);
    setGender("male");
    setPhotoUrl("");
    setCurrentId(null);
    setEditingStudent("new");
  };

  const openAdd = () => {
    if (isQuotaExceeded) {
      setShowQuotaModal(true);
      return;
    }
    openAddInternal();
  };

  const openEdit = (s: Student) => {
    setName(s.fullName || s.name || "");
    setRollNo(s.rollNo || "");
    setGender(
      (s.gender || "male").toLowerCase() === "female" || s.gender === "स्त्री"
        ? "female"
        : "male"
    );
    setPhotoUrl(s.photoUrl || "");
    setCurrentId(s.id);
    setEditingStudent(s);
  };

  const handleSave = async () => {
    if (!currentId && isQuotaExceeded) {
      setShowQuotaModal(true);
      return;
    }
    if (!name.trim()) {
      toast.error("कृपया विद्यार्थ्याचे नाव टाका");
      return;
    }
    if (!rollNo.trim()) {
      toast.error("कृपया रोल नंबर टाका");
      return;
    }
    setSaving(true);
    try {
      const docId = currentId || `student_${selectedClass}_${Date.now()}`;
      const docRef = doc(db, "users", docId);
      await setDoc(
        docRef,
        {
          name: name.trim(),
          fullName: name.trim(),
          rollNo: rollNo.trim(),
          gender: gender === "female" ? "Female" : "Male",
          photoUrl: photoUrl || "",
          class: selectedClass,
          academicYear,
          role: "student",
          medium: selectedMedium,
          isSemiEnglish: selectedMedium === "semi",
          teacherId,
          createdById: teacherId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("विद्यार्थी जतन झाला!");
      setEditingStudent(null);
    } catch (err: any) {
      toast.error("जतन करताना त्रुटी आली: " + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (s: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`तुम्हाला नक्की "${s.fullName || s.name}" हटवायचे आहे का?`)) return;
    try {
      await deleteDoc(doc(db, "users", s.id));
      toast.success("विद्यार्थी हटवला!");
    } catch (err: any) {
      toast.error("हटवताना त्रुटी आली: " + err.message);
    }
  };

  // ── ADD / EDIT STUDENT FORM (Matches Image 3) ──
  if (editingStudent !== null) {
    return (
      <div
        className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none"
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
          <button
            onClick={() => setEditingStudent(null)}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            {currentId ? "विद्यार्थी माहिती संपादन करा" : "नवीन विद्यार्थी जोडा"}
          </h2>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <FloatInput
            label="नाव"
            value={name}
            onChange={setName}
            required
            placeholder="उदा. विद्यार्थ्याचे पूर्ण नाव"
          />

          <FloatInput
            label="रोल नंबर"
            value={rollNo}
            onChange={setRollNo}
            required
            placeholder="1"
          />

          {/* Gender selection */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 text-slate-600">लिंग</p>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setGender("male")}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    borderColor: "#3b82f6",
                    background: gender === "male" ? "#3b82f6" : "transparent",
                  }}
                >
                  {gender === "male" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-slate-700 text-sm font-medium">पुरुष</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setGender("female")}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                  style={{
                    borderColor: "#3b82f6",
                    background: gender === "female" ? "#3b82f6" : "transparent",
                  }}
                >
                  {gender === "female" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-slate-700 text-sm font-medium">स्त्री</span>
              </label>
            </div>
          </div>

          {/* Photo upload box */}
          <ImageBox
            label="फोटो"
            value={photoUrl}
            onChange={setPhotoUrl}
          />

          {/* Save Button */}
          <div className="pb-6 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-950/20 disabled:opacity-50"
            >
              {saving ? "जतन होत आहे..." : "जतन करा"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STUDENT LIST VIEW (Matches Image 2) ──
  return (
    <div
      className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none relative"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">
            विद्यार्थ्यांची माहिती
          </h2>
        </div>

        {/* Top Add Button */}
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          title="नवीन विद्यार्थी जोडा"
        >
          <Plus className="size-4" />
          <span>विद्यार्थी जोडा</span>
        </button>
      </div>

      {/* Student List Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="text-xs font-bold text-slate-400">लोड होत आहे...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <p className="text-sm font-medium">कोणताही विद्यार्थी जोडलेला नाही</p>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md"
            >
              + विद्यार्थी जोडा
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                onClick={() => openEdit(student)}
                className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100 border border-slate-200/60 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
                    {student.rollNo || "?"}
                  </div>
                  <span className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                    {student.fullName || student.name || "विद्यार्थी"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(student, e)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    title="हटवा"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUOTA EXCEEDED UPGRADE MODAL */}
      {showQuotaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 text-center relative overflow-hidden">
            <div className="size-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
              ⚠️
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">विद्यार्थी कोटा संपला आहे!</h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                तुम्ही भरणा केलेला <b>{paidQuota}</b> विद्यार्थ्यांचा कोटा पूर्ण झाला आहे ({totalTeacherStudents}/{paidQuota} विद्यार्थी जोडले आहेत). 
                नवीन विद्यार्थी जोडण्यासाठी ₹{perStudentPrice} भरून अतिरिक्त १ विद्यार्थी कोटा वाढवा.
              </p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-black">
              <span>अतिरिक्त १ विद्यार्थी शुल्क</span>
              <span className="text-xl font-black text-emerald-600">₹{perStudentPrice}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQuotaModal(false)}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer"
              >
                रद्द करा
              </button>

              <button
                type="button"
                onClick={handleUpgradeQuota}
                disabled={upgradingQuota}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {upgradingQuota ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>₹{perStudentPrice} देऊन कोटा वाढवा</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
