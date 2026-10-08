import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Eye,
  Edit3,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Download,
  Printer,
  Plus,
  Trash2,
  Eraser,
  Loader2,
  AlertCircle,
  FileText,
  Building2,
  Type,
  Bold,
  GraduationCap,
  X,
  Check,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { showToast as toast } from "@/lib/custom-toast";
import type {
  DocumentModel,
  DocumentPage,
  DocumentTextBlock,
  QuestionPaperHeaderData,
  UserDocumentEdits,
} from "@/types/documentEditor";
import {
  loadDocumentModel,
  createDefaultFallbackModel,
  detectPageHeaderBox,
  loadUserDocumentEdits,
  saveUserDocumentEdits,
  resetUserDocumentEdits,
  exportDocumentToPdf,
  printDocument,
} from "@/services/documentEngine";
import { decodeMarathiLegacyText } from "@/services/marathiFontDecoder";
import {
  getUnifiedSchoolProfile,
  fetchUnifiedSchoolProfile,
  saveUnifiedSchoolProfile,
} from "@/utils/schoolProfileHelper";

interface DocumentEditorViewerProps {
  documentId: string;
  fileUrl: string;
  fileName?: string;
  wordFileUrl?: string;
  wordFileName?: string;
  documentType: "question_paper" | "homework";
  title?: string;
  userId?: string;
  userRole?: string;
  userName?: string;
  canEdit?: boolean;
  onBack?: () => void;
  metadataBadge?: React.ReactNode;
}

