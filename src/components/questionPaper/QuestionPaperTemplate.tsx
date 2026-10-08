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
  X,
  Check,
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
    return {
      ...DEFAULT_PAPER_DATA,
      schoolName: savedUserSchool || "",
      examTitle: paper?.examTypeLabel || paper?.title || DEFAULT_PAPER_DATA.examTitle,
      className: paper?.class ? `${paper.class} ली` : DEFAULT_PAPER_DATA.className,
      subjectName: paper?.subject || DEFAULT_PAPER_DATA.subjectName,
      totalMarks: paper?.totalMarks ? String(paper.totalMarks) : DEFAULT_PAPER_DATA.totalMarks,
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFillSchoolModal, setShowFillSchoolModal] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    schoolName: "",
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

      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          if (resolvedSchool) {
            parsed.schoolName = resolvedSchool;
          }
          setData(parsed);
          return;
        }
      } catch (e) {}

      if (resolvedSchool && isMounted) {
        setData((prev) => ({
          ...prev,
          schoolName: resolvedSchool,
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
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              title="मागे जा"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>{data.examTitle}</span>
              <span className="text-amber-400 text-xs font-semibold">({data.className})</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              महाराष्ट्र राज्य अभ्यासक्रम - इयत्ता १ ली आकारिक मूल्यमापन साचा
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {canEdit && (
            <button
              onClick={() => {
                setHeaderForm({
                  schoolName: data.schoolName.replace(/^शाळेचे नाव\s*[:-]?\s*/i, ""),
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
              title="शाळेचे नाव व परीक्षेचा सर्व तपशील भरा"
            >
              <GraduationCap className="size-3.5 text-emerald-100" />
              <span>शाळेचे नाव भरा (Fill School Name)</span>
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
              <span>{isEditing ? "संपादन पूर्ण करा" : "मजकूर संपादित करा (Edit)"}</span>
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

      {/* Main Printable Question Paper Body */}
      <div className="p-4 sm:p-8 flex justify-center overflow-x-auto bg-slate-950/60">
        <div
          id="balbharati-question-paper-print"
          className="w-full max-w-[800px] bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-10 border-4 border-slate-900 min-h-[1050px] font-sans selection:bg-amber-100"
          style={{ fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif" }}
        >
          {/* Header Box */}
          <div className="border-2 border-slate-900 rounded-none p-4 mb-6">
            {/* School Name */}
            <div className="mb-3 text-center sm:text-left">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black text-slate-900 shrink-0">शाळेचे नाव :</span>
                  <input
                    type="text"
                    value={data.schoolName.replace(/^शाळेचे नाव\s*[:-]?\s*/i, "")}
                    onChange={(e) => setData({ ...data, schoolName: e.target.value })}
                    className="flex-1 text-base sm:text-lg font-black text-slate-900 border-b-2 border-indigo-500 outline-none pb-0.5 bg-amber-50/50"
                    placeholder="येथे शाळेचे नाव भरा"
                  />
                </div>
              ) : (
                <div className="text-base sm:text-xl font-black text-slate-900 tracking-tight flex items-baseline gap-2 flex-wrap">
                  <span className="shrink-0 text-slate-900 font-black">शाळेचे नाव :</span>
                  <span className="text-slate-950 font-black">
                    {data.schoolName
                      ? data.schoolName.replace(/^शाळेचे नाव\s*[:-]?\s*/i, "")
                      : "____________________________________"}
                  </span>
                </div>
              )}
            </div>

            {/* Exam Title */}
            <div className="text-center my-2">
              {isEditing ? (
                <input
                  type="text"
                  value={data.examTitle}
                  onChange={(e) => setData({ ...data, examTitle: e.target.value })}
                  className="w-full text-center text-base sm:text-lg font-black text-indigo-900 border-b border-indigo-400 outline-none bg-amber-50/50"
                />
              ) : (
                <h1 className="text-base sm:text-xl font-black text-slate-900 underline decoration-2 underline-offset-4">
                  {data.examTitle}
                </h1>
              )}
            </div>

            {/* Class, Subject, Total Marks */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-300 text-xs sm:text-sm font-bold">
              <div>
                <span>इयत्ता - </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.className}
                    onChange={(e) => setData({ ...data, className: e.target.value })}
                    className="w-20 border-b border-slate-400 outline-none font-bold"
                  />
                ) : (
                  <span>{data.className}</span>
                )}
              </div>
              <div className="text-center">
                <span>विषय - </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.subjectName}
                    onChange={(e) => setData({ ...data, subjectName: e.target.value })}
                    className="w-28 border-b border-slate-400 outline-none font-bold"
                  />
                ) : (
                  <span>{data.subjectName}</span>
                )}
              </div>
              <div className="text-right">
                <span>एकूण गुण - </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={data.totalMarks}
                    onChange={(e) => setData({ ...data, totalMarks: e.target.value })}
                    className="w-12 border-b border-slate-400 outline-none font-bold text-right"
                  />
                ) : (
                  <span className="text-amber-900">{data.totalMarks}</span>
                )}
              </div>
            </div>

            {/* Student Name & Roll No (Row 4) */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mt-3 pt-2 border-t border-dashed border-slate-200">
              <div className="flex-1 flex items-center gap-1.5">
                <span className="font-bold">विद्यार्थ्याचे नाव :-</span>
                <span className="flex-1 border-b border-slate-900 inline-block min-w-[120px] max-w-[280px] font-bold px-1 text-slate-950">
                  {data.studentNamePlaceholder && data.studentNamePlaceholder !== "_____________________" ? data.studentNamePlaceholder : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-3 shrink-0">
                <span className="font-bold">हजेरी क्रमांक -</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs sm:text-sm bg-white">
                  {data.rollNo}
                </div>
              </div>
            </div>

            {/* Date & Marks Obtained (Row 5) */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mt-2">
              <div className="font-bold">
                {data.examDate || "दि.   /   / २०२६"}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold">मिळालेले गुण -</span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs sm:text-sm bg-white">
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

          {/* Footer */}
          <div className="mt-8 pt-3 border-t-2 border-slate-900 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>महाराष्ट्र राज्य परीक्षा मंडळ अभ्यासक्रम मानक</span>
            <span>पालकांची स्वाक्षरी : ____________________</span>
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
            <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
              {/* Field 1: School Name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  १. शाळेचे नाव (School Name):
                </label>
                <input
                  type="text"
                  value={headerForm.schoolName}
                  onChange={(e) => setHeaderForm({ ...headerForm, schoolName: e.target.value })}
                  placeholder="उदा. जिल्हा परिषद शाळा धोंडेवाडी"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-emerald-500/40 rounded-xl font-bold text-slate-900 text-sm outline-none focus:border-emerald-600 focus:bg-white shadow-xs"
                />
              </div>

              {/* Field 2: Exam / Assessment Title */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  २. चाचणी / परीक्षेचे नाव (Exam Title):
                </label>
                <input
                  type="text"
                  value={headerForm.examTitle}
                  onChange={(e) => setHeaderForm({ ...headerForm, examTitle: e.target.value })}
                  placeholder="उदा. आकारिक मूल्यमापन चाचणी क्र. १"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white"
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

              {/* Fields 3, 4, 5: Class, Subject, Total Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ३. इयत्ता (Class):
                  </label>
                  <input
                    type="text"
                    value={headerForm.className}
                    onChange={(e) => setHeaderForm({ ...headerForm, className: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ४. विषय (Subject):
                  </label>
                  <input
                    type="text"
                    value={headerForm.subjectName}
                    onChange={(e) => setHeaderForm({ ...headerForm, subjectName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ५. एकूण गुण (Marks):
                  </label>
                  <input
                    type="text"
                    value={headerForm.totalMarks}
                    onChange={(e) => setHeaderForm({ ...headerForm, totalMarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Fields 6, 7: Student Name & Roll No */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ६. विद्यार्थ्याचे नाव (Student Name):
                  </label>
                  <input
                    type="text"
                    value={headerForm.studentName}
                    onChange={(e) => setHeaderForm({ ...headerForm, studentName: e.target.value })}
                    placeholder="उदा. _____________________ (किंवा विद्यार्थ्याचे नाव)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ७. हजेरी क्रमांक (Roll No.):
                  </label>
                  <input
                    type="text"
                    value={headerForm.rollNo}
                    onChange={(e) => setHeaderForm({ ...headerForm, rollNo: e.target.value })}
                    placeholder="[   ] (रिक्त चौकट)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white text-center"
                  />
                </div>
              </div>

              {/* Fields 8, 9: Date & Marks Obtained */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ८. दिनांक (Date):
                  </label>
                  <input
                    type="text"
                    value={headerForm.examDate}
                    onChange={(e) => setHeaderForm({ ...headerForm, examDate: e.target.value })}
                    placeholder="उदा. दि.   /   / २०२६"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">
                    ९. मिळालेले गुण (Obtained):
                  </label>
                  <input
                    type="text"
                    value={headerForm.obtainedMarks}
                    onChange={(e) => setHeaderForm({ ...headerForm, obtainedMarks: e.target.value })}
                    placeholder="[   ] (तपासणीसाठी)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs sm:text-sm outline-none focus:border-indigo-500 focus:bg-white text-center"
                  />
                </div>
              </div>

              {/* Live Preview Box (Exact Screenshot 1 match) */}
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                  <span>👁️ थेट पूर्वावलोकन (Live Preview - बॉक्स कसा दिसेल):</span>
                </div>
                <div className="bg-white border-2 border-slate-900 rounded-none p-3 text-slate-900 shadow-sm select-none font-sans">
                  {/* Line 1: School Name */}
                  <div className="font-black text-sm tracking-tight mb-1 text-slate-900">
                    शाळेचे नाव : <span className="text-slate-950 font-black">{headerForm.schoolName || "____________________________________"}</span>
                  </div>
                  {/* Line 2: Exam Title */}
                  <div className="text-center font-black text-xs sm:text-sm my-1 text-slate-900">
                    {headerForm.examTitle || "आकारिक मूल्यमापन चाचणी क्र. १"}
                  </div>
                  {/* Line 3: Class, Subject, Marks */}
                  <div className="flex items-center justify-between text-xs font-bold mt-1.5 pt-1 border-t border-slate-200">
                    <div>इयत्ता - <span className="font-black">{headerForm.className || "१ ली"}</span></div>
                    <div>विषय - <span className="font-black">{headerForm.subjectName || "भाषा"}</span></div>
                    <div>एकूण गुण - <span className="font-black">{headerForm.totalMarks || "२०"}</span></div>
                  </div>
                  {/* Line 4: Student Name & Roll No */}
                  <div className="flex items-center justify-between text-xs font-semibold mt-1.5">
                    <div className="flex-1 flex items-center gap-1">
                      <span>विद्यार्थ्याचे नाव :-</span>
                      <span className="flex-1 border-b border-slate-900 inline-block min-w-[100px] max-w-[200px] px-1 font-bold">
                        {headerForm.studentName && headerForm.studentName !== "_____________________" ? headerForm.studentName : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2 shrink-0">
                      <span>हजेरी क्रमांक -</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs bg-white">
                        {headerForm.rollNo}
                      </div>
                    </div>
                  </div>
                  {/* Line 5: Date & Marks */}
                  <div className="flex items-center justify-between text-xs font-semibold mt-1.5">
                    <div>{headerForm.examDate || "दि.   /   / २०२६"}</div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span>मिळालेले गुण -</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-slate-900 rounded-sm flex items-center justify-center font-black text-xs bg-white">
                        {headerForm.obtainedMarks}
                      </div>
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
                  setData((prev) => ({ ...prev, schoolName: "" }));
                  setShowFillSchoolModal(false);
                  toast.info("शाळेचे नाव पूर्ववत करण्यात आले.");
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
                    setData((prev) => ({
                      ...prev,
                      schoolName: cleanSchool,
                      examTitle: headerForm.examTitle,
                      className: headerForm.className,
                      subjectName: headerForm.subjectName,
                      totalMarks: headerForm.totalMarks,
                      studentNamePlaceholder: headerForm.studentName,
                      rollNo: headerForm.rollNo,
                      examDate: headerForm.examDate,
                      obtainedMarks: headerForm.obtainedMarks,
                    }));
                    if (cleanSchool) {
                      saveUnifiedSchoolProfile({ schoolName: cleanSchool });
                      if (userId) {
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
                    }
                    setShowFillSchoolModal(false);
                    toast.success("शाळेचे नाव व परीक्षेचा सर्व तपशील बॉक्समध्ये व्यवस्थित बसवला!");
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
