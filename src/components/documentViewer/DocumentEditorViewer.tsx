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
  Loader2,
  AlertCircle,
  FileText,
  Building2,
  Type,
  Bold,
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

interface DocumentEditorViewerProps {
  documentId: string;
  fileUrl: string;
  fileName?: string;
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
  const [schoolNameInput, setSchoolNameInput] = useState<string>(
    userName ? `जि. प. प्राथमिक शाळा (${userName})` : "जिल्हा परिषद प्राथमिक शाळा"
  );
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
            editsFound = true;
            mergedPages = model.pages.map((p) => {
              const editedPage = userEdits.pages.find((ep) => ep.pageNumber === p.pageNumber);
              if (editedPage && editedPage.textBlocks) {
                return {
                  ...p,
                  textBlocks: editedPage.textBlocks,
                };
              }
              return p;
            });
          }
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

  // Update text of a block
  const handleUpdateBlockText = (pageIndex: number, blockId: string, newText: string) => {
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      page.textBlocks = page.textBlocks.map((b) => {
        if (b.id === blockId) {
          return {
            ...b,
            text: newText,
            isEdited: true,
          } as any;
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
          } as any;
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
        fontSize: 14,
        fontFamily: "Noto Sans Devanagari, sans-serif",
        fontWeight: "600",
        color: "#0f172a",
        editable: true,
        isCustom: true,
      };
      (newBlock as any).isEdited = true;
      page.textBlocks = [...page.textBlocks, newBlock];
      nextPages[pageIndex] = page;
      return nextPages;
    });
    setActiveEditingBlockId(newId);
    toast.success("नवीन मजकूर ब्लॉक जोडला गेला!");
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
          b.id === blockId ? { ...origBlock, isEdited: false } : b
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

          {/* School Header Quick Customizer Button */}
          {canEdit && (
            <button
              onClick={() => setShowSchoolHeaderModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="शाळेचे नाव व तपशील बदला"
            >
              <Building2 className="size-3.5 text-blue-400" />
              <span className="hidden md:inline">शाळा तपशील (Header)</span>
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
                  const isModified = Boolean(block.isCustom || (block as any).isEdited);

                  // In view mode: if not modified and background exists, don't render anything
                  if (mode === "view" && page.backgroundUrl && !isModified) {
                    return null;
                  }

                  return (
                    <div
                      key={block.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (mode === "edit") {
                          setActiveEditingBlockId(block.id);
                        }
                      }}
                      className={`doc-text-block-item absolute transition-all ${
                        isEditing
                          ? "bg-white z-50 rounded shadow-md"
                          : isModified
                          ? "bg-white border border-amber-300 hover:border-amber-500 shadow-xs rounded cursor-pointer z-30"
                          : mode === "edit"
                          ? "cursor-text z-20"
                          : "z-10"
                      }`}
                      style={{
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: isEditing ? `${Math.max(block.width, 18)}%` : isModified ? "auto" : `${block.width}%`,
                        minWidth: isEditing ? "120px" : "20px",
                        maxWidth: "96%",
                        fontSize: `${Math.max(10, Math.round(block.fontSize * zoomScale * 0.88))}px`,
                        fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif",
                        fontWeight: block.fontWeight || "600",
                        color: block.color || "#0f172a",
                        lineHeight: 1.3,
                        backgroundColor:
                          isModified || isEditing ? "#ffffff" : "transparent",
                        boxShadow:
                          isModified && !isEditing
                            ? "0 0 0 2px #ffffff"
                            : undefined,
                      }}
                    >
                      {isEditing ? (
                        /* DIRECT IN-PLACE EDITING ON THE SHEET (NO POPUP MODAL) */
                        <div className="relative w-full h-full">
                          <textarea
                            autoFocus
                            rows={Math.max(1, block.text.split("\n").length)}
                            value={block.text}
                            onChange={(e) =>
                              handleUpdateBlockText(pageIdx, block.id, e.target.value)
                            }
                            onBlur={() => setActiveEditingBlockId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setActiveEditingBlockId(null);
                              }
                            }}
                            className="w-full bg-white text-slate-900 border-2 border-indigo-600 rounded-sm outline-none px-1.5 py-0.5 m-0 resize-none font-sans"
                            style={{
                              fontSize: "inherit",
                              fontFamily: "inherit",
                              fontWeight: "inherit",
                              lineHeight: 1.25,
                            }}
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setActiveEditingBlockId(null);
                            }}
                            className="absolute -bottom-6 right-0 px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold shadow-md cursor-pointer flex items-center gap-0.5 z-50"
                            title="पूर्ण करा (Done)"
                          >
                            <Check className="size-3" />
                            <span>पूर्ण</span>
                          </button>
                        </div>
                      ) : isModified ? (
                        /* MODIFIED TEXT DIRECTLY ON THE SHEET OVER SOLID WHITE BACKING */
                        <div className="relative group px-1 py-0.5">
                          <span className="block whitespace-pre-wrap break-words">
                            {block.text}
                          </span>
                          {mode === "edit" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                block.isCustom
                                  ? handleDeleteBlock(pageIdx, block.id)
                                  : handleRevertBlock(pageIdx, block.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 -right-2.5 p-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-sm z-30"
                              title={block.isCustom ? "हटवा" : "मूळ मजकूर परत आणा"}
                            >
                              <RotateCcw className="size-2.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* UNEDITED BLOCK: INVISIBLE HOTSPOT DIRECTLY ON SHEET */
                        <div
                          className={`w-full h-full min-h-[16px] transition-all rounded ${
                            mode === "edit"
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
    </div>
  );
}
