import React, { useState, useRef } from "react";
import {
  BookOpen,
  Calendar,
  Languages,
  Calculator,
  Sparkles,
  Printer,
  Download,
  Edit3,
  Eye,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import type { HomeworkItem, DailyHomeworkVariables } from "@/types/documentEditor";
import { saveUserDocumentEdits, resetUserDocumentEdits } from "@/services/documentEngine";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

interface DailyHomeworkTemplateProps {
  homework: HomeworkItem;
  userId?: string;
  userRole?: string;
  userName?: string;
  canEdit?: boolean;
  onBack?: () => void;
}

export function DailyHomeworkTemplate({
  homework,
  userId = "guest_user",
  userRole = "teacher",
  userName,
  canEdit = true,
  onBack,
}: DailyHomeworkTemplateProps) {
  // Initialize dynamic variables from homework record or fallback defaults
  const [variables, setVariables] = useState<DailyHomeworkVariables>(() => {
    return (
      homework.variables || {
        weekday: getMarathiWeekday(homework.homeworkDate || new Date().toISOString()),
        date: formatMarathiDate(homework.homeworkDate || new Date().toISOString()),
        schoolName: "जिल्हा परिषद प्राथमिक शाळा",
        kendra: "केंद्र शाळा",
        marathi: {
          subjectName: "मराठी (Language)",
          topic: "पाठ वाचन व शब्दलेखन",
          instructions: "खालील दिलेले शब्द वाचा आणि सुंदर हस्ताक्षरात वहीत लिहा:",
          questions: [
            "१. खालील शब्दांचे जोडाक्षर ओळखा व लिहा: पुस्तक, रस्ता, चष्मा",
            "२. दिलेल्या अक्षरांपासून अर्थपूर्ण शब्द बनवा: क, म, ळ",
            "३. तुमच्या आवडीच्या फळाचे नाव लिहून त्याचे चित्र काढा.",
          ],
          examples: ["उदा: घर -> घरटे, झाड -> झाडे"],
        },
        english: {
          subjectName: "English",
          topic: "Action Words & Simple Sentences",
          instructions: "Read the words and write 2 lines for each action:",
          questions: [
            "1. Write 3 action words that you do daily (e.g. Read, Write, Play).",
            "2. Fill in the blanks: The sun rises in the ____ (East/West).",
            "3. Match the rhyming words: Cat - Mat, Sun - Fun.",
          ],
        },
        maths: {
          subjectName: "गणित (Mathematics)",
          topic: "संख्या ज्ञान व बेरीज-वजाबाकी",
          instructions: "खालील उदाहरणे समजून घेऊन सोडवा:",
          questions: [
            "१. योग्य संख्या लिहा: २५ + १५ = [   ]",
            "२. लहान-मोठेपणा ओळखा (> किंवा <): ४२ [   ] ५८",
            "३. चढत्या क्रमाने मांडा: १२, ४५, २३, ९",
          ],
          examples: ["उदा: १० + ५ = १५"],
        },
        activity: {
          title: "दैनिक उपक्रम / खेळ (Daily Activity)",
          description: "आज घरातील कोणत्याही ५ वस्तूंची नावे मराठी व इंग्रजीमध्ये सांगा व पालकांना दाखवा.",
          instructions: "पालकांनी मुलांचा अभ्यास तपासून शेरा द्यावा.",
        },
      }
    );
  });

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const worksheetRef = useRef<HTMLDivElement>(null);

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!worksheetRef.current) return;
    try {
      setIsExporting(true);
      toast.info("वर्कशीट PDF तयार होत आहे...");
      const element = worksheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`गृहपाठ_${homework.class}_${homework.homeworkDate || "daily"}.pdf`);
      toast.success("गृहपाठ PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error("PDF डाउनलोड करताना त्रुटी आली.");
    } finally {
      setIsExporting(false);
    }
  };

  // Save Edits (User specific)
  const handleSaveEdits = async () => {
    if (!userId) {
      toast.error("कृपया लॉगिन करा.");
      return;
    }
    try {
      setIsSaving(true);
      // Map variables to pseudo text blocks for user edits persistence
      const textBlocks = [
        {
          id: "template_vars",
          text: JSON.stringify(variables),
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fontSize: 14,
          editable: true,
        },
      ];
      await saveUserDocumentEdits(
        "homework",
        homework.id,
        userId,
        [{ pageNumber: 1, textBlocks }],
        userRole,
        userName
      );
      toast.success("गृहपाठ बदल जतन झाले!");
    } catch (e: any) {
      toast.error("जतन करताना त्रुटी: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original
  const handleReset = async () => {
    if (!window.confirm("मूळ गृहपाठ पुनर्संचयित करायचा आहे का?")) return;
    try {
      setIsSaving(true);
      if (userId) {
        await resetUserDocumentEdits("homework", homework.id, userId);
      }
      if (homework.variables) {
        setVariables(homework.variables);
      }
      toast.success("मूळ गृहपाठ परत आणला गेला!");
    } catch (e: any) {
      toast.error("त्रुटी: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-slate-100 font-sans">
      {/* Top Toolbar */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <BookOpen className="size-4 text-amber-400" />
              <span>दैनिक गृहपाठ (Daily Homework Worksheet)</span>
            </h2>
            <p className="text-[11px] text-amber-200/80 font-medium">
              {homework.class} • {homework.medium === "marathi" ? "मराठी माध्यम" : "सेमी माध्यम"} • {variables.date} ({variables.weekday})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setMode("view")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === "view"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Eye className="size-3.5" />
                <span>पहा (View)</span>
              </button>
              <button
                onClick={() => setMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === "edit"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Edit3 className="size-3.5" />
                <span>संपादित करा (Edit)</span>
              </button>
            </div>
          )}

          {canEdit && mode === "edit" && (
            <button
              onClick={handleSaveEdits}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>सेव्ह करा</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="मूळ स्वरूपात आणा"
          >
            <RotateCcw className="size-4" />
          </button>

          <button
            onClick={handlePrint}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="प्रिंट"
          >
            <Printer className="size-4" />
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            <Download className="size-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Printable / Renderable Worksheet Container */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center bg-slate-800/80 custom-scrollbar">
        <div
          ref={worksheetRef}
          className="w-full max-w-[760px] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border-4 border-amber-600/30 print:border-none print:shadow-none print:p-4 select-text"
          style={{ fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif" }}
        >
          {/* Header Banner */}
          <div className="border-b-2 border-dashed border-amber-500 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="size-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <BookOpen className="size-8 text-amber-600" />
              </div>

              <div className="text-center flex-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-0.5 rounded-full inline-block mb-1">
                  बालभारती दैनिक गृहपाठ कार्यपुस्तिका २०२६-२७
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {mode === "edit" ? (
                    <input
                      type="text"
                      value={variables.schoolName || ""}
                      onChange={(e) =>
                        setVariables({ ...variables, schoolName: e.target.value })
                      }
                      className="text-center w-full border-b border-amber-400 outline-none font-bold"
                      placeholder="शाळेचे नाव"
                    />
                  ) : (
                    variables.schoolName || "जिल्हा परिषद प्राथमिक शाळा"
                  )}
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  इयत्ता: <strong>{homework.class}</strong> | माध्यम:{" "}
                  <strong>{homework.medium === "marathi" ? "मराठी" : "सेमी इंग्रजी"}</strong>
                </p>
              </div>

              <div className="size-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <Sparkles className="size-8 text-orange-600" />
              </div>
            </div>

            {/* Date and Metadata Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs font-bold text-slate-700 bg-amber-50/70 p-2.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-amber-600" />
                <span>दिनांक:</span>
                {mode === "edit" ? (
                  <input
                    type="text"
                    value={variables.date}
                    onChange={(e) => setVariables({ ...variables, date: e.target.value })}
                    className="border-b border-amber-400 bg-transparent px-1 outline-none font-bold text-slate-900"
                  />
                ) : (
                  <strong className="text-slate-900">{variables.date}</strong>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span>वार:</span>
                {mode === "edit" ? (
                  <input
                    type="text"
                    value={variables.weekday}
                    onChange={(e) => setVariables({ ...variables, weekday: e.target.value })}
                    className="border-b border-amber-400 bg-transparent px-1 outline-none font-bold text-slate-900"
                  />
                ) : (
                  <strong className="text-slate-900">{variables.weekday}</strong>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span>विद्यार्थ्याचे नाव: ____________________</span>
                <span>हजेरी क्र.: ______</span>
              </div>
            </div>
          </div>

          {/* Section 1: Marathi (भाषा) */}
          {variables.marathi && (
            <div className="mb-6 border-2 border-emerald-500/30 rounded-2xl p-4 bg-emerald-50/30">
              <div className="flex items-center justify-between gap-2 border-b border-emerald-200 pb-2 mb-3">
                <h3 className="text-sm font-black text-emerald-800 flex items-center gap-2">
                  <Languages className="size-4 text-emerald-600" />
                  <span>विषय - {variables.marathi.subjectName}</span>
                </h3>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  घटक: {variables.marathi.topic}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700 mb-2 italic">
                {variables.marathi.instructions}
              </p>

              <div className="space-y-2">
                {variables.marathi.questions.map((q, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                    {mode === "edit" ? (
                      <textarea
                        rows={2}
                        value={q}
                        onChange={(e) => {
                          const updated = [...variables.marathi!.questions];
                          updated[idx] = e.target.value;
                          setVariables({
                            ...variables,
                            marathi: { ...variables.marathi!, questions: updated },
                          });
                        }}
                        className="w-full text-xs font-medium border border-slate-200 rounded p-1 outline-none"
                      />
                    ) : (
                      <p className="text-xs font-bold text-slate-800">{q}</p>
                    )}
                    {/* Writing space box */}
                    <div className="mt-2 h-8 border-b-2 border-dotted border-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Mathematics (गणित) */}
          {variables.maths && (
            <div className="mb-6 border-2 border-blue-500/30 rounded-2xl p-4 bg-blue-50/30">
              <div className="flex items-center justify-between gap-2 border-b border-blue-200 pb-2 mb-3">
                <h3 className="text-sm font-black text-blue-800 flex items-center gap-2">
                  <Calculator className="size-4 text-blue-600" />
                  <span>विषय - {variables.maths.subjectName}</span>
                </h3>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  घटक: {variables.maths.topic}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700 mb-2 italic">
                {variables.maths.instructions}
              </p>

              <div className="space-y-2">
                {variables.maths.questions.map((q, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-xs">
                    {mode === "edit" ? (
                      <textarea
                        rows={2}
                        value={q}
                        onChange={(e) => {
                          const updated = [...variables.maths!.questions];
                          updated[idx] = e.target.value;
                          setVariables({
                            ...variables,
                            maths: { ...variables.maths!, questions: updated },
                          });
                        }}
                        className="w-full text-xs font-medium border border-slate-200 rounded p-1 outline-none"
                      />
                    ) : (
                      <p className="text-xs font-bold text-slate-800">{q}</p>
                    )}
                    <div className="mt-2 h-8 border-b-2 border-dotted border-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: English */}
          {variables.english && (
            <div className="mb-6 border-2 border-purple-500/30 rounded-2xl p-4 bg-purple-50/30">
              <div className="flex items-center justify-between gap-2 border-b border-purple-200 pb-2 mb-3">
                <h3 className="text-sm font-black text-purple-800 flex items-center gap-2">
                  <BookOpen className="size-4 text-purple-600" />
                  <span>Subject - {variables.english.subjectName}</span>
                </h3>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  Unit: {variables.english.topic}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700 mb-2 italic">
                {variables.english.instructions}
              </p>

              <div className="space-y-2">
                {variables.english.questions.map((q, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-xl border border-purple-100 shadow-xs">
                    {mode === "edit" ? (
                      <textarea
                        rows={2}
                        value={q}
                        onChange={(e) => {
                          const updated = [...variables.english!.questions];
                          updated[idx] = e.target.value;
                          setVariables({
                            ...variables,
                            english: { ...variables.english!, questions: updated },
                          });
                        }}
                        className="w-full text-xs font-medium border border-slate-200 rounded p-1 outline-none"
                      />
                    ) : (
                      <p className="text-xs font-bold text-slate-800">{q}</p>
                    )}
                    <div className="mt-2 h-8 border-b-2 border-dotted border-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Daily Activity */}
          {variables.activity && (
            <div className="border-2 border-amber-500/40 rounded-2xl p-4 bg-amber-50/50 mb-6">
              <h3 className="text-sm font-black text-amber-900 flex items-center gap-2 mb-2">
                <Sparkles className="size-4 text-amber-600" />
                <span>{variables.activity.title}</span>
              </h3>
              <p className="text-xs font-bold text-slate-800 mb-1">
                {variables.activity.description}
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                {variables.activity.instructions}
              </p>
            </div>
          )}

          {/* Footer Signature Box */}
          <div className="mt-8 pt-4 border-t-2 border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
            <div>
              <span>पालकांची स्वाक्षरी (Parent's Sign)</span>
              <div className="mt-6 border-b border-slate-400 w-36" />
            </div>
            <div className="text-center">
              <span>शेरा / गुण (Remarks)</span>
              <div className="mt-2 px-6 py-2 border border-slate-300 rounded-lg inline-block text-emerald-700">
                उत्कृष्ट ★★★
              </div>
            </div>
            <div className="text-right">
              <span>वर्गशिक्षक स्वाक्षरी (Teacher's Sign)</span>
              <div className="mt-6 border-b border-slate-400 w-36 ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getMarathiWeekday(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDay();
    const days = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
    return days[day] || "बुधवार";
  } catch {
    return "बुधवार";
  }
}

function formatMarathiDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = [
      "जानेवारी",
      "फेब्रुवारी",
      "मार्च",
      "एप्रिल",
      "मे",
      "जून",
      "जुलै",
      "ऑगस्ट",
      "सप्टेंबर",
      "ऑक्टोबर",
      "नोव्हेंबर",
      "डिसेंबर",
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}
