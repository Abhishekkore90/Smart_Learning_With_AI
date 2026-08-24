import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PlanningDocumentRecord,
  DEFAULT_HEADERS,
} from "@/lib/smartPlanningParser";
import {
  extractSubjectSectionsFromExcel,
  splitRowsIntoSubjectSections,
  normalizeSubjectName,
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
  Check,
  UserCheck,
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
  const activeRecordId = record?.id || (record as any)?.recordKey || null;

  // Load User-Specific Edit (Persisted in LocalStorage / Firestore for logged in user)
  useEffect(() => {
    let isMounted = true;
    const loadUserSavedEdit = async () => {
      if (!activeRecordId) return;

      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";

      // 1. LocalStorage check (strictly user specific)
      const localDataStr = localStorage.getItem(`user_edit_${effectiveUserId}_${activeRecordId}`);

      if (localDataStr) {
        try {
          const parsed = JSON.parse(localDataStr);
          if (parsed && (parsed.rawDataRows || parsed.rows || parsed.tableRows) && (parsed.editedByUserId === effectiveUserId || !parsed.editedByUserId)) {
            // Check if Admin published a newer version after this user edit
            const adminTime = record?.uploadedAt ? new Date(record.uploadedAt).getTime() : 0;
            const userEditTime = parsed.editedAt ? new Date(parsed.editedAt).getTime() : 0;

            if (mode !== "admin" && adminTime > userEditTime) {
              // Admin edited after user edit -> invalidate stale local cache so teacher gets Admin's new update
              localStorage.removeItem(`user_edit_${effectiveUserId}_${activeRecordId}`);
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
            if (data.editedByUserId === effectiveUserId || !data.editedByUserId) {
              const adminTime = record?.uploadedAt ? new Date(record.uploadedAt).getTime() : 0;
              const userEditTime = data.editedAt ? new Date(data.editedAt).getTime() : 0;

              if (mode !== "admin" && adminTime > userEditTime) {
                // Admin updated main file after user edit -> fallback to Admin's new version
                setSavedUserEditRecord(null);
                return;
              }

              setSavedUserEditRecord(data);
              try {
                localStorage.setItem(`user_edit_${effectiveUserId}_${activeRecordId}`, JSON.stringify(data));
              } catch (e) {}
            }
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
  }, [activeRecordId, user?.uid]);

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

        if (record?.planningType === "question_bank" || (record as any)?.category === "prashnapedhi") {
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
  }, [activeUrl, record?.planningType]);

  // List of Available Subjects
  const availableSubjectNames = useMemo(() => {
    if (parsedWorkbook && parsedWorkbook.allSubjectNames.length > 0) {
      return parsedWorkbook.allSubjectNames;
    }
    const currentRec = savedUserEditRecord || record;
    if (currentRec) {
      const recAny = currentRec as any;
      let rowsToUse: string[][] = recAny.rawDataRows || currentRec.rows || [];
      if (!rowsToUse || rowsToUse.length === 0) {
        if (recAny.tableRows && Array.isArray(recAny.tableRows)) {
          rowsToUse = recAny.tableRows.map((tr: any) => [
            tr.month || "",
            tr.weeks || "",
            tr.workingDays || "",
            tr.periods || "",
            tr.topics || "",
            tr.outcomes || "",
          ]);
        }
      }
      if (rowsToUse && rowsToUse.length > 0) {
        const splitMap = splitRowsIntoSubjectSections(rowsToUse, currentRec.subjectId || "मराठी");
        const keys = Object.keys(splitMap);
        if (keys.length > 0) return keys;
      }
    }
    return ["मराठी", "गणित", "इंग्रजी", "कलाशिक्षण", "कार्यशिक्षण", "शारीरिक शिक्षण"];
  }, [parsedWorkbook, record, savedUserEditRecord]);

  // All subject sections extracted from Excel or stored record
  const allSectionsAvailable = useMemo<SubjectSection[]>(() => {
    const currentRec = savedUserEditRecord || record;

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

    // 1. If user has saved customized edit data
    if (savedUserEditRecord) {
      const recAny = savedUserEditRecord as any;
      if (recAny.tableRows && Array.isArray(recAny.tableRows) && recAny.tableRows.length > 0) {
        const sections = splitTableRowsBySubject(recAny.tableRows, savedUserEditRecord.subjectId || "मराठी");
        if (sections.length > 0) return sections;
      }

      let rowsToUse: string[][] = [];
      if (recAny.rawDataRows && Array.isArray(recAny.rawDataRows) && recAny.rawDataRows.length > 0) {
        rowsToUse = recAny.rawDataRows;
      } else if (savedUserEditRecord.rows && Array.isArray(savedUserEditRecord.rows) && savedUserEditRecord.rows.length > 0) {
        rowsToUse = savedUserEditRecord.rows;
      }

      if (rowsToUse.length > 0) {
        const splitMap = splitRowsIntoSubjectSections(rowsToUse, savedUserEditRecord.subjectId || "मराठी");
        if (Object.keys(splitMap).length > 0) {
          return Object.values(splitMap);
        }
      }
    }

    // 2. Check if parsedWorkbook has extracted subject sections from Excel
    if (parsedWorkbook && Object.keys(parsedWorkbook.subjects).length > 0) {
      return Object.values(parsedWorkbook.subjects);
    }

    // 3. Fallback to data stored directly in record (tableRows / rawDataRows / rows / gridData)
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

    // Do NOT fallback to returning all subjects! Return a single section for selected subject
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

  // Selected Subject Section(s) to Display
  const activeSectionsToDisplay = useMemo<SubjectSection[]>(() => {
    return filterSectionsBySubject(allSectionsAvailable, selectedSubjectFilter);
  }, [allSectionsAvailable, selectedSubjectFilter]);

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
    if (onEdit) {
      try {
        onEdit();
      } catch (e) {}
    }
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

  // Save Edits for Specific User
  const handleSaveUserEdits = async () => {
    try {
      setIsSavingEdits(true);
      const effectiveUserId = user?.uid || auth?.currentUser?.uid || "guest_teacher";
      const recordId = activeRecordId || `plan_${record?.classId || "1"}_${selectedSubjectFilter}`;

      // Merge allSectionsAvailable with editableSections to preserve every subject section intact
      const mergedSectionsMap: Record<string, SubjectSection> = {};

      allSectionsAvailable.forEach((sec) => {
        mergedSectionsMap[sec.subjectName] = JSON.parse(JSON.stringify(sec));
      });

      editableSections.forEach((sec) => {
        mergedSectionsMap[sec.subjectName] = JSON.parse(JSON.stringify(sec));
      });

      const sectionsToSave = Object.values(mergedSectionsMap);
      const combinedRows: string[][] = [];
      const updatedTableRows: any[] = [];

      sectionsToSave.forEach((sec) => {
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
        category: record?.category || "varshik_niyojan",
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
        headers: record?.headers || [],
        uploadedAt: mode === "admin" ? new Date().toISOString() : (record?.uploadedAt || new Date().toISOString()),
        rawDataRows: combinedRows,
        rows: combinedRows,
        tableRows: updatedTableRows,
        isCustomUserEdit: true,
        editedByUserId: effectiveUserId,
        editedAt: new Date().toISOString(),
      };

      // 1. Store in LocalStorage strictly for this specific user
      try {
        localStorage.setItem(`user_edit_${effectiveUserId}_${recordId}`, JSON.stringify(updatedRec));
      } catch (e) {
        console.warn("LocalStorage save notice:", e);
      }

      // 2. Persist in Firestore user_edits collection strictly for this user
      if (db) {
        try {
          const userDocRef = doc(db, "academic_plannings_user_edits", `${effectiveUserId}_${recordId}`);
          await setDoc(userDocRef, updatedRec, { merge: true });

          // Only update main collection if explicitly in Admin mode
          if (mode === "admin") {
            const adminDocRef = doc(db, "academic_plannings", recordId);
            await setDoc(adminDocRef, updatedRec, { merge: true });
          }
        } catch (e) {
          console.warn("Firestore user edit save notice:", e);
        }
      }

      setSavedUserEditRecord(updatedRec);
      setIsInlineEditing(false);
      toast.success("🎉 तुमची संपादित केलेली माहिती युझर अकाउंटसाठी यशस्वीरित्या सेव्ह झाली!");
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

  const handlePrintOrPdf = () => {
    window.print();
  };

  // Generate Multi-Subject Combined PDF
  const handleDownloadCombinedPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      toast.info("⚡ सर्व विषयांचे एकत्र (Combined) PDF तयार होत आहे...");

      const printElement = printContainerRef.current;
      if (!printElement) {
        toast.error("प्रिन्ट घटक उपलब्ध नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: `इयत्ता_${record?.classId || "1"}_संपूर्ण_वार्षिक_नियोजन_२०२६-२७.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: ["tr", "td", "th"] },
      };

      await (html2pdf() as any).from(printElement).set(opt).save();
      setIsGeneratingPdf(false);
      toast.success("🎉 सर्व विषयांचे एकत्र (Combined) PDF यशस्वीरित्या डाऊनलोड झाले!");
    } catch (err) {
      console.error("Combined PDF error:", err);
      setIsGeneratingPdf(false);
      toast.error("PDF डाऊनलोड करताना अडचण आली.");
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

  return (
    <div className="w-full space-y-5 print:p-0">
      {/* Top Controls & Subject Filter Selector */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4 print:hidden">
        {/* Subject Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 pr-2 border-r border-slate-200">
            <BookOpen className="size-4 text-indigo-600" /> विषय निवडा (Select Subject):
          </span>

          <button
            onClick={() => setSelectedSubjectFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              selectedSubjectFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-105"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
          >
            <Globe className="size-3.5" />
            <span>🌐 सर्व विषय एकत्र (All Combined)</span>
          </button>

          {availableSubjectNames.map((sName) => (
            <button
              key={sName}
              onClick={() => setSelectedSubjectFilter(sName)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedSubjectFilter === sName
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
              <span>✏️ तुम्ही संपादन केलेले नियोजन (तुमच्या युझर अकाउंटसाठी जतन केले आहे)</span>
            </div>
            <button
              onClick={handleResetToOriginal}
              className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-800 rounded-xl text-[11px] font-black border border-amber-300 transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="size-3.5 text-amber-600" />
              <span>🔄 मूळ फाईलवर जा</span>
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
            {/* Inline Editing Controls */}
            {isInlineEditing ? (
              <>
                <button
                  onClick={handleSaveUserEdits}
                  disabled={isSavingEdits}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-600/30 active:scale-95 disabled:opacity-50"
                >
                  {isSavingEdits ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  <span>💾 SAVE (सेव्ह करा)</span>
                </button>

                <button
                  onClick={() => handleAddRow(selectedSubjectFilter === "all" ? "मराठी" : selectedSubjectFilter)}
                  className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200 active:scale-95"
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
              <>
                <button
                  onClick={handleDownloadCombinedPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                  <span>📥 COMBINED PDF DOWNLOAD</span>
                </button>

                <button
                  onClick={handleStartInlineEditing}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 border border-slate-700"
                  title="थेट तक्ता एडिट करा"
                >
                  <Edit3 className="size-4 text-amber-300" />
                  <span>✏️ EDIT (संपादन करा)</span>
                </button>

                <button
                  onClick={handlePrintOrPdf}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300"
                >
                  <Printer className="size-4 text-slate-600" />
                  <span>PRINT / PDF</span>
                </button>
              </>
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
            {record?.planningType === "question_bank" || (record as any)?.category === "prashnapedhi" ? (
              <>
                <div className="border-b-2 border-slate-900 pb-5 space-y-2 text-center">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                    {record?.fileName || "प्रश्नपेढी"}
                  </h2>
                  <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                    <span className="bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      इयत्ता: <strong>{record?.classId || "—"}</strong>
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">
                      विषय: <strong>{record?.subjectId || "—"}</strong>
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
                        <div className="bg-slate-900 text-amber-300 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs">
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
                              <tr className="bg-slate-900 text-amber-300 font-black" style={{ backgroundColor: "#0f172a" }}>
                                {Array.from({ length: columnCount }).map((_, colIndex) => (
                                  <th
                                    key={colIndex}
                                    className="border border-slate-700 p-3 text-center font-black align-middle text-xs tracking-wider uppercase bg-slate-900 text-amber-300 whitespace-pre-wrap min-w-[110px]"
                                    style={{ backgroundColor: "#0f172a", color: "#fde047", border: "1px solid #334155" }}
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
                {/* Header Title Card */}
                <div className="border-b-2 border-slate-900 pb-5 space-y-2 text-center">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {parsedWorkbook?.classTitle || `इयत्ता : ${record?.classId || "१ ली"} संपूर्ण वार्षिक नियोजन सन २०२६-२७`}
                  </h2>
                  <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 flex-wrap">
                    <span className="bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                      माध्यम: <strong>मराठी</strong>
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">
                      विषय पर्याय: <strong>{selectedSubjectFilter === "all" ? "सर्व विषय एकत्र" : selectedSubjectFilter}</strong>
                    </span>
                  </div>
                </div>

                {/* EDIT MODE NOTICE BANNER */}
                {isInlineEditing && (
                  <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2.5 font-black text-xs sm:text-sm">
                      <Edit3 className="size-5 text-amber-200 animate-bounce" />
                      <span>✏️ तक्ता संपादन पद्धत चालू आहे - सर्व माहिती थेट एडिट करा व सेव्ह करा</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveUserEdits}
                        disabled={isSavingEdits}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-1.5 border border-amber-400/40"
                      >
                        {isSavingEdits ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        <span>💾 सेव्ह करा</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Render Selected Subject Sections */}
                {sectionsToRender.length > 0 ? (
                  sectionsToRender.map((sec, secIdx) => {
                    const filteredRows = sec.rows.filter((row) => {
                      if (!searchQuery.trim() || isInlineEditing) return true;
                      const q = searchQuery.toLowerCase().trim();
                      return row.some((c) => (c || "").toLowerCase().includes(q));
                    });

                    const categoryHeaders =
                      DEFAULT_HEADERS[record?.category || "varshik_niyojan"] ||
                      DEFAULT_HEADERS.varshik_niyojan;

                    return (
                      <div key={secIdx} className="space-y-4 page-break-after">
                        {/* Subject Banner Header */}
                        <div className="bg-slate-900 text-amber-300 px-5 py-3 rounded-2xl flex items-center justify-between shadow-xs print:bg-slate-900 print:text-amber-300">
                          <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="size-4 text-emerald-400" />
                            <span>{sec.displaySubjectName || `विषय : ${sec.subjectName}`}</span>
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
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "7%" }} />
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "9%" }} />
                              <col style={{ width: "40%" }} />
                              <col style={{ width: "21%" }} />
                              {isInlineEditing && <col style={{ width: "5%" }} />}
                            </colgroup>
                            <thead>
                              <tr className="bg-slate-900 text-amber-300 font-black text-center text-xs border-b-2 border-slate-900" style={{ backgroundColor: "#0f172a" }}>
                                {categoryHeaders.map((hText: string, i: number) => {
                                  return (
                                    <th
                                      key={i}
                                      className="border border-slate-700 p-2.5 text-center font-black tracking-wider uppercase bg-slate-900 text-amber-300 text-xs shadow-xs"
                                      style={{ backgroundColor: "#0f172a", color: "#fde047", border: "1px solid #334155" }}
                                    >
                                      {i === 4 ? `विषय : ${sec.subjectName}` : hText}
                                    </th>
                                  );
                                })}
                                {isInlineEditing && (
                                  <th className="border border-slate-700 p-2.5 text-center bg-slate-900 text-amber-300 text-xs">
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
                                    className={`hover:bg-indigo-50/40 transition-colors ${
                                      rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                                    }`}
                                  >
                                    {isInlineEditing ? (
                                      <>
                                        {/* Editable Month */}
                                        <td className="border border-slate-300 p-1.5 align-top">
                                          <input
                                            type="text"
                                            value={r[0] || ""}
                                            onChange={(e) => handleCellChange(sec.subjectName, rIdx, 0, e.target.value)}
                                            placeholder="महिना"
                                            className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                          />
                                        </td>
                                        {/* Editable Weeks */}
                                        <td className="border border-slate-300 p-1.5 align-top">
                                          <input
                                            type="text"
                                            value={r[1] || ""}
                                            onChange={(e) => handleCellChange(sec.subjectName, rIdx, 1, e.target.value)}
                                            placeholder="आठवडा"
                                            className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                          />
                                        </td>
                                        {/* Editable Days */}
                                        <td className="border border-slate-300 p-1.5 align-top">
                                          <input
                                            type="text"
                                            value={r[2] || ""}
                                            onChange={(e) => handleCellChange(sec.subjectName, rIdx, 2, e.target.value)}
                                            placeholder="दिवस"
                                            className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                          />
                                        </td>
                                        {/* Editable Periods */}
                                        <td className="border border-slate-300 p-1.5 align-top">
                                          <input
                                            type="text"
                                            value={r[3] || ""}
                                            onChange={(e) => handleCellChange(sec.subjectName, rIdx, 3, e.target.value)}
                                            placeholder="तासिका"
                                            className="w-full p-2 text-xs font-bold text-center border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                          />
                                        </td>
                                        {/* Editable Topics */}
                                        <td className="border border-slate-300 p-1.5 align-top">
                                          <AutoHeightTextarea
                                            value={r[4] || ""}
                                            onChange={(val) => handleCellChange(sec.subjectName, rIdx, 4, val)}
                                            placeholder="घटकांचे नाव व सविस्तर स्पष्टीकरण..."
                                          />
                                        </td>
                                        {/* Editable Outcomes */}
                                        <td className="border border-slate-300 p-1.5 align-top">
                                          <AutoHeightTextarea
                                            value={r[5] || ""}
                                            onChange={(val) => handleCellChange(sec.subjectName, rIdx, 5, val)}
                                            placeholder="अध्ययन निष्पत्ती..."
                                          />
                                        </td>
                                        {/* Delete Row Action */}
                                        <td className="border border-slate-300 p-1.5 align-middle text-center">
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
                                      categoryHeaders.map((_: string, cIdx: number) => {
                                        return (
                                          <td
                                            key={cIdx}
                                            className={`border border-slate-300 p-2.5 align-top text-slate-900 leading-relaxed ${
                                              cIdx <= 3 ? "text-center font-bold" : "text-left whitespace-pre-line"
                                            }`}
                                          >
                                            {r[cIdx] || "-"}
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
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs">
                    कोणताही विषय डेटा उपलब्ध नाही.
                  </div>
                )}

                {/* Footer Signature Bar */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 text-center text-xs font-black text-slate-900">
                  <div>वर्ग शिक्षक / विषय शिक्षक स्वाक्षरी</div>
                  <div>मुख्याध्यापक स्वाक्षरी व शिक्का</div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
