import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PlanningDocumentRecord,
  PlanningCategory,
  DEFAULT_HEADERS,
  formatMarathiClassName,
} from "@/lib/smartPlanningParser";
import {
  extractSubjectSectionsFromExcel,
  splitRowsIntoSubjectSections,
  splitRowsIntoMonthlySections,
  normalizeSubjectName,
  isSignatureRow,
  isMarathiMonth,
  canonicalizeMarathiMonth,
  normalizeAnnualPlanningRows,
  isExamOrAssessmentText,
  AnnualPlanningWorkbook,
  SubjectSection,
  normalizeMonthlyPlanningRow,
  normalizeMonthlyPlanningRows,
  isTableColumnHeaderRow,
  getAcademicMonthRank,
} from "@/lib/smartSubjectSplitter";
import { getBunnyStorageUrl, fetchBinaryFile } from "@/lib/bunny-auth-pdf";
import {
  BookOpen,
  Calendar,
  Search,
  Printer,
  Download,
  FileSpreadsheet,
  Table as TableIcon,
  Sparkles,
  Edit3,
  Trash2,
  FileText,
  Loader2,
  Globe,
  CheckCircle2,
  RotateCcw,
  Save,
  Plus,
  X,
  UserCheck,
  School,
  Building,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { parseExcelData } from "@/services/fileReader/ExcelParser";
import type { ParsedSheet } from "@/services/fileReader/types";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { getFileFromIndexedDB } from "@/lib/indexedDbStorage";
import { getDefaultSubjectsForClass, detectRecordMedium, isRecordSemi, areSubjectsEquivalent } from "@/data/cceSubjects";
import { getUnifiedSchoolProfile, saveUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";

// ── Question Bank Dynamic Column Resolver & Cell Value Helper ───────────────
const resolveQuestionBankColumnMap = (headers: any[]) => {
  const map = {
    srNo: -1,
    lesson: -1,
    outcome: -1,
    question: -1,
    answer: -1,
    evalType: -1,
    qType: -1,
    objective: -1,
  };

  headers.forEach((h, idx) => {
    const clean = String(h || "").trim().toLowerCase();
    if (!clean) return;

    if (
      map.srNo === -1 &&
      (clean.includes("अनुक्रमांक") || clean.includes("अ.क्र") || clean.includes("प्रश्न क्रमांक") || clean === "क्र." || clean === "अ. क्र." || clean === "sr" || clean.startsWith("sr"))
    ) {
      map.srNo = idx;
    } else if (
      map.lesson === -1 &&
      (clean.includes("पाठ") || clean.includes("घटक") || clean.includes("क्षेत्र") || clean.includes("topic") || clean.includes("lesson") || clean.includes("unit"))
    ) {
      map.lesson = idx;
    } else if (
      map.outcome === -1 &&
      (clean.includes("निष्पत्ती") || clean.includes("outcome") || clean.includes("lo"))
    ) {
      map.outcome = idx;
    } else if (
      map.question === -1 &&
      (clean.includes("प्रश्न") || clean.includes("question") || clean.includes("सवाल"))
    ) {
      map.question = idx;
    } else if (
      map.answer === -1 &&
      (clean.includes("उत्तर") || clean.includes("answer") || clean.includes("पर्याय") || clean.includes("गुण") || clean.includes("marks"))
    ) {
      map.answer = idx;
    } else if (
      map.evalType === -1 &&
      (clean.includes("मूल्यमापन") || clean.includes("evaluation") || clean.includes("तोंडी") || clean.includes("लेखी"))
    ) {
      map.evalType = idx;
    } else if (
      map.qType === -1 &&
      (clean.includes("प्रकार") || clean.includes("type") || clean.includes("स्वरूप"))
    ) {
      map.qType = idx;
    } else if (
      map.objective === -1 &&
      (clean.includes("उद्दिष्ट") || clean.includes("objective") || clean.includes("वैशिष्टय"))
    ) {
      map.objective = idx;
    }
  });

  if (map.srNo === -1) map.srNo = 0;
  if (map.lesson === -1) map.lesson = 1;
  if (map.outcome === -1) map.outcome = map.lesson === 2 ? 1 : 2;
  if (map.question === -1) map.question = 3;
  if (map.answer === -1) map.answer = 4;
  if (map.evalType === -1) map.evalType = 5;
  if (map.qType === -1) map.qType = 6;
  if (map.objective === -1) map.objective = 7;

  return map;
};

const getQuestionBankCellVal = (row: any[], idx: number): string => {
  if (!row || idx < 0 || idx >= row.length) return "";
  const v = row[idx];
  if (v && typeof v === "object" && "value" in v) return String(v.value || "").trim();
  return String(v || "").trim();
};

interface PlanningTableRendererProps {
  record: PlanningDocumentRecord | null;
  fileUrl?: string | null;
  mode?: "teacher" | "admin";
  selectedSubject?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface UserSchoolProfile {
  schoolName: string;
  kendraName: string;
  talukaName: string;
  districtName?: string;
  udiseNumber: string;
  teacherName: string;
  headMasterName: string;
  isSavedByUser?: boolean;
}

// Auto-expanding textarea without inner sidebars/scrollbars
const AutoHeightTextarea: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder, className = "" }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(52, textareaRef.current.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full p-2 text-xs font-medium border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white leading-relaxed overflow-hidden resize-none ${className}`}
    />
  );
};

export const PlanningTableRenderer: React.FC<PlanningTableRendererProps> = ({
  record,
  fileUrl,
  mode = "teacher",
  selectedSubject,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [parsedWorkbook, setParsedWorkbook] = useState<AnnualPlanningWorkbook | null>(null);
  // Directly open all subjects, all months, and all lessons by default
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [loadingWorkbook, setLoadingWorkbook] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [questionBankSheets, setQuestionBankSheets] = useState<ParsedSheet[]>([]);
  const [selectedQuestionBankLesson, setSelectedQuestionBankLesson] = useState<string>("all");

  // Strictly identify the current section type: "question_bank" | "monthly" | "annual"
  const currentSectionType: "question_bank" | "monthly" | "annual" = useMemo(() => {
    const recAny = record as any;
    const pType = String(recAny?.planningType || recAny?.category || "").toLowerCase().trim();
    const titleStr = String(recAny?.title || recAny?.name || recAny?.fileName || parsedWorkbook?.classTitle || "").toLowerCase().trim();

    // 1. Strict Question Bank Check
    if (
      pType === "question_bank" ||
      pType === "prashnapedhi" ||
      recAny?.category === "question_bank" ||
      recAny?.category === "prashnapedhi" ||
      titleStr.includes("प्रश्नपेढी") ||
      titleStr.includes("prashnapedhi") ||
      (titleStr.includes("question") && titleStr.includes("bank"))
    ) {
      return "question_bank";
    }

    // 2. Strict Monthly Planning Check
    if (
      pType === "monthly" ||
      pType === "masik" ||
      pType === "masik_niyojan" ||
      recAny?.category === "masik_niyojan" ||
      titleStr.includes("मासिक") ||
      titleStr.includes("monthly")
    ) {
      return "monthly";
    }

    // 3. Fallback to Annual Planning
    return "annual";
  }, [record, parsedWorkbook]);

  const isQuestionBank = currentSectionType === "question_bank";
  const isMonthly = currentSectionType === "monthly";
  const isAnnual = currentSectionType === "annual";

  // Dynamically resolve active selected subject from web or record
  const resolvedSubjectName = useMemo(() => {
    if (selectedSubjectFilter && selectedSubjectFilter !== "all") {
      return selectedSubjectFilter;
    }
    if (selectedSubject && selectedSubject !== "all") {
      return selectedSubject;
    }
    if (record?.subjectId && record.subjectId !== "all") {
      return record.subjectId;
    }
    const recAny = record as any;
    if (recAny?.subject && recAny.subject !== "all") {
      return recAny.subject;
    }
    if (record?.fileName?.includes("मराठी")) {
      return "मराठी";
    }
    if (record?.fileName?.includes("इंग्रजी") || record?.fileName?.toLowerCase().includes("english")) {
      return "इंग्रजी";
    }
    if (record?.fileName?.includes("गणित") || record?.fileName?.toLowerCase().includes("math")) {
      return "गणित";
    }
    return isMonthly ? "सर्व विषय" : "सर्व विषय (All Subjects)";
  }, [selectedSubjectFilter, selectedSubject, record, isMonthly]);

  // Keep selectedSubjectFilter defaulting to "all" whenever a document opens or switches
  useEffect(() => {
    setSelectedSubjectFilter("all");
    setSelectedQuestionBankLesson("all");
    setSearchQuery("");
  }, [record?.id, fileUrl]);

  // Inline Table Editing State & User-Specific Storage
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [isSavingEdits, setIsSavingEdits] = useState<boolean>(false);
  const [editableSections, setEditableSections] = useState<SubjectSection[]>([]);
  const [savedUserEditRecord, setSavedUserEditRecord] = useState<PlanningDocumentRecord | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);
  const activeUrl = fileUrl || record?.fileUrl || null;

  // Strictly namespaced active record ID so Question Bank and Monthly/Annual Planning never share keys
  const activeRecordId = useMemo(() => {
    const recAny = record as any;
    const baseId = record?.id || recAny?.recordKey;
    const med = detectRecordMedium(record);
    const cls = record?.classId || "1st";
    const subj = record?.subjectId || "all";
    const year = recAny?.academicYear || "2026-27";

    if (baseId && typeof baseId === "string") {
      if (baseId.includes(currentSectionType)) {
        return baseId;
      }
      return `${currentSectionType}_${baseId}`;
    }

    return `${year}_${med}_${cls}_${currentSectionType}_${subj}`;
  }, [record, currentSectionType]);

  // Load User-Specific Edit (Persisted in LocalStorage / Firestore for logged in user)
  useEffect(() => {
    let isMounted = true;
    const loadUserSavedEdit = async () => {
      if (!activeRecordId) return;

      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";

      // 1. LocalStorage check (strictly user and section specific)
      const primaryKey = `user_edit_${currentSectionType}_${effectiveUserId}_${activeRecordId}`;
      const fallbackKey = `user_edit_${effectiveUserId}_${activeRecordId}`;
      const legacyKey = `user_edit_${activeRecordId}`;

      const localDataStr =
        localStorage.getItem(primaryKey) ||
        localStorage.getItem(fallbackKey) ||
        localStorage.getItem(legacyKey);

      if (localDataStr) {
        try {
          const parsed = JSON.parse(localDataStr);
          const parsedType = String(parsed?.planningType || parsed?.category || "").toLowerCase();
          const matchesType =
            (currentSectionType === "question_bank" && (parsedType === "question_bank" || parsedType === "prashnapedhi")) ||
            (currentSectionType === "monthly" && (parsedType === "monthly" || parsedType === "masik_niyojan")) ||
            (currentSectionType === "annual" && (parsedType === "annual" || parsedType === "varshik_niyojan"));

          if (parsed && matchesType && (parsed.sections || parsed.rawDataRows || parsed.rows || parsed.tableRows || parsed.sheets)) {
            const adminTime = record?.uploadedAt ? new Date(record.uploadedAt).getTime() : 0;
            const userEditTime = parsed.editedAt ? new Date(parsed.editedAt).getTime() : 0;

            if (mode !== "admin" && adminTime > userEditTime) {
              localStorage.removeItem(primaryKey);
              localStorage.removeItem(fallbackKey);
              localStorage.removeItem(legacyKey);
              setSavedUserEditRecord(null);
              return;
            }

            if (isMounted) setSavedUserEditRecord(parsed);
            return;
          } else if (parsed && !matchesType) {
            // Edit belongs to a DIFFERENT section! Never load it here.
            setSavedUserEditRecord(null);
          }
        } catch (e) { }
      }

      // 2. Firestore check for user-specific custom edit
      if (db) {
        try {
          const docRef = doc(db, "academic_plannings_user_edits", `${currentSectionType}_${effectiveUserId}_${activeRecordId}`);
          let snap = await getDoc(docRef);
          if (!snap.exists()) {
            const legacyDocRef = doc(db, "academic_plannings_user_edits", `${effectiveUserId}_${activeRecordId}`);
            snap = await getDoc(legacyDocRef);
          }
          if (snap.exists() && isMounted) {
            const data = snap.data() as PlanningDocumentRecord;
            const dataType = String(data?.planningType || (data as any)?.category || "").toLowerCase();
            const matchesType =
              (currentSectionType === "question_bank" && (dataType === "question_bank" || dataType === "prashnapedhi")) ||
              (currentSectionType === "monthly" && (dataType === "monthly" || dataType === "masik_niyojan")) ||
              (currentSectionType === "annual" && (dataType === "annual" || dataType === "varshik_niyojan"));

            if (!matchesType) {
              setSavedUserEditRecord(null);
              return;
            }

            const adminTime = record?.uploadedAt ? new Date(record.uploadedAt).getTime() : 0;
            const userEditTime = data.editedAt ? new Date(data.editedAt).getTime() : 0;

            if (mode !== "admin" && adminTime > userEditTime) {
              setSavedUserEditRecord(null);
              return;
            }

            setSavedUserEditRecord(data);
            try {
              localStorage.setItem(primaryKey, JSON.stringify(data));
            } catch (e) { }
          }
        } catch (e) {
          console.warn("Firestore fetch user edit notice:", e);
        }
      }
    };

    loadUserSavedEdit();
    return () => {
      isMounted = false;
    };
  }, [activeRecordId, currentSectionType, user?.uid, record?.uploadedAt]);

  // Extract Subject Sections from Excel when fileUrl is present
  useEffect(() => {
    let isMounted = true;
    if (!activeUrl) {
      setParsedWorkbook(null);
      return;
    }

    setLoadingWorkbook(true);
    setParsedWorkbook(null);
    setQuestionBankSheets([]);

    const fetchUrl = activeUrl ? getBunnyStorageUrl(activeUrl) : "";

    const loadWorkbook = async () => {
      try {
        let buffer: ArrayBuffer | null = null;

        // 1. Try network fetch if activeUrl is present
        if (activeUrl) {
          buffer = await fetchBinaryFile(activeUrl);
        }

        // 2. Fallback to local IndexedDB if network fetch failed or activeUrl missing/expired
        if (!buffer) {
          const currentMed = detectRecordMedium(record);
          const keysToTry = [
            activeRecordId,
            record?.id,
            (record as any)?.recordKey,
            `2026-27_${currentMed}_${record?.classId || "1st"}_${currentSectionType}_${record?.subjectId || "all"}`,
            `plan_${currentMed}_${record?.classId || "1st"}_${currentSectionType}_${record?.subjectId || "all"}`
          ].filter(Boolean) as string[];

          for (const key of keysToTry) {
            try {
              const blobFromDb = await getFileFromIndexedDB(key);
              if (blobFromDb) {
                buffer = await blobFromDb.arrayBuffer();
                break;
              }
            } catch (e) { }
          }
        }

        if (!buffer) {
          throw new Error("Workbook data could not be retrieved.");
        }

        // Only treat as Question Bank if record is explicitly Question Bank AND NOT Monthly Planning or Annual Planning
        const isExplicitQB =
          !isMonthly &&
          (record?.planningType === "question_bank" ||
            (record as any)?.category === "question_bank" ||
            (record as any)?.planningType === "prashnapedhi" ||
            (record as any)?.category === "prashnapedhi" ||
            String(record?.fileName || "").toLowerCase().includes("prashnapedhi") ||
            String((record as any)?.title || "").includes("प्रश्नपेढी") ||
            (String(record?.fileName || "").toLowerCase().includes("question") &&
              String(record?.fileName || "").toLowerCase().includes("bank")));

        const parsed = await parseExcelData(buffer, { preserveFormatting: true });

        // Never trigger Question Bank sheet interceptor for Monthly Planning or Annual Planning
        const hasExplicitQBSheet =
          !isMonthly &&
          record?.planningType !== "annual" &&
          (record as any)?.category !== "varshik_niyojan" &&
          parsed.sheets.some(
            (sheet) =>
              sheet.sheetName.includes("प्रश्नपेढी") ||
              sheet.sheetName.toLowerCase().includes("prashnapedhi") ||
              (sheet.sheetName.toLowerCase().includes("question") && sheet.sheetName.toLowerCase().includes("bank"))
          );

        if (isExplicitQB || hasExplicitQBSheet) {
          if (!parsed.sheets.length) throw new Error("Question Bank workbook has no readable sheets.");
          if (isMounted) {
            setQuestionBankSheets(parsed.sheets.filter((sheet) => sheet.rows.some((row) => row.some(Boolean))));
            setLoadingWorkbook(false);
          }
          return;
        }

        const wb = await extractSubjectSectionsFromExcel(buffer);
        if (isMounted) {
          setParsedWorkbook(wb);
          setLoadingWorkbook(false);
        }
      } catch (err) {
        console.warn("Planning workbook fetch/parse notice:", err);
        if (isMounted) setLoadingWorkbook(false);
      }
    };

    loadWorkbook();

    return () => {
      isMounted = false;
    };
  }, [activeUrl, activeRecordId, record?.id, currentSectionType]);

  // All subject sections extracted from Excel or stored record
  const allSectionsAvailable = useMemo<SubjectSection[]>(() => {
    // Helper to split tableRows by tr.subject
    const splitTableRowsBySubject = (tRows: any[], fallbackSubj: string): SubjectSection[] => {
      const splitMap: Record<string, SubjectSection> = {};
      tRows.forEach((tr: any) => {
        const rawSubj = tr.subject || fallbackSubj || "मराठी";
        const normSubj = normalizeSubjectName(rawSubj);
        if (!splitMap[normSubj]) {
          splitMap[normSubj] = {
            subjectName: normSubj,
            displaySubjectName: `विषय : ${normSubj}`,
            headers: DEFAULT_HEADERS.varshik_niyojan,
            rows: [],
            startRow: 0,
            endRow: 0,
          };
        }
        splitMap[normSubj].rows.push([
          tr.month || "",
          tr.weeks || "",
          tr.workingDays || "",
          tr.periods || "",
          tr.topics || "",
          tr.outcomes || "",
        ]);
      });
      return Object.values(splitMap);
    };

    // 1. If user or admin has saved customized edit data, verify section type match before using
    if (savedUserEditRecord) {
      const recAny = savedUserEditRecord as any;
      const savedType = String(recAny.planningType || recAny.category || "").toLowerCase();
      const matchesType =
        (currentSectionType === "question_bank" && (savedType === "question_bank" || savedType === "prashnapedhi")) ||
        (currentSectionType === "monthly" && (savedType === "monthly" || savedType === "masik_niyojan")) ||
        (currentSectionType === "annual" && (savedType === "annual" || savedType === "varshik_niyojan"));

      if (matchesType && recAny.sections && Array.isArray(recAny.sections) && recAny.sections.length > 0) {
        return recAny.sections;
      }
    }

    if (record) {
      const recAny = record as any;
      const recType = String(recAny.planningType || recAny.category || "").toLowerCase();
      const matchesType =
        (currentSectionType === "question_bank" && (recType === "question_bank" || recType === "prashnapedhi")) ||
        (currentSectionType === "monthly" && (recType === "monthly" || recType === "masik_niyojan")) ||
        (currentSectionType === "annual" && (recType === "annual" || recType === "varshik_niyojan"));

      if (matchesType && recAny.sections && Array.isArray(recAny.sections) && recAny.sections.length > 0) {
        return recAny.sections;
      }
    }

    // 2. Check if Monthly Planning is requested
    const isMonthlyPlan = isMonthly;
    if (isMonthlyPlan) {
      if (parsedWorkbook && parsedWorkbook.monthlySections && Object.keys(parsedWorkbook.monthlySections).length > 0) {
        const sections = Object.values(parsedWorkbook.monthlySections).map((mSec: any) => ({
          subjectName: mSec.monthName,
          displaySubjectName: mSec.displayMonthName,
          headers: mSec.headers || DEFAULT_HEADERS.masik_niyojan,
          rows: mSec.rows,
          startRow: 0,
          endRow: mSec.rows.length,
        }));
        sections.sort((a, b) => getAcademicMonthRank(a.subjectName) - getAcademicMonthRank(b.subjectName));
        return sections;
      }

      const currentRec = savedUserEditRecord || record;
      const recAny = currentRec as any;
      let rowsToUse: string[][] = recAny?.rawDataRows || currentRec?.rows || [];
      if (rowsToUse.length === 0 && parsedWorkbook?.rawGrid) {
        rowsToUse = parsedWorkbook.rawGrid;
      }

      if (rowsToUse.length > 0) {
        const mSplitMap = splitRowsIntoMonthlySections(rowsToUse);
        if (Object.keys(mSplitMap).length > 0) {
          const sections = Object.values(mSplitMap).map((mSec) => ({
            subjectName: mSec.monthName,
            displaySubjectName: mSec.displayMonthName,
            headers: mSec.headers || DEFAULT_HEADERS.masik_niyojan,
            rows: mSec.rows,
            startRow: 0,
            endRow: mSec.rows.length,
          }));
          sections.sort((a, b) => getAcademicMonthRank(a.subjectName) - getAcademicMonthRank(b.subjectName));
          return sections;
        }
      }
    }

    // 3. Fallback to Annual Planning Subject Sections
    if (parsedWorkbook && Object.keys(parsedWorkbook.subjects).length > 0) {
      return Object.values(parsedWorkbook.subjects);
    }

    // 4. Otherwise fallback to record tableRows / rawDataRows
    if (record) {
      const recAny = record as any;

      if (recAny.tableRows && Array.isArray(recAny.tableRows) && recAny.tableRows.length > 0) {
        const sections = splitTableRowsBySubject(recAny.tableRows, record.subjectId || "मराठी");
        if (sections.length > 0) return sections;
      }

      let rowsToUse: string[][] = [];
      if (recAny.rawDataRows && Array.isArray(recAny.rawDataRows) && recAny.rawDataRows.length > 0) {
        rowsToUse = recAny.rawDataRows;
      } else if (record.rows && Array.isArray(record.rows) && record.rows.length > 0) {
        rowsToUse = record.rows;
      } else if (record.gridData && Array.isArray(record.gridData) && record.gridData.length > 0) {
        rowsToUse = record.gridData.map((rowCells) =>
          rowCells.map((cell) => (typeof cell === "string" ? cell : cell?.value || ""))
        );
      }

      if (rowsToUse.length > 0) {
        const splitMap = splitRowsIntoSubjectSections(rowsToUse, record.subjectId || "मराठी");
        if (Object.keys(splitMap).length > 0) {
          return Object.values(splitMap);
        }
      }
    }

    return [];
  }, [parsedWorkbook, record, savedUserEditRecord]);

  // List of Available Subjects
  const availableSubjectNames = useMemo(() => {
    if (!isMonthly && (record?.planningType === "question_bank" || isQuestionBank) && questionBankSheets.length > 0) {
      return questionBankSheets.map((s) => s.sheetName);
    }
    if (allSectionsAvailable.length > 0) {
      const names = allSectionsAvailable.map((s) => s.subjectName);
      if (isMonthly) {
        names.sort((a, b) => getAcademicMonthRank(a) - getAcademicMonthRank(b));
      }
      return names;
    }
    if (parsedWorkbook && parsedWorkbook.allSubjectNames.length > 0) {
      const names = [...parsedWorkbook.allSubjectNames];
      if (isMonthly) {
        names.sort((a, b) => getAcademicMonthRank(a) - getAcademicMonthRank(b));
      }
      return names;
    }
    const currentMed = detectRecordMedium(record);
    const names = getDefaultSubjectsForClass(record?.classId || "1st", currentMed);
    if (isMonthly) {
      names.sort((a, b) => getAcademicMonthRank(a) - getAcademicMonthRank(b));
    }
    return names;
  }, [record?.planningType, record?.classId, record, isMonthly, isQuestionBank, questionBankSheets, allSectionsAvailable, parsedWorkbook]);

  // Dynamic Selected Medium Display
  const displayMedium = useMemo(() => {
    const med = detectRecordMedium(record);
    return med === "semi" ? "सेमी-इंग्रजी" : "मराठी";
  }, [record]);

  // Clean main document class title
  const cleanClassTitle = useMemo(() => {
    let title = parsedWorkbook?.classTitle || "";
    if (!title || title.length > 50) {
      const clsName = formatMarathiClassName(record?.classId || record?.fileName || "1st");
      return `इयत्ता : ${clsName} • ${isMonthly ? "मासिक नियोजन" : "वार्षिक नियोजन"} • सन : २०२६-२७`;
    }
    return title;
  }, [parsedWorkbook, record, isMonthly]);

  // Helper to get structured section title parts with clean spacing
  const getSectionBannerParts = (sec: SubjectSection) => {
    const rawTitle = (sec.displaySubjectName || sec.subjectName || "").trim();
    const clsName = formatMarathiClassName(record?.classId || record?.fileName || "1st");
    const recAny = record as any;

    // Detect actual academic subject, never let month name become subject
    let realSubject = "";
    if (record?.subjectId && record.subjectId !== "all") {
      realSubject = normalizeSubjectName(record.subjectId);
    } else if (recAny?.subject && recAny.subject !== "all") {
      realSubject = normalizeSubjectName(recAny.subject);
    } else if (selectedSubjectFilter && selectedSubjectFilter !== "all") {
      realSubject = normalizeSubjectName(selectedSubjectFilter);
    } else if (!isMonthly && sec.subjectName && !isMarathiMonth(sec.subjectName)) {
      realSubject = normalizeSubjectName(sec.subjectName);
    }
    if (!realSubject || realSubject === "सामान्य" || realSubject === "all" || isMarathiMonth(realSubject)) {
      realSubject = "मराठी";
    }

    if (isMonthly) {
      const isEnglish = /[a-zA-Z]/.test(sec.subjectName || rawTitle);
      const cleanMonth = (sec.subjectName || rawTitle).trim();

      if (isEnglish) {
        return {
          isEnglish: true,
          segments: [
            "Monthly & Unit Planning",
            `Month : ${cleanMonth}`,
            `Subject : ${realSubject}`,
            `Medium : ${displayMedium}`,
          ],
          fullText: `Monthly & Unit Planning  —  Month : ${cleanMonth}  |  Subject : ${realSubject}  |  Medium : ${displayMedium}`,
        };
      }

      const monthRegex = /(जुन|जून|जुलै|ऑगस्ट|सप्टेंबर|सप्टें|ऑक्टोबर|ऑक्टो|नोव्हेंबर|नोव्हें|डिसेंबर|डिसे|जानेवारी|जाने|फेब्रुवारी|फेब्रु|मार्च\s*(?:\+|&|आणि|[-–/]|ते)?\s*एप्रिल|मार्च|एप्रिल|मे)(?:\s*[\d\u0966-\u096F]{4})?/i;
      const match = rawTitle.match(monthRegex) || (sec.subjectName || "").match(monthRegex);
      let monthName = match ? match[0].trim() : "जून २०२६";
      if (monthName.startsWith("जुन")) monthName = monthName.replace("जुन", "जून");
      if (!monthName.includes("२०२६") && !monthName.includes("2026") && !monthName.includes("२०२७") && !monthName.includes("2027")) {
        monthName += " २०२६";
      }

      return {
        isEnglish: false,
        segments: [
          "अभ्यासक्रमाचे मासिक व घटक नियोजन",
          `माहे : ${monthName}`,
          `विषय : ${realSubject}`,
          `माध्यम : ${displayMedium}`,
        ],
        fullText: `अभ्यासक्रमाचे मासिक व घटक नियोजन  —  माहे : ${monthName}  |  विषय : ${realSubject}  |  माध्यम : ${displayMedium}`,
      };
    }

    // Annual Planning: cleanly separated sentences with breathing room
    const annualSegments = [
      `इयत्ता : ${clsName}`,
      "वार्षिक नियोजन सन : २०२६-२७",
      `विषय : ${realSubject}`,
      `माध्यम : ${displayMedium}`,
    ];

    return {
      isEnglish: false,
      segments: annualSegments,
      fullText: annualSegments.join("  |  "),
    };
  };

  // Helper to format clean section/month banner title
  const formatCleanSectionTitle = (sec: SubjectSection) => {
    return getSectionBannerParts(sec).fullText;
  };


  // Helper to normalize cell string for accurate comparison (handling non-breaking spaces & whitespace differences)
  const normalizeForCompare = (val: any) => {
    if (val === null || val === undefined) return "";
    return String(val)
      .replace(/[\u00a0\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const isEmptyValue = (val: any) => {
    const norm = normalizeForCompare(val);
    return norm === "" || norm === "-" || norm === "null" || norm === "undefined";
  };

  // Helper to detect if content/subject/medium in Excel is English
  const isEnglishContent = (
    headers: string[],
    rows: string[][],
    subjectName?: string,
    mediumId?: string
  ): boolean => {
    const sub = (subjectName || "").toLowerCase();
    const med = (mediumId || "").toLowerCase();

    if (med === "english" || med === "en") return true;
    if (sub === "english" || sub.includes("english")) return true;

    const headerStr = (headers || []).join(" ").toLowerCase();
    if (
      headerStr.includes("date") ||
      headerStr.includes("month") ||
      headerStr.includes("unit") ||
      headerStr.includes("topic") ||
      headerStr.includes("outcome") ||
      headerStr.includes("objective") ||
      headerStr.includes("period") ||
      headerStr.includes("week") ||
      headerStr.includes("tlm") ||
      headerStr.includes("material")
    ) {
      return true;
    }

    let englishCount = 0;
    let devanagariCount = 0;

    const sampleRows = (rows || []).slice(0, 12);
    for (const r of sampleRows) {
      for (const cell of r) {
        const s = String(cell || "").trim();
        if (!s || s === "-") continue;
        const engMatches = s.match(/[a-zA-Z]/g);
        const devMatches = s.match(/[\u0900-\u097F]/g);
        if (engMatches) englishCount += engMatches.length;
        if (devMatches) devanagariCount += devMatches.length;
      }
    }

    return englishCount > devanagariCount && englishCount > 15;
  };

  // Helper to get dynamic category headers matching the Excel language (English / Marathi)
  const getCategoryHeaders = (sec: SubjectSection, isMonthlyPlan: boolean, recordAny: any): string[] => {
    if (sec.headers && Array.isArray(sec.headers) && sec.headers.length >= 4) {
      const hasMeaningfulHeaders = sec.headers.some(
        (h) => h && !h.toLowerCase().includes("स्तंभ") && !h.toLowerCase().includes("column")
      );
      if (hasMeaningfulHeaders) {
        const cleanedHeaders = [...sec.headers];
        if (!isMonthlyPlan && cleanedHeaders.length >= 6) {
          cleanedHeaders[5] = "शिक्षक स्वाक्षरी";
        }
        // For monthly plans, replace "दिनांक" with "दिवस" in the first column
        if (isMonthlyPlan && cleanedHeaders.length > 0) {
          if (cleanedHeaders[0] && (cleanedHeaders[0].trim().includes("दिनांक") || cleanedHeaders[0].trim().toLowerCase() === "date" || cleanedHeaders[0].trim().includes("date"))) {
            cleanedHeaders[0] = "दिवस";
          }
        }
        return cleanedHeaders;
      }
    }

    const isEng = isEnglishContent(sec.headers || [], sec.rows, sec.subjectName, recordAny?.mediumId);

    if (isMonthlyPlan) {
      return isEng
        ? [
          "Day",
          "Topic / Unit / Subtopic",
          "Learning Outcomes",
          "Teaching Points / Objectives",
          "Learning Experiences",
          "Tools & Techniques",
          "Teaching Learning Material (TLM)",
        ]
        : DEFAULT_HEADERS.masik_niyojan;
    } else {
      return isEng
        ? [
          "Month",
          "Weeks",
          "Working Days",
          "Periods",
          `Subject : ${sec.subjectName}`,
          "Teacher Signature",
        ]
        : [
          "महिना",
          "आठवडा",
          "कामाचे दिवस",
          "प्राप्त तासिका",
          `विषय : ${sec.subjectName}`,
          "शिक्षक स्वाक्षरी",
        ];
    }
  };

  // Helper to check if text is an Exam / Assessment / Test / Vacation title
  const isExamOrAssessmentText = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    if (!s || s === "-" || s === "null" || s === "undefined") return false;

    return (
      // Marathi keywords
      s.includes("चाचणी") ||
      s.includes("मूल्यमापन") ||
      s.includes("परीक्षा") ||
      s.includes("संकलित") ||
      s.includes("घटक चाचणी") ||
      s.includes("सत्र परीक्षा") ||
      s.includes("प्रथम घटक") ||
      s.includes("द्वितीय घटक") ||
      s.includes("प्रथम सत्र") ||
      s.includes("द्वितीय सत्र") ||
      s.includes("दिवाळी सुट्ट्या") ||
      s.includes("दिवाळी सुट्टी") ||
      s.includes("दिवाळी") ||
      s.includes("सुट्ट्या") ||
      s.includes("सुट्टी") ||
      s.includes("सुट्या") ||
      s.includes("उन्हाळी सुट्टी") ||
      s.includes("उन्हाळी सुट्ट्या") ||
      s.includes("उन्हाळी") ||
      s.includes("मूल्यांकन") ||
      s.includes("चाचणी क्र") ||
      s.includes("मूल्यमापन क्र") ||
      s.includes("प्रथम सत्र संकलित") ||
      s.includes("द्वितीय सत्र संकलित") ||
      // English keywords
      s.includes("first unit test") ||
      s.includes("1st unit test") ||
      s.includes("unit test 1") ||
      s.includes("unit test - 1") ||
      s.includes("unit test -1") ||
      s.includes("unit test i") ||
      s.includes("second unit test") ||
      s.includes("2nd unit test") ||
      s.includes("unit test 2") ||
      s.includes("unit test - 2") ||
      s.includes("unit test -2") ||
      s.includes("unit test ii") ||
      s.includes("unit test") ||
      s.includes("first term exam") ||
      s.includes("1st term exam") ||
      s.includes("first term examination") ||
      s.includes("term 1 exam") ||
      s.includes("first term assessment") ||
      s.includes("first term summative assessment") ||
      s.includes("second term exam") ||
      s.includes("2nd term exam") ||
      s.includes("second term examination") ||
      s.includes("term 2 exam") ||
      s.includes("second term assessment") ||
      s.includes("second term summative assessment") ||
      s.includes("summative assessment") ||
      s.includes("diwali vacation") ||
      s.includes("diwali holidays") ||
      s.includes("diwali holiday") ||
      s.includes("diwali break") ||
      s.includes("summer vacation") ||
      s.includes("summer holidays") ||
      s.includes("summer break")
    );
  };

  // Helper to check if an entire row is an Exam / Assessment row
  const isExamOrAssessmentRow = (row: string[]): boolean => {
    if (!row || !Array.isArray(row)) return false;
    return row.some((cell) => isExamOrAssessmentText(cell));
  };

  // Helper to compute rowSpan matrix for ALL columns
  const getTargetRowSpanMatrix = (rows: string[][], isMonthlyPlan: boolean, headers: string[]) => {
    const numRows = rows.length;
    if (numRows === 0) return [];
    const numCols = Math.max(...rows.map((r) => r.length), headers.length, 1);

    const matrix: { rowSpan: number; skip: boolean; displayValue: string; isExam?: boolean; isMonthHeader?: boolean }[][] = Array.from(
      { length: numRows },
      () => Array.from({ length: numCols }, () => ({ rowSpan: 1, skip: false, displayValue: "-" }))
    );

    // --- ANNUAL PLANNING (वार्षिक नियोजन) MATRIX BUILDER ---
    if (!isMonthlyPlan) {
      // Step 1: Pre-sanitize rows so EVERY row strictly knows its month
      let activeMonth = "";
      const effectiveMonthPerRow: string[] = [];

      for (let r = 0; r < numRows; r++) {
        let cell0 = String(rows[r]?.[0] || "").trim();
        if (cell0 === "-" || cell0 === "null" || cell0 === "undefined") cell0 = "";

        // If cell0 is exam text (e.g. द्वितीय घटक चाचणी), move it to Col 4 (Topic) so it's not swallowed by month merging
        if (isExamOrAssessmentText(cell0)) {
          if (!rows[r][4] || rows[r][4] === "-" || rows[r][4] === "null" || rows[r][4] === "undefined") {
            rows[r][4] = cell0;
          }
          cell0 = "";
        }

        // Check if ANY other cell in this row has exam text and Col 4 is missing it
        const examCellInRow = (rows[r] || []).find((c) => isExamOrAssessmentText(c));
        if (examCellInRow && (!rows[r][4] || rows[r][4] === "-" || rows[r][4] === "null" || !isExamOrAssessmentText(rows[r][4]))) {
          rows[r][4] = String(examCellInRow).trim();
        }

        if (cell0 && isMarathiMonth(cell0)) {
          activeMonth = canonicalizeMarathiMonth(cell0);
        }
        effectiveMonthPerRow.push(activeMonth || "-");
      }

      // Step 2: Divide rows into Month blocks based on effectiveMonthPerRow
      const monthBlocks: { startR: number; endR: number; monthName: string }[] = [];
      let blockStart = 0;
      let blockMonth = effectiveMonthPerRow[0] || "-";

      for (let r = 1; r < numRows; r++) {
        const m = effectiveMonthPerRow[r];
        if (normalizeForCompare(m) !== normalizeForCompare(blockMonth)) {
          monthBlocks.push({
            startR: blockStart,
            endR: r,
            monthName: blockMonth,
          });
          blockStart = r;
          blockMonth = m;
        }
      }
      if (numRows > 0) {
        monthBlocks.push({
          startR: blockStart,
          endR: numRows,
          monthName: blockMonth,
        });
      }

      // Step 2: Populate matrix with rowSpans for Columns 0, 1, 2, 3 per Month block
      monthBlocks.forEach(({ startR, endR, monthName }) => {
        const monthSpan = endR - startR;

        // Col 0: Month name (rowSpan across monthSpan)
        matrix[startR][0] = {
          rowSpan: monthSpan,
          skip: false,
          displayValue: monthName || "-",
          isMonthHeader: true,
        };
        for (let k = startR + 1; k < endR; k++) {
          matrix[k][0] = { rowSpan: 1, skip: true, displayValue: "" };
        }

        // Cols 1, 2, 3 (Weeks, Working Days, Periods) - group identical values into rowSpans
        for (let cIdx = 1; cIdx <= 3 && cIdx < numCols; cIdx++) {
          const firstVal = String(rows[startR]?.[cIdx] || "").trim();
          let allSame = true;

          for (let k = startR + 1; k < endR; k++) {
            const valK = String(rows[k]?.[cIdx] || "").trim();
            if (valK && valK !== "-" && normalizeForCompare(valK) !== normalizeForCompare(firstVal)) {
              allSame = false;
              break;
            }
          }

          if (allSame) {
            const displayV = (firstVal === "null" || firstVal === "undefined" || !firstVal) ? "-" : firstVal;
            matrix[startR][cIdx] = {
              rowSpan: monthSpan,
              skip: false,
              displayValue: displayV,
            };
            for (let k = startR + 1; k < endR; k++) {
              matrix[k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
            }
          } else {
            // Consecutive matching sub-spans
            let subR = startR;
            while (subR < endR) {
              const subVal = String(rows[subR]?.[cIdx] || "").trim();
              let subSpan = 1;
              while (
                subR + subSpan < endR &&
                normalizeForCompare(rows[subR + subSpan]?.[cIdx]) === normalizeForCompare(subVal)
              ) {
                subSpan++;
              }

              const displayV = (subVal === "null" || subVal === "undefined" || !subVal) ? "-" : subVal;
              matrix[subR][cIdx] = {
                rowSpan: subSpan,
                skip: false,
                displayValue: displayV,
              };
              for (let k = 1; k < subSpan; k++) {
                matrix[subR + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
              }
              subR += subSpan;
            }
          }
        }

        // Col 4: Topic / Unit details (1 cell per row)
        for (let r = startR; r < endR; r++) {
          if (!matrix[r][4]?.skip) {
            let rawVal = String(rows[r]?.[4] || "").trim();
            if (!rawVal || rawVal === "-" || rawVal === "null" || rawVal === "undefined") {
              const examCell = (rows[r] || []).find((c) => isExamOrAssessmentText(c));
              if (examCell) rawVal = String(examCell).trim();
            }
            const val = (rawVal === "null" || rawVal === "undefined") ? "" : rawVal;
            const rowText = (rows[r] || []).join(" ");
            const isExam = isExamOrAssessmentText(val) || isExamOrAssessmentText(rowText);

            matrix[r][4] = {
              rowSpan: 1,
              skip: false,
              displayValue: val || "-",
              isExam,
            };
          }
        }

        // Also check if any other cell in the month block has exam or assessment text
        for (let r = startR; r < endR; r++) {
          for (let c = 0; c < numCols; c++) {
            if (matrix[r][c] && !matrix[r][c].skip) {
              const cellV = matrix[r][c].displayValue || String(rows[r]?.[c] || "");
              if (isExamOrAssessmentText(cellV)) {
                matrix[r][c].isExam = true;
              }
            }
          }
        }

        // Col 5: Teacher Signature (शिक्षक स्वाक्षरी) - Merged per Month Block (rowSpan = monthSpan), BLANK
        if (numCols >= 6) {
          matrix[startR][5] = {
            rowSpan: monthSpan,
            skip: false,
            displayValue: "",
          };
          for (let k = startR + 1; k < endR; k++) {
            matrix[k][5] = { rowSpan: 1, skip: true, displayValue: "" };
          }
        }
      });

      return matrix;
    }

    // --- MONTHLY PLANNING (मासिक नियोजन) MATRIX BUILDER ---
    let r = 0;
    while (r < numRows) {
      const isExamRow = isExamOrAssessmentRow(rows[r]);

      if (isExamRow) {
        let examSpan = 1;
        while (r + examSpan < numRows && isExamOrAssessmentRow(rows[r + examSpan])) {
          examSpan++;
        }

        let examTitle = "";
        let primaryCol = 1;

        for (let spanR = r; spanR < r + examSpan; spanR++) {
          for (let c = 0; c < numCols; c++) {
            const val = rows[spanR]?.[c];
            if (isExamOrAssessmentText(val)) {
              examTitle = String(val).trim();
              primaryCol = c;
              break;
            }
          }
          if (examTitle) break;
        }

        if (!examTitle) examTitle = "चाचणी / मूल्यमापन";

        // Col 0 (Date) inside Exam block: 1 cell per row (rowSpan: 1) to ensure full cell borders
        for (let spanR = r; spanR < r + examSpan; spanR++) {
          const dVal = String(rows[spanR]?.[0] || "").trim();
          matrix[spanR][0] = { rowSpan: 1, skip: false, displayValue: dVal || "-" };
        }

        // Columns 1 to numCols - 1: Exam banner cell across examSpan
        for (let cIdx = 1; cIdx < numCols; cIdx++) {
          if (cIdx === primaryCol) {
            matrix[r][cIdx] = { rowSpan: examSpan, skip: false, displayValue: examTitle, isExam: true };
            for (let k = 1; k < examSpan; k++) {
              matrix[r + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
            }
          } else {
            let altExamTitle = "";
            for (let spanR = r; spanR < r + examSpan; spanR++) {
              const val = rows[spanR]?.[cIdx];
              if (isExamOrAssessmentText(val) && normalizeForCompare(val) !== normalizeForCompare(examTitle)) {
                altExamTitle = String(val).trim();
                break;
              }
            }

            const colDisplay = altExamTitle || "-";
            matrix[r][cIdx] = { rowSpan: examSpan, skip: false, displayValue: colDisplay, isExam: !!altExamTitle };
            for (let k = 1; k < examSpan; k++) {
              matrix[r + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
            }
          }
        }

        r += examSpan;
      } else {
        // Col 0: दिवस (Day) cell - strictly as per Excel, 1 cell per row (no artificial merging logic)
        const dVal = String(rows[r]?.[0] || "").trim();
        matrix[r][0] = { rowSpan: 1, skip: false, displayValue: dVal || "-" };

        // Columns 1 to numCols - 1: span consecutive sub-rows if sub-row has empty cell in this column
        for (let cIdx = 1; cIdx < numCols; cIdx++) {
          if (!matrix[r][cIdx].skip) {
            const rawVal = String(rows[r]?.[cIdx] || "").trim();
            const val = (rawVal === "null" || rawVal === "undefined") ? "" : rawVal;

            if (isEmptyValue(val)) {
              matrix[r][cIdx] = { rowSpan: 1, skip: false, displayValue: "-" };
            } else {
              let span = 1;
              while (
                r + span < numRows &&
                !isExamOrAssessmentRow(rows[r + span]) &&
                isEmptyValue(rows[r + span]?.[cIdx]) &&
                (cIdx === 1 || isEmptyValue(rows[r + span]?.[1]))
              ) {
                span++;
              }

              matrix[r][cIdx] = {
                rowSpan: span,
                skip: false,
                displayValue: val,
              };

              for (let k = 1; k < span; k++) {
                matrix[r + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
              }
            }
          }
        }

        r++;
      }
    }

    return matrix;
  };

  // One-time School & Teacher Profile State
  const [schoolProfile, setSchoolProfile] = useState<UserSchoolProfile>({
    schoolName: "",
    kendraName: "",
    talukaName: "",
    districtName: "",
    udiseNumber: "",
    teacherName: "",
    headMasterName: "",
  });
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState<boolean>(false);
  const [isSavingSchoolProfile, setIsSavingSchoolProfile] = useState<boolean>(false);
  const [schoolFormData, setSchoolFormData] = useState<UserSchoolProfile>({
    schoolName: "",
    kendraName: "",
    talukaName: "",
    districtName: "",
    udiseNumber: "",
    teacherName: "",
    headMasterName: "",
  });

  useEffect(() => {
    const effectiveUserId = user?.uid || auth?.currentUser?.uid;
    const storageKey = effectiveUserId ? `user_planning_school_profile_${effectiveUserId}` : null;

    const blankProfile: UserSchoolProfile = {
      schoolName: "",
      kendraName: "",
      talukaName: "",
      districtName: "",
      udiseNumber: "",
      teacherName: "",
      headMasterName: "",
      isSavedByUser: false,
    };

    // Helper to validate genuine user-saved profile vs legacy/contaminated mock data
    const isGenuineUserSaved = (p: any): boolean => {
      if (!p || typeof p !== "object") return false;
      if (p.isSavedByUser === true) return true;
      // Reject legacy contaminated mock data
      if (
        p.schoolName === "z.p.school" ||
        p.udiseNumber === "2233445566778899" ||
        p.headMasterName?.includes("बाळासाहेब") ||
        p.kendraName === "नरसिंगपूर"
      ) {
        return false;
      }
      return Boolean(p.schoolName && p.schoolName.trim() !== "");
    };

    const applyProfile = (data: Partial<UserSchoolProfile>) => {
      const merged: UserSchoolProfile = {
        schoolName: data.schoolName?.trim() || "",
        kendraName: data.kendraName?.trim() || "",
        talukaName: data.talukaName?.trim() || "",
        districtName: data.districtName?.trim() || "",
        udiseNumber: data.udiseNumber?.trim() || "",
        teacherName: data.teacherName?.trim() || "",
        headMasterName: data.headMasterName?.trim() || "",
        isSavedByUser: Boolean(data.isSavedByUser),
      };
      setSchoolProfile(merged);
      setSchoolFormData(merged);
      return merged;
    };

    // 1. Check local cache for this specific authenticated user
    let cachedFound = false;
    if (storageKey) {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (isGenuineUserSaved(parsed)) {
            applyProfile(parsed);
            cachedFound = true;
          } else {
            // Clean up legacy contaminated cache
            localStorage.removeItem(storageKey);
          }
        } catch (e) {}
      }
    }

    if (!cachedFound) {
      applyProfile(blankProfile);
    }

    // 2. Fetch from Firestore for logged-in user
    const fetchSchoolProfile = async () => {
      if (db && effectiveUserId && effectiveUserId !== "guest_teacher") {
        try {
          // Check dedicated user_planning_school_profiles collection
          const docRef = doc(db, "user_planning_school_profiles", effectiveUserId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as UserSchoolProfile;
            if (isGenuineUserSaved(data)) {
              const merged = applyProfile({ ...data, isSavedByUser: true });
              if (storageKey) localStorage.setItem(storageKey, JSON.stringify(merged));
              return;
            }
          }

          // Fallback check: Did this user provide personal info when registering in 'users' collection?
          const userDocRef = doc(db, "users", effectiveUserId);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData && (uData.schoolName || uData.fullName)) {
              const candidate = {
                schoolName: uData.schoolName || "",
                kendraName: uData.kendra || uData.centerName || "",
                talukaName: uData.taluka || "",
                districtName: uData.district || uData.jilha || "",
                udiseNumber: uData.udise || uData.udiseNumber || "",
                teacherName: uData.fullName || user?.displayName || "",
                headMasterName: uData.headmaster || "",
                isSavedByUser: true,
              };
              if (isGenuineUserSaved(candidate)) {
                const merged = applyProfile(candidate);
                if (storageKey) localStorage.setItem(storageKey, JSON.stringify(merged));
                return;
              }
            }
          }
        } catch (err) {
          console.warn("Planning school profile fetch notice:", err);
        }
      }
    };

    fetchSchoolProfile();
  }, [user?.uid]);

  const handleSaveSchoolProfile = async () => {
    try {
      setIsSavingSchoolProfile(true);
      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
      const storageKey = `user_planning_school_profile_${effectiveUserId}`;

      const profileToSave: UserSchoolProfile = {
        schoolName: schoolFormData.schoolName.trim(),
        kendraName: schoolFormData.kendraName.trim(),
        talukaName: schoolFormData.talukaName.trim(),
        districtName: (schoolFormData.districtName || "").trim(),
        udiseNumber: schoolFormData.udiseNumber.trim(),
        teacherName: schoolFormData.teacherName.trim(),
        headMasterName: schoolFormData.headMasterName.trim(),
        isSavedByUser: true,
      };

      localStorage.setItem(storageKey, JSON.stringify(profileToSave));

      saveUnifiedSchoolProfile({
        schoolName: profileToSave.schoolName,
        kendra: profileToSave.kendraName,
        centerName: profileToSave.kendraName,
        taluka: profileToSave.talukaName,
        jilha: profileToSave.districtName,
        district: profileToSave.districtName,
        udise: profileToSave.udiseNumber,
        teacherName: profileToSave.teacherName,
        headmaster: profileToSave.headMasterName,
      });

      if (db && effectiveUserId && effectiveUserId !== "guest_teacher") {
        try {
          const docRef = doc(db, "user_planning_school_profiles", effectiveUserId);
          await setDoc(docRef, { ...profileToSave, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
          console.warn("Firestore save planning school profile notice:", e);
        }
      }

      setSchoolProfile(profileToSave);
      setSchoolFormData(profileToSave);
      setIsSchoolModalOpen(false);
      toast.success("🎉 शाळा व शिक्षक माहिती यशस्वीरित्या जतन झाली!");
    } catch (err) {
      console.error("Save school profile error:", err);
      toast.error("माहिती जतन करताना त्रुटी आली.");
    } finally {
      setIsSavingSchoolProfile(false);
    }
  };

  // Helper to filter sections strictly by selected subject
  const filterSectionsBySubject = (sections: SubjectSection[], filter: string): SubjectSection[] => {
    if (!sections || sections.length === 0) return [];
    if (filter === "all") return sections;

    const fLower = filter.trim().toLowerCase();
    const isFilterPart1 = fLower.includes("भाग १") || fLower.includes("भाग 1") || fLower.includes("part 1");
    const isFilterPart2 = fLower.includes("भाग २") || fLower.includes("भाग 2") || fLower.includes("part 2");

    const matched = sections.filter((sec) => {
      const sName = (sec.subjectName || "").trim().toLowerCase();
      const dName = (sec.displaySubjectName || "").trim().toLowerCase();

      const isSecPart1 = sName.includes("भाग १") || sName.includes("भाग 1") || sName.includes("part 1") || dName.includes("भाग १") || dName.includes("भाग 1");
      const isSecPart2 = sName.includes("भाग २") || sName.includes("भाग 2") || sName.includes("part 2") || dName.includes("भाग २") || dName.includes("भाग 2");

      // Strict separation: Part 1 must never match Part 2
      if (isFilterPart1 && isSecPart2) return false;
      if (isFilterPart2 && isSecPart1) return false;

      // If filtering for Part 1 specifically, must match Part 1
      if (isFilterPart1) return isSecPart1;
      // If filtering for Part 2 specifically, must match Part 2
      if (isFilterPart2) return isSecPart2;

      return (
        sName === fLower ||
        dName.includes(fLower) ||
        sName.includes(fLower) ||
        fLower.includes(sName) ||
        areSubjectsEquivalent(sName, fLower) ||
        areSubjectsEquivalent(dName, fLower) ||
        (isMonthly && getAcademicMonthRank(sName) === getAcademicMonthRank(fLower) && getAcademicMonthRank(sName) < 900)
      );
    });

    if (matched.length > 0) return matched;

    return [
      {
        subjectName: filter,
        displaySubjectName: isMonthly ? `महिना : ${filter}` : `विषय : ${filter}`,
        headers: isMonthly ? DEFAULT_HEADERS.masik_niyojan : DEFAULT_HEADERS.varshik_niyojan,
        rows: [],
        startRow: 0,
        endRow: 0,
      },
    ];
  };

  // Dynamic sections to render depending on view / edit mode and current subject filter
  const sectionsToRender = useMemo<SubjectSection[]>(() => {
    const targetSource = isInlineEditing ? editableSections : allSectionsAvailable;
    return filterSectionsBySubject(targetSource, selectedSubjectFilter);
  }, [isInlineEditing, editableSections, allSectionsAvailable, selectedSubjectFilter]);

  // Start Inline Editing Action
  const handleStartInlineEditing = () => {
    let sectionsToEdit = JSON.parse(JSON.stringify(allSectionsAvailable));
    if (!sectionsToEdit || sectionsToEdit.length === 0) {
      sectionsToEdit = availableSubjectNames.map((sName) => ({
        subjectName: sName,
        displaySubjectName: isMonthly ? `महिना : ${sName}` : `विषय : ${sName}`,
        headers: isMonthly ? DEFAULT_HEADERS.masik_niyojan : DEFAULT_HEADERS.varshik_niyojan,
        rows: isMonthly ? [
          ["०१ ते ०८ जून", "१. पूर्वतयारी व स्वागत", "संवाद साधणे व पूर्वज्ञान तपासणे", "चित्र वर्णन व संवाद", "विद्यार्थ्यांशी संवाद व गाणी", "तोंडी प्रश्नोत्तर", "चित्र तक्ते"],
          ["०९ ते १५ जून", "२. मूलभूत क्षमता विकास", "अक्षर व अंक ओळख", "अक्षर ओळख व सराव", "मातीत गिरवणे व लेखन", "प्रात्यक्षिक", "अक्षर कार्ड"],
        ] : [
          ["जून", "१-२", "१२", "२५", "वर्ग पूर्वतयारी अभ्यासक्रम, सराव व उजळणी", "वाचन, लेखन क्षमता विकास"],
          ["जुलै", "३-६", "२४", "५०", "घटक १ चा सराव व स्वाध्याय", "संकल्पना स्पष्टीकरण"],
        ],
        startRow: 0,
        endRow: 0,
      }));
    }
    setEditableSections(sectionsToEdit);
    setIsInlineEditing(true);
    toast.info("✏️ तक्ता संपादन मोड सुरू झाला! तुम्ही माहिती थेट बदलू शकता.", { duration: 3000 });
  };

  // Modify cell value in real-time by subject name
  const handleCellChange = (subjName: string, rIdx: number, cIdx: number, val: string) => {
    setEditableSections((prev) => {
      let targetIdx = prev.findIndex(
        (s) =>
          s.subjectName === subjName ||
          s.subjectName.toLowerCase().includes(subjName.toLowerCase()) ||
          subjName.toLowerCase().includes(s.subjectName.toLowerCase())
      );

      let next = [...prev];
      if (targetIdx === -1) {
        const newSec: SubjectSection = {
          subjectName: subjName,
          displaySubjectName: isMonthly ? `महिना : ${subjName}` : `विषय : ${subjName}`,
          headers: isMonthly ? DEFAULT_HEADERS.masik_niyojan : DEFAULT_HEADERS.varshik_niyojan,
          rows: [isMonthly ? ["", "", "", "", "", "", ""] : ["", "", "", "", "", ""]],
          startRow: 0,
          endRow: 0,
        };
        next.push(newSec);
        targetIdx = next.length - 1;
      }

      const sec = { ...next[targetIdx] };
      const rows = [...sec.rows];
      const emptyRow = isMonthly ? ["", "", "", "", "", "", ""] : ["", "", "", "", "", ""];
      const row = [...(rows[rIdx] || emptyRow)];
      while (row.length <= cIdx) row.push("");
      row[cIdx] = val;
      rows[rIdx] = row;
      sec.rows = rows;
      next[targetIdx] = sec;
      return next;
    });
  };

  // Add new row to section by subject name or fallback filter
  const handleAddRow = (subjNameOrIdx: string | number = 0) => {
    const subjName = typeof subjNameOrIdx === "string" ? subjNameOrIdx : (selectedSubjectFilter === "all" ? "मराठी" : selectedSubjectFilter);
    setEditableSections((prev) => {
      let targetIdx = prev.findIndex(
        (s) =>
          s.subjectName === subjName ||
          s.subjectName.toLowerCase().includes(subjName.toLowerCase()) ||
          subjName.toLowerCase().includes(s.subjectName.toLowerCase())
      );

      let next = [...prev];
      if (targetIdx === -1) {
        const newSec: SubjectSection = {
          subjectName: subjName,
          displaySubjectName: isMonthly ? `महिना : ${subjName}` : `विषय : ${subjName}`,
          headers: isMonthly ? DEFAULT_HEADERS.masik_niyojan : DEFAULT_HEADERS.varshik_niyojan,
          rows: [isMonthly ? ["", "", "", "", "", "", ""] : ["", "", "", "", "", ""]],
          startRow: 0,
          endRow: 0,
        };
        next.push(newSec);
        return next;
      }

      const sec = { ...next[targetIdx] };
      const emptyRow = isMonthly ? ["", "", "", "", "", "", ""] : ["", "", "", "", "", ""];
      const rows = [...sec.rows, emptyRow];
      sec.rows = rows;
      next[targetIdx] = sec;
      return next;
    });
    toast.success("➕ नवीन खालील ओळ जोडली गेली.");
  };

  // Delete row from section by subject name
  const handleDeleteRow = (subjName: string, rIdx: number) => {
    setEditableSections((prev) => {
      const targetIdx = prev.findIndex(
        (s) =>
          s.subjectName === subjName ||
          s.subjectName.toLowerCase().includes(subjName.toLowerCase()) ||
          subjName.toLowerCase().includes(s.subjectName.toLowerCase())
      );

      if (targetIdx === -1) return prev;

      const next = [...prev];
      const sec = { ...next[targetIdx] };
      const rows = sec.rows.filter((_, idx) => idx !== rIdx);
      sec.rows = rows;
      next[targetIdx] = sec;
      return next;
    });
    toast.info("🗑️ ओळ डिलीट केली.");
  };

  // Save Edits for Specific User vs Admin Master
  const handleSaveUserEdits = async () => {
    try {
      setIsSavingEdits(true);
      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
      const currentMed = detectRecordMedium(record);
      const recordId = activeRecordId;

      // Use editableSections directly as source of truth for saving
      const sectionsToSave = JSON.parse(JSON.stringify(editableSections.length > 0 ? editableSections : allSectionsAvailable));
      const combinedRows: string[][] = [];
      const updatedTableRows: any[] = [];

      sectionsToSave.forEach((sec: SubjectSection) => {
        if (sec.rows && sec.rows.length > 0) {
          combinedRows.push([isMonthly ? `महिना : ${sec.subjectName}` : `विषय : ${sec.subjectName}`, "", "", "", "", ""]);
          combinedRows.push(isMonthly ? DEFAULT_HEADERS.masik_niyojan : DEFAULT_HEADERS.varshik_niyojan);
          sec.rows.forEach((r) => {
            combinedRows.push([...r]);
            updatedTableRows.push({
              month: r[0] || "",
              weeks: r[1] || "",
              workingDays: r[2] || "",
              periods: r[3] || "",
              topics: r[4] || "",
              outcomes: r[5] || "",
              subject: sec.subjectName,
            });
          });
        }
      });

      const targetCategory: PlanningCategory =
        currentSectionType === "question_bank"
          ? "prashnapedhi"
          : currentSectionType === "monthly"
            ? "masik_niyojan"
            : "varshik_niyojan";

      const updatedRec: PlanningDocumentRecord = {
        ...(record || {}),
        id: recordId,
        mediumId: currentMed,
        category: targetCategory,
        planningType: currentSectionType,
        classId: record?.classId || "1",
        subjectId: record?.subjectId || (selectedSubjectFilter !== "all" ? selectedSubjectFilter : "मराठी"),
        metadata: record?.metadata || {
          title: "",
          planned_periods: "",
          working_days: "",
          academic_year: "",
          class_display: "",
          subject_display: "",
        },
        headers: categoryHeaders,
        uploadedAt: mode === "admin" ? new Date().toISOString() : (record?.uploadedAt || new Date().toISOString()),
        sections: sectionsToSave, // STORE DIRECTLY FOR 100% RELIABLE RENDERING
        rawDataRows: combinedRows,
        rows: combinedRows,
        tableRows: updatedTableRows,
        isCustomUserEdit: true,
        editedByUserId: effectiveUserId,
        editedAt: new Date().toISOString(),
      };

      // Always save to LocalStorage with strict section-namespaced key
      try {
        localStorage.setItem(`user_edit_${currentSectionType}_${effectiveUserId}_${recordId}`, JSON.stringify(updatedRec));
        localStorage.setItem(`user_edit_${currentSectionType}_${recordId}`, JSON.stringify(updatedRec));
        // Keep fallback for backwards compatibility
        localStorage.setItem(`user_edit_${effectiveUserId}_${recordId}`, JSON.stringify(updatedRec));
      } catch (e) {
        console.warn("LocalStorage save notice:", e);
      }

      if (mode === "admin") {
        // Admin edits update master Firestore record for ALL teachers
        if (db && recordId) {
          try {
            const adminDocRef = doc(db, "academic_plannings", recordId);
            await setDoc(adminDocRef, updatedRec, { merge: true });
          } catch (e) {
            console.warn("Firestore admin save notice:", e);
          }
        }
        toast.success("🎉 ॲडमिन मास्टर फाईल यशस्वीरित्या सेव्ह झाली! सर्व युझर्सना हा बदल दिसेल.");
      } else {
        // Teacher/User edit is strictly saved for this specific user and section
        if (db && recordId) {
          try {
            const userDocRef = doc(db, "academic_plannings_user_edits", `${currentSectionType}_${effectiveUserId}_${recordId}`);
            await setDoc(userDocRef, updatedRec, { merge: true });
          } catch (e) {
            console.warn("Firestore user edit save notice:", e);
          }
        }
        toast.success("🎉 तुमची संपादित केलेली माहिती फक्त तुमच्या खात्यासाठी (Specific User) यशस्वीरित्या सेव्ह झाली!");
      }

      setSavedUserEditRecord(updatedRec);
      setIsInlineEditing(false);
    } catch (err) {
      console.error("Save edit error:", err);
      toast.error("माहिती सेव्ह करताना अडचण आली.");
    } finally {
      setIsSavingEdits(false);
    }
  };

  // Reset to Original Admin File
  const handleResetToOriginal = async () => {
    const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";

    if (activeRecordId) {
      try {
        localStorage.removeItem(`user_edit_${currentSectionType}_${activeRecordId}`);
        localStorage.removeItem(`user_edit_${currentSectionType}_${effectiveUserId}_${activeRecordId}`);
        localStorage.removeItem(`user_edit_${activeRecordId}`);
        localStorage.removeItem(`user_edit_${effectiveUserId}_${activeRecordId}`);

        if (db) {
          try {
            await deleteDoc(doc(db, "academic_plannings_user_edits", `${currentSectionType}_${effectiveUserId}_${activeRecordId}`));
            await deleteDoc(doc(db, "academic_plannings_user_edits", `${effectiveUserId}_${activeRecordId}`));
          } catch (e) { }
        }
      } catch (e) { }
    }

    setSavedUserEditRecord(null);
    setIsInlineEditing(false);
    toast.info("🔄 मूळ एडमिन फाईल यशस्वीरित्या रिस्टोअर झाली.");
  };

  // Dedicated Question Bank PDF Generator (Landscape A4, Zero Text Cutting, Strict Pagination)
  const handleDownloadQuestionBankPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      toast.info("⚡ प्रश्नपेढी PDF तयार होत आहे... (Generating Question Bank PDF)");

      const { jsPDF } = await import("jspdf");
      let html2canvas: any;
      try {
        const hModule = await import("html2canvas-pro");
        html2canvas = hModule.default || hModule;
      } catch {
        const hModule = await import("html2canvas");
        html2canvas = hModule.default || hModule;
      }

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "landscape",
        compress: true,
      });

      const pdfWidth = 281; // mm printable width (297mm - 16mm margins)
      const exportWidth = 1120; // px
      const PAGE_MAX_HEIGHT = 740; // px budget to ensure zero cutting on landscape A4

      // Filter sheets according to selectedSubjectFilter
      const sheetsToExport = questionBankSheets.filter((sheet) => {
        if (selectedSubjectFilter === "all") return true;
        const fLower = selectedSubjectFilter.trim().toLowerCase();
        const sName = (sheet.sheetName || "").trim().toLowerCase();
        return sName === fLower || sName.includes(fLower) || fLower.includes(sName);
      });

      if (sheetsToExport.length === 0) {
        toast.error("कोणतीही शीट उपलब्ध नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      // Hidden container to render pages
      const tempContainer = document.createElement("div");
      tempContainer.className = "pdf-question-bank-export";
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "0px";
      tempContainer.style.top = "0px";
      tempContainer.style.zIndex = "-9999";
      tempContainer.style.width = `${exportWidth}px`;
      tempContainer.style.backgroundColor = "#ffffff";
      tempContainer.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif";
      document.body.appendChild(tempContainer);

      const generatedPages: HTMLElement[] = [];

      // ── Process Each Sheet ──
      for (let sIdx = 0; sIdx < sheetsToExport.length; sIdx++) {
        const sheet = sheetsToExport[sIdx];
        const isInfoSheet =
          sheet.sheetName.includes("सूचना") ||
          sheet.sheetName.toLowerCase().includes("info") ||
          sheet.sheetName.toLowerCase().includes("instruction");

        const nonEmptyRows = (sheet.rows || []).filter((row) =>
          row.some((cell) => String(cell || "").trim() !== "")
        );

        if (nonEmptyRows.length === 0) continue;

        // 1. INFO SHEET (सूचना)
        if (isInfoSheet) {
          const infoPage = document.createElement("div");
          infoPage.style.width = `${exportWidth}px`;
          infoPage.style.padding = "24px 28px";
          infoPage.style.boxSizing = "border-box";
          infoPage.style.backgroundColor = "#ffffff";
          infoPage.style.display = "flex";
          infoPage.style.flexDirection = "column";
          infoPage.style.justifyContent = "space-between";
          infoPage.style.minHeight = "720px";

          // Top Header
          const schoolBox = document.createElement("div");
          schoolBox.style.border = "2px solid #0f172a";
          schoolBox.style.borderRadius = "12px";
          schoolBox.style.padding = "10px 16px";
          schoolBox.style.backgroundColor = "#f8fafc";
          schoolBox.style.marginBottom = "14px";
          schoolBox.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
              <h2 style="font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0;">
                ${schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
              </h2>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 13px; font-weight: 700; padding-top: 6px; color: #0f172a;">
              <div><span style="color: #475569;">केंद्र:</span> <strong>${schoolProfile.kendraName || "—"}</strong></div>
              <div style="text-align: center;"><span style="color: #475569;">तालुका:</span> <strong>${schoolProfile.talukaName || "—"}</strong></div>
              <div style="text-align: center;"><span style="color: #475569;">जिल्हा:</span> <strong>${schoolProfile.districtName || "—"}</strong></div>
              <div style="text-align: right;"><span style="color: #475569;">UDISE:</span> <strong style="font-family: monospace;">${schoolProfile.udiseNumber || "—"}</strong></div>
            </div>
          `;
          infoPage.appendChild(schoolBox);

          // Info Banner
          const infoBanner = document.createElement("div");
          infoBanner.style.backgroundColor = "#ffffff";
          infoBanner.style.color = "#000000";
          infoBanner.style.border = "1.5px solid #000000";
          infoBanner.style.padding = "8px 16px";
          infoBanner.style.borderRadius = "10px";
          infoBanner.style.display = "flex";
          infoBanner.style.justifyContent = "space-between";
          infoBanner.style.alignItems = "center";
          infoBanner.style.marginBottom = "14px";
          infoBanner.innerHTML = `
            <span style="font-size: 14px; font-weight: 900; color: #000000;">📋 अभ्यासक्रम व प्रश्नपेढी मार्गदर्शक सूचना (Curriculum Specifications)</span>
            <span style="font-size: 12px; font-weight: 700; color: #475569;">NEP 2020 / SCF-FS 2024</span>
          `;
          infoPage.appendChild(infoBanner);

          // Info Table
          const infoTable = document.createElement("table");
          infoTable.style.width = "100%";
          infoTable.style.borderCollapse = "collapse";
          infoTable.style.border = "2px solid #000000";
          infoTable.style.backgroundColor = "#ffffff";
          infoTable.innerHTML = `
            <thead>
              <tr style="background-color: #ffffff; color: #000000; border-bottom: 2px solid #000000;">
                <th style="padding: 8px 12px; text-align: left; font-size: 13px; font-weight: 900; width: 30%; border: 1px solid #000000; background-color: #ffffff; color: #000000;">विषय / घटक</th>
                <th style="padding: 8px 12px; text-align: left; font-size: 13px; font-weight: 900; width: 70%; border: 1px solid #000000; background-color: #ffffff; color: #000000;">तपशीलवार माहिती</th>
              </tr>
            </thead>
            <tbody>
              ${nonEmptyRows.map((row) => `
                <tr style="background-color: #ffffff;">
                  <td style="padding: 8px 12px; font-size: 12px; font-weight: 800; color: #000000; border: 1px solid #000000; vertical-align: top;">${row[0] || ""}</td>
                  <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #000000; border: 1px solid #000000; vertical-align: top;">${row[1] || row.slice(1).join(" ") || ""}</td>
                </tr>
              `).join("")}
            </tbody>
          `;
          infoPage.appendChild(infoTable);

          // Signature Bar
          const sig = document.createElement("div");
          sig.style.marginTop = "20px";
          sig.style.paddingTop = "12px";
          sig.style.borderTop = "2px solid #94a3b8";
          sig.style.display = "grid";
          sig.style.gridTemplateColumns = "1fr 1fr";
          sig.style.textAlign = "center";
          sig.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
              <div style="height: 45px;"></div>
              <div style="width: 220px; border-top: 1.5px dotted #64748b; margin-bottom: 5px;"></div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a;">वर्ग शिक्षक स्वाक्षरी</div>
              <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 3px;">(${schoolProfile.teacherName || "शिक्षकाचे नाव"})</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
              <div style="height: 45px;"></div>
              <div style="width: 220px; border-top: 1.5px dotted #64748b; margin-bottom: 5px;"></div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a;">मुख्याध्यापक स्वाक्षरी व शिक्का</div>
              <div style="font-size: 11px; font-weight: 700; color: #475569; margin-top: 3px;">(${schoolProfile.headMasterName || "मुख्याध्यापक नाव"})</div>
            </div>
          `;
          infoPage.appendChild(sig);

          generatedPages.push(infoPage);
          continue;
        }

        // 2. QUESTION BANK SHEET (प्रश्नपेढी)
        const headerIndex = nonEmptyRows.findIndex((row) => {
          const joined = row.map((c) => String(c || "")).join(" ").toLowerCase();
          return (
            ((joined.includes("अनुक्रमांक") || joined.includes("अ.क्र") || joined.includes("क्र.")) &&
              (joined.includes("प्रश्न") || joined.includes("पाठ") || joined.includes("घटक") || joined.includes("उत्तर"))) ||
            joined.includes("प्रश्न क्रमांक") ||
            joined.includes("question number")
          );
        });

        const effectiveHeaderIdx = headerIndex >= 0 ? headerIndex : 0;
        const tableHeader = nonEmptyRows[effectiveHeaderIdx] || sheet.headers || [];
        const rawDataRows = nonEmptyRows.slice(effectiveHeaderIdx + 1);
        const rawGridRows =
          sheet.gridData && sheet.gridData.length > effectiveHeaderIdx + 1
            ? sheet.gridData.slice(effectiveHeaderIdx + 1)
            : rawDataRows.map((r) =>
              r.map((v) => ({ value: v, rowspan: 1, colspan: 1, isMergedHidden: false }))
            );
        const colMap = resolveQuestionBankColumnMap(tableHeader);

        // Extract all questions with lesson and outcome inheritance
        const allQuestions: Array<{
          srNo: string;
          lesson: string;
          outcome: string;
          question: string;
          answer: string;
          evalType: string;
          qType: string;
          objective: string;
        }> = [];

        let currentLesson = "";
        let currentOutcome = "";

        for (let rIdx = 0; rIdx < rawDataRows.length; rIdx++) {
          const r = rawDataRows[rIdx];
          const gridRow = rawGridRows[rIdx] || [];
          if ((!r || r.length === 0) && (!gridRow || gridRow.length === 0)) continue;

          const rawLesson = getQuestionBankCellVal(gridRow, colMap.lesson) || getQuestionBankCellVal(r, colMap.lesson);
          const rawOutcome = getQuestionBankCellVal(gridRow, colMap.outcome) || getQuestionBankCellVal(r, colMap.outcome);
          const rawQuestion = getQuestionBankCellVal(gridRow, colMap.question) || getQuestionBankCellVal(r, colMap.question);
          const rawSr = getQuestionBankCellVal(gridRow, colMap.srNo) || getQuestionBankCellVal(r, colMap.srNo);

          if (rawLesson && !rawLesson.toLowerCase().includes("पाठ / घटक") && !rawLesson.toLowerCase().includes("घटक विवरण")) {
            currentLesson = rawLesson;
          }
          if (rawOutcome && !rawOutcome.toLowerCase().includes("अध्ययन निष्पत्ती")) {
            currentOutcome = rawOutcome;
          }

          if (!rawQuestion && !rawSr) continue;

          allQuestions.push({
            srNo: rawSr || String(allQuestions.length + 1),
            lesson: currentLesson || "सामान्य पाठ / घटक",
            outcome: currentOutcome || "—",
            question: rawQuestion,
            answer: getQuestionBankCellVal(gridRow, colMap.answer) || getQuestionBankCellVal(r, colMap.answer),
            evalType: getQuestionBankCellVal(gridRow, colMap.evalType) || getQuestionBankCellVal(r, colMap.evalType),
            qType: getQuestionBankCellVal(gridRow, colMap.qType) || getQuestionBankCellVal(r, colMap.qType),
            objective: getQuestionBankCellVal(gridRow, colMap.objective) || getQuestionBankCellVal(r, colMap.objective),
          });
        }

        // Filter questions by selected lesson & search query
        const filteredQuestions = allQuestions.filter((q) => {
          if (selectedQuestionBankLesson !== "all" && q.lesson !== selectedQuestionBankLesson) {
            return false;
          }
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            return (
              q.question.toLowerCase().includes(query) ||
              q.answer.toLowerCase().includes(query) ||
              q.lesson.toLowerCase().includes(query) ||
              q.outcome.toLowerCase().includes(query) ||
              q.srNo.toLowerCase().includes(query) ||
              q.evalType.toLowerCase().includes(query) ||
              q.qType.toLowerCase().includes(query) ||
              q.objective.toLowerCase().includes(query)
            );
          }
          return true;
        });

        if (filteredQuestions.length === 0) continue;

        // Group questions by lesson
        const lessonGroups: Array<{
          lesson: string;
          outcome: string;
          questions: typeof filteredQuestions;
        }> = [];

        filteredQuestions.forEach((q) => {
          let lastGrp = lessonGroups[lessonGroups.length - 1];
          if (!lastGrp || lastGrp.lesson !== q.lesson) {
            lastGrp = {
              lesson: q.lesson,
              outcome: q.outcome,
              questions: [],
            };
            lessonGroups.push(lastGrp);
          }
          lastGrp.questions.push(q);
        });

        // ── Render strictly 2 Topics (Lessons) per Landscape A4 Page ──
        const LESSONS_PER_PAGE = 2;
        const pageLessonGroups: (typeof lessonGroups)[] = [];
        for (let i = 0; i < lessonGroups.length; i += LESSONS_PER_PAGE) {
          pageLessonGroups.push(lessonGroups.slice(i, i + LESSONS_PER_PAGE));
        }

        for (let pIdx = 0; pIdx < pageLessonGroups.length; pIdx++) {
          const lessonsOnPage = pageLessonGroups[pIdx];
          const isFullFirstPage = pIdx === 0 && generatedPages.length === 0;
          const totalQuestionsOnPage = lessonsOnPage.reduce((sum, lg) => sum + lg.questions.length, 0);

          // Calculate optimized font size and padding so all questions of these 2 topics fit without cutting
          let qFontSize = "12px";
          let qLineHeight = "1.28";
          let cellPadding = "2.5px 4px";
          let headerFontSize = "12px";
          let metaFontSize = "11.5px";

          if (totalQuestionsOnPage > 22) {
            qFontSize = "10px";
            qLineHeight = "1.2";
            cellPadding = "1.5px 3px";
            headerFontSize = "10.5px";
            metaFontSize = "9.5px";
          } else if (totalQuestionsOnPage > 17) {
            qFontSize = "11px";
            qLineHeight = "1.22";
            cellPadding = "2px 3.5px";
            headerFontSize = "11.5px";
            metaFontSize = "10.5px";
          } else if (totalQuestionsOnPage > 12) {
            qFontSize = "11.8px";
            qLineHeight = "1.25";
            cellPadding = "2.2px 3.5px";
            headerFontSize = "12px";
            metaFontSize = "11px";
          } else {
            qFontSize = "12.5px";
            qLineHeight = "1.3";
            cellPadding = "3px 4px";
            headerFontSize = "12.5px";
            metaFontSize = "11.5px";
          }

          const pageDiv = document.createElement("div");
          pageDiv.className = "pdf-question-bank-page";
          pageDiv.style.width = `${exportWidth}px`;
          pageDiv.style.minHeight = "710px";
          pageDiv.style.padding = isFullFirstPage ? "6px 14px" : "5px 14px";
          pageDiv.style.boxSizing = "border-box";
          pageDiv.style.backgroundColor = "#ffffff";
          pageDiv.style.display = "flex";
          pageDiv.style.flexDirection = "column";
          pageDiv.style.justifyContent = "space-between";
          pageDiv.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif";

          const topContent = document.createElement("div");
          topContent.style.display = "flex";
          topContent.style.flexDirection = "column";
          topContent.style.gap = "3px";

          // 1. Top School Header
          if (isFullFirstPage) {
            const masterHeader = document.createElement("div");
            masterHeader.style.border = "1.5px solid #000000";
            masterHeader.style.borderRadius = "8px";
            masterHeader.style.padding = "4px 10px";
            masterHeader.style.backgroundColor = "#ffffff";
            masterHeader.innerHTML = `
              <div style="text-align: center; border-bottom: 1.5px solid #000000; padding-bottom: 2px;">
                <h2 style="font-size: 16px; font-weight: 900; color: #000000; text-transform: uppercase; margin: 0;">
                  ${schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                </h2>
              </div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 11px; font-weight: 700; color: #000000; padding-top: 2px;">
                <div><span style="color: #475569;">केंद्र:</span> <strong>${schoolProfile.kendraName || "—"}</strong></div>
                <div style="text-align: center;"><span style="color: #475569;">तालुका:</span> <strong>${schoolProfile.talukaName || "—"}</strong></div>
                <div style="text-align: center;"><span style="color: #475569;">जिल्हा:</span> <strong>${schoolProfile.districtName || "—"}</strong></div>
                <div style="text-align: right;"><span style="color: #475569;">UDISE:</span> <strong style="font-family: monospace;">${schoolProfile.udiseNumber || "—"}</strong></div>
              </div>
            `;
            topContent.appendChild(masterHeader);

            // Calculate class and subject labels in Marathi
            const classNameMr = formatMarathiClassName(record?.classId || record?.fileName || "1st");
            const subjectNameMr = resolvedSubjectName;

            // Subject Banner
            const banner = document.createElement("div");
            banner.style.backgroundColor = "#ffffff";
            banner.style.color = "#000000";
            banner.style.border = "1.5px solid #000000";
            banner.style.padding = "3.5px 10px";
            banner.style.borderRadius = "6px";
            banner.style.display = "flex";
            banner.style.justifyContent = "space-between";
            banner.style.alignItems = "center";
            banner.innerHTML = `
              <span style="font-size: 12.5px; font-weight: 900; color: #000000;">
                📚 इयत्ता: ${classNameMr} | विषय: ${subjectNameMr} | शैक्षणिक वर्ष: २०२६-२७ | संपूर्ण प्रश्नपेढी
              </span>
              <span style="font-size: 10.5px; font-weight: 700; color: #475569;">
                NEP 2020 / SCF-FS 2024 संलग्नीत
              </span>
            `;
            topContent.appendChild(banner);
          } else {
            const classNameMr = formatMarathiClassName(record?.classId || record?.fileName || "1st");
            const subjectNameMr = resolvedSubjectName;

            // Compact Continuous Header on subsequent pages
            const compactHeader = document.createElement("div");
            compactHeader.style.border = "1.5px solid #000000";
            compactHeader.style.borderRadius = "6px";
            compactHeader.style.padding = "3px 10px";
            compactHeader.style.backgroundColor = "#ffffff";
            compactHeader.style.display = "flex";
            compactHeader.style.justifyContent = "space-between";
            compactHeader.style.alignItems = "center";
            compactHeader.innerHTML = `
              <span style="font-size: 11.5px; font-weight: 900; color: #000000;">
                🏫 ${schoolProfile.schoolName || "जिल्हा परिषद शाळा"} | UDISE: ${schoolProfile.udiseNumber || "—"}
              </span>
              <span style="font-size: 11.5px; font-weight: 900; color: #000000;">
                इयत्ता: ${classNameMr} | विषय: ${subjectNameMr} | प्रश्नपेढी (२०२६-२७)
              </span>
              <span style="font-size: 10.5px; font-weight: 800; color: #475569;">
                पान क्रमांक: ${generatedPages.length + 1}
              </span>
            `;
            topContent.appendChild(compactHeader);
          }

          // 2. Lesson Title Subheader showing the 2 topics on this page
          const lessonBanner = document.createElement("div");
          lessonBanner.style.backgroundColor = "#ffffff";
          lessonBanner.style.border = "1.5px solid #000000";
          lessonBanner.style.borderRadius = "6px";
          lessonBanner.style.padding = "3.5px 10px";
          lessonBanner.style.display = "flex";
          lessonBanner.style.justifyContent = "space-between";
          lessonBanner.style.alignItems = "center";
          lessonBanner.style.gap = "8px";
          lessonBanner.innerHTML = `
            <div style="font-size: 12.5px; font-weight: 900; color: #000000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              📖 समाविष्ट पाठ: ${lessonsOnPage.map((lg) => lg.lesson).join("  &nbsp;|&nbsp;  ")}
            </div>
            <div style="font-size: 11px; font-weight: 800; color: #000000; white-space: nowrap; background-color: #ffffff; padding: 2px 7px; border-radius: 4px; border: 1px solid #000000;">
              🎯 एकूण प्रश्न: ${totalQuestionsOnPage}
            </div>
          `;
          topContent.appendChild(lessonBanner);

          // 3. The 8-Column Question Table (Containing 2 topics ~ 20 questions)
          const table = document.createElement("table");
          table.className = "pdf-question-bank-table";
          table.style.width = "100%";
          table.style.borderCollapse = "collapse";
          table.style.border = "2px solid #000000";
          table.style.backgroundColor = "#ffffff";
          table.style.tableLayout = "fixed";

          table.innerHTML = `
            <colgroup>
              <col style="width: 30px;">
              <col style="width: 12%;">
              <col style="width: 14%;">
              <col style="width: 38.5%;">
              <col style="width: 25.5%;">
              <col style="width: 58px;">
              <col style="width: 58px;">
              <col style="width: 50px;">
            </colgroup>
            <thead>
              <tr style="background-color: #ffffff; color: #000000; border-bottom: 2px solid #000000;">
                <th style="border: 1px solid #000000; padding: 1px 0.5px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000; width: 30px; min-width: 30px; max-width: 30px; line-height: 1.1;">अ.<br/>क्र.</th>
                <th style="border: 1px solid #000000; padding: 3px 2px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000;">${tableHeader[1] || "पाठ / घटक"}</th>
                <th style="border: 1px solid #000000; padding: 3px 2px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000;">${tableHeader[2] || "अध्ययन निष्पत्ती"}</th>
                <th style="border: 1px solid #000000; padding: 3px 8px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000;">${tableHeader[3] || "प्रश्न"}</th>
                <th style="border: 1px solid #000000; padding: 3px 8px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000;">${tableHeader[4] || "उत्तर"}</th>
                <th style="border: 1px solid #000000; padding: 2px 1px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000; line-height: 1.15; word-break: break-word; width: 58px; max-width: 60px;">${tableHeader[5] ? String(tableHeader[5]).replace(" ", "<br/>") : "मूल्यमापन<br/>प्रकार"}</th>
                <th style="border: 1px solid #000000; padding: 2px 1px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000; line-height: 1.15; word-break: break-word; width: 58px; max-width: 60px;">${tableHeader[6] ? String(tableHeader[6]).replace(" ", "<br/>") : "प्रश्नाचा<br/>प्रकार"}</th>
                <th style="border: 1px solid #000000; padding: 2px 1px; font-size: ${headerFontSize}; font-weight: 900; text-align: center; background-color: #ffffff; color: #000000; line-height: 1.15; word-break: break-word; width: 50px; max-width: 52px;">${tableHeader[7] || "उद्दिष्ट"}</th>
              </tr>
            </thead>
            <tbody>
              ${lessonsOnPage.map((lg) => {
            const questions = lg.questions;

            // Calculate outcome spans within this lesson
            const outcomeSpans: { isStart: boolean; span: number }[] = [];
            for (let i = 0; i < questions.length; i++) {
              if (i === 0 || questions[i].outcome !== questions[i - 1].outcome) {
                let span = 1;
                while (i + span < questions.length && questions[i + span].outcome === questions[i].outcome) {
                  span++;
                }
                outcomeSpans.push({ isStart: true, span });
              } else {
                outcomeSpans.push({ isStart: false, span: 1 });
              }
            }

            return questions.map((q, qIdx) => {
              const isFirstRowOfLesson = qIdx === 0;
              const isLastRowOfLesson = qIdx === questions.length - 1;

              let evalText = q.evalType || "—";
              if (q.evalType?.includes("तोंडी")) {
                evalText = "तोंडी";
              } else if (q.evalType?.includes("लेखी")) {
                evalText = "लेखी";
              } else if (q.evalType?.includes("प्रात्यक्षिक")) {
                evalText = "प्रात्यक्षिक";
              }

              let qTypeText = q.qType || "—";
              if (q.qType?.includes("वस्तुनिष्ठ")) {
                qTypeText = "वस्तुनिष्ठ";
              } else if (q.qType?.includes("लघुत्तरी")) {
                qTypeText = "लघुत्तरी";
              } else if (q.qType?.includes("दीर्घोत्तरी")) {
                qTypeText = "दीर्घोत्तरी";
              }

              const objText = q.objective || "—";
              const standardRowBottomBorder = isLastRowOfLesson ? "2px solid #000000" : "1px solid #000000";

              const lessonCellHtml = isFirstRowOfLesson
                ? `<td rowspan="${questions.length}" style="border: 1.5px solid #000000; border-right: 1.5px solid #000000; border-bottom: 2px solid #000000; padding: ${cellPadding}; font-size: ${qFontSize}; font-weight: 900; color: #000000; background-color: #ffffff; vertical-align: middle; text-align: center; word-break: break-word;">
                    <div style="font-weight: 900; color: #000000; text-align: center; line-height: ${qLineHeight}; padding: 4px 2px; font-size: ${qFontSize}; word-break: break-word;">${lg.lesson || "पाठ / घटक"}</div>
                  </td>`
                : "";

              const outcomeCellHtml = outcomeSpans[qIdx].isStart
                ? `<td rowspan="${outcomeSpans[qIdx].span}" style="border: 1.5px solid #000000; border-right: 1.5px solid #000000; ${qIdx + outcomeSpans[qIdx].span === questions.length ? "border-bottom: 2px solid #000000;" : ""} padding: ${cellPadding}; font-size: ${qFontSize}; font-weight: 600; color: #000000; background-color: #ffffff; vertical-align: middle; text-align: center; word-break: break-word;">
                    <div style="font-weight: 600; color: #000000; text-align: center; line-height: ${qLineHeight}; padding: 4px 2px; font-size: ${qFontSize}; word-break: break-word;">${q.outcome || "—"}</div>
                  </td>`
                : "";

              return `
                    <tr style="background: transparent;">
                      <td style="border: 1px solid #000000; border-bottom: ${standardRowBottomBorder}; padding: 1.5px 0.5px; font-size: ${qFontSize}; font-weight: 900; text-align: center; color: #000000; vertical-align: middle; background-color: #ffffff; width: 30px; min-width: 30px; max-width: 30px;">
                        ${q.srNo}
                      </td>

                      ${lessonCellHtml}

                      ${outcomeCellHtml}

                      <td style="border: 1px solid #000000; border-bottom: ${standardRowBottomBorder}; padding: 3px 6px; font-size: ${qFontSize}; font-weight: 800; color: #000000; line-height: ${qLineHeight}; vertical-align: middle; word-break: break-word; overflow-wrap: break-word; background-color: #ffffff; text-align: left;">
                        ${q.question}
                      </td>

                      <td class="qb-col-answer" style="border: 1px solid #000000; border-bottom: ${standardRowBottomBorder}; padding: 3px 6px; font-size: ${qFontSize}; font-weight: 600; color: #000000; background-color: #ffffff; line-height: ${qLineHeight}; vertical-align: middle; word-break: break-word; overflow-wrap: break-word; text-align: left;">
                        ${q.answer}
                      </td>

                      <td style="border: 1px solid #000000; border-bottom: ${standardRowBottomBorder}; padding: 2px 1px; text-align: center; vertical-align: middle; background-color: #ffffff; font-size: ${metaFontSize}; font-weight: 800; color: #000000; white-space: nowrap; width: 58px; max-width: 60px;">
                        ${evalText}
                      </td>

                      <td style="border: 1px solid #000000; border-bottom: ${standardRowBottomBorder}; padding: 2px 1px; text-align: center; vertical-align: middle; background-color: #ffffff; font-size: ${metaFontSize}; font-weight: 800; color: #000000; white-space: nowrap; width: 58px; max-width: 60px;">
                        ${qTypeText}
                      </td>

                      <td style="border: 1px solid #000000; border-bottom: ${standardRowBottomBorder}; padding: 2px 1px; text-align: center; vertical-align: middle; background-color: #ffffff; font-size: ${metaFontSize}; font-weight: 800; color: #000000; white-space: nowrap; width: 50px; max-width: 52px;">
                        ${objText}
                      </td>
                    </tr>
                  `;
            }).join("");
          }).join("")}
            </tbody>
          `;
          topContent.appendChild(table);
          pageDiv.appendChild(topContent);

          // 4. Bottom Footer / Signature
          const isLastPageOfDoc = pIdx === pageLessonGroups.length - 1;
          const bottomFooter = document.createElement("div");
          bottomFooter.style.marginTop = isLastPageOfDoc ? "10px" : "3px";
          bottomFooter.style.paddingTop = "2px";
          bottomFooter.style.borderTop = "1px solid #cbd5e1";

          if (isLastPageOfDoc) {
            bottomFooter.innerHTML = `
              <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; padding-top: 6px; padding-bottom: 6px; margin-bottom: 4px; border-bottom: 1px dashed #cbd5e1;">
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                  <div style="height: 45px;"></div>
                  <div style="width: 220px; border-top: 1.5px dotted #64748b; margin-bottom: 5px;"></div>
                  <div style="font-size: 13px; font-weight: 900; color: #0f172a;">वर्ग शिक्षक स्वाक्षरी</div>
                  <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 2px;">(${schoolProfile.teacherName || "शिक्षकाचे नाव"})</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
                  <div style="height: 45px;"></div>
                  <div style="width: 220px; border-top: 1.5px dotted #64748b; margin-bottom: 5px;"></div>
                  <div style="font-size: 13px; font-weight: 900; color: #0f172a;">मुख्याध्यापक स्वाक्षरी व शिक्का</div>
                  <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-top: 2px;">(${schoolProfile.headMasterName || "मुख्याध्यापक नाव"})</div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; color: #64748b;">
                <span>महाराष्ट्र प्राथमिक शिक्षण परिषद | शैक्षणिक वर्ष २०२६-२७</span>
                <span>अंतिम पान (${pageLessonGroups.length}/${pageLessonGroups.length})</span>
              </div>
            `;
          } else {
            bottomFooter.innerHTML = `
              <div style="display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; color: #64748b;">
                <span>महाराष्ट्र राज्य अभ्यासक्रम आराखडा (SCF-FS / NEP 2020)</span>
                <span>${schoolProfile.schoolName || ""}</span>
                <span>पान ${pIdx + 1} / ${pageLessonGroups.length}</span>
              </div>
            `;
          }
          pageDiv.appendChild(bottomFooter);

          generatedPages.push(pageDiv);
        }
      }

      if (generatedPages.length === 0) {
        toast.error("प्रिंट करण्यासाठी कोणतीही माहिती सापडली नाही.");
        setIsGeneratingPdf(false);
        if (tempContainer.parentNode) document.body.removeChild(tempContainer);
        return;
      }

      toast.info(`⚡ एकूण ${generatedPages.length} पाने तयार केली जात आहेत... (Rendering ${generatedPages.length} Pages)`);

      // ── Render each generated page directly with html2canvas (Zero text cutting, Fast & Reliable!) ──
      for (let p = 0; p < generatedPages.length; p++) {
        const pageDiv = generatedPages[p];
        tempContainer.innerHTML = "";
        tempContainer.appendChild(pageDiv);

        // Allow layout to settle
        await new Promise((resolve) => setTimeout(resolve, 30));

        const pageCanvas = await html2canvas(pageDiv, {
          scale: 1.75,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
        });

        if (p > 0) {
          pdf.addPage("a4", "landscape");
        }

        // High efficiency JPEG compression (0.78 retains razor-sharp Devanagari text while saving 75% file size)
        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.78);

        // Proportional scale to fit strictly within landscape A4 printable area (281mm x 196mm) with zero cutting
        const maxAvailableWidthMm = 281;
        const maxAvailableHeightMm = 196;
        const canvasRatio = pageCanvas.width / pageCanvas.height;

        let renderWidthMm = maxAvailableWidthMm;
        let renderHeightMm = renderWidthMm / canvasRatio;

        if (renderHeightMm > maxAvailableHeightMm) {
          renderHeightMm = maxAvailableHeightMm;
          renderWidthMm = renderHeightMm * canvasRatio;
        }

        const offsetX = 8 + (maxAvailableWidthMm - renderWidthMm) / 2;
        const offsetY = 7 + (maxAvailableHeightMm - renderHeightMm) / 2;

        pdf.addImage(pageImgData, "JPEG", offsetX, offsetY, renderWidthMm, renderHeightMm, undefined, "FAST");
      }

      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }

      const classNameMr = formatMarathiClassName(record?.classId || record?.fileName || "1st");
      const devYear = "२०२६-२७";
      const lessonPart = selectedQuestionBankLesson !== "all"
        ? `_${selectedQuestionBankLesson.replace(/[/\\?%*:|"<>]/g, "_")}`
        : "_सर्व_२४_पाठ";
      const subjectPart = resolvedSubjectName || "मराठी";
      const filename = `इयत्ता_${classNameMr}_प्रश्नपेढी_${subjectPart}${lessonPart}_${devYear}.pdf`;

      pdf.save(filename);
      toast.success("🎉 प्रश्नपेढी PDF यशस्वीरित्या डाऊनलोड झाली!");
    } catch (err) {
      console.error("Question Bank PDF download error:", err);
      toast.error("प्रश्नपेढी PDF डाऊनलोड करताना अडचण आली.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate Multi-Subject / Single-Subject PDF preserving exact web structure & per-subject clean pagebreaks
  const handleDownloadCombinedPdf = async () => {
    // Route Question Bank workbooks directly to dedicated landscape zero-cutting PDF generator
    if (!isMonthly && (record?.planningType === "question_bank" || isQuestionBank)) {
      return handleDownloadQuestionBankPdf();
    }

    const printElement = printContainerRef.current;
    if (!printElement) {
      toast.error("प्रिन्ट घटक उपलब्ध नाही.");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const isSingleSubject = selectedSubjectFilter !== "all";
      toast.info(
        isSingleSubject
          ? `⚡ विषय : ${selectedSubjectFilter} चे PDF तयार होत आहे...`
          : "⚡ सर्व विषयांचे एकत्र (Combined) PDF तयार होत आहे..."
      );

      const { jsPDF } = await import("jspdf");
      const html2canvasModule = await import("html2canvas");
      const html2canvas = html2canvasModule.default || html2canvasModule;

      const orientation = "portrait";
      const pdfWidth = 190;
      const pdfPageHeight = 297;
      const exportWidth = "950px";

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      const subjectSections = Array.from(
        printElement.querySelectorAll(".pdf-subject-section")
      ) as HTMLElement[];

      if (subjectSections.length === 0) {
        toast.error("विषय तक्ता आढळला नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      let totalPdfPages = 0;

      for (let i = 0; i < subjectSections.length; i++) {
        const sec = subjectSections[i];

        // Clone section to remove non-printable buttons/inputs
        const secClone = sec.cloneNode(true) as HTMLElement;
        secClone.querySelectorAll(".print\\:hidden, .no-print, button, svg.lucide-edit-3").forEach((el: any) => el.remove());
        secClone.querySelectorAll("input, textarea").forEach((input: any) => {
          const span = document.createElement("span");
          span.textContent = input.value || " ";
          span.className = "inline-block font-black text-slate-900";
          input.parentNode?.replaceChild(span, input);
        });

        // Explicitly center exam, assessment, and vacation cells in cloned element for PDF export
        secClone.querySelectorAll("tbody tr td").forEach((tdEl: any) => {
          const text = tdEl.textContent?.trim() || "";
          if (isExamOrAssessmentText(text) || tdEl.classList.contains("exam-assessment-cell")) {
            tdEl.style.textAlign = "center";
            tdEl.style.verticalAlign = "middle";
            tdEl.style.fontWeight = "900";
            tdEl.style.backgroundColor = "#fffbe6";
            tdEl.classList.add("text-center");
            tdEl.classList.remove("text-left");
            Array.from(tdEl.children).forEach((child: any) => {
              child.style.textAlign = "center";
              child.style.margin = "0 auto";
              child.style.display = "flex";
              child.style.justifyContent = "center";
              child.style.alignItems = "center";
              child.style.width = "100%";
            });
          }
        });

        // Extract components of the section
        const schoolHeader = secClone.querySelector(".pdf-school-header");
        const subjectBanner = secClone.querySelector(".pdf-subject-banner") as HTMLElement | null;
        if (subjectBanner) {
          subjectBanner.style.display = "flex";
          subjectBanner.style.flexDirection = "row";
          subjectBanner.style.flexWrap = "nowrap";
          subjectBanner.style.justifyContent = "space-between";
          subjectBanner.style.alignItems = "center";
          subjectBanner.style.padding = "6px 14px";
          subjectBanner.style.whiteSpace = "nowrap";
          subjectBanner.style.width = "100%";
          subjectBanner.style.boxSizing = "border-box";
          subjectBanner.querySelectorAll("*").forEach((el: any) => {
            el.style.flexWrap = "nowrap";
            el.style.whiteSpace = "nowrap";
          });
        }
        const tableEl = secClone.querySelector("table");
        const colgroup = secClone.querySelector("colgroup");
        const thead = secClone.querySelector("thead");
        const allTrs = Array.from(secClone.querySelectorAll("tbody tr")) as HTMLElement[];
        const sigBar = secClone.querySelector(".pdf-signature-bar");

        if (allTrs.length === 0) continue;

        // Group rows into Month Blocks (Annual Planning) or Date Blocks (Monthly Planning)
        const trGroups: HTMLElement[][] = [];
        let currentGroup: HTMLElement[] = [];

        allTrs.forEach((tr) => {
          const isMonthStart = tr.getAttribute("data-month-start") === "true";
          const firstTd = tr.querySelector("td");
          const firstTdText = firstTd?.textContent?.trim() || "";
          const isMonthByText = !isMonthly && isMarathiMonth(firstTdText);

          if ((isMonthStart || isMonthByText) && currentGroup.length > 0) {
            trGroups.push(currentGroup);
            currentGroup = [];
          }
          currentGroup.push(tr);
        });
        if (currentGroup.length > 0) {
          trGroups.push(currentGroup);
        }

        // Hidden container to construct and measure DOM pages
        const tempContainer = document.createElement("div");
        tempContainer.className = "pdf-export-active";
        tempContainer.style.position = "fixed";
        tempContainer.style.left = "0px";
        tempContainer.style.top = "0px";
        tempContainer.style.zIndex = "-9999";
        tempContainer.style.width = exportWidth; // "950px"
        tempContainer.style.backgroundColor = "#ffffff";
        tempContainer.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif";
        document.body.appendChild(tempContainer);

        // A4 page height budget in DOM pixels at 950px width:
        // Total A4 is 950 * (297 / 210) = 1343px. 1340px utilizes the full A4 height with ~19mm safe margin!
        const PAGE_MAX_HEIGHT = 1340;

        const pageList: HTMLElement[] = [];

        const createNewPage = (isFirstPage: boolean) => {
          const pageDiv = document.createElement("div");
          pageDiv.className = "bg-white space-y-3.5";
          pageDiv.style.width = exportWidth;
          pageDiv.style.padding = "20px 25px";
          pageDiv.style.boxSizing = "border-box";
          pageDiv.style.backgroundColor = "#ffffff";
          pageDiv.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif";

          if (isFirstPage) {
            if (schoolHeader) pageDiv.appendChild(schoolHeader.cloneNode(true));
            if (subjectBanner) pageDiv.appendChild(subjectBanner.cloneNode(true));
          }

          const pageTable = document.createElement("table");
          if (tableEl) pageTable.className = tableEl.className;
          pageTable.style.width = "900px";
          pageTable.style.margin = "0 auto";
          pageTable.style.boxSizing = "border-box";
          pageTable.style.borderCollapse = "collapse";
          pageTable.style.backgroundColor = "#ffffff";

          if (colgroup) pageTable.appendChild(colgroup.cloneNode(true));
          if (thead) pageTable.appendChild(thead.cloneNode(true));

          const pageTbody = document.createElement("tbody");
          pageTable.appendChild(pageTbody);
          pageDiv.appendChild(pageTable);

          tempContainer.appendChild(pageDiv);
          pageList.push(pageDiv);
          return { pageDiv, tbody: pageTbody };
        };

        let currentPage = createNewPage(true);

        for (let g = 0; g < trGroups.length; g++) {
          const group = trGroups[g];
          const clonedRows = group.map((tr) => tr.cloneNode(true) as HTMLElement);
          clonedRows.forEach((tr) => currentPage.tbody.appendChild(tr));

          // If adding this entire month overflows the page, and the page already has at least one month:
          // Move this month to a fresh page!
          if (currentPage.pageDiv.offsetHeight > PAGE_MAX_HEIGHT && currentPage.tbody.children.length > group.length) {
            clonedRows.forEach((tr) => tr.remove());
            currentPage = createNewPage(false);
            const freshClonedRows = group.map((tr) => tr.cloneNode(true) as HTMLElement);
            freshClonedRows.forEach((tr) => currentPage.tbody.appendChild(tr));
          }
        }

        // Add signature bar on the last page of this subject
        if (sigBar) {
          const clonedSig = sigBar.cloneNode(true) as HTMLElement;
          currentPage.pageDiv.appendChild(clonedSig);

          // If signature bar causes overflow and page has multiple months,
          // move the last month and signature to a new page
          if (currentPage.pageDiv.offsetHeight > PAGE_MAX_HEIGHT && trGroups.length > 1) {
            const lastGroup = trGroups[trGroups.length - 1];
            if (currentPage.tbody.children.length > lastGroup.length) {
              clonedSig.remove();
              for (let k = 0; k < lastGroup.length; k++) {
                currentPage.tbody.lastElementChild?.remove();
              }
              currentPage = createNewPage(false);
              lastGroup.forEach((tr) => currentPage.tbody.appendChild(tr.cloneNode(true)));
              currentPage.pageDiv.appendChild(clonedSig);
            }
          }
        }

        // Yield main thread before rendering
        await new Promise((resolve) => setTimeout(resolve, 30));

        // Render each generated page directly with html2canvas (NO SLICING = ZERO WORD CUTTING!)
        for (let p = 0; p < pageList.length; p++) {
          const pageDiv = pageList[p];
          tempContainer.innerHTML = "";
          tempContainer.appendChild(pageDiv);

          // Allow DOM to settle
          await new Promise((resolve) => setTimeout(resolve, 30));

          const pageCanvas = await html2canvas(pageDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0,
          });

          if (totalPdfPages > 0) {
            pdf.addPage();
          }
          totalPdfPages++;

          const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.98);
          const pageHeightMm = (pageCanvas.height * pdfWidth) / pageCanvas.width;
          pdf.addImage(pageImgData, "JPEG", 10, 10, pdfWidth, pageHeightMm);
        }

        document.body.removeChild(tempContainer);
      }

      const classNameMr = formatMarathiClassName(record?.classId || record?.fileName || "1st");
      const devYear = "२०२६-२७";

      const filename = isMonthly
        ? (isSingleSubject
          ? `इयत्ता_${classNameMr}_मासिक_नियोजन_${selectedSubjectFilter}_${devYear}.pdf`
          : `इयत्ता_${classNameMr}_संपूर्ण_मासिक_नियोजन_${devYear}.pdf`)
        : (isSingleSubject
          ? `इयत्ता_${classNameMr}_वार्षिक_नियोजन_${selectedSubjectFilter}_${devYear}.pdf`
          : `इयत्ता_${classNameMr}_संपूर्ण_वार्षिक_नियोजन_${devYear}.pdf`);


      pdf.save(filename);

      toast.success(
        isSingleSubject
          ? `🎉 विषय : ${selectedSubjectFilter} चे PDF यशस्वीरित्या डाऊनलोड झाले!`
          : "🎉 सर्व विषयांचे एकत्र (Combined) PDF यशस्वीरित्या डाऊनलोड झाले!"
      );
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("PDF डाऊनलोड करताना अडचण आली.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!record && !parsedWorkbook && !savedUserEditRecord) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-3">
        <div className="size-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <BookOpen className="size-8" />
        </div>
        <h3 className="text-base font-black text-slate-800">माहिती उपलब्ध नाही (No Record Found)</h3>
        <p className="text-xs text-slate-500 font-semibold max-w-sm">
          निवडलेल्या इयत्ता व विषयासाठी अद्याप नियोजन फाईल सेव्ह केलेली नाही.
        </p>
      </div>
    );
  }

  const categoryHeaders = isMonthly ? DEFAULT_HEADERS.masik_niyojan : DEFAULT_HEADERS.varshik_niyojan;

  return (
    <div className="w-full space-y-5 print:p-0">
      {/* Top Controls & Subject Filter Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        {/* Subject Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 pr-2 border-r border-slate-200">
            <BookOpen className="size-4 text-indigo-600" /> {isMonthly ? "महिना निवडा (SELECT MONTH):" : "विषय निवडा (SELECT SUBJECT):"}
          </span>

          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${selectedSubjectFilter === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
          >
            <Globe className="size-3.5" />
            <span>{isMonthly ? "🌐 सर्व महिने एकत्र (All Months)" : "🌐 सर्व विषय एकत्र (All Combined)"}</span>
          </button>

          {availableSubjectNames.map((sName) => (
            <button
              key={sName}
              onClick={() => setSelectedSubjectFilter(sName)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${selectedSubjectFilter === sName
                ? "bg-slate-900 text-amber-300 shadow-md scale-105"
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-300"
                }`}
            >
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>{sName}</span>
            </button>
          ))}
        </div>

        {/* User Specific Customization Badge */}
        {savedUserEditRecord && !isInlineEditing && (!isQuestionBank || savedUserEditRecord.planningType === "question_bank") && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-300/80 px-4 py-2.5 rounded-2xl text-xs font-bold text-amber-900">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4 text-amber-600 shrink-0" />
              <span>✏️ तुम्ही संपादन केलेले नियोजन (तुमच्या युझर खात्यासाठी जतन केले आहे)</span>
            </div>
            <button
              onClick={handleResetToOriginal}
              className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-black border border-amber-300 transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="size-3.5 text-amber-600" />
              <span>🔄 मूळ एडमिन फाईलवर जा</span>
            </button>
          </div>
        )}

        {/* Action Controls & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="घटक किंवा शब्द शोधा (Search topics)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleDownloadCombinedPdf}
              disabled={isGeneratingPdf}
              className={`px-4 py-2.5 rounded-xl ${isQuestionBank
                ? "bg-slate-900 hover:bg-slate-800 text-white border border-slate-700"
                : "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white"
                } text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50`}
            >
              {isGeneratingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>
                {isQuestionBank
                  ? selectedQuestionBankLesson === "all"
                    ? "📥 संपूर्ण प्रश्नपेढी PDF (All Lessons PDF)"
                    : `📥 प्रश्नपेढी PDF (${selectedQuestionBankLesson})`
                  : selectedSubjectFilter === "all"
                    ? (isMonthly ? "📥 संपूर्ण मासिक नियोजन PDF" : "📥 COMBINED PDF DOWNLOAD")
                    : (isMonthly ? `📥 मासिक नियोजन PDF (${selectedSubjectFilter})` : `📥 PDF DOWNLOAD (${selectedSubjectFilter})`)}
              </span>
            </button>

            {!isMonthly && isQuestionBank && selectedQuestionBankLesson !== "all" && (
              <button
                onClick={() => {
                  setSelectedQuestionBankLesson("all");
                  setTimeout(() => handleDownloadQuestionBankPdf(), 50);
                }}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 border border-slate-700"
                title="सर्व २४ पाठांचे एकत्र PDF डाऊनलोड करा"
              >
                <Download className="size-4 text-white" />
                <span>📥 सर्व २४ पाठ PDF</span>
              </button>
            )}

            {/* SINGLE ONLY SAVE / EDIT CONTROL BAR - EXCLUSIVELY FOR PLANNING (NOT QUESTION BANK) */}
            {!isQuestionBank && (
              isInlineEditing ? (
                <>
                  <button
                    onClick={handleSaveUserEdits}
                    disabled={isSavingEdits}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50 border border-emerald-400"
                  >
                    {isSavingEdits ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    <span>💾 SAVE (सेव्ह करा)</span>
                  </button>

                  <button
                    onClick={() => handleAddRow(selectedSubjectFilter === "all" ? (isMonthly ? "जून" : "मराठी") : selectedSubjectFilter)}
                    className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border border-amber-300 active:scale-95"
                  >
                    <Plus className="size-4" />
                    <span>➕ ओळ जोडा</span>
                  </button>

                  <button
                    onClick={() => setIsInlineEditing(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <X className="size-4" />
                    <span>रद्द करा</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartInlineEditing}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Edit3 className="size-4 text-slate-950" />
                  <span>✏️ EDIT (संपादन करा)</span>
                </button>
              )
            )}

            {mode === "admin" && onDelete && (
              <button
                onClick={onDelete}
                className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200"
              >
                <Trash2 className="size-4" /> <span>डिलीट</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Document Content Area */}
      <div
        ref={printContainerRef}
        className="bg-white rounded-3xl border border-slate-300 shadow-sm overflow-hidden p-6 sm:p-8 space-y-8 print:border-none print:shadow-none print:p-0"
      >
        {loadingWorkbook ? (
          <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              विषयनिहाय नियोजन डेटा लोड होत आहे... (Loading Subject Sections)
            </span>
          </div>
        ) : (
          <>
            {isQuestionBank ? (
              <>
                <div className="border-b-2 border-slate-900 pb-5 space-y-2 text-center">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    {record?.fileName || "प्रश्नपेढी"}
                  </h2>
                  <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                    <span className="bg-white text-slate-900 px-3 py-1 rounded-xl border border-slate-300">
                      इयत्ता: <strong>{formatMarathiClassName(record?.classId || "2nd")}</strong>
                    </span>
                    <span className="bg-white text-slate-900 px-3 py-1 rounded-xl border border-slate-300">
                      विषय: <strong>{record?.subjectId || "मराठी"}</strong>
                    </span>
                    <span className="bg-white text-slate-900 px-3 py-1 rounded-xl border border-slate-300">
                      माध्यम: <strong>{displayMedium}</strong>
                    </span>
                    <span className="bg-white text-slate-900 px-3 py-1 rounded-xl border border-slate-300">
                      Sheets: <strong>{questionBankSheets.length}</strong>
                    </span>
                  </div>
                </div>

                {/* Filter Question Bank sheets according to selectedSubjectFilter */}
                {(() => {
                  const filteredSheets = questionBankSheets.filter((sheet) => {
                    if (selectedSubjectFilter === "all") return true;
                    const fLower = selectedSubjectFilter.trim().toLowerCase();
                    const sName = (sheet.sheetName || "").trim().toLowerCase();

                    const isFilterPart1 = fLower.includes("भाग १") || fLower.includes("भाग 1") || fLower.includes("part 1");
                    const isFilterPart2 = fLower.includes("भाग २") || fLower.includes("भाग 2") || fLower.includes("part 2");
                    const isSecPart1 = sName.includes("भाग १") || sName.includes("भाग 1") || sName.includes("part 1");
                    const isSecPart2 = sName.includes("भाग २") || sName.includes("भाग 2") || sName.includes("part 2");

                    if (isFilterPart1 && isSecPart2) return false;
                    if (isFilterPart2 && isSecPart1) return false;
                    if (isFilterPart1) return isSecPart1;
                    if (isFilterPart2) return isSecPart2;

                    return sName === fLower || sName.includes(fLower) || fLower.includes(sName);
                  });

                  if (filteredSheets.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">
                        निवडलेल्या विषयासाठी ({selectedSubjectFilter}) कोणतीही शीट सापडली नाही.
                      </div>
                    );
                  }

                  return filteredSheets.map((sheet, sheetIndex) => {
                    const isInfoSheet =
                      sheet.sheetName.includes("सूचना") ||
                      sheet.sheetName.toLowerCase().includes("info") ||
                      sheet.sheetName.toLowerCase().includes("instruction");

                    const nonEmptyRows = (sheet.rows || []).filter((row) =>
                      row.some((cell) => String(cell || "").trim() !== "")
                    );

                    const headerIndex = nonEmptyRows.findIndex((row) => {
                      const joined = row.map((c) => String(c || "")).join(" ").toLowerCase();
                      return (
                        ((joined.includes("अनुक्रमांक") || joined.includes("अ.क्र") || joined.includes("क्र.")) &&
                          (joined.includes("प्रश्न") || joined.includes("पाठ") || joined.includes("घटक") || joined.includes("उत्तर"))) ||
                        joined.includes("प्रश्न क्रमांक") ||
                        joined.includes("question number") ||
                        (joined.includes("विषय") && joined.includes("माहिती"))
                      );
                    });

                    const effectiveHeaderIdx = headerIndex >= 0 ? headerIndex : 0;
                    const tableHeader = nonEmptyRows[effectiveHeaderIdx] || sheet.headers || [];
                    const metadataRows = effectiveHeaderIdx > 0 ? nonEmptyRows.slice(0, effectiveHeaderIdx) : [];
                    const rawDataRows = nonEmptyRows.slice(effectiveHeaderIdx + 1);
                    const rawGridRows =
                      sheet.gridData && sheet.gridData.length > effectiveHeaderIdx + 1
                        ? sheet.gridData.slice(effectiveHeaderIdx + 1)
                        : rawDataRows.map((r) =>
                          r.map((v) => ({ value: v, rowspan: 1, colspan: 1, isMergedHidden: false }))
                        );

                    // 1. RENDER INFORMATION SHEET (सूचना)
                    if (isInfoSheet) {
                      return (
                        <div key={`${sheet.sheetName}-${sheetIndex}`} className="pdf-subject-section space-y-4 page-break-after">
                          {/* School Info Header Card */}
                          <div className="pdf-school-header border-2 border-slate-900 rounded-2xl p-5 sm:p-6 bg-white space-y-3.5 text-sm sm:text-base font-bold text-slate-900 print:bg-white print:border-2 print:border-slate-900 relative">
                            <button
                              type="button"
                              onClick={() => {
                                setSchoolFormData(schoolProfile);
                                setIsSchoolModalOpen(true);
                              }}
                              className="print:hidden absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                              title="शाळा माहिती संपादन करा"
                            >
                              <Edit3 className="size-3.5 text-slate-700" />
                              <span>बदला</span>
                            </button>

                            <div className="text-center border-b-2 border-slate-900 pb-3">
                              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 uppercase tracking-wide print:text-slate-950">
                                {schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                              </h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm md:text-base font-bold text-slate-900 pt-1.5">
                              <div><span className="text-slate-600 font-semibold">केंद्र:</span> <span className="font-extrabold text-slate-950">{schoolProfile.kendraName || "—"}</span></div>
                              <div className="sm:text-center"><span className="text-slate-600 font-semibold">तालुका:</span> <span className="font-extrabold text-slate-950">{schoolProfile.talukaName || "—"}</span></div>
                              <div className="sm:text-center"><span className="text-slate-600 font-semibold">जिल्हा:</span> <span className="font-extrabold text-slate-950">{schoolProfile.districtName || "—"}</span></div>
                              <div className="sm:text-right"><span className="text-slate-600 font-semibold">UDISE क्र.:</span> <span className="font-mono font-extrabold text-slate-950">{schoolProfile.udiseNumber || "—"}</span></div>
                            </div>
                          </div>

                          <div className="pdf-subject-banner bg-white text-slate-950 border-2 border-slate-900 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                              <FileSpreadsheet className="size-4 text-slate-900" />
                              <span>{sheet.sheetName} (अभ्यासक्रम संदर्भ व तपशील)</span>
                            </h3>
                            <span className="text-[11px] font-bold text-slate-600">{rawDataRows.length} नोंदी</span>
                          </div>

                          <div className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden shadow-sm">
                            <table className="w-full border-collapse text-xs font-sans">
                              <thead>
                                <tr className="bg-white text-black border-b-2 border-slate-900" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
                                  <th className="border border-slate-400 p-3 text-left font-black w-1/3 bg-white text-black" style={{ backgroundColor: "#ffffff", color: "#000000" }}>विषय / घटक</th>
                                  <th className="border border-slate-400 p-3 text-left font-black w-2/3 bg-white text-black" style={{ backgroundColor: "#ffffff", color: "#000000" }}>तपशील व माहिती</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rawDataRows.map((row, rIdx) => (
                                  <tr key={rIdx} className="bg-white">
                                    <td className="border border-slate-300 p-3 font-black text-black align-top bg-white">
                                      {row[0] || ""}
                                    </td>
                                    <td className="border border-slate-300 p-3 font-semibold text-slate-900 align-top leading-relaxed bg-white">
                                      {row[1] || ""}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }

                    // 2. RENDER QUESTION BANK SHEET (प्रश्नपेढी)
                    const colMap = resolveQuestionBankColumnMap(tableHeader);
                    const isStandard8Col =
                      tableHeader.some((h) => String(h || "").includes("अनुक्रमांक") || String(h || "").includes("अ.क्र") || String(h || "").includes("प्रश्न क्रमांक")) ||
                      tableHeader.some((h) => String(h || "").includes("पाठ") || String(h || "").includes("घटक")) ||
                      tableHeader.some((h) => String(h || "").includes("प्रश्न"));

                    let currentLesson = "";
                    let currentOutcome = "";

                    const allQuestions = rawDataRows.map((row, rIdx) => {
                      const gridRow = rawGridRows[rIdx] || [];
                      const rawLesson = getQuestionBankCellVal(gridRow, colMap.lesson) || getQuestionBankCellVal(row, colMap.lesson);
                      const rawOutcome = getQuestionBankCellVal(gridRow, colMap.outcome) || getQuestionBankCellVal(row, colMap.outcome);
                      const rawSr = getQuestionBankCellVal(gridRow, colMap.srNo) || getQuestionBankCellVal(row, colMap.srNo);
                      const rawQuestion = getQuestionBankCellVal(gridRow, colMap.question) || getQuestionBankCellVal(row, colMap.question);

                      if (rawLesson && !rawLesson.toLowerCase().includes("पाठ / घटक") && !rawLesson.toLowerCase().includes("घटक विवरण")) {
                        currentLesson = rawLesson;
                      }
                      if (rawOutcome && !rawOutcome.toLowerCase().includes("अध्ययन निष्पत्ती")) {
                        currentOutcome = rawOutcome;
                      }

                      return {
                        rowIdx: rIdx,
                        rowCells: gridRow,
                        srNo: rawSr || String(rIdx + 1),
                        lesson: currentLesson || "सामान्य पाठ / घटक",
                        outcome: currentOutcome || "—",
                        question: rawQuestion,
                        answer: getQuestionBankCellVal(gridRow, colMap.answer) || getQuestionBankCellVal(row, colMap.answer),
                        evalType: getQuestionBankCellVal(gridRow, colMap.evalType) || getQuestionBankCellVal(row, colMap.evalType),
                        qType: getQuestionBankCellVal(gridRow, colMap.qType) || getQuestionBankCellVal(row, colMap.qType),
                        objective: getQuestionBankCellVal(gridRow, colMap.objective) || getQuestionBankCellVal(row, colMap.objective),
                      };
                    }).filter((q) => q.question || q.srNo);

                    // Unique lessons for filter dropdown
                    const uniqueLessons = Array.from(new Set(allQuestions.map((q) => q.lesson).filter(Boolean)));

                    // Filter questions by selected lesson & search query
                    const filteredQuestions = allQuestions.filter((q) => {
                      if (selectedQuestionBankLesson !== "all" && q.lesson !== selectedQuestionBankLesson) {
                        return false;
                      }
                      if (searchQuery.trim()) {
                        const query = searchQuery.toLowerCase().trim();
                        return (
                          q.question.toLowerCase().includes(query) ||
                          q.answer.toLowerCase().includes(query) ||
                          q.lesson.toLowerCase().includes(query) ||
                          q.outcome.toLowerCase().includes(query) ||
                          q.srNo.toLowerCase().includes(query) ||
                          q.evalType.toLowerCase().includes(query) ||
                          q.qType.toLowerCase().includes(query) ||
                          q.objective.toLowerCase().includes(query)
                        );
                      }
                      return true;
                    });

                    const isSearching = searchQuery.trim().length > 0;
                    const isSingleLesson = selectedQuestionBankLesson !== "all";

                    // Calculate contiguous spans for lesson and outcome so merged rows have no downside dividing lines
                    const lessonSpans: { isStart: boolean; span: number }[] = [];
                    const outcomeSpans: { isStart: boolean; span: number }[] = [];

                    for (let i = 0; i < filteredQuestions.length; i++) {
                      // Lesson span
                      if (i === 0 || filteredQuestions[i].lesson !== filteredQuestions[i - 1].lesson || isSearching) {
                        if (isSearching) {
                          lessonSpans.push({ isStart: true, span: 1 });
                        } else {
                          let span = 1;
                          while (
                            i + span < filteredQuestions.length &&
                            filteredQuestions[i + span].lesson === filteredQuestions[i].lesson
                          ) {
                            span++;
                          }
                          lessonSpans.push({ isStart: true, span });
                        }
                      } else {
                        lessonSpans.push({ isStart: false, span: 1 });
                      }

                      // Outcome span
                      if (
                        i === 0 ||
                        filteredQuestions[i].outcome !== filteredQuestions[i - 1].outcome ||
                        filteredQuestions[i].lesson !== filteredQuestions[i - 1].lesson ||
                        isSearching
                      ) {
                        if (isSearching) {
                          outcomeSpans.push({ isStart: true, span: 1 });
                        } else {
                          let span = 1;
                          while (
                            i + span < filteredQuestions.length &&
                            filteredQuestions[i + span].outcome === filteredQuestions[i].outcome &&
                            filteredQuestions[i + span].lesson === filteredQuestions[i].lesson
                          ) {
                            span++;
                          }
                          outcomeSpans.push({ isStart: true, span });
                        }
                      } else {
                        outcomeSpans.push({ isStart: false, span: 1 });
                      }
                    }

                    return (
                      <div key={`${sheet.sheetName}-${sheetIndex}`} className="pdf-subject-section space-y-4 page-break-after">
                        {/* School Info Header Card */}
                        <div className="pdf-school-header border-2 border-slate-900 rounded-2xl p-5 sm:p-6 bg-white space-y-3.5 text-sm sm:text-base font-bold text-slate-900 print:bg-white print:border-2 print:border-slate-900 relative">
                          <button
                            type="button"
                            onClick={() => {
                              setSchoolFormData(schoolProfile);
                              setIsSchoolModalOpen(true);
                            }}
                            className="print:hidden absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                            title="शाळा माहिती संपादन करा"
                          >
                            <Edit3 className="size-3.5 text-slate-700" />
                            <span>बदला</span>
                          </button>

                          <div className="text-center border-b-2 border-slate-900 pb-3">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 uppercase tracking-wide print:text-slate-950">
                              {schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                            </h2>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm md:text-base font-bold text-slate-900 pt-1.5">
                            <div><span className="text-slate-600 font-semibold">केंद्र:</span> <span className="font-extrabold text-slate-950">{schoolProfile.kendraName || "—"}</span></div>
                            <div className="sm:text-center"><span className="text-slate-600 font-semibold">तालुका:</span> <span className="font-extrabold text-slate-950">{schoolProfile.talukaName || "—"}</span></div>
                            <div className="sm:text-center"><span className="text-slate-600 font-semibold">जिल्हा:</span> <span className="font-extrabold text-slate-950">{schoolProfile.districtName || "—"}</span></div>
                            <div className="sm:text-right"><span className="text-slate-600 font-semibold">UDISE क्र.:</span> <span className="font-mono font-extrabold text-slate-950">{schoolProfile.udiseNumber || "—"}</span></div>
                          </div>
                        </div>

                        {/* Sheet Banner */}
                        <div className="pdf-subject-banner bg-white text-slate-950 border-2 border-slate-900 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                            <FileSpreadsheet className="size-4 text-slate-900" />
                            <span>{sheet.sheetName}</span>
                          </h3>
                          <span className="text-[11px] font-bold text-slate-600">{allQuestions.length} एकूण प्रश्न नोंदी</span>
                        </div>

                        {/* Interactive Lesson Filter Bar */}
                        {isStandard8Col && uniqueLessons.length > 0 && (
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border-2 border-slate-300 print:hidden">
                            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                              <label className="text-xs font-black text-slate-800 shrink-0">
                                पाठ निवडा (Select Lesson):
                              </label>
                              <select
                                value={selectedQuestionBankLesson}
                                onChange={(e) => setSelectedQuestionBankLesson(e.target.value)}
                                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-xs cursor-pointer flex-1 max-w-md"
                              >
                                <option value="all">
                                  सर्व {uniqueLessons.length} पाठ (संपूर्ण {allQuestions.length} प्रश्न)
                                </option>
                                {uniqueLessons.map((les, lIdx) => (
                                  <option key={lIdx} value={les}>
                                    {les}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
                              <span className="bg-white text-slate-900 px-3 py-1 rounded-xl border border-slate-300">
                                दाखवलेले प्रश्न: <strong>{filteredQuestions.length}</strong>
                              </span>
                              {selectedQuestionBankLesson !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedQuestionBankLesson("all")}
                                  className="text-xs text-slate-700 hover:text-black underline font-bold cursor-pointer"
                                >
                                  सर्व पाठ पहा
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isGeneratingPdf}
                                onClick={handleDownloadQuestionBankPdf}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50 border border-slate-700"
                                title="या पाठाचे / प्रश्नपेढीचे PDF डाऊनलोड करा"
                              >
                                {isGeneratingPdf ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3 text-white" />}
                                <span>{selectedQuestionBankLesson === "all" ? "संपूर्ण PDF" : "हा पाठ PDF"}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {headerIndex > 0 && metadataRows.length > 0 && (
                          <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-1">
                            {metadataRows.map((row, idx) => (
                              <div key={idx} className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                                {row.filter((cell) => String(cell || "").trim() !== "").join("  |  ")}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reconstructed Question Bank Table */}
                        <div className="overflow-x-auto rounded-2xl border-2 border-slate-900 shadow-sm bg-white">
                          <table className="w-full border-collapse text-xs font-sans bg-white table-fixed min-w-[950px]">
                            {isStandard8Col && (
                              <colgroup>
                                <col style={{ width: "30px" }} />
                                <col style={{ width: "12%" }} />
                                <col style={{ width: "14%" }} />
                                <col style={{ width: "38.5%" }} />
                                <col style={{ width: "25.5%" }} />
                                <col style={{ width: "58px" }} />
                                <col style={{ width: "58px" }} />
                                <col style={{ width: "50px" }} />
                              </colgroup>
                            )}
                            <thead>
                              <tr className="bg-white text-black border-b-2 border-slate-900" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
                                {isStandard8Col ? (
                                  <>
                                    <th className="border border-slate-400 p-0.5 text-center font-black bg-white text-black text-[11px] leading-tight" style={{ backgroundColor: "#ffffff", color: "#000000", width: "30px", minWidth: "30px", maxWidth: "30px" }}>
                                      अ.<br />क्र.
                                    </th>
                                    <th className="border border-slate-400 p-2 text-center font-black bg-white text-black text-xs" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
                                      {tableHeader[1] || "पाठ / घटक"}
                                    </th>
                                    <th className="border border-slate-400 p-2 text-center font-black bg-white text-black text-xs" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
                                      {tableHeader[2] || "अध्ययन निष्पत्ती"}
                                    </th>
                                    <th className="border border-slate-400 p-3 text-center font-black bg-white text-black text-xs sm:text-sm" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
                                      {tableHeader[3] || "प्रश्न"}
                                    </th>
                                    <th className="border border-slate-400 p-3 text-center font-black bg-white text-black text-xs sm:text-sm" style={{ backgroundColor: "#ffffff", color: "#000000" }}>
                                      {tableHeader[4] || "उत्तर"}
                                    </th>
                                    <th className="border border-slate-400 p-0.5 text-center font-black bg-white text-black text-[11px] leading-tight break-words" style={{ backgroundColor: "#ffffff", color: "#000000", width: "58px", minWidth: "55px", maxWidth: "60px" }}>
                                      {tableHeader[5] ? (
                                        String(tableHeader[5]).includes(" ") ? (
                                          <>
                                            {String(tableHeader[5]).split(" ")[0]}
                                            <br />
                                            {String(tableHeader[5]).split(" ").slice(1).join(" ")}
                                          </>
                                        ) : (
                                          tableHeader[5]
                                        )
                                      ) : (
                                        <>मूल्यमापन<br />प्रकार</>
                                      )}
                                    </th>
                                    <th className="border border-slate-400 p-0.5 text-center font-black bg-white text-black text-[11px] leading-tight break-words" style={{ backgroundColor: "#ffffff", color: "#000000", width: "58px", minWidth: "55px", maxWidth: "60px" }}>
                                      {tableHeader[6] ? (
                                        String(tableHeader[6]).includes(" ") ? (
                                          <>
                                            {String(tableHeader[6]).split(" ")[0]}
                                            <br />
                                            {String(tableHeader[6]).split(" ").slice(1).join(" ")}
                                          </>
                                        ) : (
                                          tableHeader[6]
                                        )
                                      ) : (
                                        <>प्रश्नाचा<br />प्रकार</>
                                      )}
                                    </th>
                                    <th className="border border-slate-400 p-0.5 text-center font-black bg-white text-black text-[11px] leading-tight break-words" style={{ backgroundColor: "#ffffff", color: "#000000", width: "50px", minWidth: "48px", maxWidth: "52px" }}>
                                      {tableHeader[7] || "उद्दिष्ट"}
                                    </th>
                                  </>
                                ) : (

                                  tableHeader.map((h, colIndex) => (
                                    <th
                                      key={colIndex}
                                      className="border border-slate-400 p-2.5 text-center font-black align-top whitespace-pre-wrap min-w-[110px] bg-white text-black"
                                      style={{ backgroundColor: "#ffffff", color: "#000000" }}
                                    >
                                      {h || `स्तंभ ${colIndex + 1}`}
                                    </th>
                                  ))
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {isStandard8Col ? (
                                filteredQuestions.length > 0 ? (
                                  filteredQuestions.map((q, idx) => {
                                    return (
                                      <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                        {/* 1. अ.क्र. */}
                                        <td className="border border-slate-300 p-0.5 text-center font-extrabold text-black align-middle bg-white text-xs" style={{ width: "30px", minWidth: "30px", maxWidth: "30px" }}>
                                          {q.srNo}
                                        </td>

                                        {/* 2. पाठ (Single merged cell, centered, persistent divider) */}
                                        {lessonSpans[idx]?.isStart ? (
                                          <td
                                            rowSpan={lessonSpans[idx].span}
                                            className="border border-slate-400 p-3 font-black text-black bg-white align-middle text-center text-xs sm:text-sm leading-relaxed break-words"
                                            style={{ verticalAlign: "middle", textAlign: "center", borderRight: "1.5px solid #000000" }}
                                          >
                                            <div className="flex flex-col items-center justify-center text-center p-2 mx-auto font-black text-black break-words">
                                              {q.lesson || "पाठ / घटक"}
                                            </div>
                                          </td>
                                        ) : null}

                                        {/* 3. अध्ययन निष्पत्ती (Single merged cell, centered, persistent divider) */}
                                        {outcomeSpans[idx]?.isStart ? (
                                          <td
                                            rowSpan={outcomeSpans[idx].span}
                                            className="border border-slate-400 p-3 font-semibold text-black bg-white align-middle text-center text-xs leading-relaxed break-words"
                                            style={{ verticalAlign: "middle", textAlign: "center", borderRight: "1.5px solid #000000" }}
                                          >
                                            <div className="flex flex-col items-center justify-center text-center p-2 mx-auto font-semibold text-black break-words">
                                              {q.outcome || "—"}
                                            </div>
                                          </td>
                                        ) : null}

                                        {/* 4. प्रश्न */}
                                        <td className="border border-slate-300 p-3 text-black font-bold leading-relaxed align-top bg-white break-words text-xs sm:text-[13.5px]">
                                          {q.question}
                                        </td>

                                        {/* 5. उत्तर */}
                                        <td className="border border-slate-300 p-3 text-black font-medium leading-relaxed bg-white align-top break-words text-xs sm:text-[13.5px]">
                                          {q.answer}
                                        </td>

                                        {/* 6. मूल्यमापन प्रकार */}
                                        <td className="border border-slate-300 p-0.5 text-center align-middle bg-white text-[11px] font-bold text-black break-words leading-tight" style={{ width: "58px", minWidth: "55px", maxWidth: "60px" }}>
                                          {q.evalType ? (
                                            q.evalType.includes("तोंडी") ? "तोंडी" : q.evalType.includes("लेखी") ? "लेखी" : q.evalType.includes("प्रात्यक्षिक") ? "प्रात्यक्षिक" : q.evalType
                                          ) : "—"}
                                        </td>

                                        {/* 7. प्रश्नाचा प्रकार */}
                                        <td className="border border-slate-300 p-0.5 text-center align-middle bg-white text-[11px] font-bold text-black break-words leading-tight" style={{ width: "58px", minWidth: "55px", maxWidth: "60px" }}>
                                          {q.qType ? (
                                            q.qType.includes("वस्तुनिष्ठ") ? "वस्तुनिष्ठ" : q.qType.includes("लघुत्तरी") ? "लघुत्तरी" : q.qType.includes("दीर्घोत्तरी") ? "दीर्घोत्तरी" : q.qType
                                          ) : "—"}
                                        </td>

                                        {/* 8. उद्दिष्ट */}
                                        <td className="border border-slate-300 p-0.5 text-center align-middle bg-white text-[11px] font-bold text-black break-words leading-tight" style={{ width: "50px", minWidth: "48px", maxWidth: "52px" }}>
                                          {q.objective || "—"}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (

                                  <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold text-sm bg-white">
                                      शोधानुसार किंवा निवडलेल्या पाठासाठी कोणताही प्रश्न सापडला नाही.
                                    </td>
                                  </tr>
                                )
                              ) : (
                                rawDataRows.length > 0 ? (
                                  rawDataRows.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="bg-white">
                                      {row.map((cell, colIndex) => (
                                        <td key={colIndex} className="border border-slate-300 p-2.5 align-top text-black bg-white leading-relaxed whitespace-pre-wrap min-w-[110px]">
                                          {cell || ""}
                                        </td>
                                      ))}
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={tableHeader.length || 1} className="p-6 text-center text-slate-400 font-bold bg-white">
                                      या शीटमध्ये शोधानुसार कोणतीही नोंद सापडली नाही.
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Signature Bar on Question Bank Sheet */}
                        <div className="pdf-signature-bar pt-4 mt-6 border-t-2 border-slate-300 grid grid-cols-2 text-center text-sm sm:text-base font-black text-slate-950">
                          <div className="flex flex-col items-center">
                            <div className="h-10 sm:h-12 w-full" />
                            <div className="w-48 sm:w-56 border-t border-dotted border-slate-500 mb-2" />
                            <div className="pdf-sig-title text-sm sm:text-base font-black text-slate-950">वर्ग शिक्षक स्वाक्षरी</div>
                            <div className="pdf-sig-name text-xs sm:text-sm text-slate-700 font-bold mt-1">({schoolProfile.teacherName || "शिक्षकाचे नाव"})</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="h-10 sm:h-12 w-full" />
                            <div className="w-48 sm:w-56 border-t border-dotted border-slate-500 mb-2" />
                            <div className="pdf-sig-title text-sm sm:text-base font-black text-slate-950">मुख्याध्यापक स्वाक्षरी व शिक्का</div>
                            <div className="pdf-sig-name text-xs sm:text-sm text-slate-700 font-bold mt-1">({schoolProfile.headMasterName || "मुख्याध्यापक नाव"})</div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </>
            ) : (
              <>
                <style>{`
                  @media print {
                    .html2pdf__page-break {
                      page-break-before: always !important;
                      break-before: page !important;
                      height: 0 !important;
                      margin: 0 !important;
                      padding: 0 !important;
                    }
                    table {
                      page-break-inside: auto;
                    }
                    tr {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                      page-break-after: auto !important;
                    }
                    td, th {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                    }
                  }

                  /* Dedicated Clean PDF Export Mode */
                  .pdf-export-active .print\:hidden,
                  .pdf-export-active .no-print,
                  .pdf-export-active input,
                  .pdf-export-active select,
                  .pdf-export-active button {
                    display: none !important;
                  }
                  .pdf-export-active .pdf-subject-section {
                    box-sizing: border-box !important;
                  }
                  .pdf-export-active table {
                    border-collapse: collapse !important;
                    border-spacing: 0 !important;
                    width: 100% !important;
                    border: 1.5px solid #0f172a !important;
                    background-color: #ffffff !important;
                  }
                  .pdf-export-active tr {
                    background-color: transparent !important;
                    background: transparent !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .pdf-export-active td, .pdf-export-active th {
                    border: 1.5px solid #1e293b !important;
                    background-color: #ffffff !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    box-sizing: border-box !important;
                    color: #0f172a !important;
                    font-size: 15.5px !important;
                    font-weight: 700 !important;
                    line-height: 1.45 !important;
                    padding: 8px 8px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .pdf-export-active th {
                    background-color: #f1f5f9 !important;
                    color: #0f172a !important;
                    font-size: 16.5px !important;
                    font-weight: 900 !important;
                    text-align: center !important;
                    vertical-align: middle !important;
                    padding: 10px 8px !important;
                  }

                  /* Dedicated Styling for Question Bank in PDF Export */
                  .pdf-question-bank-export td,
                  .pdf-question-bank-table td {
                    box-sizing: border-box !important;
                    word-break: break-word !important;
                    overflow-wrap: break-word !important;
                    white-space: normal !important;
                    color: #0f172a !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .pdf-question-bank-export td.qb-col-lesson,
                  .pdf-question-bank-table td.qb-col-lesson {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    font-weight: 900 !important;
                    border: 1px solid #000000 !important;
                    vertical-align: middle !important;
                    text-align: center !important;
                  }
                  .pdf-question-bank-export td.qb-col-outcome,
                  .pdf-question-bank-table td.qb-col-outcome {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    font-weight: 600 !important;
                    border: 1px solid #000000 !important;
                    vertical-align: middle !important;
                    text-align: center !important;
                  }
                  .pdf-question-bank-export td.qb-col-answer,
                  .pdf-question-bank-table td.qb-col-answer {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    font-weight: 600 !important;
                  }
                  .pdf-question-bank-export th,
                  .pdf-question-bank-table th {
                    line-height: 1.3 !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    font-weight: 900 !important;
                    text-align: center !important;
                    border: 1px solid #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .pdf-question-bank-export .pdf-question-bank-page {
                    page-break-after: always !important;
                    break-after: page !important;
                  }
                  .pdf-export-active td.text-center,
                  .pdf-export-active td.align-middle {
                    vertical-align: middle !important;
                    text-align: center !important;
                    font-size: 17px !important;
                  }
                  .pdf-export-active td.text-left,
                  .pdf-export-active td.align-top {
                    vertical-align: top !important;
                    text-align: left !important;
                  }
                  .pdf-export-active td.exam-assessment-cell,
                  td.exam-assessment-cell {
                    vertical-align: middle !important;
                    text-align: center !important;
                    font-size: 16.5px !important;
                    font-weight: 900 !important;
                    background-color: #fffbe6 !important;
                  }
                  .pdf-export-active td.exam-assessment-cell *,
                  td.exam-assessment-cell * {
                    text-align: center !important;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    justify-content: center !important;
                  }
                  .pdf-export-active td.bg-amber-50\/40,
                  .pdf-export-active td.bg-amber-50 {
                    background-color: #fffbe6 !important;
                  }
                  .pdf-export-active .pdf-subject-banner {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: nowrap !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 6px 14px !important;
                    white-space: nowrap !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                  }
                  .pdf-export-active .pdf-subject-banner * {
                    flex-wrap: nowrap !important;
                    white-space: nowrap !important;
                    word-break: keep-all !important;
                  }
                  .pdf-export-active .pdf-subject-banner .flex-wrap {
                    flex-wrap: nowrap !important;
                  }
                  .pdf-export-active .pdf-subject-banner h3 {
                    text-align: center !important;
                    justify-content: center !important;
                    width: 100% !important;
                  }
                  .pdf-export-active .pdf-signature-bar {
                    padding-top: 24px !important;
                    margin-top: 20px !important;
                    border-top: 2px solid #0f172a !important;
                  }
                  .pdf-export-active .pdf-sig-title {
                    font-size: 17px !important;
                    font-weight: 900 !important;
                    color: #0f172a !important;
                    line-height: 1.4 !important;
                  }
                  .pdf-export-active .pdf-sig-name {
                    font-size: 15px !important;
                    font-weight: 700 !important;
                    color: #334155 !important;
                    margin-top: 6px !important;
                  }
                `}</style>
                {/* EDIT MODE NOTICE BANNER (Informative only - no duplicate save button) */}
                {isInlineEditing && (
                  <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
                      <Edit3 className="size-5 text-amber-200 animate-bounce" />
                      <span>✏️ तक्ता संपादन पद्धत सुरू आहे - सर्व माहिती थेट बदला व वरील '💾 SAVE (सेव्ह करा)' बटणावर क्लिक करा.</span>
                    </div>
                  </div>
                )}

                {/* Render Selected Subject Sections */}
                {sectionsToRender.length > 0 ? (
                  sectionsToRender
                    .filter((sec) => {
                      if (isInlineEditing) return true;
                      const hasData = sec.rows.some((row) =>
                        row.some((c) => {
                          const s = String(c || "").trim();
                          return s !== "" && s !== "-" && s !== "null" && s !== "undefined";
                        })
                      );
                      return hasData;
                    })
                    .map((sec, secIdx) => {
                      const normalizedRows = isMonthly
                        ? normalizeMonthlyPlanningRows(sec.rows, sec.subjectName)
                        : normalizeAnnualPlanningRows(sec.rows);
                      const filteredRows = normalizedRows.filter((row) => {
                        // CRITICAL: Exam / Assessment / Test / Vacation rows must ALWAYS be preserved and shown!
                        if (isExamOrAssessmentRow(row) || isExamOrAssessmentText(row.join(" "))) {
                          return true;
                        }
                        if (isSignatureRow(row)) return false;
                        if (isTableColumnHeaderRow(row)) return false;
                        // Filter out rows that are duplicate header rows (headers appearing as data)
                        if (isMonthly) {
                          const rowText = row.map((c) => String(c || "").trim().toLowerCase()).join(" ");
                          const firstCell = String(row[0] || "").trim().toLowerCase();
                          const secondCell = String(row[1] || "").trim().toLowerCase();
                          const thirdCell = String(row[2] || "").trim().toLowerCase();
                          const isHeaderLikeRow =
                            (firstCell.includes("दिनांक") || firstCell.includes("दिवस") || firstCell === "date" || firstCell === "day") &&
                            (secondCell.includes("पाठ") || secondCell.includes("घटक") || secondCell.includes("topic") || secondCell.includes("unit") ||
                              thirdCell.includes("अध्ययन") || thirdCell.includes("निष्पत्ती") || thirdCell.includes("learning") || thirdCell.includes("outcome") ||
                              rowText.includes("साहित्य") || rowText.includes("साधन"));
                          if (isHeaderLikeRow) return false;

                          const kwMatches = ["दिवस", "दिनांक", "पाठ", "घटक", "उपघटक", "अध्ययन", "निष्पत्ती", "मुद्दे", "उद्देश", "साधन", "साहित्य"].filter(
                            (kw) => rowText.includes(kw)
                          );
                          if (kwMatches.length >= 3) return false;
                        }
                        const hasMeaningfulContent = row.some((c) => {
                          const s = String(c || "").trim();
                          return s !== "" && s !== "-" && s !== "null" && s !== "undefined";
                        });
                        if (!hasMeaningfulContent && !isInlineEditing) return false;

                        if (!searchQuery.trim() || isInlineEditing) return true;
                        const q = searchQuery.toLowerCase().trim();
                        return row.some((c) => (c || "").toLowerCase().includes(q));
                      });

                      const categoryHeaders = getCategoryHeaders(sec, isMonthly, record);
                      const sectionRowMatrix = !isInlineEditing ? getTargetRowSpanMatrix(filteredRows, isMonthly, categoryHeaders) : [];

                      return (
                        <div
                          key={`${sec.subjectName}-${secIdx}`}
                          className={`pdf-subject-section space-y-4 my-6 ${secIdx > 0 ? "html2pdf__page-break pt-6 border-t-2 border-slate-200 print:pt-0 print:border-none" : ""}`}
                        >
                          {/* Header Title & School Info Card for THIS Subject */}
                          <div className="pdf-school-header border-2 border-slate-900 rounded-2xl p-5 sm:p-6 bg-slate-50 space-y-3.5 text-sm sm:text-base font-bold text-slate-900 print:bg-white print:border-2 print:border-slate-900 relative">
                            <button
                              type="button"
                              onClick={() => {
                                setSchoolFormData(schoolProfile);
                                setIsSchoolModalOpen(true);
                              }}
                              className="print:hidden absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-indigo-700 text-xs font-bold border border-indigo-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                              title="शाळा माहिती संपादन करा"
                            >
                              <Edit3 className="size-3.5 text-indigo-600" />
                              <span>बदला</span>
                            </button>

                            <div className="text-center border-b-2 border-slate-900 pb-3">
                              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-950 uppercase tracking-wide print:text-slate-950">
                                {schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                              </h2>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm md:text-base font-bold text-slate-900 pt-1.5">
                              <div><span className="text-slate-600 font-semibold">केंद्र:</span> <span className="font-extrabold text-slate-950">{schoolProfile.kendraName || "—"}</span></div>
                              <div className="sm:text-center"><span className="text-slate-600 font-semibold">तालुका:</span> <span className="font-extrabold text-slate-950">{schoolProfile.talukaName || "—"}</span></div>
                              <div className="sm:text-center"><span className="text-slate-600 font-semibold">जिल्हा:</span> <span className="font-extrabold text-slate-950">{schoolProfile.districtName || "—"}</span></div>
                              <div className="sm:text-right"><span className="text-slate-600 font-semibold">UDISE क्र.:</span> <span className="font-mono font-extrabold text-slate-950">{schoolProfile.udiseNumber || "—"}</span></div>
                            </div>
                          </div>

                          {/* Subject Banner Header */}
                          {(() => {
                            const parts = getSectionBannerParts(sec);
                            return (
                              <div className="pdf-subject-banner relative bg-amber-50/90 border-2 border-amber-300 text-amber-950 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl flex flex-nowrap items-center justify-between gap-2 sm:gap-3 shadow-xs overflow-hidden">
                                <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap flex-1 min-w-0 overflow-hidden">
                                  <BookOpen className="size-4 sm:size-4.5 text-amber-600 shrink-0" />
                                  <div className="flex items-center flex-nowrap whitespace-nowrap gap-x-1 sm:gap-x-1.5 text-xs sm:text-[13px] md:text-[13.5px] font-black text-amber-950 min-w-0">
                                    {parts.segments.map((seg, idx) => {
                                      const colonMatch = seg.match(/^(.*?)\s*(:-|:)\s*(.*)$/);
                                      const hasColon = !!colonMatch;
                                      const label = hasColon ? colonMatch[1].trim() : seg;
                                      const val = hasColon ? colonMatch[3].trim() : "";

                                      return (
                                        <div key={idx} className="flex items-center shrink-0">
                                          {idx > 0 && (
                                            <span className="text-amber-400 font-black select-none text-xs sm:text-sm mx-1 sm:mx-1.5 md:mx-2">
                                              •
                                            </span>
                                          )}
                                          <span className="inline-flex items-center whitespace-nowrap">
                                            {hasColon ? (
                                              <>
                                                <span className="font-bold text-amber-800/90">{label}</span>
                                                <span className="font-black text-amber-600 mx-1">:</span>
                                                <span className="font-black text-amber-950">{val}</span>
                                              </>
                                            ) : (
                                              <span className="font-black text-amber-950">{seg}</span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-center">
                                  <span className="text-[11px] sm:text-xs font-black text-amber-800 bg-amber-100/90 px-2.5 sm:px-3 py-1 rounded-full border border-amber-300 whitespace-nowrap shadow-2xs shrink-0">
                                    {filteredRows.length} ओळी (Rows)
                                  </span>

                                  {isInlineEditing && (
                                    <button
                                      onClick={() => handleAddRow(sec.subjectName)}
                                      className="px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                                    >
                                      <Plus className="size-3.5" />
                                      <span className="hidden sm:inline">ओळ जोडा</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Mobile Scroll Indicator */}
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100 sm:hidden mb-2">
                            <span className="flex items-center gap-1">👈👉 संपूर्ण तक्ता पाहण्यासाठी डावीकडे/उजवीकडे सरकवा (Scroll horizontally)</span>
                          </div>
                          {/* Table View Container */}
                          <div className="overflow-x-auto border border-slate-900 rounded-xl shadow-xs mb-4 pb-1">
                            <table className="w-full min-w-[900px] table-fixed border-collapse border border-slate-900 text-xs font-sans bg-white">
                              <colgroup>
                                {isMonthly ? [
                                  <col key="m0" style={{ width: "55px" }} />,
                                  <col key="m1" style={{ width: "95px" }} />,
                                  <col key="m2" style={{ width: "190px" }} />,
                                  <col key="m3" style={{ width: "125px" }} />,
                                  <col key="m4" style={{ width: "245px" }} />,
                                  <col key="m5" style={{ width: "95px" }} />,
                                  <col key="m6" style={{ width: "95px" }} />,
                                  ...(isInlineEditing ? [<col key="mEdit" style={{ width: "60px" }} />] : [])
                                ] : [
                                  <col key="a0" style={{ width: "80px" }} />,
                                  <col key="a1" style={{ width: "60px" }} />,
                                  <col key="a2" style={{ width: "80px" }} />,
                                  <col key="a3" style={{ width: "80px" }} />,
                                  <col key="a4" style={{ width: "500px" }} />,
                                  <col key="a5" style={{ width: "100px" }} />,
                                  ...(isInlineEditing ? [<col key="aEdit" style={{ width: "60px" }} />] : [])
                                ]}
                              </colgroup>
                              <thead>
                                <tr className="bg-slate-100 text-slate-900 font-black text-center text-xs border-b border-slate-400">
                                  {categoryHeaders.map((hText: string, i: number) => (
                                    <th
                                      key={i}
                                      className="border border-slate-400 p-2 text-center font-black tracking-wide text-[11px] bg-slate-100 text-slate-900 leading-snug whitespace-pre-line"
                                    >
                                      {!isMonthly && i === 4
                                        ? `विषय : ${sec.subjectName}`
                                        : isMonthly && i === 0
                                          ? "दिवस"
                                          : isMonthly && i === 5
                                            ? "उपयोगात आणावयाची\nसाधन तंत्रे"
                                            : isMonthly && i === 6
                                              ? "आवश्यक\nसाहित्य"
                                              : hText}
                                    </th>
                                  ))}
                                  {isInlineEditing && (
                                    <th className="border border-slate-400 p-2.5 text-center font-black tracking-wide text-xs bg-slate-100 text-slate-900">
                                      क्रिया
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRows.length > 0 ? (
                                  filteredRows.map((r, rIdx) => {
                                    const isMonthStartRow =
                                      !isInlineEditing &&
                                      (isMonthly
                                        ? (rIdx === 0 || sectionRowMatrix[rIdx]?.[1]?.skip === false)
                                        : (rIdx === 0 || sectionRowMatrix[rIdx]?.[0]?.skip === false));

                                    return (
                                      <tr
                                        key={rIdx}
                                        data-month-start={isMonthStartRow ? "true" : undefined}
                                        className="bg-white hover:bg-slate-50 transition-colors"
                                        style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                                      >
                                        {isInlineEditing ? (
                                          isMonthly ? (
                                            <>
                                              {/* Monthly Col 0: Date */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <input
                                                  type="text"
                                                  value={r[0] || ""}
                                                  onChange={(e) => handleCellChange(sec.subjectName, rIdx, 0, e.target.value)}
                                                  placeholder="दिवस"
                                                  className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                                />
                                              </td>
                                              {/* Monthly Col 1: Topic */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[1] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 1, val)}
                                                  placeholder="पाठ/घटक/उपघटक..."
                                                />
                                              </td>
                                              {/* Monthly Col 2: Learning Outcome */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[2] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 2, val)}
                                                  placeholder="अध्ययन निष्पत्ती..."
                                                />
                                              </td>
                                              {/* Monthly Col 3: Objectives */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[3] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 3, val)}
                                                  placeholder="अध्ययन मुद्दे/पाठ्यांश उद्देश..."
                                                />
                                              </td>
                                              {/* Monthly Col 4: Experience */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[4] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 4, val)}
                                                  placeholder="अध्ययन अनुभवाचे स्वरूप..."
                                                />
                                              </td>
                                              {/* Monthly Col 5: Tools */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[5] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 5, val)}
                                                  placeholder="उपयोगात आणावयाची साधन तंत्रे..."
                                                />
                                              </td>
                                              {/* Monthly Col 6: Material */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[6] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 6, val)}
                                                  placeholder="आवश्यक साहित्य..."
                                                />
                                              </td>
                                              {/* Delete Row Action */}
                                              <td className="border border-slate-300 p-1.5 align-middle text-center" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <button
                                                  onClick={() => handleDeleteRow(sec.subjectName, rIdx)}
                                                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors border border-rose-200 cursor-pointer"
                                                  title="ही ओळ डिलीट करा"
                                                >
                                                  <Trash2 className="size-4" />
                                                </button>
                                              </td>
                                            </>
                                          ) : (
                                            <>
                                              {/* Editable Month */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <input
                                                  type="text"
                                                  value={r[0] || ""}
                                                  onChange={(e) => handleCellChange(sec.subjectName, rIdx, 0, e.target.value)}
                                                  placeholder="महिना"
                                                  className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                                />
                                              </td>
                                              {/* Editable Weeks */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <input
                                                  type="text"
                                                  value={r[1] || ""}
                                                  onChange={(e) => handleCellChange(sec.subjectName, rIdx, 1, e.target.value)}
                                                  placeholder="आठवडा"
                                                  className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                                />
                                              </td>
                                              {/* Editable Days */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <input
                                                  type="text"
                                                  value={r[2] || ""}
                                                  onChange={(e) => handleCellChange(sec.subjectName, rIdx, 2, e.target.value)}
                                                  placeholder="दिवस"
                                                  className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                                />
                                              </td>
                                              {/* Editable Periods */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <input
                                                  type="text"
                                                  value={r[3] || ""}
                                                  onChange={(e) => handleCellChange(sec.subjectName, rIdx, 3, e.target.value)}
                                                  placeholder="तासिका"
                                                  className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                                />
                                              </td>
                                              {/* Editable Topics */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[4] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 4, val)}
                                                  placeholder="घटकांचे नाव व सविस्तर स्पष्टीकरण..."
                                                />
                                              </td>
                                              {/* Editable Outcomes */}
                                              <td className="border border-slate-300 p-1.5 align-top" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <AutoHeightTextarea
                                                  value={r[5] || ""}
                                                  onChange={(val) => handleCellChange(sec.subjectName, rIdx, 5, val)}
                                                  placeholder="अध्ययन निष्पत्ती..."
                                                />
                                              </td>
                                              {/* Delete Row Action */}
                                              <td className="border border-slate-300 p-1.5 align-middle text-center" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                                                <button
                                                  onClick={() => handleDeleteRow(sec.subjectName, rIdx)}
                                                  className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors border border-rose-200 cursor-pointer"
                                                  title="ही ओळ डिलीट करा"
                                                >
                                                  <Trash2 className="size-4" />
                                                </button>
                                              </td>
                                            </>
                                          )
                                        ) : (
                                          categoryHeaders.map((_: string, cIdx: number) => {
                                            const cellInfo = sectionRowMatrix[rIdx]?.[cIdx];
                                            if (!isInlineEditing && cellInfo?.skip) {
                                              return null;
                                            }

                                            const cellVal = cellInfo ? cellInfo.displayValue : r[cIdx] || "-";
                                            const isExam = cellInfo?.isExam || isExamOrAssessmentText(cellInfo?.displayValue) || isExamOrAssessmentText(r[cIdx]) || isExamOrAssessmentText(cellVal);
                                            const cellText = cellVal;

                                            let cellClasses = "border border-slate-300 p-2.5 sm:p-3 leading-relaxed sm:leading-6";
                                            if (isExam) {
                                              cellClasses += " exam-assessment-cell text-center font-black text-slate-950 bg-amber-50/50 text-xs sm:text-[13.5px]";
                                            } else if (isMonthly) {
                                              cellClasses += " align-middle";
                                              if (cIdx === 0) {
                                                cellClasses += " text-center font-bold text-slate-900 text-xs sm:text-[13px]";
                                              } else if (cIdx === 1) {
                                                cellClasses += " text-center font-bold text-slate-950 text-xs sm:text-[13.5px] whitespace-pre-line break-words";
                                              } else if (cIdx === 2) {
                                                cellClasses += " text-center font-bold text-slate-900 text-xs sm:text-[13.5px] whitespace-pre-line break-words leading-relaxed sm:leading-6";
                                              } else if (cIdx === 3) {
                                                cellClasses += " text-center font-medium text-slate-900 text-xs sm:text-[13px] whitespace-pre-line break-words";
                                              } else {
                                                cellClasses += " text-left text-slate-900 text-xs sm:text-[13.5px] whitespace-pre-line break-words leading-relaxed sm:leading-6";
                                              }
                                            } else {
                                              cellClasses += " align-middle";
                                              cellClasses += cIdx <= 3
                                                ? " text-center font-bold text-slate-900 text-xs sm:text-[13px]"
                                                : " text-left text-xs sm:text-[13.5px] whitespace-pre-line leading-relaxed sm:leading-6";
                                            }

                                            return (
                                              <td
                                                key={cIdx}
                                                rowSpan={!isInlineEditing && cellInfo?.rowSpan ? cellInfo.rowSpan : 1}
                                                className={cellClasses}
                                                style={{
                                                  pageBreakInside: "avoid",
                                                  breakInside: "avoid",
                                                  verticalAlign: "middle",
                                                  textAlign: isExam || cIdx <= 3 ? "center" : "left",
                                                  fontFamily: "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif",
                                                  backgroundColor: isExam ? "#fffbeb" : undefined,
                                                }}
                                              >
                                                {isExam ? (
                                                  <div
                                                    className="w-full flex flex-col items-center justify-center text-center py-1 px-1"
                                                    style={{
                                                      textAlign: "center",
                                                      justifyContent: "center",
                                                      alignItems: "center",
                                                      display: "flex",
                                                      flexDirection: "column",
                                                      width: "100%",
                                                    }}
                                                  >
                                                    <span
                                                      className="font-black text-slate-950 text-center whitespace-pre-line break-words inline-block"
                                                      style={{
                                                        textAlign: "center",
                                                        fontWeight: "900",
                                                        display: "inline-block",
                                                        width: "100%",
                                                      }}
                                                    >
                                                      {cellText}
                                                    </span>
                                                  </div>
                                                ) : isMonthly && (cIdx === 1 || cIdx === 2) ? (
                                                  <div className="flex flex-col justify-center items-center text-center w-full min-h-full py-1 px-1">
                                                    <span className="whitespace-pre-line break-words">{cellText}</span>
                                                  </div>
                                                ) : (
                                                  cellText
                                                )}
                                              </td>
                                            );
                                          })
                                        )}
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={isInlineEditing ? 7 : 6} className="p-6 text-center text-slate-400 font-bold text-xs">
                                      या विषयासाठी कोणतीही नोंद सापडली नाही.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          {/* Signature Bar on EVERY Subject Page */}
                          <div className="pdf-signature-bar pt-4 mt-6 border-t-2 border-slate-300 grid grid-cols-2 text-center text-sm sm:text-base font-black text-slate-950">
                            <div className="flex flex-col items-center">
                              <div className="h-10 sm:h-12 w-full" />
                              <div className="w-48 sm:w-56 border-t border-dotted border-slate-500 mb-2" />
                              <div className="pdf-sig-title text-sm sm:text-base font-black text-slate-950">वर्ग शिक्षक स्वाक्षरी</div>
                              <div className="pdf-sig-name text-xs sm:text-sm text-slate-700 font-bold mt-1">({schoolProfile.teacherName || "शिक्षकाचे नाव"})</div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="h-10 sm:h-12 w-full" />
                              <div className="w-48 sm:w-56 border-t border-dotted border-slate-500 mb-2" />
                              <div className="pdf-sig-title text-sm sm:text-base font-black text-slate-950">मुख्याध्यापक स्वाक्षरी व शिक्का</div>
                              <div className="pdf-sig-name text-xs sm:text-sm text-slate-700 font-bold mt-1">({schoolProfile.headMasterName || "मुख्याध्यापक नाव"})</div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs">
                    कोणताही विषय डेटा उपलब्ध नाही.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* SCHOOL INFO MODAL IN PLANNING TABLE RENDERER */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <School className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    शाळा व शिक्षक माहिती (School Profile Setup)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    ही माहिती नियोजन व प्रश्नपेढीच्या शीर्षकामध्ये दिसेल.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSchoolModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  शाळेचे नाव (School Name): <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolFormData.schoolName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, schoolName: e.target.value })}
                  placeholder="उदा. जि. प. प्राथमिक शाळा..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">केंद्र (Kendra / Center):</label>
                <input
                  type="text"
                  value={schoolFormData.kendraName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, kendraName: e.target.value })}
                  placeholder="उदा. केंद्र नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">तालुका (Taluka):</label>
                <input
                  type="text"
                  value={schoolFormData.talukaName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, talukaName: e.target.value })}
                  placeholder="उदा. तालुका नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">जिल्हा (District):</label>
                <input
                  type="text"
                  value={schoolFormData.districtName || ""}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, districtName: e.target.value })}
                  placeholder="उदा. जिल्हा नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">UDISE नंबर (UDISE Number):</label>
                <input
                  type="text"
                  value={schoolFormData.udiseNumber}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, udiseNumber: e.target.value })}
                  placeholder="उदा. 27350800701"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">वर्ग शिक्षकाचे नाव (Class Teacher):</label>
                <input
                  type="text"
                  value={schoolFormData.teacherName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, teacherName: e.target.value })}
                  placeholder="उदा. वर्ग शिक्षकाचे नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">मुख्याध्यापकाचे नाव (Headmaster Name):</label>
                <input
                  type="text"
                  value={schoolFormData.headMasterName}
                  onChange={(e) => setSchoolFormData({ ...schoolFormData, headMasterName: e.target.value })}
                  placeholder="उदा. मुख्याध्यापकाचे नाव"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSchoolModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>
              <button
                type="button"
                disabled={isSavingSchoolProfile}
                onClick={handleSaveSchoolProfile}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingSchoolProfile ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" /> जतन होत आहे...
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> SUBMIT & SAVE (जतन करा)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
