import React, { useState, useEffect } from "react";
import {
  Printer,
  Download,
  Save,
  RotateCcw,
  Edit3,
  ChevronLeft,
  CheckCircle2,
  GraduationCap,
  School,
  UserCheck,
  X,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import type { QuestionPaperItem } from "@/types/documentEditor";
import { jsPDF } from "jspdf";
import {
  getUnifiedSchoolProfile,
  fetchUnifiedSchoolProfile,
  saveUnifiedSchoolProfile,
} from "@/utils/schoolProfileHelper";

export interface QuestionPaperTemplateProps {
  paper?: Partial<QuestionPaperItem>;
  userId?: string;
  userRole?: string;
  userName?: string;
  canEdit?: boolean;
  onBack?: () => void;
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface LetterCircleSection {
  id: string;
  targetLetter: string;
  words: string[];
  marks: number;
}

interface QuestionPaperData {
  schoolName: string;
  kendra?: string;
  taluka?: string;
  jilha?: string;
  teacherName?: string;
  headmasterName?: string;
  examTitle: string;
  className: string;
  subjectName: string;
  totalMarks: string;
  studentNamePlaceholder: string;
  rollNo: string;
  examDate: string;
  obtainedMarks: string;
  matchingPairs: MatchingPair[];
  tracingLetters: string[];
  letterCircleSections: LetterCircleSection[];
  copyWords: string[];
}

const DEFAULT_PAPER_DATA: QuestionPaperData = {
  schoolName: "",
  kendra: "",
  taluka: "",
  jilha: "",
  teacherName: "",
  headmasterName: "",
  examTitle: "आकारिक मूल्यमापन चाचणी क्र. १",
  className: "१ ली (1st)",
  subjectName: "भाषा व गणित (Language & Maths)",
  totalMarks: "२०",
  studentNamePlaceholder: "विद्यार्थ्याचे नाव : ___________________________________",
  rollNo: "",
  examDate: new Date().toISOString().split("T")[0],
  obtainedMarks: "",
  matchingPairs: [
    { id: "m1", left: "कप", right: "मासा" },
    { id: "m2", left: "मासा", right: "पालक" },
    { id: "m3", left: "पालक", right: "कढई" },
    { id: "m4", left: "कढई", right: "कप" },
  ],
  tracingLetters: ["क", "क", "क", "ब", "ब", "ब", "स", "स", "स", "आ", "आ", "आ"],
  letterCircleSections: [
    {
      id: "lc1",
      targetLetter: "म",
      words: ["मदत", "मका", "मळा", "ममता", "माठ", "मामा", "माकड", "मकर", "यम"],
      marks: 2,
    },
    {
      id: "lc2",
      targetLetter: "ब",
      words: ["बदक", "सांबर", "बकरी", "सरबत", "बगळा", "बटाटा", "बघ"],
      marks: 2,
    },
    {
      id: "lc3",
      targetLetter: "स",
      words: ["सई", "सरबत", "सनई", "बस", "कसरत", "ऊस", "तरस", "रस"],
      marks: 2,
    },
  ],
  copyWords: ["कमल", "काकी", "सनई", "कबीर", "मामा", "पालक"],
};

export function QuestionPaperTemplate({
  paper,
  userId,
  userRole = "teacher",
  userName,
  canEdit = true,
  onBack,
}: QuestionPaperTemplateProps) {
  const getUserSavedQPSchool = (uid?: string): string => {
    if (!uid || typeof window === "undefined") return "";
    try {
      const saved = localStorage.getItem(`user_question_paper_school_${uid}`);
      if (saved && saved.trim() && !saved.includes("___")) return saved.trim();
    } catch (e) {}
    return "";
  };

  const [data, setData] = useState<QuestionPaperData>(() => {
    const savedUserSchool = getUserSavedQPSchool(userId);
    const uni = getUnifiedSchoolProfile();
    return {
      ...DEFAULT_PAPER_DATA,
      schoolName: savedUserSchool || uni.schoolName || "",
      kendra: uni.kendra || uni.centerName || "",
      taluka: uni.taluka || "",
      jilha: uni.jilha || uni.district || "",
      teacherName: uni.teacherName || userName || "",
      headmasterName: uni.headmaster || "",
      examTitle: paper?.examTypeLabel || paper?.title || DEFAULT_PAPER_DATA.examTitle,
      className: paper?.class ? `${paper.class} ली` : DEFAULT_PAPER_DATA.className,
      subjectName: paper?.subject || DEFAULT_PAPER_DATA.subjectName,
      totalMarks: paper?.totalMarks ? String(paper.totalMarks) : DEFAULT_PAPER_DATA.totalMarks,
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFillSchoolModal, setShowFillSchoolModal] = useState(false);
  const [mobileFitWidth, setMobileFitWidth] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [headerForm, setHeaderForm] = useState({
    schoolName: "",
    kendra: "",
    taluka: "",
    jilha: "",
    teacherName: "",
    headmasterName: "",
    examTitle: "आकारिक मूल्यमापन चाचणी क्र. १",
    className: "१ ली",
    subjectName: "भाषा",
    totalMarks: "२०",
    studentName: "_____________________",
    rollNo: "",
    examDate: "दि.   /   / २०२६",
    obtainedMarks: "",
  });
  const storageKey = `qp_custom_template_${paper?.id || "default"}_${userId || "guest"}`;

  useEffect(() => {
    let isMounted = true;
    async function initProfileAndData() {
      let resolvedSchool = getUserSavedQPSchool(userId);

      if (!resolvedSchool && userId && userId !== "guest_teacher") {
        try {
          const { db } = await import("@/lib/firebase");
          const { doc, getDoc } = await import("firebase/firestore");
          const userDocRef = doc(db, "users", userId);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const qpName = snap.data()?.questionPaperSchoolName;
            if (qpName && typeof qpName === "string" && qpName.trim() && !qpName.includes("___")) {
              resolvedSchool = qpName.trim();
              localStorage.setItem(`user_question_paper_school_${userId}`, resolvedSchool);
            }
          }
        } catch (e) {}
      }

      const uni = getUnifiedSchoolProfile();
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          if (resolvedSchool) {
            parsed.schoolName = resolvedSchool;
          }
          if (!parsed.kendra && (uni.kendra || uni.centerName)) parsed.kendra = uni.kendra || uni.centerName;
          if (!parsed.taluka && uni.taluka) parsed.taluka = uni.taluka;
          if (!parsed.jilha && (uni.jilha || uni.district)) parsed.jilha = uni.jilha || uni.district;
          if (!parsed.teacherName && uni.teacherName) parsed.teacherName = uni.teacherName;
          if (!parsed.headmasterName && uni.headmaster) parsed.headmasterName = uni.headmaster;
          setData(parsed);
          return;
        }
      } catch (e) {}

      if (isMounted) {
        setData((prev) => ({
          ...prev,
          schoolName: resolvedSchool || uni.schoolName || prev.schoolName,
          kendra: prev.kendra || uni.kendra || uni.centerName || "",
          taluka: prev.taluka || uni.taluka || "",
          jilha: prev.jilha || uni.jilha || uni.district || "",
          teacherName: prev.teacherName || uni.teacherName || userName || "",
          headmasterName: prev.headmasterName || uni.headmaster || "",
        }));
      }
    }

    initProfileAndData();
    return () => {
      isMounted = false;
    };
  }, [storageKey, userId]);

  const handleSave = () => {
    try {
      setIsSaving(true);
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (data.schoolName?.trim() && userId) {
        localStorage.setItem(`user_question_paper_school_${userId}`, data.schoolName.trim());
        if (userId !== "guest_teacher") {
          import("@/lib/firebase").then(({ db }) => {
            import("firebase/firestore").then(({ doc, setDoc }) => {
              setDoc(doc(db, "users", userId), { questionPaperSchoolName: data.schoolName.trim() }, { merge: true }).catch(() => {});
            });
          });
        }
      }
      toast.success("प्रश्नपत्रिकेचा बदललेला साचा जतन झाला!");
    } catch (e) {
      toast.error("जतन करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("प्रश्नपत्रिका पूर्ववत (Default) करायची आहे का?")) {
      localStorage.removeItem(storageKey);
      const savedUserSchool = getUserSavedQPSchool(userId);
      setData({
        ...DEFAULT_PAPER_DATA,
        schoolName: savedUserSchool || "",
      });
      toast.success("साचा पूर्ववत करण्यात आला.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(data.schoolName, 105, 18, { align: "center" });

      doc.setFontSize(13);
      doc.text(data.examTitle, 105, 26, { align: "center" });

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Class: ${data.className}  |  Subject: ${data.subjectName}  |  Marks: ${data.totalMarks}`, 105, 34, {
        align: "center",
      });

      doc.line(15, 38, 195, 38);
      doc.text("Question 1: Match the pairs", 16, 46);
      doc.text("Question 2: Trace and write letters", 16, 80);
      doc.text("Question 3: Circle the target letters", 16, 120);
      doc.text("Question 4: Read and write words", 16, 160);

      doc.save(`${paper?.title || "Question_Paper"}.pdf`);
      toast.success("PDF डाउनलोड पूर्ण झाली!");
    } catch (err) {
      window.print();
    }
  };

  return (
    <div className="flex flex-col w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden font-sans text-slate-100">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 sm:px-6 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 no-print">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
                title="मागे जा"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <div className="min-w-0 truncate">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 truncate">
                <span className="truncate">{data.examTitle}</span>
                <span className="text-amber-400 text-xs font-semibold shrink-0">({data.className})</span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                महाराष्ट्र राज्य अभ्यासक्रम - इयत्ता १ ली आकारिक मूल्यमापन साचा
              </p>
            </div>
          </div>

          {/* Quick mobile fit toggle for small screens */}
          <button
            onClick={() => setMobileFitWidth(!mobileFitWidth)}
            className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 border border-slate-700 text-amber-400 shrink-0 cursor-pointer"
            title={mobileFitWidth ? "मूळ आकार (100% Zoom)" : "स्क्रीनवर बसवा (Fit Width)"}
          >
            {mobileFitWidth ? <Maximize2 className="size-3" /> : <Minimize2 className="size-3" />}
            <span>{mobileFitWidth ? "१००%" : "स्क्रीनवर"}</span>
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {/* Fit button for larger screens */}
          <button
            onClick={() => setMobileFitWidth(!mobileFitWidth)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
            title={mobileFitWidth ? "मूळ आकार दाखवा (100% Zoom)" : "स्क्रीनवर व्यवस्थित बसवा (Fit Screen)"}
          >
            {mobileFitWidth ? <Maximize2 className="size-3.5 text-amber-400" /> : <Minimize2 className="size-3.5 text-amber-400" />}
            <span>{mobileFitWidth ? "१००% आकार" : "स्क्रीनवर बसवा"}</span>
          </button>

          {canEdit && (
            <button
              onClick={() => {
                setHeaderForm({
                  schoolName: data.schoolName.replace(/^शाळेचे नाव\s*[:-]?\s*/i, ""),
                  kendra: data.kendra || "",
                  taluka: data.taluka || "",
                  jilha: data.jilha || "",
                  teacherName: data.teacherName || "",
                  headmasterName: data.headmasterName || "",
                  examTitle: data.examTitle,
                  className: data.className,
                  subjectName: data.subjectName,
                  totalMarks: data.totalMarks,
                  studentName: data.studentNamePlaceholder,
                  rollNo: data.rollNo,
                  examDate: data.examDate || "दि.   /   / २०२६",
                  obtainedMarks: data.obtainedMarks,
                });
                setShowFillSchoolModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border border-emerald-400/40 active:scale-95"
              title="शाळेचे नाव, केंद्र, तालुका, जिल्हा व शिक्षक माहिती भरा"
            >
              <GraduationCap className="size-3.5 text-emerald-100" />
              <span>शाळा व शिक्षक माहिती भरा</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isEditing
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              {isEditing ? <CheckCircle2 className="size-3.5" /> : <Edit3 className="size-3.5" />}
              <span>{isEditing ? "पूर्ण करा" : "संपादन"}</span>
            </button>
          )}

          {canEdit && isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Save className="size-3.5" />
                <span>जतन करा</span>
              </button>
              <button
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="पूर्ववत करा (Reset)"
              >
                <RotateCcw className="size-4" />
              </button>
            </>
          )}

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>PDF डाउनलोड</span>
          </button>
        </div>
      </div>

      <style>{`
        @media screen and (max-width: 768px) {
          #balbharati-question-paper-print.mobile-fit-active {
            transform: scale(calc((100vw - 24px) / 800));
            transform-origin: top center;
            margin-bottom: calc((800px - (100vw - 24px)) * -1.05);
          }
        }
        @media print {
          #balbharati-question-paper-print.mobile-fit-active {
            transform: none !important;
            margin-bottom: 0 !important;
          }
        }
      `}</style>

      {/* Main Printable Question Paper Body */}
      <div className="p-1 sm:p-8 flex justify-center overflow-x-hidden bg-slate-950/60 w-full">
        <div
          id="balbharati-question-paper-print"
          className="w-full max-w-[800px] bg-white text-slate-900 rounded-xl shadow-2xl p-3 sm:p-10 border-2 sm:border-4 border-slate-900 min-h-[1050px] font-sans selection:bg-amber-100 transition-all box-border overflow-hidden"
          style={{ fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif" }}
        >
          {/* Header Box */}
          <div className="border-2 border-slate-900 rounded-none p-2.5 sm:p-4 mb-4 sm:mb-6 w-full box-border overflow-hidden bg-white">
            {/* School Name, Kendra, Taluka, Jilla Row */}
            <div className="mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b border-slate-300">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-base font-black text-slate-900 whitespace-nowrap shrink-0">शाळेचे नाव :</span>
                    <input
                      type="text"
                      value={data.schoolName.replace(/^शाळेचे नाव\s*[:-]?\s*/i, "")}
                      onChange={(e) => setData({ ...data, schoolName: e.target.value })}
                      className="flex-1 min-w-0 text-xs sm:text-base font-black text-slate-900 border-b-2 border-indigo-500 outline-none pb-0.5 bg-amber-50/50"
                      placeholder="येथे शाळेचे नाव भरा"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-700 whitespace-nowrap">केंद्र :</span>
                      <input
                        type="text"
                        value={data.kendra || ""}
                        onChange={(e) => setData({ ...data, kendra: e.target.value })}
                        className="flex-1 border-b border-slate-400 outline-none font-bold bg-amber-50/50 px-1"
                        placeholder="केंद्र"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-700 whitespace-nowrap">तालुका :</span>
                      <input
                        type="text"
                        value={data.taluka || ""}
                        onChange={(e) => setData({ ...data, taluka: e.target.value })}
                        className="flex-1 border-b border-slate-400 outline-none font-bold bg-amber-50/50 px-1"
                        placeholder="तालुका"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-700 whitespace-nowrap">जिल्हा :</span>
                      <input
                        type="text"
                        value={data.jilha || ""}
                        onChange={(e) => setData({ ...data, jilha: e.target.value })}
                        className="flex-1 border-b border-slate-400 outline-none font-bold bg-amber-50/50 px-1"
                        placeholder="जिल्हा"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-xs sm:text-base font-black text-slate-900 tracking-tight">
                  {/* Line 1: Dedicated School Name across full line */}
                  <div className="flex items-baseline gap-1.5 w-full">
                    <span className="shrink-0 text-slate-900 font-black whitespace-nowrap">शाळेचे नाव :</span>
                    <span className="font-black text-slate-950 border-b border-dotted border-slate-500 pb-0.5 px-1 flex-1 min-w-0">
                      {data.schoolName
                        ? data.schoolName.replace(/^शाळेचे नाव\s*[:-]?\s*/i, "")
                        : ""}
                    </span>
                  </div>

                  {/* Line 2: Remaining Location Fields (Kendra | Taluka | Jilha) */}
                  {(data.kendra || data.taluka || data.jilha) && (
                    <div className="flex flex-wrap items-center justify-center text-center w-full gap-x-2.5 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs font-bold text-slate-800 pt-0.5 mb-1 sm:mb-2">
                      {data.kendra && (
                        <span className="whitespace-nowrap">
                          <span className="text-slate-700 font-bold">केंद्र : </span>
                          <span className="font-bold text-slate-950">{data.kendra}</span>
                        </span>
                      )}
                      {data.kendra && (data.taluka || data.jilha) && (
                        <span className="text-slate-400 font-normal select-none">|</span>
                      )}
                      {data.taluka && (
                        <span className="whitespace-nowrap">
                          <span className="text-slate-700 font-bold">तालुका : </span>
                          <span className="font-bold text-slate-950">{data.taluka}</span>
                        </span>
                      )}
                      {(data.kendra || data.taluka) && data.jilha && (
                        <span className="text-slate-400 font-normal select-none">|</span>
                      )}
                      {data.jilha && (
                        <span className="whitespace-nowrap">
                          <span className="text-slate-700 font-bold">जिल्हा : </span>
                          <span className="font-bold text-slate-950">{data.jilha}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Exam Title */}
            <div className="text-center my-2 sm:my-3">
              {isEditing ? (
                <input
                  type="text"
                  value={data.examTitle}
                  onChange={(e) => setData({ ...data, examTitle: e.target.value })}
                  className="w-full text-center text-xs sm:text-base font-black text-indigo-900 border-b border-indigo-400 outline-none bg-amber-50/50"
                />
              ) : (
                <h1 className="text-xs sm:text-lg font-black text-slate-900 underline decoration-2 underline-offset-4 truncate">
                  {data.examTitle}
                </h1>
              )}
            </div>

            {/* Class, Subject, Roll No (Row 3) */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-300 text-[11px] sm:text-sm font-bold gap-1 sm:gap-2">
              <div className="text-left">
                <span className="whitespace-nowrap">इयत्ता - </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.className}
                    onChange={(e) => setData({ ...data, className: e.target.value })}
                    className="w-16 sm:w-20 border-b border-slate-400 outline-none font-bold"
                  />
                ) : (
                  <span className="font-black">{data.className}</span>
                )}
              </div>
              <div className="text-center">
                <span className="whitespace-nowrap">विषय - </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.subjectName}
                    onChange={(e) => setData({ ...data, subjectName: e.target.value })}
                    className="w-20 sm:w-28 border-b border-slate-400 outline-none font-bold"
                  />
                ) : (
                  <span className="font-black">{data.subjectName}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-right">
                <span className="font-bold whitespace-nowrap text-[11px] sm:text-xs">हजेरी क्रमांक -</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.rollNo}
                    onChange={(e) => setData({ ...data, rollNo: e.target.value })}
                    className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-900 rounded-sm font-black text-xs sm:text-sm text-center outline-none bg-amber-50/50"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs sm:text-sm bg-white shrink-0">
                    {data.rollNo}
                  </div>
                )}
              </div>
            </div>

            {/* Student Name & Total Marks (Row 4) */}
            <div className="flex items-center justify-between text-[11px] sm:text-sm font-semibold mt-2 pt-1.5 border-t border-dashed border-slate-200 gap-1.5">
              <div className="flex-1 min-w-0 flex items-center gap-1">
                <span className="font-bold whitespace-nowrap shrink-0">विद्यार्थ्याचे नाव :-</span>
                <span className="flex-1 border-b border-slate-900 inline-block min-w-0 font-bold px-1 text-slate-950 truncate">
                  {data.studentNamePlaceholder && data.studentNamePlaceholder !== "_____________________" ? data.studentNamePlaceholder : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-1 shrink-0 text-right">
                <span className="font-bold whitespace-nowrap text-[11px] sm:text-xs">एकूण गुण -</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs sm:text-sm bg-white shrink-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={data.totalMarks}
                      onChange={(e) => setData({ ...data, totalMarks: e.target.value })}
                      className="w-full text-center outline-none font-bold bg-transparent"
                    />
                  ) : (
                    <span className="text-slate-950 font-black">{data.totalMarks || "२०"}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Date & Marks Obtained (Row 5) */}
            <div className="flex items-center justify-between text-[11px] sm:text-sm font-semibold mt-1.5 sm:mt-2 gap-1.5">
              <div className="font-bold whitespace-nowrap text-[11px] sm:text-xs">
                {data.examDate || "दि.   /   / २०२६"}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold whitespace-nowrap text-[11px] sm:text-xs">मिळालेले गुण -</span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs sm:text-sm bg-white shrink-0">
                  {data.obtainedMarks}
                </div>
              </div>
            </div>
          </div>

          {/* QUESTION 1: जोड्या जुळवा (Match Pairs) */}
          <div className="mb-6 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                प्रश्न १) सारख्या शब्दांच्या जोड्या जुळव.
              </h3>
              <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                (गुण २)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="space-y-2">
                {data.matchingPairs.map((pair, idx) => (
                  <div
                    key={`l_${pair.id}`}
                    className="p-2 border-2 border-slate-800 rounded-lg text-center font-bold text-sm bg-white shadow-xs"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={pair.left}
                        onChange={(e) => {
                          const next = [...data.matchingPairs];
                          next[idx].left = e.target.value;
                          setData({ ...data, matchingPairs: next });
                        }}
                        className="w-full text-center outline-none"
                      />
                    ) : (
                      pair.left
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {data.matchingPairs.map((pair, idx) => (
                  <div
                    key={`r_${pair.id}`}
                    className="p-2 border-2 border-slate-800 rounded-lg text-center font-bold text-sm bg-white shadow-xs"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={pair.right}
                        onChange={(e) => {
                          const next = [...data.matchingPairs];
                          next[idx].right = e.target.value;
                          setData({ ...data, matchingPairs: next });
                        }}
                        className="w-full text-center outline-none"
                      />
                    ) : (
                      pair.right
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QUESTION 2: अक्षर गिरव आणि लिही (Trace Letters) */}
          <div className="mb-6 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                प्रश्न २) खालील अक्षर गिरव आणि लिही.
              </h3>
              <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                (गुण ४)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {data.tracingLetters.map((char, idx) => (
                <div
                  key={idx}
                  className="flex items-center border-2 border-slate-800 rounded-lg overflow-hidden h-14 bg-white"
                >
                  <div className="w-1/2 h-full flex items-center justify-center border-r-2 border-dashed border-slate-300 text-2xl font-normal text-slate-400 select-none tracking-widest">
                    {char}
                  </div>
                  <div className="w-1/2 h-full flex items-center justify-center text-2xl font-bold text-slate-800">
                    {isEditing ? (
                      <input
                        type="text"
                        value={char}
                        onChange={(e) => {
                          const next = [...data.tracingLetters];
                          next[idx] = e.target.value;
                          setData({ ...data, tracingLetters: next });
                        }}
                        className="w-full text-center outline-none text-xl font-bold"
                      />
                    ) : (
                      ""
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QUESTION 3: अक्षराला गोल करा (Circle Letter) */}
          <div className="mb-6 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                प्रश्न ३) दिलेल्या अक्षराला गोल करा.
              </h3>
              <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                (गुण ६)
              </span>
            </div>

            <div className="space-y-3">
              {data.letterCircleSections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex items-center border-2 border-slate-800 rounded-xl p-2 bg-amber-50/20 gap-3"
                >
                  <div className="size-10 rounded-lg bg-amber-200 border-2 border-amber-600 flex items-center justify-center font-black text-xl text-slate-900 shrink-0">
                    {sec.targetLetter}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-800">
                    {sec.words.map((w, wIdx) => (
                      <span
                        key={wIdx}
                        className="px-2 py-1 rounded-md border border-dashed border-slate-300 hover:border-slate-800 hover:bg-white cursor-pointer transition-all"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* QUESTION 4: शब्द वाच आणि असेच लिही (Read & Copy Handwriting) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                प्रश्न ४) खालील शब्द वाच आणि सुंदर हस्ताक्षरात पुन्हा लिही.
              </h3>
              <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                (गुण ४)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {data.copyWords.map((word, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-sm font-bold text-slate-900 pl-1">{word}</div>
                  <div className="border-b-2 border-dashed border-slate-400 h-6 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Teacher, Parent & Headmaster Signatures (After subject / bottom of paper) */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm font-bold text-slate-900">
              {/* Left: Class / Subject Teacher */}
              <div className="text-left space-y-1">
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold">
                  विषय शिक्षक / वर्ग शिक्षक :
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.teacherName || ""}
                    onChange={(e) => setData({ ...data, teacherName: e.target.value })}
                    className="w-full border-b border-slate-400 outline-none font-bold text-xs sm:text-sm bg-amber-50/50"
                    placeholder="शिक्षकाचे नाव"
                  />
                ) : (
                  <div className="font-black text-slate-950 text-xs sm:text-sm min-h-[1.25rem]">
                    {data.teacherName || "____________________"}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 font-medium pt-2 sm:pt-3">स्वाक्षरी</div>
              </div>

              {/* Center: Parent Signature */}
              <div className="text-center space-y-1">
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold">
                  पालकांची स्वाक्षरी :
                </div>
                <div className="font-black text-slate-950 text-xs sm:text-sm min-h-[1.25rem]">
                  ____________________
                </div>
                <div className="text-[10px] text-slate-400 font-medium pt-2 sm:pt-3">स्वाक्षरी व दिनांक</div>
              </div>

              {/* Right: Headmaster */}
              <div className="text-right space-y-1">
                <div className="text-[11px] sm:text-xs text-slate-600 font-semibold">
                  मुख्याध्यापक :
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.headmasterName || ""}
                    onChange={(e) => setData({ ...data, headmasterName: e.target.value })}
                    className="w-full border-b border-slate-400 outline-none font-bold text-xs sm:text-sm text-right bg-amber-50/50"
                    placeholder="मुख्याध्यापकाचे नाव"
                  />
                ) : (
                  <div className="font-black text-slate-950 text-xs sm:text-sm min-h-[1.25rem]">
                    {data.headmasterName || "____________________"}
                  </div>
                )}
                <div className="text-[10px] text-slate-400 font-medium pt-2 sm:pt-3">स्वाक्षरी व शिक्का</div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>महाराष्ट्र राज्य परीक्षा मंडळ अभ्यासक्रम मानक</span>
              <span>गुण नोंदवही व प्रगती पत्रकासाठी वैध</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fill School Name & Exam Details Modal */}
      {showFillSchoolModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-xl w-full text-slate-800 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                    <span>शाळेचे नाव व परीक्षेचा तपशील भरा</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      हेडर बॉक्स (Header Box)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    खालील सर्व माहिती भरा. ही माहिती थेट प्रश्नपत्रिकेवरील हेडर बॉक्समध्ये व्यवस्थित बसवली जाईल.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFillSchoolModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
              {/* Section A: School, Kendra, Taluka, Jilla */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <School className="size-4 text-indigo-600" />
                  <span>शाळा व पत्ता माहिती (School Details)</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    १. शाळेचे नाव (School Name): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={headerForm.schoolName}
                    onChange={(e) => setHeaderForm({ ...headerForm, schoolName: e.target.value })}
                    placeholder="उदा. जिल्हा परिषद शाळा धोंडेवाडी"
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-emerald-500/40 rounded-xl font-bold text-slate-900 text-sm outline-none focus:border-emerald-600 shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      केंद्र (Kendra):
                    </label>
                    <input
                      type="text"
                      value={headerForm.kendra}
                      onChange={(e) => setHeaderForm({ ...headerForm, kendra: e.target.value })}
                      placeholder="उदा. पेड"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      तालुका (Taluka):
                    </label>
                    <input
                      type="text"
                      value={headerForm.taluka}
                      onChange={(e) => setHeaderForm({ ...headerForm, taluka: e.target.value })}
                      placeholder="उदा. तासगाव"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      जिल्हा (Jilla / District):
                    </label>
                    <input
                      type="text"
                      value={headerForm.jilha}
                      onChange={(e) => setHeaderForm({ ...headerForm, jilha: e.target.value })}
                      placeholder="उदा. सांगली"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Teacher & Headmaster Information */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="size-4 text-indigo-600" />
                  <span>शिक्षक व मुख्याध्यापक माहिती (Signatures)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      वर्ग शिक्षक / विषय शिक्षक नाव:
                    </label>
                    <input
                      type="text"
                      value={headerForm.teacherName}
                      onChange={(e) => setHeaderForm({ ...headerForm, teacherName: e.target.value })}
                      placeholder="उदा. श्री. आर. के. पाटील"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      मुख्याध्यापकाचे नाव (Headmaster):
                    </label>
                    <input
                      type="text"
                      value={headerForm.headmasterName}
                      onChange={(e) => setHeaderForm({ ...headerForm, headmasterName: e.target.value })}
                      placeholder="उदा. श्री. एस. व्ही. जाधव"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section C: Exam Title & Details */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="size-4 text-indigo-600" />
                  <span>परीक्षेचा तपशील (Exam Info)</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    चाचणी / परीक्षेचे नाव (Exam Title):
                  </label>
                  <input
                    type="text"
                    value={headerForm.examTitle}
                    onChange={(e) => setHeaderForm({ ...headerForm, examTitle: e.target.value })}
                    placeholder="उदा. आकारिक मूल्यमापन चाचणी क्र. १"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      "आकारिक मूल्यमापन चाचणी क्र. १",
                      "आकारिक मूल्यमापन चाचणी क्र. २",
                      "संकलित मूल्यमापन चाचणी १",
                      "संकलित मूल्यमापन चाचणी २",
                      "द्वितीय सत्र परीक्षा",
                    ].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setHeaderForm({ ...headerForm, examTitle: t })}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                          headerForm.examTitle === t
                            ? "bg-indigo-50 text-indigo-700 border-indigo-300 font-bold"
                            : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class, Subject, Total Marks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      इयत्ता (Class):
                    </label>
                    <input
                      type="text"
                      value={headerForm.className}
                      onChange={(e) => setHeaderForm({ ...headerForm, className: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      विषय (Subject):
                    </label>
                    <input
                      type="text"
                      value={headerForm.subjectName}
                      onChange={(e) => setHeaderForm({ ...headerForm, subjectName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1 text-xs">
                      एकूण गुण (Marks):
                    </label>
                    <input
                      type="text"
                      value={headerForm.totalMarks}
                      onChange={(e) => setHeaderForm({ ...headerForm, totalMarks: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Box (Exact match with Header Box and Signatures) */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <span>👁️ थेट पूर्वावलोकन (Live Preview - प्रश्नपत्रिकेवर कसे दिसेल):</span>
                </div>
                <div className="bg-white border-2 border-slate-900 rounded-none p-3 text-slate-900 shadow-sm select-none font-sans space-y-2">
                  {/* Line 1: School Name */}
                  <div className="text-xs font-black tracking-tight text-slate-900">
                    शाळेचे नाव : <span className="text-slate-950 font-black">{headerForm.schoolName || "__________________________"}</span>
                  </div>
                  {/* Line 2: Kendra, Taluka, Jilla */}
                  {(headerForm.kendra || headerForm.taluka || headerForm.jilha) && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 border-b border-slate-200 pb-1">
                      {headerForm.kendra && <span>केंद्र : <b>{headerForm.kendra}</b></span>}
                      {headerForm.kendra && (headerForm.taluka || headerForm.jilha) && <span className="text-slate-300 font-normal">|</span>}
                      {headerForm.taluka && <span>तालुका : <b>{headerForm.taluka}</b></span>}
                      {(headerForm.kendra || headerForm.taluka) && headerForm.jilha && <span className="text-slate-300 font-normal">|</span>}
                      {headerForm.jilha && <span>जिल्हा : <b>{headerForm.jilha}</b></span>}
                    </div>
                  )}

                  {/* Line 2: Exam Title */}
                  <div className="text-center font-black text-xs sm:text-sm text-slate-900">
                    {headerForm.examTitle || "आकारिक मूल्यमापन चाचणी क्र. १"}
                  </div>

                  {/* Line 3: Class, Subject, Roll No */}
                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-200">
                    <div>इयत्ता - <span className="font-black">{headerForm.className || "१ ली"}</span></div>
                    <div>विषय - <span className="font-black">{headerForm.subjectName || "भाषा"}</span></div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span>हजेरी क्रमांक -</span>
                      <div className="w-5 h-5 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-[10px] bg-white">
                        {headerForm.rollNo}
                      </div>
                    </div>
                  </div>

                  {/* Line 4: Student Name & Total Marks */}
                  <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-dashed border-slate-200">
                    <div className="flex-1 flex items-center gap-1">
                      <span>विद्यार्थ्याचे नाव :-</span>
                      <span className="border-b border-slate-900 inline-block w-28">&nbsp;</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span>एकूण गुण - </span>
                      <div className="w-5 h-5 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-[10px] bg-white">
                        {headerForm.totalMarks || "२०"}
                      </div>
                    </div>
                  </div>

                  {/* Line 5: Date & Obtained Marks */}
                  <div className="flex items-center justify-between text-xs font-semibold pt-1">
                    <div>दि. &nbsp;&nbsp; / &nbsp;&nbsp; / २०२६</div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span>मिळालेले गुण -</span>
                      <div className="w-5 h-5 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-[10px] bg-white">
                        {headerForm.obtainedMarks}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Signature Preview */}
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-bold pt-2 mt-2 border-t border-slate-300">
                    <div className="text-left">
                      <span className="text-slate-500 block text-[9px]">विषय/वर्ग शिक्षक :</span>
                      <span className="font-black text-slate-900">{headerForm.teacherName || "________________"}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-slate-500 block text-[9px]">पालक स्वाक्षरी :</span>
                      <span className="font-black text-slate-900">________________</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[9px]">मुख्याध्यापक :</span>
                      <span className="font-black text-slate-900">{headerForm.headmasterName || "________________"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setData((prev) => ({ ...prev, schoolName: "", kendra: "", taluka: "", jilha: "" }));
                  setShowFillSchoolModal(false);
                  toast.info("माहिती पूर्ववत करण्यात आली.");
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                पूर्ववत (Clear)
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFillSchoolModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanSchool = (headerForm.schoolName || "").replace(/^शाळेचे नाव\s*[:-]?\s*/i, "").trim();
                    const cleanKendra = (headerForm.kendra || "").replace(/^केंद्र\s*[:-]?\s*/i, "").trim();
                    const cleanTaluka = (headerForm.taluka || "").replace(/^तालुका\s*[:-]?\s*/i, "").trim();
                    const cleanJilha = (headerForm.jilha || "").replace(/^जिल्हा\s*[:-]?\s*/i, "").trim();
                    const cleanTeacher = (headerForm.teacherName || "").trim();
                    const cleanHeadmaster = (headerForm.headmasterName || "").trim();

                    setData((prev) => ({
                      ...prev,
                      schoolName: cleanSchool,
                      kendra: cleanKendra,
                      taluka: cleanTaluka,
                      jilha: cleanJilha,
                      teacherName: cleanTeacher,
                      headmasterName: cleanHeadmaster,
                      examTitle: headerForm.examTitle,
                      className: headerForm.className,
                      subjectName: headerForm.subjectName,
                      totalMarks: headerForm.totalMarks,
                      studentNamePlaceholder: headerForm.studentName,
                      rollNo: headerForm.rollNo,
                      examDate: headerForm.examDate,
                      obtainedMarks: headerForm.obtainedMarks,
                    }));

                    saveUnifiedSchoolProfile({
                      schoolName: cleanSchool,
                      kendra: cleanKendra,
                      taluka: cleanTaluka,
                      jilha: cleanJilha,
                      teacherName: cleanTeacher,
                      headmaster: cleanHeadmaster,
                    });

                    if (cleanSchool && userId) {
                      try {
                        localStorage.setItem(`user_question_paper_school_${userId}`, cleanSchool);
                      } catch (e) {}
                      if (userId !== "guest_teacher") {
                        import("@/lib/firebase").then(({ db }) => {
                          import("firebase/firestore").then(({ doc, setDoc }) => {
                            setDoc(doc(db, "users", userId), { questionPaperSchoolName: cleanSchool }, { merge: true }).catch(() => {});
                          });
                        });
                      }
                    }

                    setShowFillSchoolModal(false);
                    toast.success("शाळा, केंद्र, तालुका, जिल्हा व शिक्षक माहिती प्रश्नपत्रिकेवर व्यवस्थित बसवली!");
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Check className="size-4" />
                  <span>प्रश्नपत्रिकेवर बसवा (Fit Into Paper Box)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
