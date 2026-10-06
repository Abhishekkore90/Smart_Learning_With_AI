import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Printer,
  Download,
  Save,
  RotateCcw,
  Edit3,
  ChevronLeft,
  CheckCircle2,
  Plus,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Layers,
  FileCheck,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import type { QuestionPaperItem } from "@/types/documentEditor";
import {
  generateDocxFromQuestionPaper,
  downloadBlobAsFile,
} from "@/services/pdfToWordConverter";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  getUnifiedSchoolProfile,
  fetchUnifiedSchoolProfile,
  saveUnifiedSchoolProfile,
} from "@/utils/schoolProfileHelper";

export interface QuestionPaperManualEditorProps {
  paper: QuestionPaperItem;
  userId?: string;
  userRole?: string;
  userName?: string;
  canEdit?: boolean;
  onBack?: () => void;
}

interface QuestionPaperEditState {
  schoolName: string;
  examTitle: string;
  className: string;
  subjectName: string;
  totalMarks: string;
  academicYear: string;
  examTime: string;
  examDate: string;
  studentNamePlaceholder: string;
  rollNo: string;
  content: string;
}

export function QuestionPaperManualEditor({
  paper,
  userId = "guest_teacher",
  userRole = "teacher",
  userName,
  canEdit = true,
  onBack,
}: QuestionPaperManualEditorProps) {
  const initialSchool = (() => {
    try {
      const u = getUnifiedSchoolProfile();
      if (u?.schoolName?.trim() && !u.schoolName.includes("___")) return u.schoolName.trim();
    } catch (e) {}
    return "जिल्हा परिषद प्राथमिक शाळा";
  })();

  let rawContent = paper.content || paper.description || "";
  if (rawContent && rawContent.includes("शाळेचे नाव") && /[-_.~=—–•\.]{4,}/.test(rawContent)) {
    rawContent = rawContent.replace(/शाळेचे नाव\s*[-_.~=—–•\.]{4,}/g, `शाळेचे नाव : ${initialSchool}`);
  }

  // Initial state derived from paper
  const initialData: QuestionPaperEditState = {
    schoolName: initialSchool,
    examTitle: paper.examTypeLabel || paper.title || "चाचणी परीक्षा",
    className: paper.class ? `${paper.class} ली` : "१ ली",
    subjectName: paper.subject || "मराठी",
    totalMarks: paper.totalMarks || "२०",
    academicYear: paper.academicYear || "२०२६-२७",
    examTime: "१ तास",
    examDate: new Date().toLocaleDateString("mr-IN"),
    studentNamePlaceholder: "विद्यार्थ्याचे नाव : ________________________________________",
    rollNo: "____",
    content: rawContent,
  };

  const [data, setData] = useState<QuestionPaperEditState>(initialData);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);
  const [hasEdits, setHasEdits] = useState<boolean>(false);

  const storageKey = `qp_manual_edit_${paper.id}_${userId}`;

  // Load saved edits from Firestore and localStorage
  useEffect(() => {
    let isMounted = true;
    async function loadEdits() {
      let resolvedSchool = "";
      try {
        const u = getUnifiedSchoolProfile();
        if (u?.schoolName?.trim() && !u.schoolName.includes("___")) {
          resolvedSchool = u.schoolName.trim();
        }
      } catch (e) {}

      if (!resolvedSchool && userId && userId !== "guest_teacher") {
        try {
          const fetched = await fetchUnifiedSchoolProfile(userId);
          if (fetched?.schoolName?.trim() && !fetched.schoolName.includes("___")) {
            resolvedSchool = fetched.schoolName.trim();
          }
        } catch (e) {}
      }

      // 1. Check localStorage first for instant load
      try {
        const local = localStorage.getItem(storageKey);
        if (local && isMounted) {
          const parsed = JSON.parse(local);
          const isDashed = !parsed.schoolName || parsed.schoolName.includes("___") || /[-_.~=—–•\.]{4,}/.test(parsed.schoolName);
          if ((isDashed || !parsed.schoolName) && resolvedSchool) {
            parsed.schoolName = resolvedSchool;
          }
          setData(parsed);
          setHasEdits(true);
        } else if (resolvedSchool && isMounted) {
          setData((prev) => ({ ...prev, schoolName: resolvedSchool }));
        }
      } catch (e) {
        // ignore
      }

      // 2. Check Firestore
      if (userId && paper.id) {
        try {
          const docRef = doc(db, "users", userId, "questionPaperEdits", paper.id);
          const snap = await getDoc(docRef);
          if (snap.exists() && isMounted) {
            const remoteData = snap.data() as QuestionPaperEditState;
            const isDashed = !remoteData.schoolName || remoteData.schoolName.includes("___") || /[-_.~=—–•\.]{4,}/.test(remoteData.schoolName);
            if ((isDashed || !remoteData.schoolName) && resolvedSchool) {
              remoteData.schoolName = resolvedSchool;
            }
            setData(remoteData);
            setHasEdits(true);
            localStorage.setItem(storageKey, JSON.stringify(remoteData));
          }
        } catch (err) {
          console.warn("Firestore edit read error:", err);
        }
      }
    }

    loadEdits();
    return () => {
      isMounted = false;
    };
  }, [paper.id, userId, storageKey]);

  // Save manual edits to Firestore and local storage
  const handleSaveEdits = async () => {
    try {
      setIsSaving(true);
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (data.schoolName?.trim()) {
        saveUnifiedSchoolProfile({ schoolName: data.schoolName.trim() });
      }

      if (userId && paper.id) {
        try {
          const docRef = doc(db, "users", userId, "questionPaperEdits", paper.id);
          await setDoc(
            docRef,
            {
              ...data,
              paperId: paper.id,
              userId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn("Firestore save warning:", err);
        }
      }

      setHasEdits(true);
      toast.success("प्रश्नपत्रिकेतील बदल यशस्वीरीत्या जतन केले गेले!");
    } catch (err: any) {
      toast.error("जतन करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to initial
  const handleReset = () => {
    if (window.confirm("सर्व बदल पूर्ववत करून मूळ प्रश्नपत्रिका दाखवायची आहे का?")) {
      localStorage.removeItem(storageKey);
      setData(initialData);
      setHasEdits(false);
      toast.success("प्रश्नपत्रिका पूर्ववत केली गेली.");
    }
  };

  // Download edited document as Word (.docx)
  const handleDownloadDocx = async () => {
    try {
      setIsGeneratingDocx(true);
      toast.info("Word (.docx) फाईल तयार करत आहे...");

      const blob = await generateDocxFromQuestionPaper({
        title: data.examTitle,
        schoolName: data.schoolName,
        className: data.className,
        subject: data.subjectName,
        examTypeLabel: data.examTitle,
        totalMarks: data.totalMarks,
        academicYear: data.academicYear,
        examDate: data.examDate,
        time: data.examTime,
        studentNamePlaceholder: data.studentNamePlaceholder,
        rollNo: data.rollNo,
        content: data.content,
      });

      const safeFileName = `${data.examTitle}_${data.className}_${data.subjectName}.docx`.replace(
        /[\\/:*?"<>| ]/g,
        "_"
      );
      downloadBlobAsFile(blob, safeFileName);
      toast.success("Word (.docx) फाईल यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      console.error("Docx generation error:", err);
      toast.error("Word फाईल तयार करताना त्रुटी आली.");
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Print paper
  const handlePrint = () => {
    window.print();
  };

  // Quick insertion helpers for question paper editing
  const insertTextAtCursor = (insertion: string) => {
    setData((prev) => ({
      ...prev,
      content: prev.content ? `${prev.content}\n${insertion}` : insertion,
    }));
  };

  return (
    <div className="flex flex-col w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden font-sans text-slate-100">
      {/* TOP ACTION TOOLBAR */}
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
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/30 flex items-center gap-1">
                <FileText className="size-3" /> Word (.docx) संपादन
              </span>
              {hasEdits && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  बदल जतन केलेले आहेत
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 mt-0.5">
              <span>{data.examTitle}</span>
              <span className="text-amber-400 text-xs font-semibold">({data.className})</span>
            </h2>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Toggle Edit vs Preview Mode */}
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
              <span>{isEditing ? "पूर्वावलोकन पहा (Preview)" : "मजकूर संपादित करा (Edit)"}</span>
            </button>
          )}

          {/* Save Button */}
          {canEdit && (
            <button
              onClick={handleSaveEdits}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Save className="size-3.5" />
              <span>{isSaving ? "जतन करत आहे..." : "बदल जतन करा"}</span>
            </button>
          )}

          {/* Reset Button */}
          {canEdit && hasEdits && (
            <button
              onClick={handleReset}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="सर्व बदल पूर्ववत करा (Reset)"
            >
              <RotateCcw className="size-4" />
            </button>
          )}

          {/* Download Word (.docx) */}
          <button
            onClick={handleDownloadDocx}
            disabled={isGeneratingDocx}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="नवीनतम बदलांसह Word (.docx) फाईल डाउनलोड करा"
          >
            <Download className="size-3.5" />
            <span>{isGeneratingDocx ? "तयार करत आहे..." : "Word (.docx) डाऊनलोड"}</span>
          </button>

          {/* Original Word file download if admin uploaded one */}
          {paper.wordFileUrl && userRole === "admin" && (
            <a
              href={paper.wordFileUrl}
              download={paper.wordFileName || "question_paper.docx"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-500/30"
              title="अॅडमिनने अपलोड केलेली मूळ Word (.docx) फाईल डाऊनलोड करा"
            >
              <FileCheck className="size-3.5" />
              <span>मूळ Word फाईल</span>
            </a>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="size-3.5" />
            <span>प्रिंट / PDF</span>
          </button>
        </div>
      </div>

      {/* QUICK SNIPPET HELPER TOOLBAR (VISIBLE IN EDIT MODE) */}
      {isEditing && canEdit && (
        <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 py-2 flex items-center flex-wrap gap-2 text-xs no-print">
          <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px]">
            <Sparkles className="size-3 text-amber-400" /> झटपट जोडा:
          </span>
          <button
            onClick={() => insertTextAtCursor("प्र. योग्य जोड्या जुळवा. [४ गुण]\nअ गट\t\tब गट\n१) ________\t\tअ) ________\n२) ________\t\tब) ________")}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            + जोड्या जुळवा
          </button>
          <button
            onClick={() => insertTextAtCursor("प्र. रिकाम्या जागी योग्य शब्द भरा. [४ गुण]\n१) __________________________________\n२) __________________________________")}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            + रिकाम्या जागा
          </button>
          <button
            onClick={() => insertTextAtCursor("प्र. एका वाक्यात उत्तरे लिहा. [५ गुण]\n१) __________________________________\n२) __________________________________")}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            + एका वाक्यात उत्तरे
          </button>
          <button
            onClick={() => insertTextAtCursor("प्र. चूक की बरोबर ते सांगा. [३ गुण]\n१) _________________ [       ]\n२) _________________ [       ]")}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            + चूक की बरोबर
          </button>
          <button
            onClick={() => insertTextAtCursor("--------------------------------------------------------------------------------")}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            + रेषा (Divider)
          </button>
        </div>
      )}

      {/* PAPER CANVAS CONTAINER */}
      <div className="p-4 sm:p-8 flex justify-center bg-slate-950/40 min-h-[800px] overflow-x-auto">
        <div
          id="question-paper-print-area"
          className="w-full max-w-[800px] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 font-sans print:m-0 print:p-6 print:border-none print:shadow-none print:w-full print:max-w-none"
          style={{ minHeight: "1050px" }}
        >
          {/* HEADER SECTION */}
          <div className="space-y-3 pb-3 border-b-2 border-slate-800">
            {/* School Name */}
            {isEditing && canEdit ? (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider no-print">
                  शाळेचे नाव (School Name):
                </label>
                <input
                  type="text"
                  value={data.schoolName}
                  onChange={(e) => setData({ ...data, schoolName: e.target.value })}
                  className="w-full text-center text-lg sm:text-xl font-black text-slate-900 border border-blue-300 rounded-lg p-1.5 focus:ring-2 focus:ring-blue-500 outline-hidden bg-blue-50/30"
                  placeholder="शाळेचे नाव प्रविष्ट करा..."
                />
              </div>
            ) : (
              <h1 className="text-center text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {data.schoolName}
              </h1>
            )}

            {/* Exam Title & Academic Year */}
            {isEditing && canEdit ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 no-print">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    परीक्षेचे नाव (Exam Title):
                  </label>
                  <input
                    type="text"
                    value={data.examTitle}
                    onChange={(e) => setData({ ...data, examTitle: e.target.value })}
                    className="w-full text-center text-sm font-bold text-slate-900 border border-slate-300 rounded-lg p-1 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    शैक्षणिक वर्ष (Academic Year):
                  </label>
                  <input
                    type="text"
                    value={data.academicYear}
                    onChange={(e) => setData({ ...data, academicYear: e.target.value })}
                    className="w-full text-center text-sm font-bold text-slate-900 border border-slate-300 rounded-lg p-1 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center text-base sm:text-lg font-bold text-slate-800">
                {data.examTitle} ({data.academicYear})
              </div>
            )}

            {/* Meta Table (Class, Subject, Time, Total Marks) */}
            <div className="border border-slate-400 rounded-lg overflow-hidden text-xs sm:text-sm font-bold">
              {isEditing && canEdit ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2 bg-slate-50 border-b border-slate-200 no-print">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block">इयत्ता:</label>
                    <input
                      type="text"
                      value={data.className}
                      onChange={(e) => setData({ ...data, className: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block">विषय:</label>
                    <input
                      type="text"
                      value={data.subjectName}
                      onChange={(e) => setData({ ...data, subjectName: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block">वेळ:</label>
                    <input
                      type="text"
                      value={data.examTime}
                      onChange={(e) => setData({ ...data, examTime: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block">एकूण गुण:</label>
                    <input
                      type="text"
                      value={data.totalMarks}
                      onChange={(e) => setData({ ...data, totalMarks: e.target.value })}
                      className="w-full border border-slate-300 rounded p-1 text-xs"
                    />
                  </div>
                </div>
              ) : null}

              {/* Printable Meta Bar */}
              <div className="grid grid-cols-4 divide-x divide-slate-400 bg-slate-100 p-2 text-center text-slate-900">
                <div>इयत्ता: {data.className}</div>
                <div>विषय: {data.subjectName}</div>
                <div>वेळ: {data.examTime}</div>
                <div>एकूण गुण: {data.totalMarks}</div>
              </div>
            </div>

            {/* Student Info Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-xs sm:text-sm font-semibold text-slate-800">
              <div className="flex-1 w-full">
                {isEditing && canEdit ? (
                  <input
                    type="text"
                    value={data.studentNamePlaceholder}
                    onChange={(e) => setData({ ...data, studentNamePlaceholder: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1 text-xs no-print"
                    placeholder="विद्यार्थ्याचे नाव..."
                  />
                ) : null}
                <div className={isEditing && canEdit ? "hidden print:block" : "block"}>
                  {data.studentNamePlaceholder}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div>दिनांक: {data.examDate}</div>
                <div>हजेरी क्र: {data.rollNo}</div>
              </div>
            </div>
          </div>

          {/* MAIN QUESTION PAPER BODY */}
          <div className="pt-6 space-y-4">
            {isEditing && canEdit ? (
              <div className="space-y-2 no-print">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="size-3.5 text-blue-600" />
                    <span>प्रश्नपत्रिका मजकूर संपादन (Edit Question Paper Content):</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (इथे तुम्ही कोणताही प्रश्न, गुण, सूचना बदलू किंवा नवीन प्रश्न जोडू शकता)
                  </span>
                </div>
                <textarea
                  rows={22}
                  value={data.content}
                  onChange={(e) => setData({ ...data, content: e.target.value })}
                  className="w-full p-4 font-mono text-sm leading-relaxed border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50/50 text-slate-900"
                  placeholder="प्रश्नपत्रिका मजकूर इथे लिहा किंवा संपादित करा..."
                />
              </div>
            ) : null}

            {/* FORMATTED PREVIEW & PRINTABLE VIEW */}
            <div
              className={`space-y-4 text-slate-900 leading-relaxed ${
                isEditing && canEdit ? "hidden print:block" : "block"
              }`}
            >
              {data.content ? (
                data.content.split("\n").map((line, idx) => {
                  const trimmed = line.trim();
                  if (!trimmed) {
                    return <div key={idx} className="h-3" />;
                  }

                  const isQuestion =
                    trimmed.startsWith("प्र.") ||
                    trimmed.startsWith("प्रश्न") ||
                    trimmed.startsWith("सूचना") ||
                    trimmed.startsWith("विभाग") ||
                    /^[Qq]u?(estion|\.)?\s*\d+/.test(trimmed) ||
                    /^\d+[\.\)]\s/.test(trimmed);

                  // Check if line has right-aligned marks like [५ गुण]
                  const marksMatch = trimmed.match(/(\[[^\]]+गुण\]|\([^)]+गुण\)|\(\d+\)|\[\d+\])$/);
                  if (marksMatch) {
                    const marks = marksMatch[0];
                    const questionText = trimmed.substring(0, trimmed.length - marks.length).trim();
                    return (
                      <div
                        key={idx}
                        className={`flex items-start justify-between gap-4 py-1 ${
                          isQuestion ? "font-bold text-slate-900 mt-2" : "text-slate-800"
                        }`}
                      >
                        <div className="flex-1">{questionText}</div>
                        <div className="font-bold text-slate-900 whitespace-nowrap pl-2">
                          {marks}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className={`${
                        isQuestion
                          ? "font-bold text-slate-900 text-sm sm:text-base mt-3 pt-1 border-t border-slate-100"
                          : "text-slate-800 text-xs sm:text-sm pl-2"
                      }`}
                    >
                      {line}
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 italic">
                  प्रश्नपत्रिकेत कोणताही मजकूर नाही. 'मजकूर संपादित करा' बटण दाबून प्रश्न जोडा.
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-12 pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <div>स्मार्ट लर्निंग विथ एआय — प्रश्नपत्रिका पोर्टल</div>
            <div>शुभचिंतक: वर्गशिक्षक</div>
          </div>
        </div>
      </div>
    </div>
  );
}
