import React, { useState, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Upload,
  PlusCircle,
  FileText,
  FileQuestion,
  Trash2,
  Share2,
  Eye,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  Loader2,
  RotateCcw,
  BookOpen,
  Layers,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { MCQHomeworkSet, MCQQuestion } from "@/types/mcqHomework";
import { createMCQHomework, deleteMCQHomework, updateMCQHomework } from "@/services/mcqHomeworkService";
import { parseMCQWordFile, parseMCQPastedText, type ParsedMCQResult } from "@/utils/mcqWordParser";
import { MCQShareModal } from "./MCQShareModal";

export interface MCQAdminDashboardProps {
  quizzes: MCQHomeworkSet[];
  selectedClass: string;
  onSelectClass?: (classId: string) => void;
  selectedMedium: string;
  selectedSubject: string;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
  onOpenManualCreator: (date?: string) => void;
  onDeleteQuiz?: (quizId: string, title: string) => void;
  userName?: string;
}

const MARATHI_MONTHS = [
  "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
  "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
];

const WEEKDAYS = [
  { short: "रवि", full: "रविवार", isSunday: true },
  { short: "सोम", full: "सोमवार" },
  { short: "मंगळ", full: "मंगळवार" },
  { short: "बुध", full: "बुधवार" },
  { short: "गुरु", full: "गुरुवार" },
  { short: "शुक्र", full: "शुक्रवार" },
  { short: "शनि", full: "शनिवार" },
];

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISODate(str: string): Date {
  const parts = str.split(/[-/]/).map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    if (parts[0] > 1000) {
      return new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  return new Date();
}

const normalizeDate = (dStr?: string): string => {
  if (!dStr) return "";
  const clean = dStr.trim().slice(0, 10);
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    } else {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return clean;
};

const CLASS_OPTIONS = [
  { id: "1st", mr: "इयत्ता १ ली" },
  { id: "2nd", mr: "इयत्ता २ री" },
  { id: "3rd", mr: "इयत्ता ३ री" },
  { id: "4th", mr: "इयत्ता ४ थी" },
  { id: "5th", mr: "इयत्ता ५ वी" },
  { id: "6th", mr: "इयत्ता ६ वी" },
  { id: "7th", mr: "इयत्ता ७ वी" },
  { id: "8th", mr: "इयत्ता ८ वी" },
];

const SUBJECT_OPTIONS = [
  "मराठी", "इंग्रजी", "गणित", "विज्ञान", "सामाजिक शास्त्रे", "सामान्य ज्ञान", "सर्व विषय", "शिष्यवृत्ती सराव"
];

export const MCQAdminDashboard: React.FC<MCQAdminDashboardProps> = ({
  quizzes,
  selectedClass,
  onSelectClass,
  selectedMedium,
  selectedSubject,
  selectedDate,
  onSelectDate,
  onOpenManualCreator,
  onDeleteQuiz,
  userName = "सुपर ॲडमिन",
}) => {
  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return formatISODate(t);
  }, []);

  const [activeDate, setActiveDate] = useState<string>(() => {
    if (selectedDate && selectedDate !== "all") return normalizeDate(selectedDate);
    return todayStr;
  });

  const [viewMode, setViewMode] = useState<"date" | "all">("date");
  const [sharingQuiz, setSharingQuiz] = useState<MCQHomeworkSet | null>(null);
  const [previewingQuiz, setPreviewingQuiz] = useState<MCQHomeworkSet | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [confirmSectionTab, setConfirmSectionTab] = useState<string>("all");
  const [previewSectionTab, setPreviewSectionTab] = useState<string>("all");

  // Direct paste modal state
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedRawText, setPastedRawText] = useState("");

  // Word file upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsingWord, setIsParsingWord] = useState(false);
  const [parsedWordData, setParsedWordData] = useState<ParsedMCQResult | null>(null);
  const [showWordConfirmModal, setShowWordConfirmModal] = useState(false);
  const [isSavingWordQuiz, setIsSavingWordQuiz] = useState(false);

  // Word quiz upload form fields
  const [wordFormTitle, setWordFormTitle] = useState("");
  const [wordFormClass, setWordFormClass] = useState("1st");
  const [wordFormSubject, setWordFormSubject] = useState("मराठी");
  const [wordFormMedium, setWordFormMedium] = useState<"marathi" | "semi">("marathi");
  const [wordFormDate, setWordFormDate] = useState(todayStr);
  const [wordFormTimeLimit, setWordFormTimeLimit] = useState(10);
  const [wordFormInstructions, setWordFormInstructions] = useState(
    "सर्व प्रश्न सोडवणे अनिवार्य आहे. अचूक पर्यायावर क्लिक करा."
  );

  const handleDateChange = (newDate: string) => {
    setActiveDate(newDate);
    setViewMode("date");
    onSelectDate?.(newDate);
  };

  // Calendar month/year navigation state
  const [calDate, setCalDate] = useState<Date>(() => parseISODate(activeDate || todayStr));
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();

  const handlePrevMonth = () => {
    setCalDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalDate(new Date(calYear, calMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    setCalDate(new Date());
    handleDateChange(todayStr);
  };

  const handleSelectCalendarDay = (dateStr: string) => {
    handleDateChange(dateStr);
    const d = parseISODate(dateStr);
    if (d.getMonth() !== calMonth || d.getFullYear() !== calYear) {
      setCalDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  // Group quizzes by date for quick calendar badges
  const quizzesByDate = useMemo(() => {
    const map = new Map<string, MCQHomeworkSet[]>();
    quizzes.forEach((q) => {
      if (!q.date) return;
      const d = normalizeDate(q.date);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(q);
    });
    return map;
  }, [quizzes]);

  // Compute 7-day grid cells for the active month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const daysInMonth = lastDay.getDate();

    // Days from previous month for leading padding
    const prevMonthLastDay = new Date(calYear, calMonth, 0).getDate();
    const cells = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(calYear, calMonth - 1, dayNum);
      const dateStr = formatISODate(d);
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate && viewMode === "date",
        quizzesForDay: quizzesByDate.get(dateStr) || [],
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(calYear, calMonth, day);
      const dateStr = formatISODate(d);
      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate && viewMode === "date",
        quizzesForDay: quizzesByDate.get(dateStr) || [],
      });
    }

    // Days from next month for trailing padding to make full 7-day weeks
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(calYear, calMonth + 1, day);
      const dateStr = formatISODate(d);
      cells.push({
        dayNum: day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate && viewMode === "date",
        quizzesForDay: quizzesByDate.get(dateStr) || [],
      });
    }

    return cells;
  }, [calYear, calMonth, todayStr, activeDate, viewMode, quizzesByDate]);

  // Filter quizzes for the active date or all dates
  const displayedQuizzes = useMemo(() => {
    if (viewMode === "all") return quizzes;
    return quizzes.filter((q) => q.date && normalizeDate(q.date) === activeDate);
  }, [quizzes, viewMode, activeDate]);

  const activeDateFormatted = useMemo(() => {
    try {
      const d = parseISODate(activeDate);
      const day = d.getDate();
      const monthMr = MARATHI_MONTHS[d.getMonth()];
      const weekdayMr = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"][d.getDay()];
      return `${weekdayMr}, ${day} ${monthMr} ${d.getFullYear()}`;
    } catch {
      return activeDate;
    }
  }, [activeDate]);

  // Handle Word file selected
  const handleWordFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingWord(true);
    try {
      const parsed = await parseMCQWordFile(file);
      if (!parsed.questions || parsed.questions.length === 0) {
        toast.error("Word फाईलमधून प्रश्न ओळखता आले नाहीत. कृपया फॉरमॅट तपासा.");
        return;
      }

      setParsedWordData(parsed);
      const hasMultiSections = parsed.sections && parsed.sections.length > 1;
      const autoSub = hasMultiSections ? "सर्व विषय" : (selectedSubject && selectedSubject !== "all" ? selectedSubject : "मराठी");
      setWordFormTitle(parsed.title || `दैनिक MCQ स्वाध्याय - ${autoSub}`);
      setWordFormClass(parsed.detectedClass || (selectedClass !== "all" ? selectedClass : "4th"));
      setWordFormSubject(autoSub);
      setWordFormMedium(parsed.detectedMedium || (selectedMedium !== "all" ? (selectedMedium as any) : "marathi"));
      setWordFormDate(activeDate || todayStr);
      setConfirmSectionTab("all");
      setShowWordConfirmModal(true);
      toast.success(`Word फाईलमधून एकूण ${parsed.questions.length} प्रश्न यशस्वीपणे ओळखले! 🎉`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Word फाईल वाचताना त्रुटी आली.");
    } finally {
      setIsParsingWord(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle direct pasted text
  const handlePastedTextSubmit = () => {
    if (!pastedRawText.trim()) {
      toast.error("कृपया प्रश्नांचा मजकूर पेस्ट करा.");
      return;
    }
    try {
      const parsed = parseMCQPastedText(pastedRawText);
      if (!parsed.questions || parsed.questions.length === 0) {
        toast.error("पेस्ट केलेल्या मजकुरामधून प्रश्न ओळखता आले नाहीत.");
        return;
      }

      setParsedWordData(parsed);
      const hasMultiSections = parsed.sections && parsed.sections.length > 1;
      const autoSub = hasMultiSections ? "सर्व विषय" : (selectedSubject && selectedSubject !== "all" ? selectedSubject : "मराठी");
      setWordFormTitle(parsed.title || `दैनिक MCQ स्वाध्याय - ${autoSub}`);
      setWordFormClass(parsed.detectedClass || (selectedClass !== "all" ? selectedClass : "4th"));
      setWordFormSubject(autoSub);
      setWordFormMedium(parsed.detectedMedium || (selectedMedium !== "all" ? (selectedMedium as any) : "marathi"));
      setWordFormDate(activeDate || todayStr);
      setConfirmSectionTab("all");
      setShowPasteModal(false);
      setShowWordConfirmModal(true);
      toast.success(`मजकुरामधून एकूण ${parsed.questions.length} प्रश्न यशस्वीपणे ओळखले! 🎉`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "मजकूर तपासताना त्रुटी आली.");
    }
  };

  // Save parsed Word quiz to Firestore
  const handleSaveWordQuiz = async () => {
    if (!parsedWordData || !parsedWordData.questions.length) return;
    setIsSavingWordQuiz(true);

    try {
      const newQuizData: Omit<MCQHomeworkSet, "id" | "createdAt"> = {
        title: wordFormTitle.trim() || `दैनिक MCQ स्वाध्याय - ${wordFormSubject}`,
        classId: wordFormClass,
        subject: wordFormSubject,
        medium: wordFormMedium,
        date: wordFormDate,
        instructions: wordFormInstructions,
        timeLimitMinutes: Number(wordFormTimeLimit) || 0,
        questions: parsedWordData.questions,
        totalMarks: parsedWordData.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        teacherName: userName || "सुपर ॲडमिन",
        schoolName: "महाराष्ट्र शासन शिक्षण विभाग",
        createdBy: {
          role: "admin",
          name: userName || "सुपर ॲडमिन",
        },
        isCustom: false,
      };

      await createMCQHomework(newQuizData);
      toast.success("MCQ स्वाध्याय यशस्वीपणे तयार होऊन प्रकाशित झाला! 🎉");
      setShowWordConfirmModal(false);
      setParsedWordData(null);
      // Switch active class so uploaded quiz appears immediately
      if (wordFormClass && wordFormClass !== selectedClass) {
        onSelectClass?.(wordFormClass);
      }
      // Switch to the uploaded date
      handleDateChange(wordFormDate);
    } catch (err: any) {
      console.error(err);
      toast.error("स्वाध्याय जतन करताना त्रुटी आली: " + (err.message || ""));
    } finally {
      setIsSavingWordQuiz(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Hidden File Input for Word .docx */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        onChange={handleWordFileChange}
        className="hidden"
      />

      {/* ADMIN CONTROL PANEL HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-800 to-pink-800 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-amber-200">
              <ShieldCheck className="size-3.5 text-amber-300" />
              <span>ॲडमिन MCQ स्वाध्याय अपलोड व व्यवस्थापन पॅनेल</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              दैनिक MCQ स्वाध्याय अपलोड करा
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed font-medium">
              येथून Word (.docx) फाईल अपलोड करून सेकंदात प्रश्न तयार करा, किंवा मॅन्युअली प्रश्न जोडा. कॅलेंडरद्वारे कोणत्याही तारखेसाठी स्वाध्याय प्रकाशित करा.
            </p>
          </div>

          {/* TWO PRIMARY UPLOAD ACTIONS */}
          <div className="flex items-center gap-3 flex-wrap shrink-0">
            {/* 1. Upload Word File Button */}
            <button
              type="button"
              disabled={isParsingWord}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer disabled:opacity-60 border border-emerald-400/30"
              title="Word (.docx) फाईलमधून स्वयंचलित MCQ प्रश्न अपलोड करा"
            >
              {isParsingWord ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <FileText className="size-4.5" />
              )}
              <span>{isParsingWord ? "फाईल तपासत आहे..." : "Word फाईल अपलोड करा (.docx)"}</span>
            </button>

            {/* 2. Direct Paste Questions Text */}
            <button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs sm:text-sm bg-white/20 hover:bg-white/30 text-white shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer border border-white/30 backdrop-blur-md"
              title="प्रश्नांचा मजकूर थेट पेस्ट करा"
            >
              <Sparkles className="size-4.5 text-amber-300" />
              <span>मजकूर पेस्ट करा (Direct Paste)</span>
            </button>

            {/* 3. Add Questions Manually Button */}
            <button
              type="button"
              onClick={() => onOpenManualCreator(activeDate)}
              className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer border border-amber-300/40"
              title="मॅन्युअली प्रश्न टाइप करून जोडा"
            >
              <PlusCircle className="size-4.5 text-slate-950" />
              <span>मॅन्युअली प्रश्न तयार करा</span>
            </button>
          </div>
        </div>
      </div>

      {/* SPLIT SCREEN: COMPACT CALENDAR (LEFT) & SELECTED DAY'S CONTENT (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* LEFT COLUMN: COMPACT MONTHLY CALENDAR */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 lg:sticky lg:top-4">
          {/* Header: Title & Today Button */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                <CalendarIcon className="size-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                कॅलेंडर (Calendar)
              </span>
            </div>

            <button
              type="button"
              onClick={handleJumpToToday}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDate === todayStr && viewMode === "date"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100"
              }`}
              title="आजच्या तारखेवर जा"
            >
              आज (Today)
            </button>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 rounded-2xl p-1.5 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
              title="मागील महिना"
            >
              <ChevronLeft className="size-4" />
            </button>

            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">
              {MARATHI_MONTHS[calMonth]} {calYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs transition-all cursor-pointer"
              title="पुढील महिना"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Compact 7-column Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w.short}
                className={`py-1 rounded-lg text-[11px] font-black uppercase ${
                  w.isSunday
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
                title={w.full}
              >
                {w.short}
              </div>
            ))}
          </div>

          {/* Compact Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, idx) => {
              const quizCount = cell.quizzesForDay.length;
              return (
                <button
                  key={`${cell.dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectCalendarDay(cell.dateStr)}
                  className={`h-9 sm:h-10 w-full rounded-xl flex flex-col items-center justify-center p-0.5 relative transition-all cursor-pointer ${
                    cell.isSelected
                      ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black shadow-md ring-2 ring-purple-300 scale-105 z-10"
                      : cell.isToday
                      ? "border-2 border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-extrabold hover:border-purple-600"
                      : cell.isCurrentMonth
                      ? "text-slate-800 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-slate-800 font-bold"
                      : "text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850 font-normal"
                  }`}
                  title={`${cell.dateStr}: ${quizCount > 0 ? `${quizCount} स्वाध्याय उपलब्ध` : "स्वाध्याय नाही"}`}
                >
                  <span className="text-xs leading-none">
                    {cell.dayNum}
                  </span>

                  {/* Indicator Dot for Quizzes */}
                  {quizCount > 0 ? (
                    <span
                      className={`size-1.5 rounded-full mt-0.5 ${
                        cell.isSelected ? "bg-white" : "bg-emerald-500"
                      }`}
                      title={`${quizCount} स्वाध्याय`}
                    />
                  ) : cell.isToday ? (
                    <span
                      className={`size-1 rounded-full mt-0.5 ${
                        cell.isSelected ? "bg-white" : "bg-purple-500"
                      }`}
                    />
                  ) : (
                    <span className="size-1.5 mt-0.5 opacity-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: THAT DAY'S CONTENT & QUIZZES */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          {/* Quick Class Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-black text-slate-500 uppercase shrink-0 mr-1">
              इयत्ता:
            </span>
            <button
              type="button"
              onClick={() => onSelectClass?.("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedClass === "all"
                  ? "bg-purple-600 text-white shadow-xs font-black"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              सर्व इयत्ता
            </button>
            {CLASS_OPTIONS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectClass?.(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedClass === c.id
                    ? "bg-purple-600 text-white shadow-xs font-black"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {c.mr}
              </button>
            ))}
          </div>

          {/* Selected Date Header & Quick Upload Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {viewMode === "all" ? "सर्व अधिकृत MCQ स्वाध्याय" : activeDateFormatted}
                </h3>
                {viewMode === "date" && activeDate === todayStr && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                    आजचा दिवस
                  </span>
                )}
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                  {displayedQuizzes.length} स्वाध्याय
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {viewMode === "all"
                  ? `इयत्ता ${selectedClass} साठी अपलोड केलेले सर्व अधिकृत स्वाध्याय`
                  : `दिनांक ${activeDate} चे स्वाध्याय व्यवस्थापन व प्रश्न`}
              </p>
            </div>

            {/* Quick Upload Buttons for this Date */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title={`दिनांक ${activeDate} साठी Word फाईल जोडा`}
              >
                <Upload className="size-3.5 text-emerald-600" />
                <span>+ Word फाईल</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="प्रश्नांचा मजकूर पेस्ट करा"
              >
                <Sparkles className="size-3.5 text-indigo-600" />
                <span>मजकूर पेस्ट करा</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenManualCreator(activeDate)}
                className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title={`दिनांक ${activeDate} साठी मॅन्युअली प्रश्न तयार करा`}
              >
                <PlusCircle className="size-3.5 text-purple-600" />
                <span>+ मॅन्युअली जोडा</span>
              </button>
            </div>
          </div>

          {/* UPLOADED QUIZZES LIST FOR THIS DATE */}
          {displayedQuizzes.length === 0 ? (
            <div className="py-12 px-4 text-center bg-slate-50/70 dark:bg-slate-850/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
              <div className="size-14 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                <FileQuestion className="size-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-800 dark:text-slate-200">
                  {viewMode === "all"
                    ? "कोणताही स्वाध्याय उपलब्ध नाही"
                    : `दिनांक ${activeDate} साठी स्वाध्याय उपलब्ध नाही`}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  या दिवसासाठी Word फाईल अपलोड करा, मजकूर पेस्ट करा किंवा मॅन्युअली प्रश्न तयार करा.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <FileText className="size-4" />
                  <span>Word फाईल निवडा (.docx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="size-4" />
                  <span>मजकूर पेस्ट करा</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenManualCreator(activeDate)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <PlusCircle className="size-4" />
                  <span>मॅन्युअली तयार करा</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayedQuizzes.map((quiz, qIdx) => (
                <div
                  key={quiz.id}
                  className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-purple-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
                          {quiz.subject}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          इयत्ता {quiz.classId}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200">
                          तारीख: {quiz.date || "नमुद नाही"}
                        </span>
                        {quiz.isCustom ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            कस्टम
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            ॲडमिन अधिकृत
                          </span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {quiz.title}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="font-bold">{quiz.questions?.length || 0} प्रश्न</span>
                        <span>•</span>
                        <span className="font-bold">{quiz.totalMarks} गुण</span>
                        <span>•</span>
                        <span>{quiz.createdBy?.name || "सुपर ॲडमिन"}</span>
                      </div>
                    </div>

                    {/* Action Buttons for this Quiz */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                      {/* Inline Question List Toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)}
                        className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="या स्वाध्यायाचे सर्व प्रश्न येथेच पहा"
                      >
                        <Eye className="size-3.5" />
                        <span>{expandedQuizId === quiz.id ? "प्रश्न लपवा" : `प्रश्न पहा (${quiz.questions?.length || 0})`}</span>
                      </button>

                      {/* Share on WhatsApp */}
                      <button
                        type="button"
                        onClick={() => setSharingQuiz(quiz)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="स्वाध्याय लिंक WhatsApp वर शेअर करा"
                      >
                        <Share2 className="size-3.5 text-emerald-600" />
                        <span>शेअर करा</span>
                      </button>

                      {/* Delete Quiz */}
                      {onDeleteQuiz && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuiz(quiz.id, quiz.title)}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 transition-colors cursor-pointer"
                          title="स्वाध्याय हटवा"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* INLINE QUESTION-WISE EXPANDED LIST */}
                  {expandedQuizId === quiz.id && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                          📋 सर्व {quiz.questions?.length || 0} प्रश्न तपशील (Question-wise list):
                        </span>
                        <span className="text-[11px] text-slate-400">
                          हिरव्या रंगात अचूक उत्तर चिन्हांकित आहे
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                        {quiz.questions?.map((q, qIndex) => (
                          <div
                            key={q.id || qIndex}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                                <span className="text-purple-600 dark:text-purple-400 font-black mr-1.5">
                                  प्रश्न {qIndex + 1}.
                                </span>
                                {q.question}
                              </p>
                              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 shrink-0 text-[10px]">
                                {q.marks || 1} गुण
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = oIdx === q.correctIndex;
                                return (
                                  <div
                                    key={oIdx}
                                    className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                                      isCorrect
                                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                    }`}
                                  >
                                    <span>({["A", "B", "C", "D"][oIdx]}) {opt}</span>
                                    {isCorrect && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-black shrink-0">
                                        ✓ अचूक पर्याय
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {q.explanation && (
                              <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200">
                                💡 <strong>स्पष्टीकरण:</strong> {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DIRECT PASTE TEXT MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    प्रश्नांचा मजकूर पेस्ट करा (Direct Paste)
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Word, PDF किंवा WhatsApp वरून कॉपी केलेला संपूर्ण प्रश्नपत्रिका मजकूर येथे पेस्ट करा.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <textarea
              rows={12}
              value={pastedRawText}
              onChange={(e) => setPastedRawText(e.target.value)}
              placeholder="येथे प्रश्नपत्रिका मजकूर पेस्ट करा (उदा. 1) 'सूर्य' या शब्दाचा समानार्थी शब्द कोणता? (1) चंद्र (2) रवी...)"
              className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-y"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handlePastedTextSubmit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Check className="size-4" />
                <span>प्रश्न ओळखा व तयार करा 🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WORD FILE PARSED CONFIRMATION & PUBLISH MODAL */}
      {showWordConfirmModal && parsedWordData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    सर्व प्रश्न यशस्वीपणे ओळखले! 🎉
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    एकूण {parsedWordData.questions.length} प्रश्न ओळखले गेले आहेत. तपशील तपासून जतन करा.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWordConfirmModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Quiz Title */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  स्वाध्याय शीर्षक (Quiz Title):
                </label>
                <input
                  type="text"
                  value={wordFormTitle}
                  onChange={(e) => setWordFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* Grid 2 Cols: Class, Subject, Date, Medium */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Class */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">इयत्ता (Class):</label>
                  <select
                    value={wordFormClass}
                    onChange={(e) => setWordFormClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {CLASS_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.mr}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">विषय (Subject):</label>
                  <select
                    value={wordFormSubject}
                    onChange={(e) => setWordFormSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Medium */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">माध्यम (Medium):</label>
                  <select
                    value={wordFormMedium}
                    onChange={(e) => setWordFormMedium(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="marathi">मराठी माध्यम</option>
                    <option value="semi">सेमी-इंग्रजी</option>
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    प्रकाशन तारीख (Publish Date):
                  </label>
                  <input
                    type="date"
                    value={wordFormDate}
                    onChange={(e) => setWordFormDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Section Tabs if Multiple Sections */}
              {parsedWordData.sections && parsedWordData.sections.length > 1 && (
                <div className="space-y-1.5 pt-2">
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    विभाग निवडून प्रश्न पहा:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setConfirmSectionTab("all")}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        confirmSectionTab === "all"
                          ? "bg-purple-600 text-white shadow-xs font-black"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      सर्व प्रश्न ({parsedWordData.questions.length})
                    </button>
                    {parsedWordData.sections.map((sec) => {
                      const count = parsedWordData.sectionQuestions?.[sec]?.length || 0;
                      return (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setConfirmSectionTab(sec)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            confirmSectionTab === sec
                              ? "bg-purple-600 text-white shadow-xs font-black"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          {sec} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ALL QUESTIONS PREVIEW LIST (Question-wise) */}
              <div className="space-y-2 pt-2">
                <span className="font-black text-slate-800 dark:text-slate-200 block">
                  प्रश्नांची संपूर्ण यादी (Question-wise preview):
                </span>
                <div className="space-y-2.5 max-h-[44vh] overflow-y-auto p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {parsedWordData.questions
                    .filter((q) => confirmSectionTab === "all" || (q as any).section === confirmSectionTab || (q as any).section?.includes(confirmSectionTab))
                    .map((q, i) => (
                      <div key={i} className="text-xs p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                            <span className="text-purple-600 dark:text-purple-400 font-black mr-1.5">
                              {i + 1}.
                            </span>
                            {q.question}
                          </p>
                          {(q as any).section && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 shrink-0">
                              {(q as any).section}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2 text-[11px]">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = oIdx === q.correctIndex;
                            return (
                              <div
                                key={oIdx}
                                className={`p-1.5 px-2.5 rounded-lg border flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                                    : "bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span>({["A", "B", "C", "D"][oIdx]}) {opt}</span>
                                {isCorrect && (
                                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                    ✓ अचूक उत्तर
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowWordConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                type="button"
                disabled={isSavingWordQuiz}
                onClick={handleSaveWordQuiz}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-60 flex items-center gap-2"
              >
                {isSavingWordQuiz ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>{isSavingWordQuiz ? "जतन होत आहे..." : "जतन करा व प्रकाशित करा 🚀"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW QUESTIONS MODAL (Allows Admin to inspect any quiz) */}
      {previewingQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-600 text-white">
                    {previewingQuiz.subject}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    इयत्ता {previewingQuiz.classId}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {previewingQuiz.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  एकूण {previewingQuiz.questions?.length || 0} प्रश्न • {previewingQuiz.totalMarks} गुण • तारीख: {previewingQuiz.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingQuiz(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-3.5">
              {previewingQuiz.questions?.map((q, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {idx + 1}. {q.question}
                    </p>
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 shrink-0">
                      {q.marks || 1} गुण
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctIndex;
                      return (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                            isCorrect
                              ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span>({["A", "B", "C", "D"][oIdx]}) {opt}</span>
                          {isCorrect && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-black shrink-0">
                              बरोबर उत्तर ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200">
                      💡 <strong>स्पष्टीकरण:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewingQuiz(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {sharingQuiz && (
        <MCQShareModal
          isOpen={Boolean(sharingQuiz)}
          onClose={() => setSharingQuiz(null)}
          quiz={sharingQuiz}
          initialTeacherName={userName}
        />
      )}
    </div>
  );
};
