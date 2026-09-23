import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PlanningDocumentRecord,
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
import { getFileFromIndexedDB } from "@/lib/indexedDbStorage";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";

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
  const initialFilter = record?.subjectId && record.subjectId !== "all" ? record.subjectId : "all";
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(initialFilter); // "all" or specific subject
  const [loadingWorkbook, setLoadingWorkbook] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [questionBankSheets, setQuestionBankSheets] = useState<ParsedSheet[]>([]);

  // Keep selectedSubjectFilter in sync if record changes
  useEffect(() => {
    if (record?.subjectId && record.subjectId !== "all") {
      setSelectedSubjectFilter(record.subjectId);
    } else {
      setSelectedSubjectFilter("all");
    }
  }, [record?.id, record?.subjectId]);

  // Inline Table Editing State & User-Specific Storage
  const [isInlineEditing, setIsInlineEditing] = useState<boolean>(false);
  const [isSavingEdits, setIsSavingEdits] = useState<boolean>(false);
  const [editableSections, setEditableSections] = useState<SubjectSection[]>([]);
  const [savedUserEditRecord, setSavedUserEditRecord] = useState<PlanningDocumentRecord | null>(null);

  const printContainerRef = useRef<HTMLDivElement>(null);
  const activeUrl = fileUrl || record?.fileUrl || null;
  const activeRecordId = record?.id || (record as any)?.recordKey || `plan_${record?.classId || "1"}_${record?.subjectId || "all"}`;

  // Reliable check for whether this record is Monthly Planning or Annual Planning
  const isMonthly = useMemo(() => {
    const recAny = record as any;
    const pType = String(recAny?.planningType || recAny?.category || "").toLowerCase().trim();
    const titleStr = String(recAny?.title || recAny?.name || recAny?.fileName || parsedWorkbook?.classTitle || "").toLowerCase().trim();

    if (pType === "annual" || pType === "varshik" || pType === "varshik_niyojan" || titleStr.includes("वार्षिक") || titleStr.includes("annual")) {
      return false;
    }
    if (pType === "monthly" || pType === "masik" || pType === "masik_niyojan" || titleStr.includes("मासिक") || titleStr.includes("monthly")) {
      return true;
    }
    return recAny?.planningType === "monthly" || recAny?.category === "masik_niyojan";
  }, [record, parsedWorkbook]);

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

    const fetchUrl = activeUrl ? getBunnyStorageUrl(activeUrl) : "";

    const loadWorkbook = async () => {
      try {
        let buffer: ArrayBuffer | null = null;

        // 1. Try network fetch if activeUrl is present
        if (activeUrl && !activeUrl.startsWith("blob:")) {
          try {
            const headers: Record<string, string> = {};
            if (import.meta.env.DEV && import.meta.env.VITE_BUNNY_STORAGE_API_KEY) {
              headers["AccessKey"] = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
            }

            let response = await fetch(fetchUrl, { headers });
            let cType = response.headers.get("content-type") || "";
            let isHtml = cType.includes("text/html");

            // If fetchUrl returned HTML or failed, and it's a Bunny URL, try dev proxy or secure pdf-proxy
            if ((!response.ok || isHtml) && activeUrl.includes("b-cdn.net")) {
              const zone = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
              const rawPath = decodeURIComponent(new URL(activeUrl).pathname).replace(/^\//, "");
              const cleanPath = rawPath.startsWith(zone + "/") ? rawPath.slice(zone.length + 1) : rawPath;
              const directStorageProxyUrl = `/api/bunny-storage/${zone}/${encodeURI(cleanPath)}`;

              try {
                const proxyRes = await fetch(directStorageProxyUrl, { headers });
                const proxyCType = proxyRes.headers.get("content-type") || "";
                if (proxyRes.ok && !proxyCType.includes("text/html")) {
                  response = proxyRes;
                  cType = proxyCType;
                  isHtml = false;
                }
              } catch (e) {}
            }

            if (response.ok && !isHtml) {
              const ab = await response.arrayBuffer();
              const firstBytes = new Uint8Array(ab.slice(0, 50));
              const textHeader = new TextDecoder().decode(firstBytes).toLowerCase();
              if (!textHeader.includes("<!doctype") && !textHeader.includes("<html")) {
                buffer = ab;
              } else {
                console.warn("Received HTML SPA fallback instead of binary file.");
              }
            }
          } catch (e) {
            console.warn("Network fetch notice, trying IndexedDB fallback:", e);
          }
        } else if (activeUrl && activeUrl.startsWith("blob:")) {
          try {
            const blobRes = await fetch(activeUrl);
            if (blobRes.ok) {
              buffer = await blobRes.arrayBuffer();
            }
          } catch (e) {
            console.warn("Blob URL expired, trying IndexedDB fallback:", e);
          }
        }

        // 2. Fallback to local IndexedDB if network fetch failed or activeUrl missing/expired
        if (!buffer) {
          const keysToTry = [
            activeRecordId,
            record?.id,
            (record as any)?.recordKey,
            `plan_${record?.classId || "1"}_${record?.subjectId || "all"}`,
            `2026-27_${(record as any)?.mediumId || "marathi"}_${record?.classId || "1st"}_${record?.planningType || "annual"}_${record?.subjectId || "all"}`
          ].filter(Boolean) as string[];

          for (const key of keysToTry) {
            try {
              const blobFromDb = await getFileFromIndexedDB(key);
              if (blobFromDb) {
                buffer = await blobFromDb.arrayBuffer();
                break;
              }
            } catch (e) {}
          }
        }

        if (!buffer) {
          throw new Error("Workbook data could not be retrieved.");
        }

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
  }, [activeUrl, activeRecordId, record?.id]);

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
    const isMonthlyPlan = isMonthly;
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
    if (record?.planningType === "question_bank" && questionBankSheets.length > 0) {
      return questionBankSheets.map((s) => s.sheetName);
    }
    if (allSectionsAvailable.length > 0) {
      return allSectionsAvailable.map((s) => s.subjectName);
    }
    if (parsedWorkbook && parsedWorkbook.allSubjectNames.length > 0) {
      return parsedWorkbook.allSubjectNames;
    }
    return getDefaultSubjectsForClass(record?.classId || "1st", (record as any)?.mediumId);
  }, [record?.planningType, record?.classId, (record as any)?.mediumId, questionBankSheets, allSectionsAvailable, parsedWorkbook]);

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
    if (!title || title.length > 50) {
      const clsName = formatMarathiClassName(record?.classId || record?.fileName || "1st");
      return `इयत्ता : ${clsName} ${isMonthly ? "मासिक नियोजन" : "वार्षिक नियोजन"} सन :- 2026-27`;
    }
    return title;
  }, [parsedWorkbook, record, isMonthly]);

  // Helper to format clean section/month banner title
  const formatCleanSectionTitle = (sec: SubjectSection) => {
    const rawTitle = (sec.displaySubjectName || sec.subjectName || "").trim();

    const rawSubj = normalizeSubjectName(sec.subjectName) || (selectedSubjectFilter !== "all" ? selectedSubjectFilter : "") || "मराठी";
    const cleanSubj = rawSubj === "all" ? "मराठी" : rawSubj;
    const clsName = formatMarathiClassName(record?.classId || record?.fileName || "1st");

    let baseLine = cleanClassTitle;
    if (!baseLine || baseLine.length > 50) {
      baseLine = `इयत्ता : ${clsName} ${isMonthly ? "मासिक नियोजन" : "वार्षिक नियोजन"} सन :- 2026-27`;
    }

    if (isMonthly) {
      // Check if it's a monthly section or contains month names
      const monthRegex = /(जुन|जून|जुलै|ऑगस्ट|सप्टेंबर|सप्टें|ऑक्टोबर|ऑक्टो|नोव्हेंबर|नोव्हें|डिसेंबर|डिसे|जानेवारी|जाने|फेब्रुवारी|फेब्रु|मार्च|एप्रिल|मे)/i;
      const match = rawTitle.match(monthRegex);

      if (match) {
        let monthName = match[1];
        if (monthName === "जुन") monthName = "जून";
        if (!baseLine.includes(monthName)) {
          baseLine = baseLine.replace("मासिक नियोजन", `मासिक नियोजन माहे - ${monthName}`);
        }
      }
    }

    return `${baseLine}, विषय : ${cleanSubj}, माध्यम : ${displayMedium}`;
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
        return cleanedHeaders;
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

    const matrix: { rowSpan: number; skip: boolean; displayValue: string; isExam?: boolean; isMonthHeader?: boolean }[][] = Array.from(
      { length: numRows },
      () => Array.from({ length: numCols }, () => ({ rowSpan: 1, skip: false, displayValue: "-" }))
    );

    // --- ANNUAL PLANNING (वार्षिक नियोजन) MATRIX BUILDER ---
    if (!isMonthlyPlan) {
      // Step 1: Divide rows into Month blocks based on column 0 month names
      const monthBlocks: { startR: number; endR: number; monthName: string }[] = [];
      let currentMonth = "";
      let blockStart = 0;

      for (let r = 0; r < numRows; r++) {
        let cell0 = String(rows[r]?.[0] || "").trim();
        if (cell0 === "-" || cell0 === "null" || cell0 === "undefined") cell0 = "";

        let isNewMonth = false;
        if (cell0 && isMarathiMonth(cell0)) {
          if (normalizeForCompare(cell0) !== normalizeForCompare(currentMonth)) {
            currentMonth = cell0;
            isNewMonth = true;
          }
        } else if (cell0) {
          currentMonth = cell0;
          isNewMonth = true;
        }

        if (isNewMonth && r > 0) {
          monthBlocks.push({
            startR: blockStart,
            endR: r,
            monthName: rows[blockStart]?.[0] || currentMonth,
          });
          blockStart = r;
        }
      }
      if (numRows > 0) {
        monthBlocks.push({
          startR: blockStart,
          endR: numRows,
          monthName: rows[blockStart]?.[0] || currentMonth,
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
          if (!matrix[r][4].skip) {
            const rawVal = String(rows[r]?.[4] || "").trim();
            const val = (rawVal === "null" || rawVal === "undefined") ? "" : rawVal;
            const isExam = isExamOrAssessmentText(val);

            matrix[r][4] = {
              rowSpan: 1,
              skip: false,
              displayValue: val || "-",
              isExam,
            };
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
        // Col 0: Date cell - 1 cell per row (rowSpan: 1) for 100% complete borders & no date merging
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

  // Generate Multi-Subject / Single-Subject PDF preserving exact web structure & per-subject clean pagebreaks
  const handleDownloadCombinedPdf = async () => {
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

        // Extract components of the section
        const schoolHeader = secClone.querySelector(".pdf-school-header");
        const subjectBanner = secClone.querySelector(".pdf-subject-banner");
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
          pageDiv.className = "p-4 bg-white space-y-3.5";
          pageDiv.style.width = exportWidth;
          pageDiv.style.boxSizing = "border-box";
          pageDiv.style.backgroundColor = "#ffffff";
          pageDiv.style.fontFamily = "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif";

          if (isFirstPage) {
            if (schoolHeader) pageDiv.appendChild(schoolHeader.cloneNode(true));
            if (subjectBanner) pageDiv.appendChild(subjectBanner.cloneNode(true));
          }

          const pageTable = document.createElement("table");
          if (tableEl) pageTable.className = tableEl.className;
          pageTable.style.width = "100%";
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
            windowWidth: 950,
            x: 0,
            y: 0,
            width: 950,
            height: pageDiv.offsetHeight,
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
                  .pdf-export-active td.bg-amber-50\/40,
                  .pdf-export-active td.bg-amber-50 {
                    background-color: #fffbe6 !important;
                  }
                  .pdf-export-active .pdf-subject-banner {
                    justify-content: center !important;
                    text-align: center !important;
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
                        {/* Header Title & School Info Card for THIS Subject */}
                        <div className="pdf-school-header border-2 border-slate-900 rounded-2xl p-5 sm:p-6 bg-slate-50 space-y-3.5 text-sm sm:text-base font-bold text-slate-900 print:bg-white print:border-2 print:border-slate-900">
                          <div className="text-center border-b-2 border-slate-900 pb-3">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-indigo-950 uppercase tracking-wide print:text-slate-950">
                              {schoolProfile.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm md:text-base font-bold text-slate-900 pt-1.5">
                            <div><span className="text-slate-600 font-semibold">केंद्र:</span> <span className="font-extrabold text-slate-950">{schoolProfile.kendraName || "—"}</span></div>
                            <div className="sm:text-center"><span className="text-slate-600 font-semibold">तालुका:</span> <span className="font-extrabold text-slate-950">{schoolProfile.talukaName || "—"}</span></div>
                            <div className="sm:text-right"><span className="text-slate-600 font-semibold">UDISE क्र.:</span> <span className="font-mono font-extrabold text-slate-950">{schoolProfile.udiseNumber || "—"}</span></div>
                          </div>
                        </div>

                        {/* Subject Banner Header */}
                        <div className="pdf-subject-banner relative bg-indigo-50/90 border border-indigo-200 text-indigo-950 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0 shadow-xs">
                          <h3 className="text-xs sm:text-sm md:text-base font-black uppercase tracking-wider flex items-center justify-center gap-2 text-indigo-950 text-center flex-wrap sm:px-32">
                            <BookOpen className="size-4 text-indigo-600 shrink-0" />
                            <span>{formatCleanSectionTitle(sec)}</span>
                          </h3>
                          <div className="sm:absolute sm:right-4 sm:top-1/2 sm:-translate-y-1/2 flex items-center gap-2.5 shrink-0">
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full border border-indigo-200 whitespace-nowrap">
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

                         {/* Mobile Scroll Indicator */}
                         <div className="flex items-center justify-between text-[11px] font-extrabold text-indigo-700 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100 sm:hidden mb-2">
                           <span className="flex items-center gap-1">👈👉 संपूर्ण तक्ता पाहण्यासाठी डावीकडे/उजवीकडे सरकवा (Scroll horizontally)</span>
                         </div>
                         {/* Table View Container */}
                         <div className="overflow-x-auto border border-slate-900 rounded-xl shadow-xs mb-4 pb-1">
                           <table className="w-full min-w-[860px] table-fixed border-collapse border border-slate-900 text-xs font-sans bg-white">
                              <colgroup>
                                {isMonthly ? (
                                  <>
                                    <col style={{ width: "55px" }} />   {/* 0: दिनांक */}
                                    <col style={{ width: "55px" }} />   {/* 1: पाठ / घटक / उपघटक (Rotated) */}
                                    <col style={{ width: "55px" }} />   {/* 2: अध्ययन निष्पत्ती (Rotated) */}
                                    <col style={{ width: "285px" }} />  {/* 3: अध्ययन मुद्दे / पाठ्यांश उद्देश */}
                                    <col style={{ width: "275px" }} />  {/* 4: अध्ययन अनुभवाचे स्वरूप */}
                                    <col style={{ width: "110px" }} />  {/* 5: साधन तंत्रे */}
                                    <col style={{ width: "115px" }} />  {/* 6: आवश्यक साहित्य */}
                                    {isInlineEditing && <col style={{ width: "60px" }} />}
                                  </>
                                ) : (
                                  <>
                                    <col style={{ width: "80px" }} />
                                    <col style={{ width: "60px" }} />
                                    <col style={{ width: "80px" }} />
                                    <col style={{ width: "80px" }} />
                                    <col style={{ width: "505px" }} />
                                    <col style={{ width: "85px" }} />
                                    {isInlineEditing && <col style={{ width: "60px" }} />}
                                  </>
                                )}
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
                                      ? (rIdx === 0 || sectionRowMatrix[rIdx]?.[1]?.skip === false || sectionRowMatrix[rIdx]?.[2]?.skip === false)
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
                                               {isMonthly && (cIdx === 1 || cIdx === 2) && !(cellInfo?.isExam || isExamOrAssessmentText(cellInfo?.displayValue)) ? (
                                                 <div className="flex items-center justify-center h-full min-h-[55px] py-1 px-0.5">
                                                   <div
                                                     className="text-[11px] font-bold text-slate-900 tracking-tight text-center leading-snug"
                                                     style={{
                                                       writingMode: "vertical-rl",
                                                       transform: "rotate(180deg)",
                                                       maxHeight: "100%",
                                                       whiteSpace: "pre-line",
                                                       wordBreak: "break-word",
                                                       fontFamily: "'Noto Sans Devanagari', 'Mukta', Arial, sans-serif",
                                                     }}
                                                   >
                                                     {cellInfo ? cellInfo.displayValue : r[cIdx] || "-"}
                                                   </div>
                                                 </div>
                                               ) : (
                                                 cellInfo ? cellInfo.displayValue : r[cIdx] || "-"
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
                        <div className="pdf-signature-bar pt-6 border-t-2 border-slate-400 grid grid-cols-2 text-center text-sm sm:text-base font-black text-slate-950">
                          <div>
                            <div className="pdf-sig-title text-sm sm:text-base font-black text-slate-950">वर्ग शिक्षक स्वाक्षरी</div>
                            <div className="pdf-sig-name text-xs sm:text-sm text-slate-700 font-bold mt-1.5">({schoolProfile.teacherName || "शिक्षकाचे नाव"})</div>
                          </div>
                          <div>
                            <div className="pdf-sig-title text-sm sm:text-base font-black text-slate-950">मुख्याध्यापक स्वाक्षरी व शिक्का</div>
                            <div className="pdf-sig-name text-xs sm:text-sm text-slate-700 font-bold mt-1.5">({schoolProfile.headMasterName || "मुख्याध्यापक नाव"})</div>
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
