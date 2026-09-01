import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PlanningDocumentRecord,
  DEFAULT_HEADERS,
} from "@/lib/smartPlanningParser";
import {
  extractSubjectSectionsFromExcel,
  splitRowsIntoSubjectSections,
  splitRowsIntoMonthlySections,
  normalizeSubjectName,
  isSignatureRow,
  AnnualPlanningWorkbook,
  SubjectSection,
} from "@/lib/smartSubjectSplitter";
import { getBunnyStorageUrl } from "@/lib/bunny-auth-pdf";
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
} from "lucide-react";
import { toast } from "sonner";
import { parseExcelData } from "@/services/fileReader/ExcelParser";
import type { ParsedSheet } from "@/services/fileReader/types";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";

interface PlanningTableRendererProps {
  record: PlanningDocumentRecord | null;
  fileUrl?: string | null;
  mode?: "teacher" | "admin";
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface UserSchoolProfile {
  schoolName: string;
  kendraName: string;
  talukaName: string;
  udiseNumber: string;
  teacherName: string;
  headMasterName: string;
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
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [parsedWorkbook, setParsedWorkbook] = useState<AnnualPlanningWorkbook | null>(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all"); // "all" or specific subject
  const [loadingWorkbook, setLoadingWorkbook] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [questionBankSheets, setQuestionBankSheets] = useState<ParsedSheet[]>([]);

  // Inline Table Editing State & User-Specific Storage
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [isSavingEdits, setIsSavingEdits] = useState<boolean>(false);
  const [editableSections, setEditableSections] = useState<SubjectSection[]>([]);
  const [savedUserEditRecord, setSavedUserEditRecord] = useState<PlanningDocumentRecord | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);
  const activeUrl = fileUrl || record?.fileUrl || null;
  const activeRecordId = record?.id || (record as any)?.recordKey || `plan_${record?.classId || "1"}_${record?.subjectId || "all"}`;

  // Load User-Specific Edit (Persisted in LocalStorage / Firestore for logged in user)
  useEffect(() => {
    let isMounted = true;
    const loadUserSavedEdit = async () => {
      if (!activeRecordId) return;

      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";

      // 1. LocalStorage check (strictly user specific)
      const localDataStr =
        localStorage.getItem(`user_edit_${effectiveUserId}_${activeRecordId}`) ||
        localStorage.getItem(`user_edit_${activeRecordId}`);

      if (localDataStr) {
        try {
          const parsed = JSON.parse(localDataStr);
          if (parsed && (parsed.sections || parsed.rawDataRows || parsed.rows || parsed.tableRows)) {
            const adminTime = record?.uploadedAt ? new Date(record.uploadedAt).getTime() : 0;
            const userEditTime = parsed.editedAt ? new Date(parsed.editedAt).getTime() : 0;

            if (mode !== "admin" && adminTime > userEditTime) {
              localStorage.removeItem(`user_edit_${effectiveUserId}_${activeRecordId}`);
              localStorage.removeItem(`user_edit_${activeRecordId}`);
              setSavedUserEditRecord(null);
              return;
            }

            if (isMounted) setSavedUserEditRecord(parsed);
            return;
          }
        } catch (e) {}
      }

      // 2. Firestore check for user-specific custom edit
      if (db) {
        try {
          const docRef = doc(db, "academic_plannings_user_edits", `${effectiveUserId}_${activeRecordId}`);
          const snap = await getDoc(docRef);
          if (snap.exists() && isMounted) {
            const data = snap.data() as PlanningDocumentRecord;
            const adminTime = record?.uploadedAt ? new Date(record.uploadedAt).getTime() : 0;
            const userEditTime = data.editedAt ? new Date(data.editedAt).getTime() : 0;

            if (mode !== "admin" && adminTime > userEditTime) {
              setSavedUserEditRecord(null);
              return;
            }

            setSavedUserEditRecord(data);
            try {
              localStorage.setItem(`user_edit_${effectiveUserId}_${activeRecordId}`, JSON.stringify(data));
            } catch (e) {}
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
  }, [activeRecordId, user?.uid, record?.uploadedAt]);

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

    const fetchUrl = getBunnyStorageUrl(activeUrl);

    const loadWorkbook = async () => {
      try {
        let response = await fetch(fetchUrl);
        if (!response.ok && fetchUrl !== activeUrl) {
          response = await fetch(activeUrl);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const buffer = await response.arrayBuffer();

        if (record?.planningType === "question_bank") {
          const parsed = await parseExcelData(buffer, { preserveFormatting: true });
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
  }, [activeUrl]);

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

    // 1. If user or admin has saved customized edit data, ALWAYS PREFER IT FIRST!
    if (savedUserEditRecord) {
      const recAny = savedUserEditRecord as any;
      if (recAny.sections && Array.isArray(recAny.sections) && recAny.sections.length > 0) {
        return recAny.sections;
      }
    }

    if (record) {
      const recAny = record as any;
      if (recAny.sections && Array.isArray(recAny.sections) && recAny.sections.length > 0) {
        return recAny.sections;
      }
    }

    // 2. Check if Monthly Planning is requested
    const isMonthlyPlan = record?.planningType === "monthly" || record?.category === "masik_niyojan";
    if (isMonthlyPlan) {
      if (parsedWorkbook && parsedWorkbook.monthlySections && Object.keys(parsedWorkbook.monthlySections).length > 0) {
        return Object.values(parsedWorkbook.monthlySections).map((mSec: any) => ({
          subjectName: mSec.monthName,
          displaySubjectName: mSec.displayMonthName,
          headers: mSec.headers || DEFAULT_HEADERS.masik_niyojan,
          rows: mSec.rows,
          startRow: 0,
          endRow: mSec.rows.length,
        }));
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
          return Object.values(mSplitMap).map((mSec) => ({
            subjectName: mSec.monthName,
            displaySubjectName: mSec.displayMonthName,
            headers: mSec.headers || DEFAULT_HEADERS.masik_niyojan,
            rows: mSec.rows,
            startRow: 0,
            endRow: mSec.rows.length,
          }));
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
    if (allSectionsAvailable.length > 0) {
      return allSectionsAvailable.map((s) => s.subjectName);
    }
    if (parsedWorkbook && parsedWorkbook.allSubjectNames.length > 0) {
      return parsedWorkbook.allSubjectNames;
    }
    return ["मराठी", "गणित", "इंग्रजी", "कलाशिक्षण", "कार्यशिक्षण", "शारीरिक शिक्षण"];
  }, [allSectionsAvailable, parsedWorkbook]);

  // Dynamic Selected Medium Display
  const displayMedium = useMemo(() => {
    const recAny = record as any;
    const rawMed = (recAny?.mediumId || recAny?.medium || "").trim().toLowerCase();
    if (rawMed === "semi" || rawMed === "semi_english" || rawMed === "semi-english" || rawMed.includes("सेमी")) {
      return "सेमी-इंग्रजी";
    }
    if (rawMed === "marathi" || rawMed === "mr" || rawMed.includes("मराठी")) {
      return "मराठी";
    }
    if (recAny?.mediumId) return recAny.mediumId;
    return "मराठी";
  }, [record]);

  // Clean main document class title
  const cleanClassTitle = useMemo(() => {
    let title = parsedWorkbook?.classTitle || "";
    const isMonthlyPlan = record?.planningType === "monthly" || (record as any)?.category === "masik_niyojan";
    if (!title || title.length > 50) {
      return `इयत्ता : ${record?.classId || "१ ली"} ${isMonthlyPlan ? "मासिक नियोजन" : "संपूर्ण वार्षिक नियोजन"} सन २०२६-२७`;
    }
    return title;
  }, [parsedWorkbook, record]);

  // Helper to format clean section/month banner title
  const formatCleanSectionTitle = (sec: SubjectSection) => {
    const rawTitle = (sec.displaySubjectName || sec.subjectName || "").trim();

    // 1. Check if it's a monthly section or contains month names
    const monthRegex = /(जुन|जून|जुलै|ऑगस्ट|सप्टेंबर|सप्टें|ऑक्टोबर|ऑक्टो|नोव्हेंबर|नोव्हें|डिसेंबर|डिसे|जानेवारी|जाने|फेब्रुवारी|फेब्रु|मार्च|एप्रिल|मे)/i;
    const match = rawTitle.match(monthRegex);

    if (match) {
      const monthName = match[1];
      const yearMatch = rawTitle.match(/२०\d{2}|20\d{2}/);
      const yearStr = yearMatch ? ` ${yearMatch[0]}` : "";
      return `मासिक नियोजन माहे : ${monthName}${yearStr}`;
    }

    // 2. If rawTitle contains duplicate repeated phrases (e.g. length > 40)
    if (rawTitle.length > 40) {
      const normSubj = normalizeSubjectName(sec.subjectName);
      if (normSubj && normSubj !== "सामान्य") {
        return `विषय : ${normSubj}`;
      }
      const parts = rawTitle.split(/\s+अभ्यासक्रमाचे|\s+मासिक|\s+विषय/i).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 0 && parts[0].length <= 40) {
        return parts[0];
      }
      return `विषय : ${sec.subjectName}`;
    }

    // 3. Standard clean title
    if (!rawTitle.startsWith("विषय") && !rawTitle.startsWith("मासिक")) {
      return `विषय : ${rawTitle}`;
    }

    return rawTitle;
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
        return sec.headers;
      }
    }

    const isEng = isEnglishContent(sec.headers || [], sec.rows, sec.subjectName, recordAny?.mediumId);

    if (isMonthlyPlan) {
      return isEng
        ? [
            "Date",
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
            "Learning Outcomes",
          ]
        : DEFAULT_HEADERS.varshik_niyojan;
    }
  };

  // Helper to check if text is an Exam / Assessment / Test title
  const isExamOrAssessmentText = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    if (!s) return false;

    return (
      s.includes("चाचणी") ||
      s.includes("मूल्यमापन") ||
      s.includes("परीक्षा") ||
      s.includes("संकलित") ||
      s.includes("घटक चाचणी") ||
      s.includes("सत्र परीक्षा") ||
      s.includes("प्रथम घटक") ||
      s.includes("द्वितीय घटक")
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

    const matrix: { rowSpan: number; skip: boolean; displayValue: string; isExam?: boolean }[][] = Array.from(
      { length: numRows },
      () => Array.from({ length: numCols }, () => ({ rowSpan: 1, skip: false, displayValue: "-" }))
    );

    // --- ANNUAL PLANNING (वार्षिक नियोजन) MATRIX BUILDER ---
    if (!isMonthlyPlan) {
      let r = 0;
      while (r < numRows) {
        let monthVal = String(rows[r]?.[0] || "").trim();
        if (monthVal === "-" || monthVal === "null" || monthVal === "undefined") monthVal = "";

        // If row r has no month name, try finding previous valid month
        if (!monthVal && r > 0) {
          for (let prev = r - 1; prev >= 0; prev--) {
            const pVal = String(rows[prev]?.[0] || "").trim();
            if (pVal && pVal !== "-" && pVal !== "null" && pVal !== "undefined") {
              monthVal = pVal;
              break;
            }
          }
        }

        if (monthVal) {
          let blockSpan = 1;
          while (
            r + blockSpan < numRows &&
            (normalizeForCompare(rows[r + blockSpan]?.[0]) === normalizeForCompare(monthVal) ||
              isEmptyValue(rows[r + blockSpan]?.[0]))
          ) {
            blockSpan++;
          }

          // Col 0 (Month Name): 1 merged box for all rows of THIS month
          matrix[r][0] = { rowSpan: blockSpan, skip: false, displayValue: monthVal };
          for (let k = 1; k < blockSpan; k++) {
            matrix[r + k][0] = { rowSpan: 1, skip: true, displayValue: "" };
          }

          // Cols 1, 2, 3 (Weeks, Working Days, Periods): 1 merged box for all rows of THIS month
          for (let cIdx = 1; cIdx <= 3; cIdx++) {
            let colVal = "";
            for (let k = 0; k < blockSpan; k++) {
              const v = String(rows[r + k]?.[cIdx] || "").trim();
              if (v && v !== "-") {
                colVal = v;
                break;
              }
            }
            if (!colVal) colVal = "-";

            matrix[r][cIdx] = { rowSpan: blockSpan, skip: false, displayValue: colVal };
            for (let k = 1; k < blockSpan; k++) {
              matrix[r + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
            }
          }

          // Cols 4 & 5 (Topics & Learning Outcomes): 1 rowSpan per line
          for (let k = 0; k < blockSpan; k++) {
            for (let cIdx = 4; cIdx < numCols; cIdx++) {
              const cellVal = String(rows[r + k]?.[cIdx] || "").trim();
              const isExam = isExamOrAssessmentText(cellVal);
              matrix[r + k][cIdx] = { rowSpan: 1, skip: false, displayValue: cellVal || "-", isExam };
            }
          }

          r += blockSpan;
        } else {
          for (let cIdx = 0; cIdx < numCols; cIdx++) {
            const cellVal = String(rows[r]?.[cIdx] || "").trim();
            const isExam = isExamOrAssessmentText(cellVal);
            matrix[r][cIdx] = { rowSpan: 1, skip: false, displayValue: cellVal || "-", isExam };
          }
          r++;
        }
      }
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

        let dateR = r;
        while (dateR < r + examSpan) {
          const dVal = rows[dateR]?.[0];
          const dEmpty = isEmptyValue(dVal);
          if (dEmpty) {
            let dSpan = 1;
            while (
              dateR + dSpan < r + examSpan &&
              isEmptyValue(rows[dateR + dSpan]?.[0])
            ) {
              dSpan++;
            }
            matrix[dateR][0] = { rowSpan: dSpan, skip: false, displayValue: "-" };
            for (let k = 1; k < dSpan; k++) {
              matrix[dateR + k][0] = { rowSpan: 1, skip: true, displayValue: "" };
            }
            dateR += dSpan;
          } else {
            const dNorm = normalizeForCompare(dVal);
            const dDisplay = String(dVal || "").trim();
            let dSpan = 1;
            while (
              dateR + dSpan < r + examSpan &&
              (isEmptyValue(rows[dateR + dSpan]?.[0]) || normalizeForCompare(rows[dateR + dSpan]?.[0]) === dNorm)
            ) {
              dSpan++;
            }
            matrix[dateR][0] = { rowSpan: dSpan, skip: false, displayValue: dDisplay };
            for (let k = 1; k < dSpan; k++) {
              matrix[dateR + k][0] = { rowSpan: 1, skip: true, displayValue: "" };
            }
            dateR += dSpan;
          }
        }

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
        for (let cIdx = 0; cIdx < numCols; cIdx++) {
          if (matrix[r][cIdx].skip || matrix[r][cIdx].rowSpan > 1) continue;

          const cellVal = rows[r]?.[cIdx];
          const isCurrentEmpty = isEmptyValue(cellVal);

          if (isCurrentEmpty) {
            let span = 1;
            while (
              r + span < numRows &&
              !isExamOrAssessmentRow(rows[r + span]) &&
              isEmptyValue(rows[r + span]?.[cIdx])
            ) {
              span++;
            }
            matrix[r][cIdx] = { rowSpan: span, skip: false, displayValue: "-" };
            for (let k = 1; k < span; k++) {
              matrix[r + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
            }
          } else {
            const currentNorm = normalizeForCompare(cellVal);
            const currentDisplay = String(cellVal || "").trim();
            let span = 1;

            while (r + span < numRows) {
              if (isExamOrAssessmentRow(rows[r + span])) {
                break;
              }

              const nextVal = rows[r + span]?.[cIdx];
              const isNextEmpty = isEmptyValue(nextVal);
              const nextNorm = normalizeForCompare(nextVal);

              if (isNextEmpty || nextNorm === currentNorm) {
                span++;
              } else {
                break;
              }
            }

            matrix[r][cIdx] = { rowSpan: span, skip: false, displayValue: currentDisplay };
            for (let k = 1; k < span; k++) {
              matrix[r + k][cIdx] = { rowSpan: 1, skip: true, displayValue: "" };
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
    udiseNumber: "",
    teacherName: "",
    headMasterName: "",
  });

  useEffect(() => {
    const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
    const storageKey = `user_planning_school_profile_${effectiveUserId}`;

    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setSchoolProfile(parsed);
        setSchoolFormData(parsed);
      } catch (e) {}
    }

    const fetchSchoolProfile = async () => {
      if (db && effectiveUserId && effectiveUserId !== "guest_teacher") {
        try {
          const docRef = doc(db, "user_planning_school_profiles", effectiveUserId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as UserSchoolProfile;
            setSchoolProfile(data);
            setSchoolFormData(data);
            localStorage.setItem(storageKey, JSON.stringify(data));
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

      localStorage.setItem(storageKey, JSON.stringify(schoolFormData));

      if (db && effectiveUserId && effectiveUserId !== "guest_teacher") {
        try {
          const docRef = doc(db, "user_planning_school_profiles", effectiveUserId);
          await setDoc(docRef, { ...schoolFormData, updatedAt: new Date().toISOString() }, { merge: true });
        } catch (e) {
          console.warn("Firestore save planning school profile notice:", e);
        }
      }

      setSchoolProfile(schoolFormData);
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

    const matched = sections.filter((sec) => {
      const sName = (sec.subjectName || "").trim().toLowerCase();
      const dName = (sec.displaySubjectName || "").trim().toLowerCase();
      const fLower = filter.trim().toLowerCase();

      return (
        sName === fLower ||
        dName.includes(fLower) ||
        sName.includes(fLower) ||
        fLower.includes(sName)
      );
    });

    if (matched.length > 0) return matched;

    return [
      {
        subjectName: filter,
        displaySubjectName: `विषय : ${filter}`,
        headers: DEFAULT_HEADERS.varshik_niyojan,
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
        displaySubjectName: `विषय : ${sName}`,
        headers: DEFAULT_HEADERS.varshik_niyojan,
        rows: [
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
          displaySubjectName: `विषय : ${subjName}`,
          headers: DEFAULT_HEADERS.varshik_niyojan,
          rows: [["", "", "", "", "", ""]],
          startRow: 0,
          endRow: 0,
        };
        next.push(newSec);
        targetIdx = next.length - 1;
      }

      const sec = { ...next[targetIdx] };
      const rows = [...sec.rows];
      const row = [...(rows[rIdx] || ["", "", "", "", "", ""])];
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
          displaySubjectName: `विषय : ${subjName}`,
          headers: DEFAULT_HEADERS.varshik_niyojan,
          rows: [["", "", "", "", "", ""]],
          startRow: 0,
          endRow: 0,
        };
        next.push(newSec);
        return next;
      }

      const sec = { ...next[targetIdx] };
      const rows = [...sec.rows, ["", "", "", "", "", ""]];
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
  // Save Edits for Specific User vs Admin Master
  const handleSaveUserEdits = async () => {
    try {
      setIsSavingEdits(true);
      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
      const recordId = activeRecordId;

      // Use editableSections directly as source of truth for saving
      const sectionsToSave = JSON.parse(JSON.stringify(editableSections.length > 0 ? editableSections : allSectionsAvailable));
      const combinedRows: string[][] = [];
      const updatedTableRows: any[] = [];

      sectionsToSave.forEach((sec: SubjectSection) => {
        if (sec.rows && sec.rows.length > 0) {
          combinedRows.push([`विषय : ${sec.subjectName}`, "", "", "", "", ""]);
          combinedRows.push(["महिना", "आठवडा", "कामाचे दिवस", "प्राप्त तासिका", `विषय : ${sec.subjectName}`, "अध्ययन निष्पत्ती"]);
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

      const updatedRec: PlanningDocumentRecord = {
        ...(record || {}),
        id: recordId,
        category: record?.category || (isMonthly ? "masik_niyojan" : "varshik_niyojan"),
        planningType: record?.planningType || (isMonthly ? "monthly" : "annual"),
        classId: record?.classId || "1",
        subjectId: record?.subjectId || "मराठी",
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

      // Always save to LocalStorage for instant rendering
      try {
        localStorage.setItem(`user_edit_${effectiveUserId}_${recordId}`, JSON.stringify(updatedRec));
        localStorage.setItem(`user_edit_${recordId}`, JSON.stringify(updatedRec));
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
        // Teacher/User edit is strictly saved for this specific user
        if (db && recordId) {
          try {
            const userDocRef = doc(db, "academic_plannings_user_edits", `${effectiveUserId}_${recordId}`);
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
        localStorage.removeItem(`user_edit_${activeRecordId}`);
        localStorage.removeItem(`user_edit_${effectiveUserId}_${activeRecordId}`);

        if (db) {
          try {
            await deleteDoc(doc(db, "academic_plannings_user_edits", `${effectiveUserId}_${activeRecordId}`));
          } catch (e) {}
        }
      } catch (e) {}
    }

    setSavedUserEditRecord(null);
    setIsInlineEditing(false);
    toast.info("🔄 मूळ एडमिन फाईल यशस्वीरित्या रिस्टोअर झाली.");
  };

  // Generate Multi-Subject / Single-Subject PDF
  const handleDownloadCombinedPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const isSingleSubject = selectedSubjectFilter !== "all";
      toast.info(
        isSingleSubject
          ? `⚡ विषय : ${selectedSubjectFilter} चे PDF तयार होत आहे...`
          : "⚡ सर्व विषयांचे एकत्र (Combined) PDF तयार होत आहे..."
      );

      const sourceElement = printContainerRef.current;
      if (!sourceElement) {
        toast.error("प्रिन्ट घटक उपलब्ध नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      // Clone clean DOM element without interactive UI controls
      const clone = sourceElement.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".no-print, button, input, select, textarea").forEach((el) => el.remove());

      // Create hidden offscreen container with explicit A4 width
      const container = document.createElement("div");
      container.className = "pdf-export-active";
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "850px";
      container.style.background = "#ffffff";
      container.style.color = "#000000";
      container.style.padding = "10px";
      container.appendChild(clone);
      document.body.appendChild(container);

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: isSingleSubject
          ? `इयत्ता_${record?.classId || "1"}_वार्षिक_नियोजन_${selectedSubjectFilter}_२०२६-२७.pdf`
          : `इयत्ता_${record?.classId || "1"}_संपूर्ण_वार्षिक_नियोजन_२०२६-२७.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 850 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["avoid-all", "css", "legacy"],
          before: ".html2pdf__page-break",
        },
      };

      await (html2pdf() as any).from(container).set(opt).save();

      // Remove temp offscreen container
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }

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

  const isMonthly = record?.planningType === "monthly" || record?.category === "masik_niyojan";
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
        {savedUserEditRecord && !isInlineEditing && (
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
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              <span>
                {selectedSubjectFilter === "all"
                  ? "📥 COMBINED PDF DOWNLOAD"
                  : `📥 PDF DOWNLOAD (${selectedSubjectFilter})`}
              </span>
            </button>

            {/* SINGLE ONLY SAVE / EDIT CONTROL BAR */}
            {isInlineEditing ? (
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
                  onClick={() => handleAddRow(selectedSubjectFilter === "all" ? "मराठी" : selectedSubjectFilter)}
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
            {record?.planningType === "question_bank" ? (
              <>
                <div className="border-b-2 border-slate-900 pb-5 space-y-2 text-center">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    {record.fileName || "प्रश्नपेढी"}
                  </h2>
                  <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                    <span className="bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      इयत्ता: <strong>{record.classId}</strong>
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">
                      विषय: <strong>{record.subjectId}</strong>
                    </span>
                    <span className="bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200">
                      Sheets: <strong>{questionBankSheets.length}</strong>
                    </span>
                  </div>
                </div>

                {questionBankSheets.length > 0 ? (
                  questionBankSheets.map((sheet, sheetIndex) => {
                    const nonEmptyRows = sheet.rows.filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
                    const headerIndex = nonEmptyRows.findIndex((row) => row.some((cell) => String(cell || "").includes("प्रश्न क्रमांक") || String(cell || "").toLowerCase().includes("question number")));
                    const tableHeader = headerIndex >= 0 ? nonEmptyRows[headerIndex] : sheet.headers;
                    const metadataRows = headerIndex > 0 ? nonEmptyRows.slice(0, headerIndex) : [];
                    const allDataRows = headerIndex >= 0 ? nonEmptyRows.slice(headerIndex + 1) : nonEmptyRows;
                    const dataRows = searchQuery.trim()
                      ? allDataRows.filter((row) => row.some((cell) => String(cell || "").toLowerCase().includes(searchQuery.toLowerCase().trim())))
                      : allDataRows;
                    const columnCount = Math.max(tableHeader.length, ...dataRows.map((r) => r.length), 1);

                    return (
                      <div key={`${sheet.sheetName}-${sheetIndex}`} className="space-y-4 page-break-after">
                        <div className="pdf-subject-banner bg-slate-900 text-amber-300 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                            <FileSpreadsheet className="size-4 text-emerald-400" />
                            <span>{sheet.sheetName}</span>
                          </h3>
                          <span className="text-[11px] font-bold text-slate-300">{dataRows.length} प्रश्न नोंदी</span>
                        </div>

                        {headerIndex > 0 && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                            {metadataRows.map((row, idx) => (
                              <div key={idx} className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                                {row.filter((cell) => String(cell || "").trim() !== "").join("  |  ")}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="overflow-x-auto rounded-2xl border border-slate-900">
                          <table className="w-full border-collapse text-xs font-sans bg-white">
                            <thead>
                              <tr className="bg-slate-900 text-amber-300" style={{ backgroundColor: "#0f172a", color: "#fef08a" }}>
                                {Array.from({ length: columnCount }).map((_, colIndex) => (
                                  <th
                                    key={colIndex}
                                    className="border border-slate-700 p-2.5 text-center font-black align-top whitespace-pre-wrap min-w-[110px]"
                                    style={{ backgroundColor: "#0f172a", color: "#fef08a" }}
                                  >
                                    {tableHeader[colIndex] || `स्तंभ ${colIndex + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dataRows.length > 0 ? dataRows.map((row, rowIndex) => (
                                <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                                  {Array.from({ length: columnCount }).map((_, colIndex) => (
                                    <td key={colIndex} className="border border-slate-300 p-2.5 align-top text-slate-900 leading-relaxed whitespace-pre-wrap min-w-[110px]">
                                      {row[colIndex] || ""}
                                    </td>
                                  ))}
                                </tr>
                              )) : (
                                <tr><td colSpan={columnCount} className="p-6 text-center text-slate-400 font-bold">या शीटमध्ये शोधानुसार कोणतीही नोंद सापडली नाही.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs">प्रश्नपेढी डेटा उपलब्ध नाही.</div>
                )}
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

                  /* Dedicated Clean PDF Export Mode (Activated ONLY during handleDownloadCombinedPdf) */
                  .pdf-export-active .pdf-school-header {
                    background: transparent !important;
                    border: none !important;
                    border-bottom: 2px solid #000 !important;
                    border-radius: 0 !important;
                    padding: 4px 0 8px 0 !important;
                    margin-bottom: 10px !important;
                    box-shadow: none !important;
                  }
                  .pdf-export-active .pdf-school-header h2 {
                    font-size: 15px !important;
                    color: #000 !important;
                    margin-bottom: 2px !important;
                  }
                  .pdf-export-active .pdf-school-header h3 {
                    font-size: 12px !important;
                    color: #000 !important;
                  }
                  .pdf-export-active .pdf-subject-section {
                    box-sizing: border-box !important;
                    border-top: none !important;
                    padding-top: 0 !important;
                  }
                  .pdf-export-active .pdf-subject-section.html2pdf__page-break {
                    page-break-before: always !important;
                    break-before: page !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                  }
                  .pdf-export-active .pdf-subject-banner {
                    background: transparent !important;
                    color: #000 !important;
                    border-bottom: 1.5px solid #000 !important;
                    border-radius: 0 !important;
                    padding: 2px 0 4px 0 !important;
                    margin-bottom: 6px !important;
                    box-shadow: none !important;
                  }
                  .pdf-export-active .pdf-subject-banner h3 {
                    font-size: 13px !important;
                    color: #000 !important;
                    font-weight: 800 !important;
                  }
                  .pdf-export-active .pdf-subject-banner span {
                    color: #000 !important;
                  }
                  .pdf-export-active .pdf-subject-banner svg,
                  .pdf-export-active .pdf-subject-banner button,
                  .pdf-export-active .pdf-subject-banner div span {
                    display: none !important;
                  }
                  .pdf-export-active table {
                    border-collapse: collapse !important;
                    border: 1px solid #333 !important;
                    font-size: 9px !important;
                    line-height: 1.15 !important;
                    width: 100% !important;
                  }
                  .pdf-export-active th {
                    background-color: #f1f5f9 !important;
                    color: #000 !important;
                    border: 1px solid #333 !important;
                    padding: 3px 4px !important;
                    font-size: 9.5px !important;
                    font-weight: 800 !important;
                  }
                  .pdf-export-active tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .pdf-export-active td {
                    border: 1px solid #333 !important;
                    padding: 3px 4px !important;
                    font-size: 9.5px !important;
                    color: #000 !important;
                    vertical-align: middle !important;
                  }
                  .pdf-export-active .pdf-signature-bar {
                    border-top: 1px solid #000 !important;
                    padding-top: 6px !important;
                    margin-top: 8px !important;
                    font-size: 10px !important;
                    color: #000 !important;
                  }
                `}</style>
                {/* Header Title & School Info Card at START of Document (First Page Only) */}
                <div className="pdf-school-header border-2 border-slate-900 rounded-2xl p-4 sm:p-5 bg-slate-50 space-y-3 text-xs font-bold text-slate-900 print:bg-white print:border-2 print:border-slate-900">
                  <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-3">
                    <h2 className="text-lg sm:text-xl font-black text-indigo-950 uppercase tracking-tight print:text-slate-950">
                      {schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                    </h2>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase">
                      {cleanClassTitle}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold text-slate-900 pt-1">
                    <div><span className="text-slate-600">केंद्र:</span> {schoolProfile.kendraName || "—"}</div>
                    <div><span className="text-slate-600">तालुका:</span> {schoolProfile.talukaName || "—"}</div>
                    <div><span className="text-slate-600">UDISE क्र.:</span> <span className="font-mono">{schoolProfile.udiseNumber || "—"}</span></div>
                    <div><span className="text-slate-600">वर्ग शिक्षक:</span> {schoolProfile.teacherName || "—"}</div>
                    <div><span className="text-slate-600">मुख्याध्यापक:</span> {schoolProfile.headMasterName || "—"}</div>
                    <div><span className="text-slate-600">माध्यम:</span> {displayMedium}</div>
                  </div>
                </div>

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
                      const filteredRows = sec.rows.filter((row) => {
                        if (isSignatureRow(row)) return false;
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
                        {/* Subject Banner Header */}
                        <div className="pdf-subject-banner bg-slate-900 text-amber-300 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs">
                          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="size-4 text-emerald-400" />
                            <span>{formatCleanSectionTitle(sec)}</span>
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-bold text-slate-300">
                              {filteredRows.length} ओळी (Rows)
                            </span>
                            {isInlineEditing && (
                              <button
                                onClick={() => handleAddRow(sec.subjectName)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="size-3.5" />
                                <span>ओळ जोडा</span>
                              </button>
                            )}
                          </div>
                        </div>

                         {/* Table View */}
                        <div className="overflow-x-auto">
                          <table className="w-full table-fixed border-collapse border border-slate-900 text-xs font-sans bg-white">
                            <colgroup>
                              {isMonthly ? (
                                <>
                                  <col style={{ width: "6%" }} />
                                  <col style={{ width: "22%" }} />
                                  <col style={{ width: "20%" }} />
                                  <col style={{ width: "18%" }} />
                                  <col style={{ width: "16%" }} />
                                  <col style={{ width: "10%" }} />
                                  <col style={{ width: "8%" }} />
                                  {isInlineEditing && <col style={{ width: "5%" }} />}
                                </>
                              ) : (
                                <>
                                  <col style={{ width: "8%" }} />
                                  <col style={{ width: "6%" }} />
                                  <col style={{ width: "8%" }} />
                                  <col style={{ width: "8%" }} />
                                  <col style={{ width: "45%" }} />
                                  <col style={{ width: "25%" }} />
                                  {isInlineEditing && <col style={{ width: "5%" }} />}
                                </>
                              )}
                            </colgroup>
                            <thead>
                              <tr
                                className="bg-slate-900 text-amber-300 font-black text-center text-xs border-b-2 border-slate-950"
                                style={{ backgroundColor: "#0f172a", color: "#fef08a" }}
                              >
                                {categoryHeaders.map((hText: string, i: number) => (
                                  <th
                                    key={i}
                                    className="border border-slate-700 p-2.5 text-center font-black tracking-wide text-xs"
                                    style={{ backgroundColor: "#0f172a", color: "#fef08a" }}
                                  >
                                    {!isMonthly && i === 4 ? `विषय : ${sec.subjectName}` : hText}
                                  </th>
                                ))}
                                {isInlineEditing && (
                                  <th
                                    className="border border-slate-700 p-2.5 text-center font-black tracking-wide text-xs"
                                    style={{ backgroundColor: "#0f172a", color: "#fef08a" }}
                                  >
                                    क्रिया
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300">
                              {filteredRows.length > 0 ? (
                                filteredRows.map((r, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className={`hover:bg-indigo-50/40 transition-colors ${rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                      }`}
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
                                              placeholder="दिनांक"
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

                                          return (
                                            <td
                                              key={cIdx}
                                              rowSpan={!isInlineEditing && cellInfo?.rowSpan ? cellInfo.rowSpan : 1}
                                              className={`border border-slate-300 p-2.5 align-middle text-slate-900 leading-relaxed ${(cellInfo?.isExam || isExamOrAssessmentText(cellInfo?.displayValue)) ? "text-center font-bold text-slate-900 bg-amber-50/40" : cIdx <= 3 ? "text-center font-bold text-slate-900" : "text-left whitespace-pre-line"}`}
                                              style={{ pageBreakInside: "avoid", breakInside: "avoid" }}
                                            >
                                              {cellInfo ? cellInfo.displayValue : r[cIdx] || "-"}
                                            </td>
                                          );
                                       })
                                    )}
                                  </tr>
                                ))
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
                        <div className="pdf-signature-bar pt-4 border-t border-slate-300 grid grid-cols-2 text-center text-xs font-black text-slate-900">
                          <div>
                            <div>वर्ग शिक्षक स्वाक्षरी</div>
                            <div className="text-[11px] text-slate-600 font-bold mt-1">({schoolProfile.teacherName || "शिक्षकाचे नाव"})</div>
                          </div>
                          <div>
                            <div>मुख्याध्यापक स्वाक्षरी व शिक्का</div>
                            <div className="text-[11px] text-slate-600 font-bold mt-1">({schoolProfile.headMasterName || "मुख्याध्यापक नाव"})</div>
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
    </div>
  );
};
