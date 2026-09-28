import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Eye,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
  CheckCircle2,
  FileText,
  Move,
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
            isCustom: b.isCustom || true,
            isEdited: true,
          } as any;
        }
        return b;
      });
      nextPages[pageIndex] = page;
      return nextPages;
    });
  };

  // Add custom overlay text block
  const handleAddCustomBlock = (pageIndex: number) => {
    setPagesState((prevPages) => {
      const nextPages = [...prevPages];
      const page = { ...nextPages[pageIndex] };
      const newBlock: DocumentTextBlock = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        text: "येथे नवीन मजकूर प्रविष्ट करा",
        x: 10,
        y: 15,
        width: 40,
        height: 5,
        fontSize: 14,
        fontFamily: "Noto Sans Devanagari, sans-serif",
        fontWeight: "600",
        color: "#0f172a",
        editable: true,
        isCustom: true,
      };
      page.textBlocks = [...page.textBlocks, newBlock];
      nextPages[pageIndex] = page;
      return nextPages;
    });
    toast.success("नवीन मजकूर ब्लॉक जोडला गेला!");
  };

  // Delete text block
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
                onClick={() => setMode("view")}
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
                <span className="hidden sm:inline">मूळ कागदपत्र (Reset)</span>
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
        <div className="bg-amber-600/15 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Edit3 className="size-3.5 shrink-0 text-amber-400" />
            <span>
              <strong>संपादन पद्धती (Edit Mode):</strong> मजकुरावर क्लिक करून बदल करा. मूळ डिझाइन व चित्रे सुरक्षित राहतील.
            </span>
          </div>
          <button
            onClick={() => handleAddCustomBlock(currentPageNum - 1)}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="size-3" />
            <span>मजकूर जोडा (+ Add Text)</span>
          </button>
        </div>
      )}

      {/* Pages Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col items-center gap-8 bg-slate-900/90 custom-scrollbar max-h-[calc(100vh-12rem)]"
      >
        {pagesState.map((page, pageIdx) => {
          const isLandscape = page.width > page.height;
          // Calculate responsive display dimensions based on zoomScale
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
                      📝 दैनिक स्वाध्याय कार्यपत्रिका (Daily Homework Worksheet)
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
              <div className="absolute inset-0 w-full h-full z-10">
                {page.textBlocks.map((block) => {
                  const isEditing = activeEditingBlockId === block.id && mode === "edit";
                  const isModified = block.isCustom || (block as any).isEdited;

                  return (
                    <div
                      key={block.id}
                      onClick={() => {
                        if (mode === "edit") {
                          setActiveEditingBlockId(block.id);
                        }
                      }}
                      className={`absolute transition-all ${
                        mode === "edit"
                          ? "cursor-text border hover:border-amber-500/80 hover:bg-amber-100/30"
                          : ""
                      } ${
                        isEditing
                          ? "border-2 border-indigo-600 bg-white/95 shadow-lg rounded-md ring-2 ring-indigo-400/40 z-30"
                          : isModified && mode === "edit"
                          ? "border-amber-400 bg-amber-50/70 rounded"
                          : "border-transparent"
                      }`}
                      style={{
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: isEditing ? "auto" : `${block.width}%`,
                        minWidth: "40px",
                        maxWidth: "95%",
                        // Adjust font size proportionally to zoom
                        fontSize: `${Math.max(10, Math.round(block.fontSize * zoomScale * 0.85))}px`,
                        fontFamily: "'Noto Sans Devanagari', -apple-system, sans-serif",
                        fontWeight: block.fontWeight || "600",
                        color: block.color || "#0f172a",
                        lineHeight: 1.25,
                        padding: isEditing ? "4px 8px" : "1px 2px",
                        backgroundColor:
                          isModified || isEditing ? "rgba(255, 255, 255, 0.95)" : "transparent",
                      }}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <textarea
                            autoFocus
                            rows={Math.max(1, block.text.split("\n").length)}
                            value={block.text}
                            onChange={(e) =>
                              handleUpdateBlockText(pageIdx, block.id, e.target.value)
                            }
                            className="w-full min-w-[200px] max-w-lg bg-transparent text-slate-900 border-none outline-none resize-y p-0 font-sans"
                            style={{
                              fontSize: "inherit",
                              fontFamily: "inherit",
                              fontWeight: "inherit",
                            }}
                          />
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200">
                            <span className="text-[9px] text-slate-400">
                              मजकूर संपादित करा
                            </span>
                            <div className="flex items-center gap-1">
                              {block.isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBlock(pageIdx, block.id);
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                                  title="हटवा"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveEditingBlockId(null);
                                }}
                                className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700"
                              >
                                पूर्ण
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="block whitespace-pre-wrap break-words">
                          {block.text}
                        </span>
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
    </div>
  );
}
