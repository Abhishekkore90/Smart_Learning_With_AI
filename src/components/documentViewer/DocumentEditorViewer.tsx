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
import { getUnifiedSchoolProfile } from "@/utils/schoolProfileHelper";

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

  // Quick School Header Customizer Modal
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState<boolean>(false);
  const [showFillSchoolModal, setShowFillSchoolModal] = useState<boolean>(false);
  const [fillSchoolNameInput, setFillSchoolNameInput] = useState<string>(() => {
    try {
      const uProfile = getUnifiedSchoolProfile();
      if (uProfile?.schoolName?.trim()) return uProfile.schoolName.trim();
    } catch (e) {}
    return userName ? `जि. प. प्राथमिक शाळा (${userName})` : "जिल्हा परिषद प्राथमिक शाळा";
  });
  const [fillSchoolFontSize, setFillSchoolFontSize] = useState<number>(15);
  const [fillSchoolPlacement, setFillSchoolPlacement] = useState<"full_line" | "infront">("full_line");
  const [hideSecondaryDashes, setHideSecondaryDashes] = useState<boolean>(true);
  const [schoolNameInput, setSchoolNameInput] = useState<string>(() => {
    try {
      const uProfile = getUnifiedSchoolProfile();
      if (uProfile?.schoolName?.trim()) return uProfile.schoolName.trim();
    } catch (e) {}
    return userName ? `जि. प. प्राथमिक शाळा (${userName})` : "जिल्हा परिषद प्राथमिक शाळा";
  });
  const [kendraInput, setKendraInput] = useState<string>("केंद्र शाळा");
  const [studentNameInput, setStudentNameInput] = useState<string>(
    "विद्यार्थ्याचे नाव: _________________________"
  );
  const [rollNoInput, setRollNoInput] = useState<string>("हजेरी क्र: ____");
  const [examDateInput, setExamDateInput] = useState<string>(
    new Date().toLocaleDateString("mr-IN")
  );
  const [totalMarksInput, setTotalMarksInput] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

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

        // Ensure all loaded text blocks (cached or new) are decoded to proper Marathi Unicode
        const cleanedPages = mergedPages.map((p) => ({
          ...p,
          textBlocks: (p.textBlocks || []).map((b) => ({
            ...b,
            text: decodeMarathiLegacyText(b.text || ""),
          })),
        }));

        if (isMounted) {
          setDocModel(model);
          setPagesState(cleanedPages);
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

  // Dedicated Fill School Name: Fits user's school name right in front of 'शाळेचे नाव' on Page 1
  const handleFillSchoolName = () => {
    if (pagesState.length === 0) return;
    const pageIdx = 0;
    const trimmedName = fillSchoolNameInput.trim();
    if (!trimmedName) {
      toast.error("कृपया शाळेचे नाव प्रविष्ट करा.");
      return;
    }

    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIdx] };
      const blocks = [...page.textBlocks];

      // 1. Search Page 1 for block matching "शाळेचे नाव"
      let targetIdx = blocks.findIndex((b) => {
        const t = (b.text || "").toLowerCase();
        return t.includes("शाळेचे नाव") || t.includes("शाळेचे  नाव") || t.includes("शाळा नाव");
      });

      if (targetIdx === -1) {
        targetIdx = blocks.findIndex((b) => {
          const t = (b.text || "").toLowerCase();
          return (t.includes("शाळेचे") || t.includes("शाळा") || t.includes("school")) && (b.y || 0) < 35;
        });
      }

      const customSchoolBlockId = "custom_filled_school_name";
      const filteredBlocks = blocks.filter((b) => b.id !== customSchoolBlockId);

      if (targetIdx !== -1) {
        const origTarget = filteredBlocks[targetIdx];
        const origText = origTarget.text || "";
        const hasDashes = /[-_.~=—–•\.]{2,}/.test(origText);

        if (fillSchoolPlacement === "full_line" || hasDashes) {
          // Replace this block directly with "शाळेचे नाव : [School Name]"
          // and expand its width and height to solidly cover the dotted line area
          const fullText = `शाळेचे नाव : ${trimmedName}`;
          const newWidth = Math.max(origTarget.width, origTarget.origWidth || 0, 78);
          const newHeight = Math.max(origTarget.height, origTarget.origHeight || 0, 4.4);

          filteredBlocks[targetIdx] = {
            ...origTarget,
            text: fullText,
            width: Math.min(newWidth, 94 - origTarget.x),
            height: newHeight,
            origWidth: Math.max(origTarget.origWidth || origTarget.width, newWidth),
            origHeight: Math.max(origTarget.origHeight || origTarget.height, newHeight),
            fontSize: fillSchoolFontSize || origTarget.fontSize || 15,
            fontWeight: "bold",
            color: "#0f172a",
            isEdited: true,
            isErased: false,
          };
        } else {
          // Option: Position right in front of "शाळेचे नाव"
          const labelWidth = Math.max(origTarget.width, 13);
          const startX = Math.min(origTarget.x + labelWidth + 0.8, 85);
          const availableW = Math.max(25, 93 - startX);
          const newHeight = Math.max(origTarget.height, 4.4);

          const newBlock: DocumentTextBlock = {
            id: customSchoolBlockId,
            text: trimmedName,
            x: Number(startX.toFixed(2)),
            y: origTarget.y,
            width: Number(availableW.toFixed(2)),
            height: newHeight,
            origWidth: availableW,
            origHeight: newHeight,
            fontSize: fillSchoolFontSize || origTarget.fontSize || 15,
            fontWeight: "bold",
            color: "#0f172a",
            fontFamily: "Noto Sans Devanagari, sans-serif",
            editable: true,
            isCustom: true,
          };
          (newBlock as any).isEdited = true;
          filteredBlocks.push(newBlock);
        }

        // Hide secondary dashed line blocks underneath if checked
        if (hideSecondaryDashes) {
          filteredBlocks.forEach((b, idx) => {
            if (idx !== targetIdx) {
              const isNearY = Math.abs(b.y - (origTarget.y + 2.5)) < 3.2;
              const isNearX = Math.abs(b.x - origTarget.x) < 30;
              const isOnlyDashes = /^[\s\-_.~=—–•\.]+$/.test(b.text || "");
              if (isNearY && isNearX && isOnlyDashes) {
                filteredBlocks[idx] = {
                  ...b,
                  text: "",
                  isEdited: true,
                  isErased: true,
                };
              }
            }
          });
        }
      } else {
        // Fallback: If no block matching "शाळेचे नाव" on Page 1, place at standard top header
        const fallbackBlock: DocumentTextBlock = {
          id: customSchoolBlockId,
          text: `शाळेचे नाव : ${trimmedName}`,
          x: 5,
          y: 3.2,
          width: 88,
          height: 4.5,
          origWidth: 88,
          origHeight: 4.5,
          fontSize: fillSchoolFontSize || 15,
          fontWeight: "bold",
          color: "#0f172a",
          fontFamily: "Noto Sans Devanagari, sans-serif",
          editable: true,
          isCustom: true,
        };
        (fallbackBlock as any).isEdited = true;
        filteredBlocks.push(fallbackBlock);
      }

      page.textBlocks = filteredBlocks;
      nextPages[pageIdx] = page;
      return nextPages;
    });

    setHasUserEdits(true);
    setShowFillSchoolModal(false);
    toast.success("शाळेचे नाव व्यवस्थित बसवण्यात आले! (School Name Fitted Properly)");
  };

  // Revert / Clear custom filled school name
  const handleClearFilledSchoolName = () => {
    if (pagesState.length === 0 || !docModel) return;
    const pageIdx = 0;
    const originalPage = docModel.pages[pageIdx];

    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIdx] };
      let blocks = page.textBlocks.filter((b) => b.id !== "custom_filled_school_name");

      blocks = blocks.map((b) => {
        if (b.isEdited && (b.text?.includes("शाळेचे नाव") || b.text?.includes("शाळा"))) {
          const origBlock = originalPage?.textBlocks.find((ob) => ob.id === b.id);
          if (origBlock) {
            return { ...origBlock, isEdited: false, isErased: false };
          }
        }
        return b;
      });

      page.textBlocks = blocks;
      nextPages[pageIdx] = page;
      return nextPages;
    });

    setShowFillSchoolModal(false);
    toast.info("शाळेचे नाव पूर्ववत करण्यात आले.");
  };

  // Apply School Header quickly to Page 1
  const handleApplySchoolHeader = () => {
    if (pagesState.length === 0) return;
    const pageIdx = 0;
    const headerId1 = "custom_school_name_header";
    const headerId2 = "custom_student_info_header";

    const line1Text = kendraInput.trim()
      ? `${schoolNameInput.trim()} • केंद्र: ${kendraInput.trim()}`
      : schoolNameInput.trim();

    const line2Parts: string[] = [];
    if (studentNameInput.trim()) line2Parts.push(studentNameInput.trim());
    if (rollNoInput.trim()) line2Parts.push(rollNoInput.trim());
    if (examDateInput.trim()) line2Parts.push(`दिनांक: ${examDateInput.trim()}`);
    if (totalMarksInput.trim()) line2Parts.push(`एकूण गुण: ${totalMarksInput.trim()}`);
    const line2Text = line2Parts.join("   |   ");

    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIdx] };
      const otherBlocks = page.textBlocks.filter(
        (b) => b.id !== headerId1 && b.id !== headerId2
      );

      const block1: DocumentTextBlock = {
        id: headerId1,
        text: line1Text,
        x: 4,
        y: 2,
        width: 92,
        height: 4.5,
        fontSize: 16,
        fontWeight: "800",
        color: "#0f172a",
        fontFamily: "Noto Sans Devanagari, sans-serif",
        editable: true,
        isCustom: true,
      };
      (block1 as any).isEdited = true;

      const block2: DocumentTextBlock = {
        id: headerId2,
        text: line2Text,
        x: 4,
        y: 6.8,
        width: 92,
        height: 3.8,
        fontSize: 13,
        fontWeight: "600",
        color: "#1e293b",
        fontFamily: "Noto Sans Devanagari, sans-serif",
        editable: true,
        isCustom: true,
      };
      (block2 as any).isEdited = true;

      page.textBlocks = [block1, block2, ...otherBlocks];
      nextPages[pageIdx] = page;
      return nextPages;
    });

    setShowSchoolHeaderModal(false);
    setMode("edit");
    toast.success("शाळेचे नाव व तपशील पहिल्या पानावर लागू झाले!");
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
        textBlocks: p.textBlocks,
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

  // PDF Export
  const handleDownloadPdf = async () => {
    if (!docModel) return;
    try {
      setIsExporting(true);
      toast.info("PDF तयार होत आहे, कृपया प्रतीक्षा करा...");
      const exportModel: DocumentModel = {
        ...docModel,
        pages: pagesState,
      };
      await exportDocumentToPdf(
        exportModel,
        fileName ? fileName.replace(/\.[^/.]+$/, "") + "_edited" : "document_edited"
      );
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
    const printModel: DocumentModel = {
      ...docModel,
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
          मूळ डिझाइन, चित्रे व फॉन्ट अचूकतेने तयार केले जात आहेत. (₹0 AI Cost)
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === "view"
                    ? "bg-indigo-600 text-white shadow-sm"
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

          {/* School Header Quick Customizer Button */}
          {canEdit && (
            <button
              onClick={() => setShowSchoolHeaderModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="शाळेचे नाव व तपशील बदला"
            >
              <Building2 className="size-3.5 text-blue-400" />
              <span className="hidden md:inline">इतर तपशील (Header)</span>
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
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="प्रिंट करा (Print)"
            >
              <Printer className="size-4" />
            </button>

            {wordFileUrl && (
              <a
                href={wordFileUrl}
                download={wordFileName || "question_paper.docx"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                title="Word (.docx) फाईल डाऊनलोड करा"
              >
                <FileText className="size-3.5" />
                <span className="hidden sm:inline">Word (.docx) डाउनलोड</span>
              </a>
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
                  const isErased = Boolean(block.isErased || (block.isEdited && !block.text?.trim()));
                  const isModified = Boolean(block.isCustom || block.isEdited || isErased);

                  // In view mode: if not modified and background exists, don't render anything
                  if (mode === "view" && page.backgroundUrl && !isModified) {
                    return null;
                  }

                  const origW = block.origWidth || block.width;
                  const origH = block.origHeight || block.height;
                  const maskW = Math.max(block.width, origW);
                  const maskH = Math.max(block.height, origH);

                  // Calculate exact font size scaled 1:1 with rendered PDF viewport
                  const scaleRatio = page.width > 0 ? displayWidth / page.width : zoomScale;
                  const exactFontSize = Math.max(8, Math.round((block.fontSize || 12) * scaleRatio));
                  const isBold =
                    block.fontWeight === "bold" ||
                    (typeof block.fontWeight === "number" && block.fontWeight >= 600) ||
                    block.fontWeight === "600" ||
                    block.fontWeight === "700";
                  const exactFontWeight = isBold ? "bold" : "normal";

                  // 1. ACTIVE EDITING BLOCK: Solid white background covering original sentence
                  if (isEditing) {
                    return (
                      <div
                        key={block.id}
                        className="doc-text-block-item absolute z-50 bg-white rounded-md shadow-2xl p-1.5"
                        style={{
                          left: `${block.x}%`,
                          top: `${block.y}%`,
                          width: `${Math.max(maskW, 20)}%`,
                          minHeight: `${Math.max(maskH, 3.2)}%`,
                          minWidth: "150px",
                          maxWidth: "96%",
                          backgroundColor: "#ffffff",
                          boxShadow: "0 0 0 3px #ffffff, 0 8px 24px rgba(0,0,0,0.25)",
                        }}
                      >
                        <div className="relative w-full h-full">
                          <textarea
                            autoFocus
                            rows={Math.max(1, (block.text || "").split("\n").length)}
                            value={block.text || ""}
                            placeholder="येथे नवीन मजकूर टाईप करा (किंवा खोडण्यासाठी रिक्त ठेवा)..."
                            onChange={(e) =>
                              handleUpdateBlockText(pageIdx, block.id, e.target.value)
                            }
                            onBlur={() => setActiveEditingBlockId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setActiveEditingBlockId(null);
                              }
                            }}
                            className="w-full bg-white text-slate-900 border-2 border-indigo-600 rounded outline-none p-1 resize-none font-sans"
                            style={{
                              fontSize: `${exactFontSize}px`,
                              fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif",
                              fontWeight: exactFontWeight,
                              lineHeight: 1.25,
                            }}
                          />
                          <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 gap-1 flex-wrap">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleUpdateBlockText(pageIdx, block.id, "");
                                  toast.success("मजकूर खोडला गेला! (Erased)");
                                }}
                                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                title="हा मजकूर खोडा (Erase text)"
                              >
                                <Trash2 className="size-3" />
                                <span>खोडा (Erase)</span>
                              </button>
                              {(block.isEdited || block.isCustom) && (
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    block.isCustom
                                      ? handleDeleteBlock(pageIdx, block.id)
                                      : handleRevertBlock(pageIdx, block.id);
                                    setActiveEditingBlockId(null);
                                  }}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                  title={block.isCustom ? "हटवा" : "मूळ मजकूर परत आणा"}
                                >
                                  <RotateCcw className="size-3" />
                                  <span>पूर्ववत (Revert)</span>
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setActiveEditingBlockId(null);
                              }}
                              className="px-3 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold shadow-sm cursor-pointer flex items-center gap-1"
                              title="बदल पूर्ण करा (Done)"
                            >
                              <Check className="size-3" />
                              <span>पूर्ण (Done)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. ERASED BLOCK: Solid white patch completely wiping out the underlying text
                  if (isErased) {
                    if (mode === "view") {
                      return (
                        <div
                          key={block.id}
                          className="absolute z-20 pointer-events-none"
                          style={{
                            left: `${block.x}%`,
                            top: `${block.y}%`,
                            width: `${maskW}%`,
                            height: `${maskH}%`,
                            backgroundColor: "#ffffff",
                            boxShadow: "0 0 0 3px #ffffff",
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEditingBlockId(block.id);
                        }}
                        className="absolute z-30 border border-dashed border-rose-400 hover:border-rose-600 rounded cursor-pointer group transition-all"
                        style={{
                          left: `${block.x}%`,
                          top: `${block.y}%`,
                          width: `${maskW}%`,
                          minHeight: `${Math.max(maskH, 2.5)}%`,
                          backgroundColor: "#ffffff",
                          boxShadow: "0 0 0 2px #ffffff",
                        }}
                        title="हा मजकूर खोडला आहे. नवीन मजकूर टाईप करण्यासाठी येथे क्लिक करा."
                      >
                        <div className="flex items-center justify-between px-1.5 py-0.5 text-[10px] text-rose-600 font-bold select-none h-full">
                          <span className="flex items-center gap-1 opacity-80 group-hover:opacity-100 truncate">
                            <Eraser className="size-3 shrink-0" />
                            <span className="truncate">खोडून टाकले (Erased)</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              block.isCustom
                                ? handleDeleteBlock(pageIdx, block.id)
                                : handleRevertBlock(pageIdx, block.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[9px] px-1.5 shrink-0"
                            title={block.isCustom ? "हटवा" : "मूळ मजकूर परत आणा"}
                          >
                            {block.isCustom ? "हटवा" : "पूर्ववत"}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // 3. MODIFIED WITH NEW TEXT: Solid white backing hiding original sentence + new text cleanly displayed
                  if (isModified && block.text?.trim()) {
                    return (
                      <div
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (mode === "edit") {
                            setActiveEditingBlockId(block.id);
                          }
                        }}
                        className={`doc-text-block-item absolute transition-all z-30 ${
                          mode === "edit"
                            ? "hover:ring-2 hover:ring-amber-400 cursor-pointer rounded"
                            : ""
                        }`}
                        style={{
                          left: `${block.x}%`,
                          top: `${block.y}%`,
                          minWidth: `${maskW}%`,
                          minHeight: `${maskH}%`,
                          backgroundColor: "#ffffff",
                          boxShadow: "0 0 0 2px #ffffff",
                          fontSize: `${exactFontSize}px`,
                          fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif",
                          fontWeight: exactFontWeight,
                          color: block.color || "#0f172a",
                          lineHeight: 1.25,
                        }}
                        title={mode === "edit" ? "बदल करण्यासाठी थेट क्लिक करा (Click to edit)" : undefined}
                      >
                        <div className="relative p-0 leading-tight">
                          <span className="block whitespace-pre-wrap break-words">
                            {block.text}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 4. UNEDITED BLOCK: Direct click-to-edit hotspot in edit mode (no hover popups)
                  return (
                    <div
                      key={block.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveEditingBlockId(block.id);
                      }}
                      className="absolute z-20 cursor-pointer rounded hover:bg-amber-400/20 hover:ring-1.5 hover:ring-amber-400 transition-colors"
                      style={{
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: `${Math.max(block.width, 3)}%`,
                        minWidth: "26px",
                        height: `${Math.max(block.height, 2.2)}%`,
                        minHeight: "18px",
                      }}
                      title="संपादित करण्यासाठी थेट क्लिक करा (Click to edit)"
                    />
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

      {/* School Header Quick Customizer Modal */}
      {showSchoolHeaderModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full text-slate-800 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    शाळेचे नाव व माहिती जोडा (School Header)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    पहिल्या पानावर आपल्या शाळेचे नाव, केंद्र व विद्यार्थ्याची माहिती जोडा.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSchoolHeaderModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  शाळेचे नाव (School Name):
                </label>
                <input
                  type="text"
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  placeholder="उदा. जि. प. प्राथमिक शाळा, पुणे"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">केंद्र (Center):</label>
                  <input
                    type="text"
                    value={kendraInput}
                    onChange={(e) => setKendraInput(e.target.value)}
                    placeholder="उदा. केंद्र शाळा"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">दिनांक (Date):</label>
                  <input
                    type="text"
                    value={examDateInput}
                    onChange={(e) => setExamDateInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  विद्यार्थी नाव व हजेरी क्र. ओळ:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <input
                    type="text"
                    value={rollNoInput}
                    onChange={(e) => setRollNoInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              {documentType === "question_paper" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    एकूण गुण (Total Marks, optional):
                  </label>
                  <input
                    type="text"
                    value={totalMarksInput}
                    onChange={(e) => setTotalMarksInput(e.target.value)}
                    placeholder="उदा. २०"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSchoolHeaderModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleApplySchoolHeader}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="size-4" />
                <span>लागू करा (Apply to Page 1)</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="space-y-4 text-xs">
              {/* Input for school name */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  शाळेचे नाव (School Name):
                </label>
                <input
                  type="text"
                  value={fillSchoolNameInput}
                  onChange={(e) => setFillSchoolNameInput(e.target.value)}
                  placeholder="उदा. जिल्हा परिषद प्राथमिक शाळा, कात्रज"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-emerald-500/40 rounded-xl font-bold text-slate-900 text-sm outline-none focus:border-emerald-600 focus:bg-white shadow-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  ✓ प्रोफाईलमधून आपोआप भरले आहे. आवश्यकतेनुसार बदलू शकता.
                </p>
              </div>

              {/* Live Preview Box */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  दिसण्याचा नमुना (Live Document Preview):
                </label>
                <div className="p-3 bg-slate-50 border-2 border-dashed border-emerald-300 rounded-xl space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">
                    प्रश्नपत्रिकेवर असे दिसेल:
                  </div>
                  <div
                    className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs font-bold text-slate-900 flex items-center gap-1.5"
                    style={{ fontSize: `${fillSchoolFontSize}px` }}
                  >
                    {fillSchoolPlacement === "full_line" ? (
                      <>
                        <span className="font-extrabold text-slate-900 shrink-0">शाळेचे नाव :</span>
                        <span className="text-emerald-900 underline decoration-emerald-500/50 decoration-2">
                          {fillSchoolNameInput || "येथे शाळेचे नाव येईल"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400 font-normal shrink-0">शाळेचे नाव</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                          {fillSchoolNameInput || "येथे शाळेचे नाव येईल"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Placement style mode chips */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  बसविण्याचा प्रकार (Placement Style):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFillSchoolPlacement("full_line")}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      fillSchoolPlacement === "full_line"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>शाळेचे नाव : [नाव]</span>
                      {fillSchoolPlacement === "full_line" && <Check className="size-3 text-emerald-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      पूर्ण ओळ स्वच्छ पांढऱ्या पार्श्वभूमीवर (Recommended)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFillSchoolPlacement("infront")}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      fillSchoolPlacement === "infront"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <span>केवळ [शाळेचे नाव]</span>
                      {fillSchoolPlacement === "infront" && <Check className="size-3 text-emerald-600" />}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      मूळ 'शाळेचे नाव' पुढे ओव्हरले म्हणून
                    </div>
                  </button>
                </div>
              </div>

              {/* Font Size & Options */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    अक्षरांचा आकार (Font Size):
                  </label>
                  <div className="flex items-center gap-1">
                    {[
                      { size: 13, label: "लहान (13px)" },
                      { size: 15, label: "मध्यम (15px)" },
                      { size: 17, label: "मोठे (17px)" },
                      { size: 20, label: "ठळक (20px)" },
                    ].map((f) => (
                      <button
                        key={f.size}
                        type="button"
                        onClick={() => setFillSchoolFontSize(f.size)}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                          fillSchoolFontSize === f.size
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Checkbox for covering original lines */}
              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideSecondaryDashes}
                  onChange={(e) => setHideSecondaryDashes(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 size-4"
                />
                <span className="text-xs font-semibold text-slate-700 select-none">
                  मूळ तुटक / डॅश रेषा (Underlines) स्वच्छ झाकून टाका
                </span>
              </label>
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
