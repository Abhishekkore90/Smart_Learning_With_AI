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
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import type { QuestionPaperItem } from "@/types/documentEditor";
import { jsPDF } from "jspdf";
import { getUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";

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
  schoolName: "जि. प. प्राथमिक शाळा, ________________________",
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
  const [data, setData] = useState<QuestionPaperData>(() => {
    const profileSchool = (() => {
      try {
        const u = getUnifiedSchoolProfile();
        if (u?.schoolName?.trim()) return u.schoolName.trim();
      } catch (e) {}
      return null;
    })();
    return {
      ...DEFAULT_PAPER_DATA,
      schoolName: profileSchool || (userName ? `जि. प. प्राथमिक शाळा (${userName})` : DEFAULT_PAPER_DATA.schoolName),
      examTitle: paper?.examTypeLabel || paper?.title || DEFAULT_PAPER_DATA.examTitle,
      className: paper?.class ? `${paper.class} ली` : DEFAULT_PAPER_DATA.className,
      subjectName: paper?.subject || DEFAULT_PAPER_DATA.subjectName,
      totalMarks: paper?.totalMarks ? String(paper.totalMarks) : DEFAULT_PAPER_DATA.totalMarks,
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const storageKey = `qp_custom_template_${paper?.id || "default"}_${userId || "guest"}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setData(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, [storageKey]);

  const handleSave = () => {
    try {
      setIsSaving(true);
      localStorage.setItem(storageKey, JSON.stringify(data));
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
      setData(DEFAULT_PAPER_DATA);
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
                const current = data.schoolName;
                const promptVal = window.prompt("शाळेचे नाव प्रविष्ट करा (Enter School Name):", current);
                if (promptVal !== null && promptVal.trim()) {
                  setData((prev) => ({ ...prev, schoolName: promptVal.trim() }));
                  toast.success("शाळेचे नाव अपडेट केले!");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border border-emerald-400/40"
              title="शाळेचे नाव भरा"
            >
              <GraduationCap className="size-3.5 text-emerald-100" />
              <span>शाळेचे नाव भरा</span>
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
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="size-3.5" />
            <span>प्रिंट</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
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
          <div className="border-2 border-slate-900 rounded-lg p-4 mb-6">
            {/* School Name */}
            <div className="mb-3 text-center sm:text-left">
              {isEditing ? (
                <input
                  type="text"
                  value={data.schoolName}
                  onChange={(e) => setData({ ...data, schoolName: e.target.value })}
                  className="w-full text-center sm:text-left text-lg sm:text-xl font-black text-slate-900 border-b-2 border-indigo-500 outline-none pb-1 bg-amber-50/50"
                  placeholder="शाळेचे नाव प्रविष्ट करा"
                />
              ) : (
                <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {data.schoolName}
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

            {/* Student Name, Roll No, Marks Obtained */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-2 border-t border-dashed border-slate-200 text-xs font-semibold">
              <div className="sm:col-span-2">
                <span>{data.studentNamePlaceholder}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center gap-1">
                  <span>हजेरी क्र.</span>
                  <div className="w-9 h-6 border border-slate-800 rounded flex items-center justify-center font-bold">
                    {data.rollNo}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span>मिळालेले गुण:</span>
                  <div className="w-10 h-6 border-2 border-slate-900 rounded flex items-center justify-center font-black text-indigo-700">
                    {data.obtainedMarks}
                  </div>
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
    </div>
  );
}