export function DocumentEditorViewer({
  documentId,
  fileUrl,
  fileName = "document.pdf",
  wordFileUrl,
  wordFileName,
  documentType,
  title,
  userId = "guest_user",
  userRole = "teacher",
  userName,
  canEdit = true,
  onBack,
  metadataBadge,
}: DocumentEditorViewerProps) {
  // Document Loading State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [docModel, setDocModel] = useState<DocumentModel | null>(null);

  // User Edits & State
  const [pagesState, setPagesState] = useState<DocumentPage[]>([]);
  const [hasUserEdits, setHasUserEdits] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // View / Edit Mode
  const [mode, setMode] = useState<"view" | "edit">("view");

  // Zoom & Navigation
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [activeEditingBlockId, setActiveEditingBlockId] = useState<string | null>(null);

  // Helper to read question paper school name specifically saved by this user
  const getUserSavedQPSchool = (uid?: string): string => {
    if (!uid || typeof window === "undefined") return "";
    try {
      const saved = localStorage.getItem(`user_question_paper_school_${uid}`);
      if (saved && saved.trim() && !saved.includes("___")) return saved.trim();
    } catch (e) { }
    return "";
  };

  /** 
   * Helper to apply school name cleanly across all pages in the document:
   * - If a page has a school name prompt (शाळेचे नाव / शाळा / SCHOOL NAME) in the header region (y < 35%),
   *   replace it with the user's school name, stretching across the full dotted line area with
   *   a solid white background so all underlying dotted lines are completely masked.
   * - If a page does NOT have a school name prompt (e.g. continuation pages),
   *   leave that page completely untouched (NO school name added).
   */
  const applySchoolNameToDocumentPages = (
    pages: DocumentPage[],
    schoolName: string
  ): { updatedPages: DocumentPage[]; affectedCount: number } => {
    if (!pages || pages.length === 0) return { updatedPages: pages, affectedCount: 0 };
    const cleanSchoolName = schoolName
      .replace(/^(?:शाळेचे नाव|शाळा नाव|school name)\s*[:-]?\s*/i, "")
      .trim();
    if (!cleanSchoolName) return { updatedPages: pages, affectedCount: 0 };

    let affectedCount = 0;
    let anyHeaderFound = false;

    const updatedPages = pages.map((page) => {
      const blocks = [...page.textBlocks];

      // Find if this page has a school name block in the header area (top 35%)
      let targetIdx = blocks.findIndex((b) => {
        const t = (b.text || "").toLowerCase();
        return (
          (t.includes("शाळेचे नाव") ||
            t.includes("शाळेचे  नाव") ||
            t.includes("शाळा नाव")) &&
          (b.y || 0) < 35
        );
      });

      if (targetIdx === -1) {
        targetIdx = blocks.findIndex((b) => {
          const t = (b.text || "").toLowerCase();
          return (
            (t.includes("school name") ||
              t.includes("name of school") ||
              (t.includes("school") && (b.y || 0) < 20)) &&
            (b.y || 0) < 35
          );
        });
      }

      if (targetIdx === -1) {
        targetIdx = blocks.findIndex((b) => {
          const t = (b.text || "").toLowerCase();
          return (
            (t.includes("शाळेचे") || t.includes("शाळा")) &&
            (b.y || 0) < 35
          );
        });
      }

      if (targetIdx === -1) {
        targetIdx = blocks.findIndex((b) => {
          const t = (b.text || "").toLowerCase();
          const hasDashes = /[-_.~=—–•\.]{3,}/.test(t);
          return hasDashes && (b.y || 0) < 15;
        });
      }

      // If this page does NOT have a school name section, DO NOT add one!
      if (targetIdx === -1) {
        return page;
      }

      anyHeaderFound = true;
      affectedCount++;
      const origTarget = blocks[targetIdx];
      const isEnglish = (origTarget.text || "").toLowerCase().includes("school");
      const fullText = isEnglish
        ? `SCHOOL NAME : ${cleanSchoolName}`
        : `शाळेचे नाव : ${cleanSchoolName}`;

      // Match font size as per that page's original header font size (typically 20-21px)
      const pageHeaderFontSize = Math.max(origTarget.fontSize || 20, 18);
      let fitFontSize = pageHeaderFontSize;
      if (fullText.length > 55) {
        fitFontSize = Math.round(pageHeaderFontSize * 0.75);
      } else if (fullText.length > 44) {
        fitFontSize = Math.round(pageHeaderFontSize * 0.85);
      } else if (fullText.length > 36) {
        fitFontSize = Math.round(pageHeaderFontSize * 0.92);
      }

      const startX = origTarget.x;
      const startY = origTarget.y;
      // Stretch to cover right border of inner box completely (~92%)
      const newWidth = Math.max(origTarget.width, origTarget.origWidth || 0, 92.0 - startX);
      // Height spans down to ~8.9% to fully cover Line 1 AND Line 2 of dotted lines
      const newHeight = Math.min(
        Math.max(origTarget.height, origTarget.origHeight || 0, 4.5),
        9.0 - startY
      );

      const nextBlocks = blocks.filter((b) => b.id !== "custom_filled_school_name");
      const filteredTargetIdx = nextBlocks.findIndex((b) => b.id === origTarget.id);
      const useIdx = filteredTargetIdx !== -1 ? filteredTargetIdx : targetIdx;

      nextBlocks[useIdx] = {
        ...origTarget,
        text: fullText,
        width: newWidth,
        height: newHeight,
        origWidth: Math.max(origTarget.origWidth || origTarget.width, newWidth),
        origHeight: Math.max(origTarget.origHeight || origTarget.height, newHeight),
        fontSize: fitFontSize,
        fontWeight: "bold",
        color: "#0f172a",
        isEdited: true,
        isErased: false,
      };

      // Erase any secondary dashed line text blocks nearby on this page if present
      nextBlocks.forEach((b, idx) => {
        if (idx !== useIdx) {
          const isNearY = b.y >= startY - 0.5 && b.y <= startY + 4.5;
          const isOnlyDashes = /^[\s\-_.~=—–•\.]+$/.test(b.text || "");
          if (isNearY && isOnlyDashes) {
            nextBlocks[idx] = {
              ...b,
              text: "",
              isEdited: true,
              isErased: true,
            };
          }
        }
      });

      return {
        ...page,
        textBlocks: nextBlocks,
      };
    });

    // Only if NO page in the entire document had any school name block, fallback to Page 1 top header
    if (!anyHeaderFound && updatedPages.length > 0) {
      const page0 = { ...updatedPages[0] };
      const fallbackBlock: DocumentTextBlock = {
        id: "custom_filled_school_name",
        text: `शाळेचे नाव : ${cleanSchoolName}`,
        x: 10,
        y: 4.5,
        width: 82,
        height: 4.5,
        origWidth: 82,
        origHeight: 4.5,
        fontSize: 20,
        fontWeight: "bold",
        color: "#0f172a",
        fontFamily: "Noto Sans Devanagari, sans-serif",
        editable: true,
        isCustom: true,
      };
      (fallbackBlock as any).isEdited = true;
      page0.textBlocks = [
        ...page0.textBlocks.filter((b) => b.id !== "custom_filled_school_name"),
        fallbackBlock,
      ];
      updatedPages[0] = page0;
      affectedCount = 1;
    }

    return { updatedPages, affectedCount };
  };

  // Question Paper Header Details & School Name Modal
  const [showFillSchoolModal, setShowFillSchoolModal] = useState<boolean>(false);
  const [headerData, setHeaderData] = useState<QuestionPaperHeaderData | null>(null);

  // Compute smart initial defaults based on title and user
  const computeInitialHeader = (initialSchool?: string): QuestionPaperHeaderData => {
    let guessedClass = "१ ली";
    if (title?.includes("२ री") || title?.includes("2nd")) guessedClass = "२ री";
    else if (title?.includes("३ री") || title?.includes("3rd")) guessedClass = "३ री";
    else if (title?.includes("४ थी") || title?.includes("4th")) guessedClass = "४ थी";
    else if (title?.includes("५ वी") || title?.includes("5th")) guessedClass = "५ वी";
    else if (title?.includes("६ वी") || title?.includes("6th")) guessedClass = "६ वी";
    else if (title?.includes("७ वी") || title?.includes("7th")) guessedClass = "७ वी";
    else if (title?.includes("८ वी") || title?.includes("8th")) guessedClass = "८ वी";

    let guessedSubject = "भाषा";
    if (title?.includes("गणित") || title?.toLowerCase().includes("math")) guessedSubject = "गणित";
    else if (title?.includes("इंग्रजी") || title?.toLowerCase().includes("eng")) guessedSubject = "इंग्रजी";
    else if (title?.includes("परिसर अभ्यास")) guessedSubject = "परिसर अभ्यास";
    else if (title?.includes("मराठी")) guessedSubject = "भाषा";

    let guessedExam = "आकारिक मूल्यमापन चाचणी क्र. १";
    if (title?.includes("चाचणी २") || title?.includes("unit2")) guessedExam = "आकारिक मूल्यमापन चाचणी क्र. २";
    else if (title?.includes("संकलित") && (title?.includes("२") || title?.includes("2"))) guessedExam = "संकलित मूल्यमापन चाचणी २";
    else if (title?.includes("संकलित")) guessedExam = "संकलित मूल्यमापन चाचणी १";
    else if (title?.includes("सत्र")) guessedExam = "द्वितीय सत्र परीक्षा";

    const sName = initialSchool || getUserSavedQPSchool(userId) || getUnifiedSchoolProfile()?.schoolName || "जिल्हा परिषद शाळा धोंडेवाडी";

    return {
      schoolName: sName,
      examTitle: guessedExam,
      className: guessedClass,
      subjectName: guessedSubject,
      totalMarks: "२०",
      studentName: "_____________________",
      rollNo: "",
      examDate: "दि.   /   / २०२६",
      obtainedMarks: "",
      enabled: true,
    };
  };

  const [editingHeaderPageIndex, setEditingHeaderPageIndex] = useState<number | null>(null);

  const [headerForm, setHeaderForm] = useState<QuestionPaperHeaderData>(() => {
    return computeInitialHeader();
  });

  const [fillSchoolNameInput, setFillSchoolNameInput] = useState<string>(() => {
    return getUserSavedQPSchool(userId);
  });
  const [schoolNameInput, setSchoolNameInput] = useState<string>(() => {
    return getUserSavedQPSchool(userId);
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Synchronize modal input with user-specific saved school name or header data
  useEffect(() => {
    if (showFillSchoolModal) {
      if (
        editingHeaderPageIndex !== null &&
        pagesState[editingHeaderPageIndex]?.headerBoxData
      ) {
        setHeaderForm({ ...pagesState[editingHeaderPageIndex].headerBoxData! });
      } else if (headerData) {
        setHeaderForm({ ...headerData });
      } else {
        const saved = getUserSavedQPSchool(userId);
        setHeaderForm(computeInitialHeader(saved || ""));
      }
    }
  }, [showFillSchoolModal, editingHeaderPageIndex, userId]);

  // Load Document & Merged User Edits
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Load base document model
        const model = await loadDocumentModel(fileUrl, documentId, fileName);
        if (!isMounted) return;

        // 2. Load user-specific edits if any
        let mergedPages = [...model.pages];
        let editsFound = false;
        let loadedUserEdits: UserDocumentEdits | null = null;

        if (userId) {
          loadedUserEdits = await loadUserDocumentEdits(documentType, documentId, userId);
          if (loadedUserEdits && loadedUserEdits.pages && loadedUserEdits.pages.length > 0) {
            mergedPages = model.pages.map((p) => {
              const editedPage = loadedUserEdits!.pages.find((ep) => ep.pageNumber === p.pageNumber);
              if (editedPage && editedPage.textBlocks) {
                const modifiedBlocks = editedPage.textBlocks.filter(
                  (b) => b.isEdited || b.isCustom || b.isErased
                );
                if (modifiedBlocks.length > 0) {
                  editsFound = true;
                  // Overlay modified blocks onto the fresh base model blocks
                  const baseBlocks = p.textBlocks.map((baseB) => {
                    const matched = modifiedBlocks.find((mb) => mb.id === baseB.id);
                    return matched || baseB;
                  });
                  const customBlocks = modifiedBlocks.filter((mb) => mb.isCustom);
                  return {
                    ...p,
                    headerBoxData: editedPage.headerBoxData || p.headerBoxData,
                    textBlocks: [
                      ...baseBlocks,
                      ...customBlocks.filter((cb) => !baseBlocks.some((bb) => bb.id === cb.id)),
                    ],
                  };
                }
              }
              return p;
            });
          }
        }

        // Only inject if THIS user has previously filled & saved their school name.
        // Firstly it stays blank until the user fills it.
        let activeSchoolName = getUserSavedQPSchool(userId);
        if (!activeSchoolName && userId && userId !== "guest_teacher") {
          try {
            const { db } = await import("@/lib/firebase");
            const { doc, getDoc } = await import("firebase/firestore");
            const userDocRef = doc(db, "users", userId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const qpName = userSnap.data()?.questionPaperSchoolName;
              if (qpName && typeof qpName === "string" && qpName.trim() && !qpName.includes("___")) {
                activeSchoolName = qpName.trim();
                localStorage.setItem(`user_question_paper_school_${userId}`, activeSchoolName);
              }
            }
          } catch (e) { }
        }

        if (activeSchoolName) {
          setFillSchoolNameInput(activeSchoolName);
          setSchoolNameInput(activeSchoolName);

          const { updatedPages } = applySchoolNameToDocumentPages(mergedPages, activeSchoolName);
          mergedPages = updatedPages;
        }

        // Restore or initialize Header Box Data
        let restoredHeader: QuestionPaperHeaderData | null = null;
        if (loadedUserEdits?.headerBoxData) {
          restoredHeader = loadedUserEdits.headerBoxData;
        } else {
          try {
            const savedLocalHdr = localStorage.getItem(`user_qp_header_${userId}_${documentId}`);
            if (savedLocalHdr) {
              restoredHeader = JSON.parse(savedLocalHdr);
            }
          } catch (e) { }
        }

        if (!restoredHeader && documentType === "question_paper") {
          restoredHeader = computeInitialHeader(activeSchoolName);
        }

        const effectiveSchoolName = activeSchoolName || restoredHeader?.schoolName;

        // Detect and populate headerBoxData across ALL pages of the PDF ONLY for question papers
        if (documentType === "question_paper") {
          mergedPages = mergedPages.map((page, pIdx) => {
            let pHeader: QuestionPaperHeaderData | undefined =
              page.headerBoxData || detectPageHeaderBox(page, effectiveSchoolName) || undefined;
            if (pIdx === 0 && !pHeader && restoredHeader) {
              pHeader = restoredHeader;
            }

            if (pHeader) {
              const finalSchool = effectiveSchoolName || pHeader.schoolName;
              pHeader = {
                ...pHeader,
                schoolName: finalSchool,
                rollNo: restoredHeader?.rollNo || pHeader.rollNo || "",
                obtainedMarks: restoredHeader?.obtainedMarks || pHeader.obtainedMarks || "",
                studentName:
                  restoredHeader?.studentName && restoredHeader.studentName !== "_____________________"
                    ? restoredHeader.studentName
                    : pHeader.studentName,
                examDate: restoredHeader?.examDate || pHeader.examDate,
                enabled: true,
              };

              return {
                ...page,
                headerBoxData: pHeader,
                textBlocks: page.textBlocks.map((b) => {
                  if ((b.y || 0) < 26) {
                    return { ...b, text: "", isEdited: true, isErased: true };
                  }
                  return b;
                }),
              };
            }
            return page;
          });

          if (mergedPages.length > 0 && mergedPages[0].headerBoxData) {
            setHeaderData(mergedPages[0].headerBoxData);
            setHeaderForm(mergedPages[0].headerBoxData);
            if (mergedPages[0].headerBoxData.schoolName) {
              setFillSchoolNameInput(mergedPages[0].headerBoxData.schoolName);
            }
          }
        } else {
          // For homework or other documents, ensure no question paper header box is present
          mergedPages = mergedPages.map((page) => ({
            ...page,
            headerBoxData: undefined,
          }));
          setHeaderData(null);
        }

        if (isMounted) {
          setDocModel(model);
          setPagesState(mergedPages);
          setHasUserEdits(editsFound);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn("Document viewer loading fallback:", err);
        if (isMounted) {
          try {
            const fallbackModel = createDefaultFallbackModel(fileUrl, documentId, fileName);
            setDocModel(fallbackModel);
            setPagesState(fallbackModel.pages);
            setLoading(false);
          } catch (fbErr) {
            setError(
              err?.message ||
              "कागदपत्र उघडताना त्रुटी आली. कृपया फाईल उपलब्ध असल्याची खात्री करा."
            );
            setLoading(false);
          }
        }
      }
    }

    if (fileUrl) {
      loadData();
    } else {
      setError("कागदपत्राची URL उपलब्ध नाही (Missing file URL).");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [fileUrl, documentId, fileName, userId, documentType]);

  // Zoom Controls
  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.15, 0.5));
  const handleResetZoom = () => setZoomScale(1);

  // Jump to page
  const scrollToPage = (pageNum: number) => {
    setCurrentPageNum(pageNum);
    const targetEl = pageRefs.current.get(pageNum);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Update text of a block (handles editing, erasing, and whiteout)
  const handleUpdateBlockText = (pageIndex: number, blockId: string, newText: string) => {
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      page.textBlocks = page.textBlocks.map((b) => {
        if (b.id === blockId) {
          const isErased = newText.trim() === "";
          const origW = b.origWidth || b.width;
          let calculatedWidth = origW;
          if (newText && page.width > 0) {
            try {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (ctx) {
                const isBold = b.fontWeight === "bold" || (typeof b.fontWeight === "number" && b.fontWeight >= 600);
                ctx.font = `${isBold ? "bold" : "normal"} ${b.fontSize || 12}px "Noto Sans Devanagari", sans-serif`;
                const measuredWidthPt = ctx.measureText(newText).width;
                const newWidthPct = Number(((measuredWidthPt / page.width) * 100).toFixed(2));
                calculatedWidth = Math.max(origW, newWidthPct);
              }
            } catch (_err) {
              const oldLen = Math.max(1, (b.text || "").length);
              calculatedWidth = Math.max(origW, origW * (newText.length / oldLen));
            }
          }
          return {
            ...b,
            text: newText,
            width: calculatedWidth,
            isEdited: true,
            isErased,
            origWidth: origW,
            origHeight: b.origHeight || b.height,
          };
        }
        return b;
      });
      nextPages[pageIndex] = page;
      return nextPages;
    });
  };

  // Update specific formatting property of a block (font size, weight, color)
  const handleUpdateBlockProp = (
    pageIndex: number,
    blockId: string,
    updates: Partial<DocumentTextBlock>
  ) => {
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      page.textBlocks = page.textBlocks.map((b) => {
        if (b.id === blockId) {
          return {
            ...b,
            ...updates,
            isEdited: true,
          };
        }
        return b;
      });
      nextPages[pageIndex] = page;
      return nextPages;
    });
  };

  // Add custom overlay text block at coordinate or default
  const handleAddCustomBlockAt = (pageIndex: number, x: number = 10, y: number = 15) => {
    const newId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      const newBlock: DocumentTextBlock = {
        id: newId,
        text: "येथे मजकूर लिहा",
        x,
        y,
        width: 45,
        height: 4.5,
        origWidth: 45,
        origHeight: 4.5,
        fontSize: 14,
        fontFamily: "Noto Sans Devanagari, sans-serif",
        fontWeight: "600",
        color: "#0f172a",
        editable: true,
        isCustom: true,
        isEdited: true,
        isErased: false,
      };
      page.textBlocks = [...page.textBlocks, newBlock];
      nextPages[pageIndex] = page;
      return nextPages;
    });
    setActiveEditingBlockId(newId);
    toast.success("नवीन मजकूर ब्लॉक जोडला गेला!");
  };

  // Add dedicated whiteout eraser block to cleanly cover any area
  const handleAddWhiteoutBlockAt = (pageIndex: number, x: number = 10, y: number = 20) => {
    const newId = `whiteout_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      const newBlock: DocumentTextBlock = {
        id: newId,
        text: "",
        x,
        y,
        width: 35,
        height: 4,
        origWidth: 35,
        origHeight: 4,
        fontSize: 14,
        fontFamily: "Noto Sans Devanagari, sans-serif",
        fontWeight: "600",
        color: "#0f172a",
        editable: true,
        isCustom: true,
        isEdited: true,
        isErased: true,
      };
      page.textBlocks = [...page.textBlocks, newBlock];
      nextPages[pageIndex] = page;
      return nextPages;
    });
    setActiveEditingBlockId(newId);
    toast.success("व्हाईटआऊट खोडरबर जोडला! (Whiteout Eraser added)");
  };

  // Delete text block (custom blocks or revert edited blocks)
  const handleDeleteBlock = (pageIndex: number, blockId: string) => {
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      page.textBlocks = page.textBlocks.filter((b) => b.id !== blockId);
      nextPages[pageIndex] = page;
      return nextPages;
    });
    if (activeEditingBlockId === blockId) {
      setActiveEditingBlockId(null);
    }
  };

  // Revert a single block back to its original admin text
  const handleRevertBlock = (pageIndex: number, blockId: string) => {
    if (!docModel) return;
    const originalPage = docModel.pages[pageIndex];
    const origBlock = originalPage?.textBlocks.find((b) => b.id === blockId);

    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      if (origBlock) {
        page.textBlocks = page.textBlocks.map((b) =>
          b.id === blockId ? { ...origBlock, isEdited: false, isErased: false } : b
        );
      } else {
        page.textBlocks = page.textBlocks.filter((b) => b.id !== blockId);
      }
      nextPages[pageIndex] = page;
      return nextPages;
    });
    setActiveEditingBlockId(null);
    toast.info("मजकूर मूळ स्थितीत परत आणला.");
  };

  // Dedicated Fill School Name: Automatically fits school name and exam details into header box
  const handleFillSchoolName = () => {
    if (pagesState.length === 0) return;
    const cleanSchoolName = (headerForm.schoolName || "")
      .replace(/^(?:शाळेचे नाव|शाळा नाव|school name)\s*[:-]?\s*/i, "")
      .trim();

    const finalHeader: QuestionPaperHeaderData = {
      ...headerForm,
      schoolName: cleanSchoolName || "जिल्हा परिषद शाळा धोंडेवाडी",
      enabled: true,
    };

    setHeaderData(finalHeader);
    setFillSchoolNameInput(cleanSchoolName);

    // Remember for this user specifically
    if (userId) {
      try {
        if (cleanSchoolName) {
          localStorage.setItem(`user_question_paper_school_${userId}`, cleanSchoolName);
        }
        localStorage.setItem(`user_qp_header_${userId}_${documentId}`, JSON.stringify(finalHeader));
      } catch (e) { }

      if (userId !== "guest_teacher" && cleanSchoolName) {
        try {
          import("@/lib/firebase").then(({ db }) => {
            import("firebase/firestore").then(({ doc, setDoc }) => {
              const userDocRef = doc(db, "users", userId);
              setDoc(
                userDocRef,
                { questionPaperSchoolName: cleanSchoolName },
                { merge: true }
              ).catch((err) =>
                console.warn("Save questionPaperSchoolName notice:", err)
              );
            });
          });
        } catch (e) { }
      }
      if (cleanSchoolName) {
        saveUnifiedSchoolProfile({ schoolName: cleanSchoolName });
      }
    }

    setPagesState((prevPages) => {
      return prevPages.map((page, pIdx) => {
        let pHeader: QuestionPaperHeaderData | undefined =
          page.headerBoxData || detectPageHeaderBox(page, cleanSchoolName) || undefined;

        if (pHeader || pIdx === 0) {
          const base = pHeader || finalHeader;
          const isTargetPage =
            editingHeaderPageIndex === null
              ? pIdx === 0
              : pIdx === editingHeaderPageIndex;

          const updatedHeader: QuestionPaperHeaderData = isTargetPage
            ? { ...finalHeader, isEnglish: base.isEnglish }
            : {
                ...base,
                schoolName: finalHeader.schoolName,
                studentName: finalHeader.studentName,
                rollNo: finalHeader.rollNo,
                obtainedMarks: finalHeader.obtainedMarks,
                examDate: finalHeader.examDate,
                enabled: true,
              };

          return {
            ...page,
            headerBoxData: updatedHeader,
            textBlocks: page.textBlocks.map((b) => {
              if ((b.y || 0) < 26) {
                return {
                  ...b,
                  text: "",
                  isEdited: true,
                  isErased: true,
                };
              }
              return b;
            }),
          };
        }
        return page;
      });
    });

    setHasUserEdits(true);
    setShowFillSchoolModal(false);
    toast.success("शाळेचे नाव व परीक्षेचा सर्व तपशील सर्व पानांवरील बॉक्समध्ये व्यवस्थित बसवला!");
  };

  // Revert / Clear custom filled school name across all pages
  const handleClearFilledSchoolName = () => {
    if (userId) {
      try {
        localStorage.removeItem(`user_question_paper_school_${userId}`);
        localStorage.removeItem(`user_qp_header_${userId}_${documentId}`);
      } catch (e) { }
      if (userId !== "guest_teacher") {
        try {
          import("@/lib/firebase").then(({ db }) => {
            import("firebase/firestore").then(({ doc, updateDoc, deleteField }) => {
              const userDocRef = doc(db, "users", userId);
              updateDoc(userDocRef, { questionPaperSchoolName: deleteField() }).catch(() => { });
            });
          });
        } catch (e) { }
      }
    }
    setFillSchoolNameInput("");
    setHeaderData(null);

    if (pagesState.length === 0 || !docModel) {
      setShowFillSchoolModal(false);
      return;
    }

    setPagesState((prevPages) => {
      return prevPages.map((page, pIdx) => {
        const originalPage = docModel.pages[pIdx];
        if (page.headerBoxData) {
          return {
            ...page,
            headerBoxData: undefined,
            textBlocks: originalPage?.textBlocks || page.textBlocks,
          };
        }
        return page;
      });
    });

    setShowFillSchoolModal(false);
    toast.info("शाळेचे नाव व तपशील पूर्ववत करण्यात आले.");
  };

  // Save Edits (User specific)
  const handleSaveEdits = async () => {
    if (!userId) {
      toast.error("वापरकर्ता ओळख पटलेली नाही (Please log in to save edits).");
      return;
    }
    try {
      setIsSaving(true);
      const userPagesPayload = pagesState.map((p) => ({
        pageNumber: p.pageNumber,
        textBlocks: p.textBlocks.filter(
          (b) => b.isCustom || (b as any).isEdited || (b as any).isErased
        ),
        headerBoxData: p.headerBoxData,
      }));

      await saveUserDocumentEdits(
        documentType,
        documentId,
        userId,
        userPagesPayload,
        userRole,
        userName,
        headerData || undefined
      );

      setHasUserEdits(true);
      toast.success("आपले बदल यशस्वीरित्या जतन झाले!");
    } catch (err: any) {
      console.error("Save edits error:", err);
      toast.error(err?.message || "बदल जतन करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original admin document
  const handleResetToOriginal = async () => {
    if (
      !window.confirm(
        "तुम्हाला खात्री आहे का? आपले सर्व बदल रद्द होऊन ॲडमिनचे मूळ कागदपत्र पुनर्संचयित होईल."
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);
      if (userId) {
        await resetUserDocumentEdits(documentType, documentId, userId);
      }
      if (docModel) {
        setPagesState(docModel.pages);
      }
      setHasUserEdits(false);
      setActiveEditingBlockId(null);
      toast.success("मूळ कागदपत्र पुनर्संचयित केले गेले!");
    } catch (err: any) {
      console.error("Reset error:", err);
      toast.error("पुनर्संचयित करताना त्रुटी आली.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Helper to generate a clean, meaningful filename for downloaded PDFs
   * using the question paper's actual class, subject, and exam title.
   */
  const getProperDownloadFileName = (): string => {
    let cleanTitle = (title || "").trim();
    cleanTitle = cleanTitle.replace(/\.(pdf|docx|doc)$/i, "").trim();

    const isTechnicalName =
      !cleanTitle ||
      /^clean_\d+/i.test(cleanTitle) ||
      /^edited_pdf_/i.test(cleanTitle) ||
      /^doc_\d+/i.test(cleanTitle) ||
      cleanTitle.toLowerCase().includes("pdf_pages_");

    if (!isTechnicalName) {
      let safeName = cleanTitle.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
      if (documentType === "question_paper" && !safeName.includes("प्रश्नपत्रिका")) {
        safeName += " - प्रश्नपत्रिका";
      } else if (documentType === "homework" && !safeName.includes("गृहपाठ")) {
        safeName += " - गृहपाठ";
      }
      return safeName;
    }

    // Fallback: extract intelligent metadata from Page 1 text blocks
    if (pagesState && pagesState.length > 0) {
      const page1 = pagesState[0];
      const blocks = page1.textBlocks || [];

      const classBlock = blocks.find((b) => {
        const t = (b.text || "").toLowerCase();
        return (t.includes("इयत्ता") || t.includes("std")) && (b.y || 0) < 30;
      });

      const subjectBlock = blocks.find((b) => {
        const t = (b.text || "").toLowerCase();
        return (t.includes("विषय") || t.includes("sub")) && (b.y || 0) < 30;
      });

      const examBlock = blocks.find((b) => {
        const t = (b.text || "").toLowerCase();
        return (
          (t.includes("चाचणी") ||
            t.includes("मूल्यमापन") ||
            t.includes("evaluation") ||
            t.includes("test")) &&
          (b.y || 0) < 30
        );
      });

      const parts: string[] = [];
      if (classBlock?.text) {
        parts.push(classBlock.text.replace(/[:\-_]/g, " ").replace(/\s+/g, " ").trim());
      }
      if (subjectBlock?.text) {
        parts.push(subjectBlock.text.replace(/[:\-_]/g, " ").replace(/\s+/g, " ").trim());
      }
      if (examBlock?.text) {
        parts.push(examBlock.text.replace(/[:\-_]/g, " ").replace(/\s+/g, " ").trim());
      }

      if (parts.length > 0) {
        let assembled = parts.join(" - ");
        if (documentType === "question_paper" && !assembled.includes("प्रश्नपत्रिका")) {
          assembled += " - प्रश्नपत्रिका";
        } else if (documentType === "homework" && !assembled.includes("गृहपाठ")) {
          assembled += " - गृहपाठ";
        }
        return assembled.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
      }
    }

    return documentType === "question_paper"
      ? "इयत्ता १ ली प्रश्नपत्रिका"
      : "स्वाध्याय गृहपाठ";
  };

  // PDF Export
  const handleDownloadPdf = async () => {
    if (!docModel) return;
    try {
      setIsExporting(true);
      toast.info("PDF तयार होत आहे, कृपया प्रतीक्षा करा...");
      const downloadName = getProperDownloadFileName();
      const exportModel: DocumentModel = {
        ...docModel,
        fileName: downloadName,
        documentType,
        pages: pagesState.map((p) => ({
          ...p,
          headerBoxData: documentType === "question_paper" ? p.headerBoxData : undefined,
        })),
        headerBoxData: documentType === "question_paper" ? (headerData || undefined) : undefined,
      };
      await exportDocumentToPdf(exportModel, downloadName);
      toast.success("PDF यशस्वीरित्या डाउनलोड झाली!");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("PDF डाउनलोड करताना त्रुटी आली.");
    } finally {
      setIsExporting(false);
    }
  };

  // Print
  const handlePrint = () => {
    if (!docModel) return;
    const downloadName = getProperDownloadFileName();
    const printModel: DocumentModel = {
      ...docModel,
      fileName: downloadName,
      documentType,
      pages: pagesState.map((p) => ({
        ...p,
        headerBoxData: documentType === "question_paper" ? p.headerBoxData : undefined,
      })),
      headerBoxData: documentType === "question_paper" ? (headerData || undefined) : undefined,
    };
    printDocument(printModel);
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="size-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold text-slate-800">
          {documentType === "question_paper"
            ? "प्रश्नपत्रिका लोड होत आहे..."
            : "गृहपाठ लोड होत आहे..."}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          मूळ डिझाइन, चित्रे व फॉन्ट अचूकतेने तयार केले जात आहेत.
        </p>
      </div>
    );
  }

  // Error State
  if (error || !docModel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-red-50/50 rounded-3xl border border-red-200">
        <AlertCircle className="size-12 text-red-500 mb-3" />
        <h3 className="text-base font-bold text-red-800">कागदपत्र लोड करण्यात त्रुटी</h3>
        <p className="text-xs text-red-600 mt-1 max-w-md">{error}</p>
        <div className="flex items-center gap-3 mt-5 flex-wrap justify-center">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              थेट फाईल उघडा (Open Document)
            </a>
          )}
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              मागे जा
            </button>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all cursor-pointer"
          >
            पुन्हा लोड करा
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden text-slate-100 font-sans">
      {/* Top Header & Toolbar */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Left: Document Info */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shrink-0 cursor-pointer"
              title="मागे जा (Back)"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-indigo-400 shrink-0" />
              <h2 className="text-sm sm:text-base font-black text-white truncate max-w-xs sm:max-w-md">
                {title || fileName}
              </h2>
              {hasUserEdits && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold shrink-0">
                  संपादित आवृत्ती (Edited)
                </span>
              )}
            </div>
            {metadataBadge && <div className="mt-0.5">{metadataBadge}</div>}
          </div>
        </div>

        {/* Center / Right: Interactive Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Mode Switcher */}
          {canEdit && (
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => {
                  setMode("view");
                  setActiveEditingBlockId(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mode === "view"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                <Eye className="size-3.5" />
                <span>पहा (View)</span>
              </button>
              <button
                onClick={() => setMode("edit")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mode === "edit"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                <Edit3 className="size-3.5" />
                <span>संपादित करा (Edit)</span>
              </button>
            </div>
          )}

          {/* Fill School Name Tab Button (only for question papers) */}
          {canEdit && documentType === "question_paper" && (
            <button
              onClick={() => {
                const curIdx = Math.max(0, currentPageNum - 1);
                const targetIdx = pagesState[curIdx]?.headerBoxData ? curIdx : 0;
                setEditingHeaderPageIndex(targetIdx);
                const targetHeader = pagesState[targetIdx]?.headerBoxData || headerData || computeInitialHeader();
                setHeaderForm({ ...targetHeader });
                setShowFillSchoolModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow-emerald-500/20 transition-all cursor-pointer border border-emerald-400/40 active:scale-95"
              title="प्रश्नपत्रिकेवर 'शाळेचे नाव' पुढे आपल्या शाळेचे नाव व्यवस्थित बसवा"
            >
              <GraduationCap className="size-3.5 text-emerald-100" />
              <span>शाळेचे नाव भरा (Fill School Name)</span>
            </button>
          )}



          {/* Zoom Buttons */}
          <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 px-1 py-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all cursor-pointer"
              title="झूम कमी करा"
            >
              <ZoomOut className="size-4" />
            </button>
            <span
              onClick={handleResetZoom}
              className="px-2 text-xs font-bold text-slate-300 cursor-pointer hover:text-white"
              title="रीसेट झूम"
            >
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all cursor-pointer"
              title="झूम वाढवा"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>

          {/* Page Navigator */}
          {pagesState.length > 1 && (
            <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 px-2 py-1 gap-1 text-xs">
              <button
                disabled={currentPageNum <= 1}
                onClick={() => scrollToPage(currentPageNum - 1)}
                className="p-1 disabled:opacity-30 hover:text-white text-slate-400 transition-all cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="font-bold text-slate-300">
                {currentPageNum} / {pagesState.length}
              </span>
              <button
                disabled={currentPageNum >= pagesState.length}
                onClick={() => scrollToPage(currentPageNum + 1)}
                className="p-1 disabled:opacity-30 hover:text-white text-slate-400 transition-all cursor-pointer"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}

          {/* Actions: Save, Reset, Print, Download */}
          <div className="flex items-center gap-1.5">
            {canEdit && mode === "edit" && (
              <button
                onClick={handleSaveEdits}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                <span>सेव्ह (Save)</span>
              </button>
            )}

            {hasUserEdits && (
              <button
                onClick={handleResetToOriginal}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="मूळ स्वरूपात परत आणा (Reset to original admin document)"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">मूळ प्रत (Reset)</span>
              </button>
            )}



            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              title="PDF डाउनलोड करा (Download)"
            >
              {isExporting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span className="hidden sm:inline">डाउनलोड (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode Sub-banner info */}
      {mode === "edit" && (
        <div className="bg-amber-600/15 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-amber-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Edit3 className="size-4 shrink-0 text-amber-400" />
            <span>
              <strong>थेट संपादन (Direct In-Place Edit):</strong> कागदावरील कोणत्याही मजकुरावर क्लिक करून तिथेच थेट टाईप करा. बाहेर क्लिक करताच बदल लागू होतील.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddWhiteoutBlockAt(currentPageNum - 1)}
              className="flex items-center gap-1 px-3 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              title="कागदावरील कोणताही मजकूर किंवा भाग खोडण्यासाठी व्हाईटआऊट खोडरबर वापरा"
            >
              <Eraser className="size-3.5" />
              <span>+ व्हाईटआऊट खोडरबर (+ Eraser)</span>
            </button>
            <button
              onClick={() => handleAddCustomBlockAt(currentPageNum - 1, 10, 20)}
              className="flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>मजकूर जोडा (+ Add Text)</span>
            </button>
          </div>
        </div>
      )}

      {/* Pages Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center gap-8 bg-slate-900/90 custom-scrollbar max-h-[calc(100vh-12rem)]"
      >
        {pagesState.map((page, pageIdx) => {
          const isLandscape = page.width > page.height;
          const baseWidth = isLandscape ? 900 : 720;
          const displayWidth = Math.round(baseWidth * zoomScale);
          const displayHeight = Math.round((page.height / page.width) * displayWidth);

          return (
            <div
              key={page.pageNumber}
              ref={(el) => {
                if (el) pageRefs.current.set(page.pageNumber, el);
                else pageRefs.current.delete(page.pageNumber);
              }}
              onClick={() => {
                // Clicking empty space on page closes active editing box
                if (activeEditingBlockId) {
                  setActiveEditingBlockId(null);
                }
              }}
              onDoubleClick={(e) => {
                // Double clicking anywhere on page directly adds a new text block at that spot
                if (mode === "edit") {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                  const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                  handleAddCustomBlockAt(
                    pageIdx,
                    Math.max(4, Math.min(80, clickX)),
                    Math.max(2, Math.min(94, clickY))
                  );
                }
              }}
              className="relative bg-white shadow-2xl rounded-xl overflow-hidden transition-all select-text"
              style={{
                width: `${displayWidth}px`,
                height: `${displayHeight}px`,
                minWidth: `${displayWidth}px`,
                minHeight: `${displayHeight}px`,
              }}
            >
              {page.backgroundUrl ? (
                <img
                  src={page.backgroundUrl}
                  alt={`Page ${page.pageNumber}`}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
                />
              ) : (
                <div className="absolute inset-0 bg-white flex flex-col p-6 pointer-events-none select-none">
                  <div className="border-b-2 border-amber-300 pb-2 mb-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800">
                      📝 {title || "दैनिक स्वाध्याय कार्यपत्रिका"}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      पृष्ठ {page.pageNumber}
                    </span>
                  </div>
                  <div className="flex-1 w-full space-y-7 opacity-25">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div key={i} className="border-b border-dashed border-slate-300 w-full" />
                    ))}
                  </div>
                </div>
              )}

              {/* Text Overlays Layer */}
              <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto">
                {/* 🎯 QUESTION PAPER HEADER BOX (EXACT MATCH WITH SCREENSHOT 1 & 3) */}
                {Boolean(
                  documentType === "question_paper" &&
                  ((page.headerBoxData && page.headerBoxData.enabled !== false) ||
                    (page.pageNumber === 1 &&
                      headerData &&
                      headerData.enabled !== false))
                ) &&
                  (() => {
                    const hb = page.headerBoxData || headerData!;
                    if (hb.enabled === false) return null;
                    const isEng = Boolean(hb.isEnglish);
                    const pageScale = page.width > 0 ? displayWidth / page.width : zoomScale;

                    return (
                      <React.Fragment key={`qp-header-box-layer-${page.pageNumber}`}>
                        {/* 1. MASK OUT THE ENTIRE BACKSIDES BOX FROM THE BACKGROUND IMAGE */}
                        <div
                          className="absolute z-25 bg-white pointer-events-none"
                          style={{
                            left: "2.0%",
                            top: "0.5%",
                            width: "96.0%",
                            height: "25.5%",
                          }}
                        />

                        {/* 2. THE CLEAN RECTANGULAR HEADER BOX (EXACT SCREENSHOT 1 & 3 SPEC) */}
                        <div
                          className="absolute z-35 bg-white border-2 border-slate-900 rounded-none p-2.5 sm:p-3 text-slate-900 shadow-none select-none transition-none"
                          style={{
                            left: "4.0%",
                            top: "1.6%",
                            width: "92.0%",
                            minHeight: "22.6%",
                            fontFamily: isEng
                              ? "system-ui, -apple-system, sans-serif"
                              : "'Noto Sans Devanagari', -apple-system, sans-serif",
                            boxSizing: "border-box",
                          }}
                          onClick={(e) => {
                            if (mode === "edit") {
                              e.stopPropagation();
                              setEditingHeaderPageIndex(pageIdx);
                              setHeaderForm({ ...hb });
                              setShowFillSchoolModal(true);
                            }
                          }}
                        >
                          {/* Top Right Edit Button in Edit Mode */}
                          {mode === "edit" && (
                            <div className="absolute top-1.5 right-1.5 z-40">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingHeaderPageIndex(pageIdx);
                                  setHeaderForm({ ...hb });
                                  setShowFillSchoolModal(true);
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs cursor-pointer"
                                title="तपशील संपादित करा"
                              >
                                <Edit3 className="size-3" />
                                <span>बदला (Edit)</span>
                              </button>
                            </div>
                          )}

                          {/* Line 1: School Name */}
                          <div
                            className="font-black text-slate-900 tracking-tight flex items-baseline gap-2 mb-1"
                            style={{ fontSize: `${Math.max(13, Math.round(18 * pageScale))}px` }}
                          >
                            <span className="shrink-0 font-black">
                              {isEng ? "SCHOOL NAME -" : "शाळेचे नाव :"}
                            </span>
                            <span className="text-slate-950 font-black">
                              {hb.schoolName || "____________________________________"}
                            </span>
                          </div>

                          {/* Line 2: Exam Title (Centered, bold) */}
                          <div
                            className="text-center font-black text-slate-900 tracking-wide my-1 uppercase"
                            style={{ fontSize: `${Math.max(12, Math.round(16 * pageScale))}px` }}
                          >
                            <h2>{hb.examTitle || (isEng ? "FORMATIVE EVALUATION TEST 1" : "आकारिक मूल्यमापन चाचणी क्र. १")}</h2>
                          </div>

                          {/* Line 3: Class, Subject, Total Marks (3 columns) */}
                          <div
                            className="flex items-center justify-between font-bold mt-2 pt-1 border-t border-slate-200 uppercase"
                            style={{ fontSize: `${Math.max(11, Math.round(13.5 * pageScale))}px` }}
                          >
                            <div>
                              <span>{isEng ? "STD – " : "इयत्ता - "}</span>
                              <span className="font-black">{hb.className || (isEng ? "1" : "१ ली")}</span>
                            </div>
                            <div className="text-center">
                              <span>{isEng ? "SUB – " : "विषय - "}</span>
                              <span className="font-black">{hb.subjectName || (isEng ? "MATH" : "भाषा")}</span>
                            </div>
                            <div className="text-right">
                              <span>{isEng ? "TOTAL MARKS - " : "एकूण गुण - "}</span>
                              <span className="font-black">{hb.totalMarks || (isEng ? "20" : "२०")}</span>
                            </div>
                          </div>

                          {/* Line 4: Student Name & Roll No */}
                          <div
                            className="flex items-center justify-between font-semibold mt-2"
                            style={{ fontSize: `${Math.max(10, Math.round(12.5 * pageScale))}px` }}
                          >
                            <div className="flex-1 flex items-center gap-1.5">
                              <span className="font-bold">
                                {isEng ? "STUDENT NAME :" : "विद्यार्थ्याचे नाव :-"}
                              </span>
                              <span className="flex-1 border-b border-slate-900 inline-block min-w-[120px] max-w-[280px] font-bold px-1 text-slate-950">
                                {hb.studentName && hb.studentName !== "_____________________" ? hb.studentName : ""}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pl-3 shrink-0">
                              <span className="font-bold">
                                {isEng ? "ROLL NO.-" : "हजेरी क्रमांक -"}
                              </span>
                              <div
                                className="border-2 border-slate-900 rounded-sm flex items-center justify-center font-black bg-white"
                                style={{
                                  width: `${Math.max(26, Math.round(28 * pageScale))}px`,
                                  height: `${Math.max(26, Math.round(28 * pageScale))}px`,
                                  fontSize: `${Math.max(11, Math.round(12 * pageScale))}px`,
                                }}
                              >
                                {hb.rollNo}
                              </div>
                            </div>
                          </div>

                          {/* Line 5: Date & Marks Obtained */}
                          <div
                            className="flex items-center justify-between font-semibold mt-2"
                            style={{ fontSize: `${Math.max(10, Math.round(12.5 * pageScale))}px` }}
                          >
                            <div className="font-bold">
                              {hb.examDate || (isEng ? "DATE -   /   / 2026" : "दि.   /   / २०२६")}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold">
                                {isEng ? "OBTAINED MARKS-" : "मिळालेले गुण -"}
                              </span>
                              <div
                                className="border-2 border-slate-900 rounded-sm flex items-center justify-center font-black bg-white"
                                style={{
                                  width: `${Math.max(26, Math.round(28 * pageScale))}px`,
                                  height: `${Math.max(26, Math.round(28 * pageScale))}px`,
                                  fontSize: `${Math.max(11, Math.round(12 * pageScale))}px`,
                                }}
                              >
                                {hb.obtainedMarks}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })()}

                {page.textBlocks.map((block) => {
                  const hasActiveHeader = Boolean(
                    documentType === "question_paper" &&
                    ((page.headerBoxData && page.headerBoxData.enabled !== false) ||
                      (page.pageNumber === 1 &&
                        headerData &&
                        headerData.enabled !== false))
                  );
                  if (hasActiveHeader && (block.y || 0) < 26) {
                    return null;
                  }

                  const isEditing = activeEditingBlockId === block.id && mode === "edit";
                  const isErased = Boolean(
                    (block as any).isErased || ((block as any).isEdited && !block.text?.trim())
                  );
                  const isModified = Boolean(
                    block.isCustom || (block as any).isEdited || isErased
                  );

                  // In view mode: if not modified and background exists, don't render anything (prevents double text)
                  if (mode === "view" && page.backgroundUrl && !isModified) {
                    return null;
                  }

                  const isSchoolBlock =
                    (block.text || "").includes("शाळेचे नाव") ||
                    (block.text || "").includes("SCHOOL NAME") ||
                    block.id === "custom_filled_school_name";
                  const isMultiLine = Boolean(block.text && block.text.includes("\n"));
                  const isSingleLine = !isMultiLine;
                  const isSingleWord = isSingleLine && !(block.text || "").trim().includes(" ");

                  const origW = block.origWidth || block.width;
                  const origH = block.origHeight || block.height;
                  const blockWidthPct = isSchoolBlock
                    ? Math.max(block.width, origW, 92.0 - block.x)
                    : Math.max(block.width, origW);
                  const blockHeightPct = isSchoolBlock
                    ? Math.max(block.height, origH, 4.5)
                    : Math.max(block.height, origH);

                  // Scale font size strictly according to the page's actual rendering scale so that edited text remains the exact same font size as the original text on that page
                  const pageScale = page.width > 0 ? displayWidth / page.width : zoomScale;
                  const baseFontSize = block.fontSize || (isSchoolBlock ? 20 : 14);
                  const renderedFontSize = Math.max(11, Math.round(baseFontSize * pageScale));

                  // Vertical offset: PDF.js y starts too high (-fontSize), which causes text to hit the top box border.
                  // Shifting y down by ~0.22 * fontSize centers the text vertically in its box and stops the white mask from cutting the top border!
                  const pageHeight = page.height || 792;
                  const yOffsetPct = isSingleLine && !isSchoolBlock
                    ? ((baseFontSize * 0.22) / pageHeight) * 100
                    : 0;
                  const renderTopPct = block.y + (isModified || isEditing ? yOffsetPct : 0);

                  // Horizontal centering for standalone words inside boxes / columns
                  const origCenterXPct = (block.origX ?? block.x) + (origW / 2);
                  const renderLeftPct = isModified && isSingleWord && !isSchoolBlock && block.width > origW
                    ? Math.max(block.x - ((block.width - origW) / 2), origCenterXPct - (block.width / 2))
                    : block.x;

                  return (
                    <div
                      key={block.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mode === "edit" && !isEditing) {
                          setActiveEditingBlockId(block.id);
                        }
                      }}
                      className={`doc-text-block-item absolute transition-none ${isEditing
                        ? "bg-white z-40 ring-2 ring-blue-500 rounded-xs shadow-xs"
                        : isModified
                          ? "bg-white z-30 rounded-xs cursor-pointer"
                          : mode === "edit"
                            ? "hover:ring-1 hover:ring-blue-400 hover:bg-blue-400/10 cursor-text z-20 rounded-xs"
                            : "z-10"
                        }`}
                      style={{
                        left: `${renderLeftPct}%`,
                        top: `${renderTopPct}%`,
                        width: isMultiLine ? `${blockWidthPct}%` : "max-content",
                        minWidth: isEditing
                          ? `${Math.max(blockWidthPct, 8)}%`
                          : isModified
                            ? `${Math.max(blockWidthPct, origW)}%`
                            : "16px",
                        minHeight: isMultiLine ? `${blockHeightPct}%` : undefined,
                        maxWidth: `${Math.min(96, 98 - renderLeftPct)}%`,
                        fontSize: `${renderedFontSize}px`,
                        fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif",
                        fontWeight: block.fontWeight || "600",
                        color: block.color || "#0f172a",
                        lineHeight: 1.15,
                        backgroundColor:
                          isModified || isEditing ? "#ffffff" : "transparent",
                        boxShadow: isEditing ? "0 0 0 2px #3b82f6" : undefined,
                        display: isSingleWord ? "inline-flex" : undefined,
                        alignItems: isSingleWord ? "center" : undefined,
                        justifyContent: isSingleWord ? "center" : undefined,
                      }}
                    >
                      {isEditing ? (
                        /* DIRECT SEAMLESS IN-PLACE EDITING (NO POPUP CARD, NO BUTTONS) */
                        <div className="relative w-full h-full bg-white">
                          <textarea
                            autoFocus
                            rows={Math.max(1, (block.text || "").split("\n").length)}
                            value={block.text || ""}
                            placeholder="येथे मजकूर टाईप करा..."
                            onChange={(e) =>
                              handleUpdateBlockText(pageIdx, block.id, e.target.value)
                            }
                            onBlur={() => setActiveEditingBlockId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setActiveEditingBlockId(null);
                              }
                              if (e.key === "Enter" && !e.shiftKey && !isMultiLine) {
                                e.preventDefault();
                                setActiveEditingBlockId(null);
                              }
                            }}
                            className="w-full h-full bg-white text-slate-900 border-none outline-none p-0 m-0 resize-none font-inherit selection:bg-blue-200"
                            style={{
                              fontSize: "inherit",
                              fontFamily: "inherit",
                              fontWeight: "inherit",
                              lineHeight: 1.15,
                              color: block.color || "#0f172a",
                              backgroundColor: "#ffffff",
                              display: "block",
                              whiteSpace: isMultiLine ? "pre-wrap" : "nowrap",
                              overflow: "hidden",
                              textAlign: isSingleWord ? "center" : "left",
                            }}
                          />
                        </div>
                      ) : isModified ? (
                        /* MODIFIED TEXT DIRECTLY ON THE SHEET OVER SOLID WHITE BACKING (NO UNDERLYING TEXT VISIBLE) */
                        <div className="relative group px-1 bg-white w-full h-full leading-tight flex items-center justify-center">
                          {isErased ? (
                            <span className="block text-slate-300 text-[10px] italic select-none">
                              {mode === "edit" ? "(खोडून टाकले)" : ""}
                            </span>
                          ) : (
                            <span
                              className={`block ${
                                !isMultiLine
                                  ? "whitespace-nowrap"
                                  : "whitespace-pre-wrap break-words"
                              } ${isSingleWord ? "text-center" : ""}`}
                            >
                              {block.text}
                            </span>
                          )}
                          {mode === "edit" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                block.isCustom
                                  ? handleDeleteBlock(pageIdx, block.id)
                                  : handleRevertBlock(pageIdx, block.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 -right-2.5 p-0.5 bg-slate-700 hover:bg-slate-900 text-white rounded-full shadow-xs z-30"
                              title={block.isCustom ? "हटवा" : "मूळ मजकूर परत आणा"}
                            >
                              <RotateCcw className="size-2.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* UNEDITED BLOCK: INVISIBLE HOTSPOT DIRECTLY ON SHEET */
                        <div
                          className={`w-full h-full min-h-[16px] transition-all rounded ${mode === "edit"
                            ? "hover:border hover:border-amber-400 hover:bg-amber-400/20 cursor-text"
                            : ""
                            }`}
                          title={mode === "edit" ? "बदलण्यासाठी येथे क्लिक करा" : undefined}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Page Number Label Watermark */}
              <div className="absolute bottom-2 right-3 z-20 pointer-events-none opacity-40 text-[10px] font-mono text-slate-500">
                पृष्ठ {page.pageNumber} / {pagesState.length}
              </div>
            </div>
          );
        })}
      </div>



      {/* Fill School Name & Exam Details Modal (All 9 Fields from Header Box) */}
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
                onClick={handleClearFilledSchoolName}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                title="पूर्वी भरलेली माहिती पूर्ववत करा"
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
                  onClick={handleFillSchoolName}
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
