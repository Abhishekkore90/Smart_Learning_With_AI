import React, { useState, useRef } from "react";
import {
  Printer,
  Download,
  Edit3,
  Eye,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  BookOpen,
  HelpCircle,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import type { QuestionPaperData, QuestionPaperItemDef } from "@/types/questionPaper";
import { QUESTION_PAPER_PRESETS } from "@/data/questionPaperPresets";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

interface QuestionPaperRendererProps {
  initialData?: QuestionPaperData;
  onSave?: (data: QuestionPaperData) => Promise<void> | void;
  canEdit?: boolean;
  onBack?: () => void;
  isStudentView?: boolean;
}

export function QuestionPaperRenderer({
  initialData,
  onSave,
  canEdit = true,
  onBack,
  isStudentView = false,
}: QuestionPaperRendererProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [paperData, setPaperData] = useState<QuestionPaperData>(() => {
    return initialData || QUESTION_PAPER_PRESETS[0];
  });

  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Student interaction states
  const [circledLetters, setCircledLetters] = useState<Record<string, boolean>>({});
  const [circledOptions, setCircledOptions] = useState<Record<string, number>>({});
  const [blankInputs, setBlankInputs] = useState<Record<string, string>>({});
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, string>>({});
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});

  const paperContainerRef = useRef<HTMLDivElement>(null);

  // Preset switch
  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setPaperData(JSON.parse(JSON.stringify(QUESTION_PAPER_PRESETS[index])));
    setCircledLetters({});
    setCircledOptions({});
    setBlankInputs({});
    setSelectedVehicles({});
    setStudentAnswers({});
    toast.info(`${QUESTION_PAPER_PRESETS[index].subject} (${QUESTION_PAPER_PRESETS[index].standard}) प्रश्नपत्रिका लोड झाली!`);
  };

  // Reset to original preset
  const handleReset = () => {
    if (confirm("तुम्हाला खात्री आहे का मूळ प्रश्नपत्रिका पुन्हा लोड करायची आहे?")) {
      const preset = QUESTION_PAPER_PRESETS[selectedPresetIndex] || QUESTION_PAPER_PRESETS[0];
      setPaperData(JSON.parse(JSON.stringify(preset)));
      toast.success("प्रश्नपत्रिका पूर्ववत करण्यात आली.");
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (!paperContainerRef.current) return;
    try {
      setIsExporting(true);
      toast.info("प्रश्नपत्रिका PDF तयार होत आहे...");
      const element = paperContainerRef.current;
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
      pdf.save(`${paperData.subject}_${paperData.standard}_चाचणी.pdf`);
      toast.success("प्रश्नपत्रिका PDF डाऊनलोड झाली!");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.error("PDF डाऊनलोड करताना त्रुटी आली.");
    } finally {
      setIsExporting(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (onSave) {
        await onSave(paperData);
      }
      setMode("view");
      toast.success("प्रश्नपत्रिका यशस्वीरित्या जतन (Save) झाली!");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error("जतन करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers for editing questions
  const updateQuestionTitle = (qIndex: number, newTitle: string) => {
    const next = { ...paperData };
    next.questions[qIndex].title = newTitle;
    setPaperData(next);
  };

  const updateQuestionMarks = (qIndex: number, newMarks: string) => {
    const next = { ...paperData };
    next.questions[qIndex].marks = newMarks;
    setPaperData(next);
  };

  const updateQuestionInstructions = (qIndex: number, newInst: string) => {
    const next = { ...paperData };
    next.questions[qIndex].instructions = newInst;
    setPaperData(next);
  };

  const deleteQuestion = (qIndex: number) => {
    if (confirm("हा प्रश्न हटवायचा आहे का?")) {
      const next = { ...paperData };
      next.questions.splice(qIndex, 1);
      setPaperData(next);
      toast.info("प्रश्न हटवला.");
    }
  };

  const addNewQuestion = () => {
    const next = { ...paperData };
    const qCount = next.questions.length + 1;
    const newQ: QuestionPaperItemDef = {
      id: `custom_q_${Date.now()}`,
      qNo: `प्रश्न ${qCount})`,
      title: "नवीन प्रश्न शीर्षक येथे लिहा...",
      marks: 2,
      type: "read_and_write",
      instructions: "खालील सूचनेनुसार उत्तर लिहा.",
      readWriteWords: [
        { id: "nw1", word: "शब्द १" },
        { id: "nw2", word: "शब्द २" },
        { id: "nw3", word: "शब्द ३" },
      ],
    };
    next.questions.push(newQ);
    setPaperData(next);
    toast.success("नवीन प्रश्न जोडला!");
  };

  return (
    <div className="w-full flex flex-col items-center bg-slate-100 min-h-screen pb-16">
      {/* Top Action Control Header */}
      <div className="w-full max-w-5xl bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Paper Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 whitespace-nowrap flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              प्रश्नपत्रिका निवडा:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUESTION_PAPER_PRESETS.map((preset, idx) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    selectedPresetIndex === idx
                      ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {preset.subject} ({preset.standard})
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setMode(mode === "view" ? "edit" : "view")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                  mode === "edit"
                    ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-300"
                    : "bg-slate-800 hover:bg-slate-900 text-white"
                }`}
              >
                {mode === "edit" ? (
                  <>
                    <Eye className="w-3.5 h-3.5" /> पूर्वावलोकन (Preview)
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5" /> संपादन करा (Edit Text)
                  </>
                )}
              </button>
            )}

            {mode === "edit" && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? "जतन होत आहे..." : "सेव्ह करा (Save)"}
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
            >
              <Printer className="w-3.5 h-3.5" /> प्रिंट
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> {isExporting ? "डाऊनलोड होत आहे..." : "PDF डाऊनलोड"}
            </button>

            <button
              onClick={handleReset}
              title="मूळ स्थितीत आणा"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {mode === "edit" && (
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
            <span>✏️ संपादन मोड सुरू आहे: तुम्ही शाळेचे नाव, प्रश्न, सूचना, गुण आणि शब्द थेट बदलू शकता.</span>
            <button
              onClick={addNewQuestion}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs font-black shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> नवीन प्रश्न जोडा
            </button>
          </div>
        )}
      </div>

      {/* Main A4 Question Paper Sheet Container */}
      <div className="w-full max-w-4xl p-2 sm:p-4 my-4 flex justify-center">
        <div
          ref={paperContainerRef}
          className="w-full bg-white border-2 border-black p-6 sm:p-8 shadow-md text-black font-sans print:border-none print:shadow-none print:p-0 print:m-0"
          style={{ minHeight: "1100px" }}
        >
          {/* ======================================================== */}
          {/* EXAM PAPER HEADER BLOCK                                  */}
          {/* ======================================================== */}
          <div className="border-b-2 border-black pb-3 mb-4 space-y-2">
            {/* School Name */}
            <div className="text-center">
              {mode === "edit" ? (
                <input
                  type="text"
                  value={paperData.schoolName}
                  onChange={(e) => setPaperData({ ...paperData, schoolName: e.target.value })}
                  placeholder="शाळेचे नाव टाका..."
                  className="w-full text-center text-base sm:text-lg font-black border border-dashed border-amber-500 p-1 bg-amber-50/50 rounded focus:outline-none"
                />
              ) : (
                <h1 className="text-base sm:text-lg font-black tracking-wide uppercase">
                  {paperData.schoolName || "शाळेचे नाव : __________________________________"}
                </h1>
              )}
            </div>

            {/* Exam Title */}
            <div className="text-center">
              {mode === "edit" ? (
                <input
                  type="text"
                  value={paperData.examName}
                  onChange={(e) => setPaperData({ ...paperData, examName: e.target.value })}
                  className="w-3/4 text-center text-sm sm:text-base font-black border border-dashed border-amber-500 p-1 bg-amber-50/50 rounded focus:outline-none"
                />
              ) : (
                <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-slate-900">
                  {paperData.examName}
                </h2>
              )}
            </div>

            {/* Std / Subject / Marks Grid */}
            <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold border-t border-b border-black py-1.5 px-2 bg-slate-50/40">
              <div className="flex items-center gap-1.5">
                <span>इयत्ता -</span>
                {mode === "edit" ? (
                  <input
                    type="text"
                    value={paperData.standard}
                    onChange={(e) => setPaperData({ ...paperData, standard: e.target.value })}
                    className="w-16 text-center font-black border border-dashed border-amber-500 bg-amber-50/50 px-1 rounded"
                  />
                ) : (
                  <span className="font-black underline">{paperData.standard}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span>विषय -</span>
                {mode === "edit" ? (
                  <input
                    type="text"
                    value={paperData.subject}
                    onChange={(e) => setPaperData({ ...paperData, subject: e.target.value })}
                    className="w-24 text-center font-black border border-dashed border-amber-500 bg-amber-50/50 px-1 rounded"
                  />
                ) : (
                  <span className="font-black underline">{paperData.subject}</span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span>एकूण गुण -</span>
                {mode === "edit" ? (
                  <input
                    type="number"
                    value={paperData.totalMarks}
                    onChange={(e) => setPaperData({ ...paperData, totalMarks: parseInt(e.target.value, 10) || 20 })}
                    className="w-14 text-center font-black border border-dashed border-amber-500 bg-amber-50/50 px-1 rounded"
                  />
                ) : (
                  <span className="font-black">{paperData.totalMarks}</span>
                )}
              </div>
            </div>

            {/* Student Name & Roll No */}
            <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold pt-1 px-1">
              <div className="flex-1 min-w-[240px] flex items-center gap-2">
                <span>{paperData.studentNameLabel || "विद्यार्थ्याचे नाव :-"}</span>
                <span className="flex-1 border-b border-dotted border-black inline-block min-w-[150px]">&nbsp;</span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <span>{paperData.rollNoLabel || "हजेरी क्रमांक :-"}</span>
                <span className="w-16 border-b border-dotted border-black inline-block text-center">&nbsp;</span>
              </div>
            </div>

            {/* Date & Obtained Marks */}
            <div className="flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold px-1">
              <div className="flex items-center gap-2">
                <span>{paperData.dateLabel || "दि."}</span>
                <span className="border-b border-dotted border-black px-4">___ / ___ / {paperData.date || "२०२६"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{paperData.obtainedMarksLabel || "मिळालेले गुण :-"}</span>
                <span className="w-16 border-b border-dotted border-black inline-block text-center">&nbsp;</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* QUESTIONS LIST                                           */}
          {/* ======================================================== */}
          <div className="space-y-6">
            {paperData.questions.map((q, qIndex) => (
              <div
                key={q.id || qIndex}
                className={`relative pb-4 ${
                  qIndex !== paperData.questions.length - 1 ? "border-b border-slate-300" : ""
                } ${mode === "edit" ? "p-3 bg-amber-50/20 rounded-lg border border-dashed border-amber-300" : ""}`}
              >
                {/* Question Header & Marks */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 flex items-baseline gap-2">
                    {mode === "edit" ? (
                      <div className="w-full space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={q.qNo}
                            onChange={(e) => {
                              const next = { ...paperData };
                              next.questions[qIndex].qNo = e.target.value;
                              setPaperData(next);
                            }}
                            className="w-20 font-black border border-amber-400 px-1 py-0.5 rounded text-sm bg-white"
                          />
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => updateQuestionTitle(qIndex, e.target.value)}
                            className="flex-1 font-black border border-amber-400 px-2 py-0.5 rounded text-sm bg-white"
                          />
                        </div>
                        <input
                          type="text"
                          value={q.instructions || ""}
                          onChange={(e) => updateQuestionInstructions(qIndex, e.target.value)}
                          placeholder="प्रश्न सूचना (उदा. जोड्या जुळवा, खालील शब्द वाचा...)"
                          className="w-full text-xs font-medium text-slate-600 border border-slate-300 px-2 py-0.5 rounded bg-white"
                        />
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-black leading-snug">
                          <span className="mr-1.5">{q.qNo}</span>
                          {q.title}
                        </h3>
                        {q.instructions && (
                          <p className="text-xs text-slate-700 font-bold mt-0.5">{q.instructions}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Marks Display / Edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    {mode === "edit" ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-600">गुण:</span>
                        <input
                          type="text"
                          value={q.marks}
                          onChange={(e) => updateQuestionMarks(qIndex, e.target.value)}
                          className="w-12 text-center font-black border border-amber-400 px-1 py-0.5 rounded text-xs bg-white"
                        />
                        <button
                          onClick={() => deleteQuestion(qIndex)}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                          title="प्रश्न हटवा"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm font-black text-black bg-slate-100 border border-slate-300 px-2 py-0.5 rounded">
                        (गुण {q.marks})
                      </span>
                    )}
                  </div>
                </div>

                {/* ======================================================== */}
                {/* QUESTION RENDERERS BY TYPE                              */}
                {/* ======================================================== */}

                {/* 1. MATCH THE PAIRS (जोड्या जुळव) */}
                {q.type === "match_pairs" && q.matchPairs && (
                  <div className="space-y-4 pt-1">
                    {q.matchPairs.map((sec, secIdx) => (
                      <div key={secIdx} className="space-y-2">
                        {sec.subSectionTitle && (
                          <h4 className="text-xs sm:text-sm font-black text-slate-800 underline">
                            {sec.subSectionTitle}
                          </h4>
                        )}
                        <div className="grid grid-cols-2 gap-4 sm:gap-8 max-w-xl mx-auto py-2">
                          {sec.pairs.map((pair) => (
                            <React.Fragment key={pair.id}>
                              {/* Left column item */}
                              <div className="flex items-center justify-between p-2 border border-black rounded-lg bg-slate-50/60 min-h-[48px]">
                                {pair.leftImageUrl ? (
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={pair.leftImageUrl}
                                      alt={pair.leftText || "चित्र"}
                                      className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded border border-slate-300 bg-white"
                                    />
                                    <span className="text-xs sm:text-sm font-black">{pair.leftText}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm sm:text-base font-black pl-2">{pair.leftText}</span>
                                )}
                                <span className="w-3 h-3 rounded-full border-2 border-black inline-block mr-1"></span>
                              </div>

                              {/* Right column item */}
                              <div className="flex items-center justify-between p-2 border border-black rounded-lg bg-white min-h-[48px]">
                                <span className="w-3 h-3 rounded-full border-2 border-black inline-block ml-1"></span>
                                {pair.rightImageUrl ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-black">{pair.rightText}</span>
                                    <img
                                      src={pair.rightImageUrl}
                                      alt={pair.rightText || "चित्र"}
                                      className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded border border-slate-300 bg-white"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm sm:text-base font-black pr-2">{pair.rightText}</span>
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. TRACE & WRITE (अक्षर / अंक गिरव आणि लिही) */}
                {q.type === "trace_write" && q.traceWriteItems && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {q.traceWriteItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 border-2 border-black rounded-xl bg-white shadow-2xs"
                      >
                        {/* Sample Char */}
                        <div className="w-12 h-12 flex items-center justify-center bg-slate-100 border-r-2 border-black text-2xl sm:text-3xl font-black text-slate-900">
                          {item.char}
                        </div>

                        {/* Dotted Tracing Box */}
                        <div className="flex-1 flex items-center justify-center border-r-2 border-dashed border-slate-400 h-12">
                          <span
                            className="text-2xl sm:text-3xl font-black text-slate-400 tracking-widest"
                            style={{
                              fontFamily: "monospace, sans-serif",
                              letterSpacing: "0.2em",
                              textDecoration: "underline dotted",
                            }}
                          >
                            {item.char}
                          </span>
                        </div>

                        {/* Student Copy Lines */}
                        <div className="flex-1 flex flex-col justify-center px-2 h-12 space-y-1.5">
                          <div className="w-full border-b border-black"></div>
                          <div className="w-full border-b border-black"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. ADD '◌ा' (कानामात्रा जोडून लिही) */}
                {q.type === "add_matra" && q.addMatraItems && (
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-2">
                    {q.addMatraItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 px-3 border border-black rounded-lg bg-slate-50/70 text-sm sm:text-base font-black"
                      >
                        {item.exampleChar && (
                          <span className="text-xs text-slate-600 font-bold mr-1">{item.exampleChar}</span>
                        )}
                        <span className="text-base sm:text-lg font-black">{item.baseChar}</span>
                        <span className="text-slate-400">➔</span>
                        {item.exampleChar ? (
                          <span className="text-base sm:text-lg font-black text-blue-700 underline">
                            {item.resultChar}
                          </span>
                        ) : (
                          <span className="w-12 h-8 border-2 border-black rounded bg-white inline-flex items-center justify-center font-black">
                            &nbsp;
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. CIRCLE THE TARGET LETTERS (अक्षराला गोल कर) */}
                {q.type === "circle_letters" && q.circleLetterGroups && (
                  <div className="space-y-4 pt-1">
                    {q.circleLetterGroups.map((grp) => (
                      <div
                        key={grp.id}
                        className="p-3 border border-black rounded-xl bg-white shadow-2xs space-y-2"
                      >
                        {/* Target letter badge */}
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-amber-100 border-2 border-black flex items-center justify-center font-black text-base text-slate-950 shadow-xs">
                            {grp.targetLetter}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-slate-900">
                            ' <strong className="text-base underline">{grp.targetLetter}</strong> ' या अक्षराला गोल कर:
                          </span>
                        </div>

                        {/* Words to circle */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                          {grp.words.map((word, wIdx) => {
                            const key = `${grp.id}_${wIdx}`;
                            const isCircled = circledLetters[key];
                            return (
                              <button
                                key={wIdx}
                                type="button"
                                onClick={() => {
                                  setCircledLetters({
                                    ...circledLetters,
                                    [key]: !isCircled,
                                  });
                                }}
                                className={`px-3 py-1.5 rounded-full text-sm sm:text-base font-black transition-all border ${
                                  isCircled
                                    ? "border-2 border-red-600 bg-red-50 text-red-700 ring-2 ring-red-200 shadow-sm"
                                    : "border-slate-300 hover:border-black bg-slate-50 text-slate-900"
                                }`}
                              >
                                {word}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. READ AND WRITE (शब्द वाच आणि तसेच लिही) */}
                {q.type === "read_and_write" && q.readWriteWords && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    {q.readWriteWords.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 border-2 border-black rounded-xl bg-white flex flex-col items-center justify-between min-h-[85px]"
                      >
                        {/* Word text */}
                        <span className="text-base sm:text-lg font-black text-black pb-1.5">{item.word}</span>
                        {/* Writing Box */}
                        <div className="w-full border-t-2 border-black pt-1.5 flex justify-center">
                          <span className="w-full h-8 border border-dashed border-slate-400 rounded bg-slate-50/50 inline-flex items-center justify-center text-sm font-bold text-slate-400">
                            [ येथे लिहा ]
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 6. BIG - SMALL VEHICLES (लहान - मोठा गाडी / एक-अनेक) */}
                {q.type === "big_small_vehicles" && (
                  <div className="space-y-4 pt-1">
                    {q.bigSmallData && (
                      <div className="p-3 border border-black rounded-xl bg-white space-y-2">
                        <p className="text-xs sm:text-sm font-black text-slate-900">
                          {q.bigSmallData.questionPrompt}
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-1">
                          {[q.bigSmallData.item1, q.bigSmallData.item2].map((item, iIdx) => (
                            <div
                              key={iIdx}
                              className="flex flex-col items-center p-2 border border-black rounded-lg bg-slate-50/60"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-20 sm:h-24 w-full object-contain rounded bg-white border border-slate-200 p-1"
                              />
                              <p className="text-xs font-bold mt-1 text-slate-800">{item.title}</p>
                              {/* Selection Box */}
                              <div className="w-8 h-8 border-2 border-black rounded bg-white mt-2 flex items-center justify-center font-black">
                                [ &nbsp; ]
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.oneManyData && (
                      <div className="p-3 border border-black rounded-xl bg-white space-y-2">
                        <p className="text-xs sm:text-sm font-black text-slate-900">
                          {q.oneManyData.questionPrompt}
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-1">
                          {[q.oneManyData.item1, q.oneManyData.item2].map((item, iIdx) => (
                            <div
                              key={iIdx}
                              className="flex flex-col items-center p-2 border border-black rounded-lg bg-slate-50/60"
                            >
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="h-20 sm:h-24 w-full object-contain rounded bg-white border border-slate-200 p-1"
                              />
                              <p className="text-xs font-bold mt-1 text-slate-800">{item.title}</p>
                              {/* Selection Circle */}
                              <div className="w-8 h-8 border-2 border-black rounded-full bg-white mt-2 flex items-center justify-center font-black">
                                ( &nbsp; )
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. COLOR SHAPES & DRAW LINES (चित्रे रंगव / रेषा काढ) */}
                {q.type === "color_shapes" && q.colorShapesData && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {q.colorShapesData.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="p-3 border-2 border-black rounded-xl bg-white flex flex-col items-center justify-between min-h-[120px]"
                      >
                        <p className="text-xs sm:text-sm font-black text-slate-900 text-center mb-2">
                          {item.prompt}
                        </p>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.prompt}
                            className="h-16 w-full object-contain p-1 border border-slate-200 rounded"
                          />
                        ) : (
                          <div className="w-full h-16 border-2 border-dashed border-slate-400 rounded flex items-center justify-center text-xs font-bold text-slate-400">
                            [ {item.shapeType} ]
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 8. FILL IN BLANK NUMBERS (रिकाम्या जागी योग्य संख्या लिही) */}
                {q.type === "fill_blanks" && q.fillBlanksData && (
                  <div className="pt-2">
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto p-3 bg-slate-50 border-2 border-black rounded-2xl">
                      {q.fillBlanksData.sequence.map((box, bIdx) => (
                        <div key={bIdx} className="flex items-center">
                          <div
                            className={`w-10 h-10 sm:w-12 sm:h-12 border-2 border-black rounded-xl flex items-center justify-center text-base sm:text-xl font-black ${
                              box.isBlank
                                ? "bg-white border-dashed border-blue-600 text-blue-600 shadow-inner"
                                : "bg-amber-100 text-slate-950"
                            }`}
                          >
                            {box.isBlank ? "" : box.num}
                          </div>
                          {bIdx < q.fillBlanksData!.sequence.length - 1 && (
                            <span className="text-slate-400 font-bold px-0.5">➔</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. COUNT AND CIRCLE CORRECT NUMBER (चित्रे मोज व योग्य संख्येला गोल कर) */}
                {q.type === "count_and_circle" && q.countCircleItems && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {q.countCircleItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 border-2 border-black rounded-xl bg-white flex flex-col items-center justify-between"
                      >
                        {/* Illustration */}
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.imageAlt || "वस्तू"}
                            className="h-20 w-full object-contain border border-slate-200 rounded p-1 bg-slate-50"
                          />
                        )}

                        {/* Options */}
                        <div className="flex items-center justify-around w-full mt-2 pt-1 border-t border-black">
                          {item.options.map((opt, oIdx) => {
                            const isSelected = circledOptions[item.id] === opt;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => {
                                  setCircledOptions({
                                    ...circledOptions,
                                    [item.id]: opt,
                                  });
                                }}
                                className={`w-7 h-7 rounded-full text-xs sm:text-sm font-black flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "border-2 border-red-600 bg-red-50 text-red-700 ring-2 ring-red-200"
                                    : "border border-slate-400 hover:border-black text-black"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 10. COUNT AND WRITE NUMBERS (वस्तू मोज व संख्या लिही) */}
                {q.type === "count_and_write" && q.countWriteItems && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {q.countWriteItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border-2 border-black rounded-xl bg-white flex flex-col items-center justify-between"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-24 w-full object-contain border border-slate-200 rounded p-1 bg-slate-50"
                          />
                        )}
                        <div className="flex items-center justify-between w-full mt-2 pt-2 border-t border-black text-xs sm:text-sm font-black">
                          <span>{item.unitLabel || `${item.name} =`}</span>
                          <span className="w-10 h-8 border-2 border-black rounded bg-white inline-flex items-center justify-center text-sm font-black">
                            &nbsp;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ======================================================== */}
          {/* BOTTOM SIGNATURE BLOCK                                   */}
          {/* ======================================================== */}
          <div className="mt-8 pt-4 border-t-2 border-black flex items-center justify-between text-xs sm:text-sm font-black">
            <div>
              <p>वर्गशिक्षक स्वाक्षरी</p>
            </div>
            <div className="text-center">
              <p>मुख्याध्यापक स्वाक्षरी व शिक्का</p>
            </div>
            <div className="text-right">
              <p>पालक स्वाक्षरी</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
