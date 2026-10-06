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
} from "@/types/documentEditor";
import {
  loadDocumentModel,
  createDefaultFallbackModel,
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

  // Fill School Name Modal
  const [showFillSchoolModal, setShowFillSchoolModal] = useState<boolean>(false);
  // Firstly keep it blank! After user fills it, it will be remembered for that user
  const [fillSchoolNameInput, setFillSchoolNameInput] = useState<string>(() => {
    return getUserSavedQPSchool(userId);
  });
  const [schoolNameInput, setSchoolNameInput] = useState<string>(() => {
    return getUserSavedQPSchool(userId);
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Synchronize modal input with user-specific saved school name (stays blank if never filled)
  useEffect(() => {
    if (showFillSchoolModal) {
      const saved = getUserSavedQPSchool(userId);
      setFillSchoolNameInput(saved || "");
    }
  }, [showFillSchoolModal, userId]);

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

        if (userId) {
          const userEdits = await loadUserDocumentEdits(documentType, documentId, userId);
          if (userEdits && userEdits.pages && userEdits.pages.length > 0) {
            mergedPages = model.pages.map((p) => {
              const editedPage = userEdits.pages.find((ep) => ep.pageNumber === p.pageNumber);
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
          return {
            ...b,
            text: newText,
            isEdited: true,
            isErased,
            origWidth: b.origWidth || b.width,
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

  // Dedicated Fill School Name: Automatically fits school name properly across all pages containing school header
  const handleFillSchoolName = () => {
    if (pagesState.length === 0) return;
    const trimmedName = fillSchoolNameInput.trim();
    if (!trimmedName) {
      toast.error("कृपया शाळेचे नाव प्रविष्ट करा.");
      return;
    }

    const cleanSchoolName = trimmedName
      .replace(/^(?:शाळेचे नाव|शाळा नाव|school name)\s*[:-]?\s*/i, "")
      .trim();

    setPagesState((prevPages) => {
      const { updatedPages } = applySchoolNameToDocumentPages(prevPages, cleanSchoolName);
      return updatedPages;
    });

    // Remember for this user specifically
    if (userId) {
      try {
        localStorage.setItem(`user_question_paper_school_${userId}`, cleanSchoolName);
      } catch (e) { }

      if (userId !== "guest_teacher") {
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
    }

    saveUnifiedSchoolProfile({ schoolName: cleanSchoolName });
    setHasUserEdits(true);
    setShowFillSchoolModal(false);
    toast.success("शाळेचे नाव जिथे आवश्यक आहे तिथे व्यवस्थित बसवले!");
  };

  // Revert / Clear custom filled school name across all pages
  const handleClearFilledSchoolName = () => {
    if (userId) {
      try {
        localStorage.removeItem(`user_question_paper_school_${userId}`);
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

    if (pagesState.length === 0 || !docModel) {
      setShowFillSchoolModal(false);
      return;
    }

    setPagesState((prevPages) => {
      return prevPages.map((page, pIdx) => {
        const originalPage = docModel.pages[pIdx];
        let blocks = page.textBlocks.filter((b) => b.id !== "custom_filled_school_name");

        blocks = blocks.map((b) => {
          if (
            b.isEdited &&
            (b.text?.includes("शाळेचे नाव") ||
              b.text?.includes("शाळा") ||
              b.text?.includes("SCHOOL NAME"))
          ) {
            const origBlock = originalPage?.textBlocks.find((ob) => ob.id === b.id);
            if (origBlock) {
              return { ...origBlock, isEdited: false, isErased: false };
            }
          }
          return b;
        });

        return {
          ...page,
          textBlocks: blocks,
        };
      });
    });

    setShowFillSchoolModal(false);
    toast.info("शाळेचे नाव पूर्ववत करण्यात आले.");
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
      }));

      await saveUserDocumentEdits(
        documentType,
        documentId,
        userId,
        userPagesPayload,
        userRole,
        userName
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
        pages: pagesState,
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
      pages: pagesState,
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

          {/* Fill School Name Tab Button */}
          {canEdit && (
            <button
              onClick={() => setShowFillSchoolModal(true)}
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
                {page.textBlocks.map((block) => {
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

                  const origW = block.origWidth || block.width;
                  const origH = block.origHeight || block.height;
                  const blockWidthPct = isSchoolBlock
                    ? Math.max(block.width, origW, 92.0 - block.x)
                    : Math.max(block.width, origW);
                  const blockHeightPct = isSchoolBlock
                    ? Math.max(block.height, origH, 4.5)
                    : Math.max(block.height, origH, 2.4);

                  // Scale font size strictly according to the page's actual rendering scale so that edited text remains the exact same font size as the original text on that page
                  const pageScale = page.width > 0 ? displayWidth / page.width : zoomScale;
                  const baseFontSize = block.fontSize || (isSchoolBlock ? 20 : 14);
                  const renderedFontSize = Math.max(11, Math.round(baseFontSize * pageScale));

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
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: `${blockWidthPct}%`,
                        minWidth: isEditing
                          ? `${Math.max(blockWidthPct, 15)}%`
                          : isModified
                            ? `${blockWidthPct}%`
                            : "20px",
                        minHeight: `${blockHeightPct}%`,
                        maxWidth: "96%",
                        fontSize: `${renderedFontSize}px`,
                        fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif",
                        fontWeight: block.fontWeight || "600",
                        color: block.color || "#0f172a",
                        lineHeight: 1.25,
                        backgroundColor:
                          isModified || isEditing ? "#ffffff" : "transparent",
                        boxShadow: isEditing ? "0 0 0 2px #3b82f6" : undefined,
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
                              if (e.key === "Enter" && !e.shiftKey && !(block.text || "").includes("\n")) {
                                e.preventDefault();
                                setActiveEditingBlockId(null);
                              }
                            }}
                            className="w-full h-full bg-white text-slate-900 border-none outline-none p-0 m-0 resize-none font-inherit leading-tight selection:bg-blue-200"
                            style={{
                              fontSize: "inherit",
                              fontFamily: "inherit",
                              fontWeight: "inherit",
                              lineHeight: 1.25,
                              color: block.color || "#0f172a",
                              backgroundColor: "#ffffff",
                              display: "block",
                            }}
                          />
                        </div>
                      ) : isModified ? (
                        /* MODIFIED TEXT DIRECTLY ON THE SHEET OVER SOLID WHITE BACKING (NO UNDERLYING TEXT VISIBLE) */
                        <div className="relative group px-0.5 bg-white w-full h-full min-h-[16px] leading-tight">
                          {isErased ? (
                            <span className="block text-slate-300 text-[10px] italic select-none">
                              {mode === "edit" ? "(खोडून टाकले)" : ""}
                            </span>
                          ) : (
                            <span
                              className={`block ${isSchoolBlock
                                ? "whitespace-nowrap"
                                : "whitespace-pre-wrap break-words"
                                }`}
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



      {/* Fill School Name Modal */}
      {showFillSchoolModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full text-slate-800 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                  <GraduationCap className="size-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 flex items-center gap-1.5">
                    <span>शाळेचे नाव भरा</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Auto-Fit
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    प्रश्नपत्रिकेवरील 'शाळेचे नाव' च्या पुढे शाळेचे नाव व्यवस्थित बसवून मूळ तुटक रेषा झाका.
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

            <div className="space-y-4">
              {/* Input for school name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 text-sm">
                  शाळेचे नाव (School Name):
                </label>
                <input
                  type="text"
                  value={fillSchoolNameInput}
                  onChange={(e) => setFillSchoolNameInput(e.target.value)}
                  placeholder="उदा. जिल्हा परिषद प्राथमिक शाळा..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFillSchoolName();
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-emerald-500/40 rounded-xl font-bold text-slate-900 text-sm outline-none focus:border-emerald-600 focus:bg-white shadow-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {fillSchoolNameInput
                    ? "✓ भरलेले शाळेचे नाव प्रश्नपत्रिकेवर १ ओळीत आपोआप व्यवस्थित (Auto-Fit) बसवले जाईल व कायम लक्षात ठेवले जाईल."
                    : "प्रथम रिक्त राहील. आपण एकदा शाळेचे नाव भरल्यास ते आपल्यासाठी कायम लक्षात ठेवले जाईल."}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClearFilledSchoolName}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                title="पूर्वी भरलेले शाळेचे नाव पूर्ववत करा"
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
                  <span>शाळेचे नाव बसवा (Fit School Name)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
