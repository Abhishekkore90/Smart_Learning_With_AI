import React, { useEffect, useRef, useState } from "react";
import {
  Save,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Building2,
  Calendar,
  Sparkles,
  Check,
  Edit3,
  MapPin,
  User,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  MessageCircle,
} from "lucide-react";
import { renderAsync } from "docx-preview";
import { toast } from "sonner";
import { fetchBinaryFile, getDirectBunnyStorageUrl, isBufferValidBinary } from "@/lib/bunny-auth-pdf";
import mammoth from "mammoth";
import {
  isVmlDocx,
  parseVmlDocxToHtml,
} from "@/services/vmlDocxParser";
import {
  type HomeworkHeaderProfile,
  getHomeworkHeaderProfile,
  saveHomeworkHeaderProfile,
  formatHomeworkDateToMarathi,
  getMarathiClassLabel,
  formatHomeworkFileName,
} from "@/utils/homeworkDocHelper";
import { getUnifiedSchoolProfile, saveUnifiedSchoolProfile, saveUnifiedSchoolProfileToFirestore } from "@/utils/schoolProfileHelper";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export interface SectionTab {
  key: string;
  label: string;
  pageCount: number;
  icon?: string;
}

export interface WordQuestionPaperEditorProps {
  fileUrl?: string | null;
  file?: File | Blob | null;
  initialHtml?: string | null;
  paperTitle: string;
  paperId?: string;
  subject?: string;
  userId?: string;
  userRole?: string;
  schoolName?: string;
  kendra?: string;
  taluka?: string;
  jilha?: string;
  teacherName?: string;
  headmasterName?: string;
  documentType?: "question_paper" | "homework";
  homeworkDate?: string;
  homeworkClass?: string;
  onSave?: (html: string) => Promise<void> | void;
  onClose?: () => void;
}

export const WordQuestionPaperEditor: React.FC<WordQuestionPaperEditorProps> = ({
  fileUrl,
  file,
  initialHtml,
  paperTitle,
  paperId = "default",
  subject,
  userId = "guest",
  userRole = "teacher",
  schoolName: propSchoolName,
  kendra: propKendra,
  taluka: propTaluka,
  jilha: propJilha,
  teacherName: propTeacherName,
  headmasterName: propHeadmasterName,
  documentType = "question_paper",
  homeworkDate,
  homeworkClass,
  onSave,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState(
    documentType === "homework"
      ? "Word (.docx) गृहपाठ लोड होत आहे..."
      : "Word (.docx) प्रश्नपत्रिका लोड होत आहे..."
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSavedVersion, setHasSavedVersion] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [availableSections, setAvailableSections] = useState<SectionTab[]>([]);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [schoolNameInput, setSchoolNameInput] = useState(propSchoolName || "");
  const [examDateInput, setExamDateInput] = useState("");
  const [kendraInput, setKendraInput] = useState(propKendra || "");
  const [talukaInput, setTalukaInput] = useState(propTaluka || "");
  const [jilhaInput, setJilhaInput] = useState(propJilha || "");
  const [teacherNameInput, setTeacherNameInput] = useState(propTeacherName || "");
  const [headmasterNameInput, setHeadmasterNameInput] = useState(propHeadmasterName || "");
  const [showQpHeaderModal, setShowQpHeaderModal] = useState(false);
  const [mobileFitWidth, setMobileFitWidth] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Homework Header Info States
  const [showHwHeaderModal, setShowHwHeaderModal] = useState(false);
  const [hwSchoolName, setHwSchoolName] = useState("");
  const [hwKendra, setHwKendra] = useState("");
  const [hwTaluka, setHwTaluka] = useState("");
  const [hwDistrict, setHwDistrict] = useState("");
  const [hwDayOfWeek, setHwDayOfWeek] = useState("शुक्रवार");
  const [hwDateStr, setHwDateStr] = useState("१२ ऑक्टोबर २०२६");
  const [hwClassName, setHwClassName] = useState("१ ली");
  const [hwStudentName, setHwStudentName] = useState("");
  const [hwTeacherName, setHwTeacherName] = useState("");
  const [hwHeadmasterName, setHwHeadmasterName] = useState("");

  const storageKey =
    documentType === "homework"
      ? `word_homework_edits_${paperId}`
      : `word_paper_edits_${paperId}`;

  // Initialise School Name (per user, blank initially) and Date
  useEffect(() => {
    try {
      // 1. Purge legacy global key if it contains "willingdon" or other default leakage
      const legacy = localStorage.getItem("last_paper_school_name");
      if (legacy && (legacy.toLowerCase().includes("willingdon") || legacy.includes("COLLEGE"))) {
        localStorage.removeItem("last_paper_school_name");
      }

      // 2. School name & profile fields from props, local storage or unified profile
      const uni = getUnifiedSchoolProfile();
      const userKey = `user_school_name_${userId || "guest"}`;
      const savedUserSchool = localStorage.getItem(userKey);
      const activeSchool = propSchoolName || (savedUserSchool && !savedUserSchool.toLowerCase().includes("willingdon") ? savedUserSchool.trim() : "") || uni.schoolName || "";

      setSchoolNameInput(activeSchool);
      setKendraInput(propKendra || uni.kendra || "");
      setTalukaInput(propTaluka || uni.taluka || "");
      setJilhaInput(propJilha || uni.jilha || "");
      setTeacherNameInput(propTeacherName || uni.teacherName || "");
      setHeadmasterNameInput(propHeadmasterName || uni.headmaster || "");

      // 3. Load saved homework header info strictly for this user (Fresh blank dashboard for new users!)
      const hwProf = getHomeworkHeaderProfile(userId);
      setHwSchoolName(hwProf.schoolName);
      setHwKendra(hwProf.kendra);
      setHwTaluka(hwProf.taluka);
      setHwDistrict(hwProf.district);
      setHwTeacherName(hwProf.teacherName);
      setHwHeadmasterName(hwProf.headmasterName);

      // Auto-inject into container if already rendered
      if (documentType === "homework" && containerRef.current && containerRef.current.innerHTML.trim().length > 50) {
        applyHomeworkHeaderInfo(false, hwProf);
      }

      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      setExamDateInput(`${dd}/${mm}/${yyyy}`);

      // Set Marathi Day and Date from admin-uploaded homework date, or fallback to today
      if (homeworkDate) {
        const { dayOfWeek, dateStr } = formatHomeworkDateToMarathi(homeworkDate);
        setHwDayOfWeek(dayOfWeek);
        setHwDateStr(dateStr);
      } else {
        const marathiDays = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
        const marathiMonths = [
          "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
          "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
        ];
        setHwDayOfWeek(marathiDays[today.getDay()]);
        setHwDateStr(`${today.getDate()} ${marathiMonths[today.getMonth()]} ${yyyy}`);
      }

      // Set Marathi Class from admin-uploaded homework class
      if (homeworkClass) {
        setHwClassName(getMarathiClassLabel(homeworkClass));
      }
    } catch (e) {
      console.warn("Could not load initial school name:", e);
    }
  }, [userId, homeworkDate, homeworkClass]);

  // 1. Load document
  useEffect(() => {
    let isCancelled = false;

    const loadDocx = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo(0, 0);
        }
        setLoadingMsg(
          documentType === "homework"
            ? "Word गृहपाठ वाचला जात आहे..."
            : "Word प्रश्नपत्रिका वाचली जात आहे..."
        );

        // Check if there is already a saved edited version in localStorage
        const savedHtml = localStorage.getItem(storageKey);
        if (savedHtml && !file) {
          setHasSavedVersion(true);
        }

        let arrayBuffer: ArrayBuffer | null = null;

        if (file) {
          arrayBuffer = await file.arrayBuffer();
        } else if (fileUrl) {
          setLoadingMsg(
            documentType === "homework"
              ? "Word गृहपाठ सुरक्षितपणे डाउनलोड होत आहे..."
              : "Word प्रश्नपत्रिका सुरक्षितपणे डाउनलोड होत आहे..."
          );

          // 1. Primary: Use universal binary fetcher (handles PHP proxy on Hostinger, Vercel proxy, Vite proxy & auth)
          try {
            arrayBuffer = await fetchBinaryFile(fileUrl);
          } catch (e) {
            console.warn("fetchBinaryFile notice:", e);
          }

          // 2. Extra safety attempt: direct storage url with AccessKey
          if ((!arrayBuffer || !isBufferValidBinary(arrayBuffer, true)) && (fileUrl.includes("b-cdn.net") || fileUrl.includes("bunny"))) {
            try {
              const direct = getDirectBunnyStorageUrl(fileUrl);
              if (direct) {
                const res = await fetch(direct.url, { headers: direct.headers });
                if (res.ok) {
                  const ab = await res.arrayBuffer();
                  if (isBufferValidBinary(ab, true)) {
                    arrayBuffer = ab;
                  }
                }
              }
            } catch (e) {
              console.warn("direct storage fetch notice:", e);
            }
          }

          if (!arrayBuffer || !isBufferValidBinary(arrayBuffer, true)) {
            throw new Error(
              documentType === "homework"
                ? "Word (.docx) गृहपाठ डाउनलोड करता आला नाही (CORS किंवा नेटवर्क अडथळा)."
                : "Word (.docx) प्रश्नपत्रिका डाउनलोड करता आली नाही (CORS किंवा नेटवर्क अडथळा)."
            );
          }
        }

        if (isCancelled) return;

        if (!arrayBuffer && !initialHtml) {
          throw new Error("Word फाईल सापडली नाही.");
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          containerRef.current.classList.remove("mammoth-fallback");
          if (styleContainerRef.current) {
            styleContainerRef.current.innerHTML = "";
          }

          if (arrayBuffer) {
            setLoadingMsg("मूळ लेआउट, बॉर्डर्स व प्रश्नपत्रिका तयार केली जात आहे...");
            let renderedSuccessfully = false;

            // 1. Primary for question papers with design borders & illustrations: vmlDocxParser
            try {
              const hasVml = await isVmlDocx(arrayBuffer);
              if (hasVml) {
                setLoadingMsg("मूळ डिझाइन बॉर्डर्स, चित्रे व मजकूर जोडला जात आहे...");
                const vmlHtml = await parseVmlDocxToHtml(arrayBuffer);
                if (vmlHtml && vmlHtml.trim().length > 100) {
                  containerRef.current.innerHTML = vmlHtml;
                  renderedSuccessfully = true;
                }
              }
            } catch (vmlErr) {
              console.warn("vmlDocxParser notice, falling back to docx-preview:", vmlErr);
            }

            // 2. Secondary: docx-preview for standard MS Word documents without background templates
            if (!renderedSuccessfully) {
              try {
                await renderAsync(arrayBuffer, containerRef.current, undefined, {
                  inWrapper: true,
                  hideWrapperOnPrint: false,
                  ignoreWidth: false,
                  ignoreHeight: false,
                  ignoreFonts: false,
                  breakPages: true,
                  renderHeaders: true,
                  renderFooters: true,
                  renderFootnotes: true,
                  renderEndnotes: true,
                  useBase64URL: true,
                  renderChanges: false,
                  renderComments: false,
                  trimXmlDeclaration: true,
                  renderAltChunks: true,
                  className: "docx",
                });

                if (containerRef.current.innerHTML.trim().length > 50) {
                  renderedSuccessfully = true;
                }
              } catch (docxErr) {
                console.warn("docx-preview notice, trying Mammoth:", docxErr);
              }
            }

            // 2. High-reliability fallback: Mammoth HTML conversion if docx-preview failed
            if (!renderedSuccessfully) {
              try {
                setLoadingMsg("Word फाईल मजकूर व मांडणी तयार केली जात आहे...");
                containerRef.current.classList.add("mammoth-fallback");
                const result = await mammoth.convertToHtml(
                  { arrayBuffer },
                  {
                    convertImage: mammoth.images.imgElement((image: any) => {
                      return image.read("base64").then((imageBuffer: string) => {
                        return {
                          src: `data:${image.contentType};base64,${imageBuffer}`,
                        };
                      });
                    }),
                  }
                );

                if (result.value) {
                  containerRef.current.innerHTML = result.value;
                  renderedSuccessfully = true;
                }
              } catch (mErr) {
                console.error("Mammoth conversion error:", mErr);
              }
            }
          } else if (initialHtml) {
            containerRef.current.innerHTML = initialHtml;
          }

          const renderedHtml = containerRef.current?.innerHTML?.trim() || "";
          if (renderedHtml.length < 20) {
            throw new Error("Word फाईलचे मजकूर तयार करता आले नाही. फाईल रिकामी किंवा अपूर्ण असू शकते.");
          }

          // For homework documents, format and paginate into clean, exact A4 page sheets
          if (documentType === "homework") {
            paginateHomeworkDocument();
          }

          // Make the rendered document editable inline
          enableInlineEditing();

          // Auto-apply initial school name and date into header box (per user only, blank by default for question papers)
          if (documentType !== "homework") {
            const uni = getUnifiedSchoolProfile();
            const userKey = `user_school_name_${userId || "guest"}`;
            const savedUserSchool = localStorage.getItem(userKey) || "";
            const initialSchool = propSchoolName || ((savedUserSchool && !savedUserSchool.toLowerCase().includes("willingdon")) ? savedUserSchool.trim() : "") || uni.schoolName || "";
            const initialKendra = propKendra || uni.kendra || "";
            const initialTaluka = propTaluka || uni.taluka || "";
            const initialJilha = propJilha || uni.jilha || "";
            const initialTeacher = propTeacherName || uni.teacherName || "";
            const initialHeadmaster = propHeadmasterName || uni.headmaster || "";

            const today = new Date();
            const dd = String(today.getDate()).padStart(2, "0");
            const mm = String(today.getMonth() + 1).padStart(2, "0");
            const yyyy = today.getFullYear();
            const initialDate = examDateInput || `${dd}/${mm}/${yyyy}`;

            setTimeout(() => {
              applyHeaderInfo(initialSchool, initialDate, initialKendra, initialTaluka, initialJilha, initialTeacher, initialHeadmaster, false);
            }, 200);
            setTimeout(() => {
              applyHeaderInfo(initialSchool, initialDate, initialKendra, initialTaluka, initialJilha, initialTeacher, initialHeadmaster, false);
            }, 600);
            setTimeout(() => {
              applyHeaderInfo(initialSchool, initialDate, initialKendra, initialTaluka, initialJilha, initialTeacher, initialHeadmaster, false);
            }, 1200);
          } else {
            // For homework: auto-fit header and format teacher & headmaster signatures cleanly!
            const freshProf = getHomeworkHeaderProfile(userId);
            applyHomeworkHeaderInfo(false, freshProf);
            setTimeout(() => {
              applyHomeworkHeaderInfo(false, getHomeworkHeaderProfile(userId));
            }, 100);
            setTimeout(() => {
              applyHomeworkHeaderInfo(false, getHomeworkHeaderProfile(userId));
            }, 350);
            setTimeout(() => {
              applyHomeworkHeaderInfo(false, getHomeworkHeaderProfile(userId));
            }, 750);
          }

          // Detect multi-subject sections in VML documents
          const vmlPages = containerRef.current.querySelectorAll<HTMLElement>(".vml-page-wrapper");
          if (vmlPages.length > 0) {
            const marathiPages = containerRef.current.querySelectorAll<HTMLElement>('.vml-page-wrapper[data-subject-key="marathi"]');
            const mathPages = containerRef.current.querySelectorAll<HTMLElement>('.vml-page-wrapper[data-subject-key="math"]');
            const semiPages = containerRef.current.querySelectorAll<HTMLElement>('.vml-page-wrapper[data-subject-key="semi"]');

            const tabs: SectionTab[] = [
              { key: "all", label: "सर्व विभाग (All Pages)", pageCount: vmlPages.length }
            ];
            if (marathiPages.length > 0) {
              tabs.push({ key: "marathi", label: "मराठी विभाग", pageCount: marathiPages.length, icon: "📘" });
            }
            if (mathPages.length > 0) {
              tabs.push({ key: "math", label: "गणित विभाग", pageCount: mathPages.length, icon: "🔢" });
            }
            if (semiPages.length > 0) {
              tabs.push({ key: "semi", label: "Semi-English विभाग", pageCount: semiPages.length, icon: "📐" });
            }

            // All subjects are merged into one file; show all pages together
            setActiveSection("all");
          }
        }

        setLoading(false);
      } catch (err: any) {
        console.error("Word render error:", err);
        if (!isCancelled) {
          setLoading(false);
          setLoadError(err.message || "Word फाईल लोड करताना त्रुटी आली.");
          toast.error("Word फाईल लोड करताना त्रुटी: " + (err.message || "अनोळखी त्रुटी"));
        }
      }
    };

    loadDocx();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl, file, paperId, subject, paperTitle, reloadCounter]);

  // Ensure all pages of merged Word paper are permanently visible
  useEffect(() => {
    if (!containerRef.current) return;
    const pages = containerRef.current.querySelectorAll<HTMLElement>(".vml-page-wrapper");
    pages.forEach((p) => {
      p.classList.remove("vml-page-hidden");
      p.style.display = "block";
    });
  }, [activeSection]);

  // Make all rendered sections directly editable
  const enableInlineEditing = () => {
    if (!containerRef.current) return;

    // Make the entire wrapper contentEditable
    containerRef.current.setAttribute("contenteditable", "true");
    containerRef.current.setAttribute("spellcheck", "false");

    // Also explicitly enable for child sections & pages
    const sections = containerRef.current.querySelectorAll("section, .docx, .docx-wrapper, p, table, td, th, span");
    sections.forEach((el) => {
      (el as HTMLElement).style.outline = "none";
    });

    // Listen to changes to show unsaved changes indicator and sync manually typed school name
    const handleInput = (e: Event) => {
      setHasUnsavedChanges(true);
      const target = e.target as HTMLElement;
      const schoolField = target?.closest<HTMLElement>('[data-field="school-name-text"], [data-field="school-name"]');
      if (schoolField) {
        const fullText = (schoolField.textContent || "").trim();
        const cleanTyped = fullText
          .replace(/^(?:शाळेचे\s*नाव|school\s*name)\s*[:\-–—]?\s*/i, "")
          .trim();
        if (cleanTyped && cleanTyped !== schoolNameInput) {
          setSchoolNameInput(cleanTyped);
          const userKey = `user_school_name_${userId || "guest"}`;
          localStorage.setItem(userKey, cleanTyped);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('[data-field="school-name-text"], [data-field="school-name"], [data-field="total-marks-box"], [data-field="date-text"], [data-field="exam-title-text"], [data-field="class-text"], [data-field="subject-text"], [data-field="roll-no-box"], [data-field="division-box"], [data-field="obtained-marks-box"]')) {
        if (e.key === "Enter") {
          e.preventDefault();
        }
      }
    };

    containerRef.current.removeEventListener("input", handleInput);
    containerRef.current.addEventListener("input", handleInput);
    containerRef.current.removeEventListener("keydown", handleKeyDown as any);
    containerRef.current.addEventListener("keydown", handleKeyDown as any);
  };

  // Execute formatting commands
  const formatDoc = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (containerRef.current) {
      containerRef.current.focus();
    }
    setHasUnsavedChanges(true);
  };

  // Quick insertion helpers
  const insertSchoolNameBlock = () => {
    const html = `
      <div style="text-align: center; margin-bottom: 12px; padding: 8px; border: 2px solid #000; background: #fff;">
        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">[ येथे आपल्या शाळेचे नाव टाईप करा ]</h2>
        <p style="margin: 4px 0 0 0; font-size: 14px;">आकारिक मूल्यमापन चाचणी | शैक्षणिक वर्ष २०२६-२७</p>
      </div>
    `;
    document.execCommand("insertHTML", false, html);
    setHasUnsavedChanges(true);
    toast.success("शाळेचा बॉक्स जोडला गेला! त्यावर क्लिक करून शाळेचे नाव बदला.");
  };

  const insertStudentInfoBlock = () => {
    const html = `
      <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin: 10px 0; border-bottom: 1px solid #333; padding-bottom: 4px;">
        <span>विद्यार्थ्याचे नाव: ___________________________</span>
        <span>हजेरी क्र.: [ &nbsp; ]</span>
        <span>दिनांक: ____/____/२०२६</span>
        <span>मिळालेले गुण: [ &nbsp; ] / २०</span>
      </div>
    `;
    document.execCommand("insertHTML", false, html);
    setHasUnsavedChanges(true);
    toast.success("विद्यार्थी माहिती ओळ जोडली गेली!");
  };

  const insertQuestionRow = () => {
    const html = `
      <div style="margin: 12px 0; font-size: 15px; line-height: 1.6;">
        <p style="font-weight: bold; margin: 0;">प्र. &nbsp; [ येथे नवीन प्रश्न टाईप करा ] <span style="float: right; font-weight: bold;">(गुण: २)</span></p>
        <p style="margin: 4px 0 0 20px; color: #444;">उत्तर: ____________________________________________________</p>
      </div>
    `;
    document.execCommand("insertHTML", false, html);
    setHasUnsavedChanges(true);
    toast.success("नवीन प्रश्न जोडला गेला! मजकूर थेट संपादित करा.");
  };

  const insertTableBlock = () => {
    const html = `
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; border: 1px solid #000;">
        <thead>
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 15%;">अ.क्र.</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: left;">तपशील / प्रश्न</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center; width: 20%;">गुण</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">१.</td>
            <td style="border: 1px solid #000; padding: 6px;">[ मजकूर ]</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">१</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">२.</td>
            <td style="border: 1px solid #000; padding: 6px;">[ मजकूर ]</td>
            <td style="border: 1px solid #000; padding: 6px; text-align: center;">१</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand("insertHTML", false, html);
    setHasUnsavedChanges(true);
    toast.success("तक्ता जोडला गेला!");
  };

  // Save changes
  const handleSave = async () => {
    if (!containerRef.current) return;
    try {
      setIsSaving(true);
      const currentHtml = containerRef.current.innerHTML;

      // Save to localStorage for quick restore
      localStorage.setItem(storageKey, currentHtml);

      if (onSave) {
        await onSave(currentHtml);
      }

      setHasUnsavedChanges(false);
      setHasSavedVersion(true);
      toast.success("प्रश्नपत्रिकेतील बदल यशस्वीरित्या जतन झाले!");
    } catch (err: any) {
      toast.error("जतन करताना त्रुटी आली: " + (err.message || ""));
    } finally {
      setIsSaving(false);
    }
  };

  // Restore saved changes from localStorage
  const handleRestoreSaved = () => {
    const saved = localStorage.getItem(storageKey);
    if (saved && containerRef.current) {
      containerRef.current.innerHTML = saved;
      if (documentType === "homework") {
        paginateHomeworkDocument();
      }
      enableInlineEditing();
      setHasUnsavedChanges(false);
      toast.success("मागील संपादन पूर्ववत करण्यात आले!");
    }
  };

  // Reset to original Word file
  const handleResetToOriginal = () => {
    if (!confirm("तुम्हाला खात्री आहे का? तुम्ही केलेले बदल रद्द होऊन मूळ Word फाईल पुन्हा लोड होईल.")) {
      return;
    }
    localStorage.removeItem(storageKey);
    setHasSavedVersion(false);
    setHasUnsavedChanges(false);
    window.location.reload();
  };

  // Helper to escape HTML characters
  const escapeHtmlStr = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  // Apply School Name, Kendra, Taluka, Jilla, Exam Date & Signatures to question paper
  const applyHeaderInfo = (
    schoolName = schoolNameInput,
    examDate = examDateInput,
    kendraVal = kendraInput,
    talukaVal = talukaInput,
    jilhaVal = jilhaInput,
    teacherVal = teacherNameInput,
    hmVal = headmasterNameInput,
    notify = false
  ) => {
    if (!containerRef.current) return;
    if (documentType === "homework") return;

    let updatedSchool = false;
    let updatedDate = false;

    // Keep state values in sync
    if (schoolName !== undefined) setSchoolNameInput(schoolName);
    if (examDate !== undefined) setExamDateInput(examDate);
    if (kendraVal !== undefined) setKendraInput(kendraVal);
    if (talukaVal !== undefined) setTalukaInput(talukaVal);
    if (jilhaVal !== undefined) setJilhaInput(jilhaVal);
    if (teacherVal !== undefined) setTeacherNameInput(teacherVal);
    if (hmVal !== undefined) setHeadmasterNameInput(hmVal);

    const cleanSchool = (schoolName || "").trim();
    const cleanKendra = (kendraVal || "").trim();
    const cleanTaluka = (talukaVal || "").trim();
    const cleanJilha = (jilhaVal || "").trim();
    const cleanTeacher = (teacherVal || "").trim();
    const cleanHm = (hmVal || "").trim();

    // Prepare sub-info html for Kendra, Taluka, Jilla to fit cleanly in Line 1 with uniform font size
    const subParts: string[] = [];
    if (cleanKendra) subParts.push(`<span style="white-space: nowrap; font-size: inherit;"><strong style="font-size: inherit; font-weight: 700; color: #0f172a;">केंद्र :</strong> <span style="font-size: inherit; font-weight: 700; color: #0f172a;">${escapeHtmlStr(cleanKendra)}</span></span>`);
    if (cleanTaluka) subParts.push(`<span style="white-space: nowrap; font-size: inherit;"><strong style="font-size: inherit; font-weight: 700; color: #0f172a;">तालुका :</strong> <span style="font-size: inherit; font-weight: 700; color: #0f172a;">${escapeHtmlStr(cleanTaluka)}</span></span>`);
    if (cleanJilha) subParts.push(`<span style="white-space: nowrap; font-size: inherit;"><strong style="font-size: inherit; font-weight: 700; color: #0f172a;">जिल्हा :</strong> <span style="font-size: inherit; font-weight: 700; color: #0f172a;">${escapeHtmlStr(cleanJilha)}</span></span>`);

    const subInfoHtml = subParts.length > 0 
      ? `<div class="qp-sub-location" style="display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; gap: 8px; flex-shrink: 0; font-size: inherit; font-weight: 700; color: #0f172a; white-space: nowrap;">${subParts.join('<span style="color: #94a3b8; font-weight: normal; margin: 0 4px; font-size: inherit;">|</span>')}</div>`
      : "";

    // 1. Unified Question Paper Header Box — inject ONLY on genuine header pages
    // Use data-is-header-page stamped at parse time (from raw XML, before any injection).
    // This prevents headers from landing on continuation pages and prevents the
    // subject-start detection from being poisoned by injected "विषय -" text.
    const vmlPages = containerRef.current.querySelectorAll<HTMLElement>(".vml-page-wrapper");
    vmlPages.forEach((page) => {
      const pageText = page.textContent || "";
      const isFirstPage = page.getAttribute("data-page-index") === "1" || page.getAttribute("data-page-index") === "0";

      // Primary signal: data-is-header-page is set from raw XML during parsing — reliable.
      // Fallback: if the attribute is missing (non-VML docx or older cached doc), fall back
      // to the original text-content heuristics so those documents still work.
      const hasDataAttr = page.hasAttribute("data-is-header-page");
      const isHeaderPageByAttr = page.getAttribute("data-is-header-page") === "true";

      // Check if this page has an already-injected header box (refresh scenario)
      const hasExistingHeaderBox = page.querySelector('.qp-unified-header-box') !== null;

      const hasHeaderBox = hasExistingHeaderBox || (hasDataAttr
        ? isHeaderPageByAttr  // trust the parse-time attribute
        : (
            // Legacy fallback for non-VML or older cached documents
            isFirstPage ||
            pageText.includes("शाळेचे नाव") ||
            pageText.includes("विद्यार्थ्या") ||
            pageText.includes("मूल्यमापन") ||
            pageText.includes("चाचणी") ||
            pageText.includes("इयत्ता") ||
            /school\s*name|student\s*name|std|class|evaluation|test/i.test(pageText)
          )
      );

      if (!hasHeaderBox) {
        page.querySelectorAll('.qp-unified-header-box').forEach((el) => el.remove());
        page.querySelectorAll('.qp-header-bg-mask').forEach((el) => el.remove());
        page.querySelectorAll('.qp-header-marks-block').forEach((el) => el.remove());
        page.querySelectorAll('.header-dots-mask').forEach((el) => el.remove());
        page.querySelectorAll('.header-orphan-boxes-mask').forEach((el) => el.remove());
        return;
      }

      const extSchool = page.getAttribute("data-extracted-school") || "";
      const extKendra = page.getAttribute("data-extracted-kendra") || "";
      const extTaluka = page.getAttribute("data-extracted-taluka") || "";
      const extJilha = page.getAttribute("data-extracted-jilha") || "";
      const extTitle = page.getAttribute("data-extracted-title") || "";
      const extClass = page.getAttribute("data-extracted-class") || "";
      const extSubject = page.getAttribute("data-extracted-subject") || "";
      const extMarks = page.getAttribute("data-extracted-marks") || "";
      const extDate = page.getAttribute("data-extracted-date") || "";

      // Step A: Extract or Retain Exam Title
      let examTitle = "";
      const existingTitleEl = page.querySelector<HTMLElement>('[data-field="exam-title-text"]');
      if (existingTitleEl && existingTitleEl.textContent?.trim() && !existingTitleEl.textContent.includes("undefined")) {
        examTitle = existingTitleEl.textContent.trim();
      } else if (extTitle) {
        examTitle = extTitle;
      } else {
        const shapes = Array.from(page.querySelectorAll<HTMLElement>('.vml-shape-text'));
        for (const s of shapes) {
          if (s.closest('.qp-unified-header-box')) continue;
          const t = (s.textContent || "").trim();
          const sTop = parseFloat(s.style.top || "100");
          if (sTop < 8.0 && (t.includes("मूल्यमापन") || t.includes("चाचणी") || t.includes("परीक्षा") || /test|exam|evaluation/i.test(t))) {
            examTitle = t;
            break;
          }
        }
        if (!examTitle) {
          const match = (pageText + " " + paperTitle).match(/(?:संकलित\s*मूल्यमापन(?:\s*\([^)]*\))?(?:\s*[०-९0-9\-–—]+)?|आकारिक\s*मूल्यमापन\s*चाचणी(?:\s*क्र\.?\s*[०-९0-9]+)?|द्वितीय\s*सत्र\s*परीक्षा(?:\s*[०-९0-9\-–—]+)?|प्रथम\s*सत्र\s*परीक्षा(?:\s*[०-९0-9\-–—]+)?)/i);
          if (match) examTitle = match[0].trim();
        }
        if (!examTitle) {
          if (paperTitle.includes("प्रथम सत्र") || paperTitle.includes("सत्र")) {
            examTitle = "संकलित मूल्यमापन (प्रथम सत्र) २०२६-२७";
          } else {
            examTitle = "आकारिक मूल्यमापन चाचणी क्र.१";
          }
        }
      }

      // Step B: Extract or Retain Class / Standard
      let classStd = "";
      const existingClassEl = page.querySelector<HTMLElement>('[data-field="class-text"]');
      if (existingClassEl && existingClassEl.textContent?.trim() && !existingClassEl.textContent.includes("undefined")) {
        classStd = existingClassEl.textContent.trim();
      } else if (extClass) {
        classStd = extClass;
      } else {
        const shapes = Array.from(page.querySelectorAll<HTMLElement>('.vml-shape-text'));
        for (const s of shapes) {
          if (s.closest('.qp-unified-header-box')) continue;
          const t = (s.textContent || "").trim();
          const sTop = parseFloat(s.style.top || "100");
          if (sTop < 15.0 && (t.includes("इयत्ता") || /std|class/i.test(t))) {
            const m = t.match(/इयत्ता\s*[-:–—]?\s*([०-९0-9]+(?:\s*(?:ली|री|थी|वी))?|पहिली|दुसरी|तिसरी|चौथी|पाचवी|सहावी|सातवी|आठवी|[१-८])/i);
            if (m) {
              classStd = m[0].trim();
              break;
            }
          }
        }
        if (!classStd) {
          const fullContext = (pageText + " " + paperTitle + " " + (document.title || "")).toLowerCase();
          if (fullContext.includes("तिसरी") || fullContext.includes("३री") || fullContext.includes("३ री") || /इयत्ता\s*[-_]?\s*3/i.test(fullContext)) {
            classStd = "इयत्ता - ३ री";
          } else if (fullContext.includes("चौथी") || fullContext.includes("४थी") || fullContext.includes("४ थी") || /इयत्ता\s*[-_]?\s*4/i.test(fullContext)) {
            classStd = "इयत्ता - ४ थी";
          } else if (fullContext.includes("पहिली") || fullContext.includes("१ली") || fullContext.includes("१ ली") || /इयत्ता\s*[-_]?\s*1/i.test(fullContext)) {
            classStd = "इयत्ता - १ ली";
          } else if (fullContext.includes("दुसरी") || fullContext.includes("२री") || fullContext.includes("२ री") || /इयत्ता\s*[-_]?\s*2/i.test(fullContext)) {
            classStd = "इयत्ता - २ री";
          } else if (fullContext.includes("पाचवी") || fullContext.includes("५वी") || fullContext.includes("५ वी") || /इयत्ता\s*[-_]?\s*5/i.test(fullContext)) {
            classStd = "इयत्ता - ५ वी";
          } else if (fullContext.includes("सहावी") || fullContext.includes("६वी") || fullContext.includes("६ वी") || /इयत्ता\s*[-_]?\s*6/i.test(fullContext)) {
            classStd = "इयत्ता - ६ वी";
          } else if (fullContext.includes("सातवी") || fullContext.includes("७वी") || fullContext.includes("७ वी") || /इयत्ता\s*[-_]?\s*7/i.test(fullContext)) {
            classStd = "इयत्ता - ७ वी";
          } else if (fullContext.includes("आठवी") || fullContext.includes("८वी") || fullContext.includes("८ वी") || /इयत्ता\s*[-_]?\s*8/i.test(fullContext)) {
            classStd = "इयत्ता - ८ वी";
          }
        }
        if (!classStd) classStd = "इयत्ता - १ ली";
      }
      if (!classStd.startsWith("इयत्ता")) classStd = `इयत्ता - ${classStd}`;
      classStd = classStd.replace(/^इयत्ता\s*[-:–—]?\s*/i, "इयत्ता - ").trim();

      // Step C: Extract or Retain Subject
      let subjectName = "";
      const existingSubjectEl = page.querySelector<HTMLElement>('[data-field="subject-text"]');
      if (existingSubjectEl && existingSubjectEl.textContent?.trim() && !existingSubjectEl.textContent.includes("undefined")) {
        subjectName = existingSubjectEl.textContent.trim();
      } else if (extSubject) {
        subjectName = extSubject;
      } else {
        const shapes = Array.from(page.querySelectorAll<HTMLElement>('.vml-shape-text'));
        for (const s of shapes) {
          if (s.closest('.qp-unified-header-box')) continue;
          const t = (s.textContent || "").trim();
          const sTop = parseFloat(s.style.top || "100");
          if (sTop < 15.0 && t.includes("विषय")) {
            const m = t.match(/विषय\s*[-:–—]?\s*([^\n\r,•()]+)/i);
            if (m && m[1]?.trim()) {
              subjectName = m[1].trim();
              break;
            }
          }
        }
        if (!subjectName) {
          const fullContext = (pageText + " " + paperTitle + " " + (subject || ""));
          if (fullContext.includes("परिसर अभ्यास")) subjectName = "परिसर अभ्यास";
          else if (fullContext.includes("भाषा") || fullContext.includes("मराठी")) subjectName = "भाषा";
          else if (fullContext.includes("गणित")) subjectName = "गणित";
          else if (fullContext.includes("इंग्रजी") || /english/i.test(fullContext)) subjectName = "इंग्रजी";
          else if (fullContext.includes("हिंदी")) subjectName = "हिंदी";
          else if (fullContext.includes("विज्ञान")) subjectName = "विज्ञान";
          else if (fullContext.includes("सामाजिक")) subjectName = "सामाजिक शास्त्रे";
        }
        if (!subjectName && subject) subjectName = subject;
        if (!subjectName) subjectName = "भाषा";
      }
      subjectName = subjectName.replace(/^विषय\s*[-:–—]?\s*/i, "").trim();
      const displaySubject = `विषय - ${subjectName}`;

      // Step D: Extract or Retain Total Marks
      let totalMarks = "";
      const existingMarksEl = page.querySelector<HTMLElement>('[data-field="total-marks-box"]');
      if (existingMarksEl && existingMarksEl.textContent?.trim() && !existingMarksEl.textContent.includes("undefined")) {
        totalMarks = existingMarksEl.textContent.trim();
      } else if (extMarks) {
        totalMarks = extMarks;
      } else {
        const shapes = Array.from(page.querySelectorAll<HTMLElement>('.vml-shape-text'));
        for (const s of shapes) {
          if (s.closest('.qp-unified-header-box')) continue;
          const t = (s.textContent || "").trim();
          const m = t.match(/(?:एकूण\s*गुण|total\s*marks)\s*[:\-–—]?\s*\[?\s*([०-९0-9]+)\s*\]?/i);
          if (m && m[1]) {
            totalMarks = m[1].trim();
            break;
          }
        }
        if (!totalMarks) {
          const m = (pageText + " " + paperTitle).match(/(?:एकूण\s*गुण|total\s*marks)\s*[:\-–—]?\s*\[?\s*([०-९0-9]+)\s*\]?/i);
          if (m && m[1]) totalMarks = m[1].trim();
        }
        if (!totalMarks) {
          const combined = (classStd + " " + paperTitle).toLowerCase();
          if (/पाचवी|सहावी|सातवी|आठवी|५|६|७|८|5th|6th|7th|8th/i.test(combined)) {
            totalMarks = "५०";
          } else if (/तिसरी|चौथी|३|४|3rd|4th/i.test(combined)) {
            totalMarks = "४०";
          } else {
            totalMarks = "२०";
          }
        }
      }
      if (totalMarks === "४") totalMarks = "४०";
      else if (totalMarks === "३") totalMarks = "३०";
      else if (totalMarks === "२") totalMarks = "२०";
      else if (totalMarks === "५") totalMarks = "५०";

      // Step E: Date
      let displayDate = "";
      if (examDate && examDate.trim()) {
        displayDate = examDate.replace(/^(?:दिनांक|दि\.?|date)\s*[:\-–—]?\s*/i, "").trim();
      } else if (extDate) {
        displayDate = extDate;
      } else {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        displayDate = `${dd}/${mm}/${yyyy}`;
      }

      // Step F: School & Location
      const effectiveSchool = cleanSchool || extSchool;
      const displaySchool = effectiveSchool
        ? effectiveSchool.replace(/^(?:शाळेचे\s*नाव|school\s*name)\s*[:\-–—]?\s*/i, "").trim()
        : "........................................................";

      const finalKendra = cleanKendra || extKendra;
      const finalTaluka = cleanTaluka || extTaluka;
      const finalJilha = cleanJilha || extJilha;

      const pageSubParts: string[] = [];
      if (finalKendra) pageSubParts.push(`<span style="white-space: nowrap; font-size: inherit;"><strong style="font-size: inherit; font-weight: 700; color: #0f172a;">केंद्र :</strong> <span style="font-size: inherit; font-weight: 700; color: #0f172a;">${escapeHtmlStr(finalKendra)}</span></span>`);
      if (finalTaluka) pageSubParts.push(`<span style="white-space: nowrap; font-size: inherit;"><strong style="font-size: inherit; font-weight: 700; color: #0f172a;">तालुका :</strong> <span style="font-size: inherit; font-weight: 700; color: #0f172a;">${escapeHtmlStr(finalTaluka)}</span></span>`);
      if (finalJilha) pageSubParts.push(`<span style="white-space: nowrap; font-size: inherit;"><strong style="font-size: inherit; font-weight: 700; color: #0f172a;">जिल्हा :</strong> <span style="font-size: inherit; font-weight: 700; color: #0f172a;">${escapeHtmlStr(finalJilha)}</span></span>`);

      const subLocationHtml = pageSubParts.length > 0 
        ? `<div class="qp-sub-location" style="display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; gap: 8px; flex-shrink: 0; font-size: inherit; font-weight: 700; color: #0f172a; white-space: nowrap;">${pageSubParts.join('<span style="color: #94a3b8; font-weight: normal; margin: 0 4px; font-size: inherit;">|</span>')}</div>`
        : "";

      // Check if this paper specifically uses the tall evaluation grid template (Class 1 & Class 2 primary papers)
      const combinedClassContext = (classStd + " " + (paperTitle || "") + " " + pageText).toLowerCase();
      const isClass1or2 =
        /इयत्ता\s*[-_]?\s*(?:१|२|1|2|पहिली|दुसरी)\b/i.test(combinedClassContext) ||
        /\b(?:std|class)\s*[-_]?\s*[12]\b/i.test(combinedClassContext) ||
        /\b(?:1st|2nd)\b/i.test(combinedClassContext) ||
        /पहिली|दुसरी|१ली|२री|१ ली|२ री/i.test(combinedClassContext);
      const isExplicitHigherClass =
        /इयत्ता\s*[-_]?\s*(?:३|४|५|६|७|८|3|4|5|6|7|8|तिसरी|चौथी|पाचवी|सहावी|सातवी|आठवी)\b/i.test(combinedClassContext) ||
        /\b(?:std|class)\s*[-_]?\s*[3-8]\b/i.test(combinedClassContext) ||
        /\b(?:3rd|4th|5th|6th|7th|8th)\b/i.test(combinedClassContext) ||
        /तिसरी|चौथी|पाचवी|सहावी|सातवी|आठवी|३री|४थी|५वी|६वी|७वी|८वी/i.test(combinedClassContext);
      const pageHasEvalGridAttr = page.getAttribute("data-has-eval-grid");
      const isEvalGrid = pageHasEvalGridAttr === "true" || (isClass1or2 && !isExplicitHigherClass && pageHasEvalGridAttr !== "false");

      // Step G: Remove all stray raw shapes inside header box region
      const allShapes = Array.from(page.querySelectorAll<HTMLElement>('.vml-shape-text'));
      const headerThreshold = 26.2;
      allShapes.forEach((s) => {
        if (s.closest('.qp-unified-header-box')) return;
        const sTop = parseFloat(s.style.top || "100");
        const t = (s.textContent || "").trim();
        const isQ =
          /^(?:प्रश्न|प्र\.|q(?:ue)?\.?)\s*[०-९0-9]+/i.test(t) ||
          /^[०-९0-9]+\s*[\)\.]\s*\S+/.test(t) ||
          (t.length > 20 && (t.includes("प्रश्न") || t.includes("प्र.")));
        if (sTop < headerThreshold && !isQ) {
          s.style.display = "none";
          s.style.visibility = "hidden";
          s.style.opacity = "0";
          s.remove();
        }
      });

      // Remove any legacy mask divs or marks blocks
      page.querySelectorAll('.header-dots-mask').forEach((el) => el.remove());
      page.querySelectorAll('.header-orphan-boxes-mask').forEach((el) => el.remove());
      page.querySelectorAll('.header-marks-corner-mask').forEach((el) => el.remove());
      page.querySelectorAll('.qp-header-marks-block').forEach((el) => el.remove());

      // Step G2: Ensure solid white background mask behind header box to eliminate background template double-borders & columns
      let bgMask = page.querySelector<HTMLElement>('.qp-header-bg-mask');
      if (!bgMask) {
        bgMask = document.createElement("div");
        bgMask.className = "qp-header-bg-mask";
        page.insertBefore(bgMask, page.querySelector('.vml-shapes-layer') || page.firstChild);
      }
      bgMask.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 26.2%; background: #ffffff !important; z-index: 2; pointer-events: none;";

      // Read dynamic header geometry detected from the document
      const docHeaderTop = page.getAttribute("data-header-top-pct");
      const docHeaderHeight = page.getAttribute("data-header-height-pct");
      const docHeaderLeft = page.getAttribute("data-header-left-pct");
      const docHeaderWidth = page.getAttribute("data-header-width-pct");

      // Step H: Create or Update .qp-unified-header-box
      let headerBox = page.querySelector<HTMLElement>('.qp-unified-header-box');
      if (!headerBox) {
        headerBox = document.createElement("div");
        const shapesLayer = page.querySelector(".vml-shapes-layer") || page;
        shapesLayer.appendChild(headerBox);
      }
      headerBox.className = "qp-unified-header-box";
      headerBox.setAttribute("data-field", "qp-unified-header-box");
      headerBox.setAttribute("data-header-variant", isEvalGrid ? "eval-grid" : "standard");

      // Apply dynamic header box coordinates detected from template geometry
      if (docHeaderTop && docHeaderHeight && docHeaderLeft && docHeaderWidth) {
        headerBox.style.setProperty("--header-top", `${docHeaderTop}%`);
        headerBox.style.setProperty("--header-height", `${docHeaderHeight}%`);
        headerBox.style.setProperty("--header-left", `${docHeaderLeft}%`);
        headerBox.style.setProperty("--header-width", `${docHeaderWidth}%`);
      }

      const schoolLen = (displaySchool || "").length;
      const schoolFontSize = schoolLen > 55
        ? "clamp(7.5px, 1.7cqw, 10pt)"
        : schoolLen > 40
        ? "clamp(8.5px, 2.0cqw, 11.5pt)"
        : schoolLen > 25
        ? "clamp(9px, 2.2cqw, 12.5pt)"
        : "clamp(9.5px, 2.4cqw, 13.5pt)";

      headerBox.innerHTML = `
        <!-- Row 1: School Name centered as one line -->
        <div style="width:100%;text-align:center;overflow:hidden;white-space:nowrap;font-size:${schoolFontSize};font-weight:700;color:#0f172a;line-height:1.3;">
          <span style="font-size:inherit;font-weight:700;color:#0f172a;">शाळेचे नाव :&nbsp;</span><span contenteditable="true" data-field="school-name-text" style="font-weight:700;color:#0f172a;outline:none;cursor:text;font-size:inherit;">${escapeHtmlStr(displaySchool)}</span>
        </div>

        ${subLocationHtml ? `
        <!-- Row 1b: Kendra / Taluka / Jilha centered -->
        <div style="width:100%;text-align:center;overflow:hidden;white-space:nowrap;font-size:clamp(6.5px,1.55cqw,9.5pt);font-weight:700;color:#0f172a;line-height:1.25;">${subLocationHtml}</div>
        ` : ""}

        <!-- Row 2: Exam Title bold centered -->
        <div data-field="exam-title" style="width:100%;text-align:center;overflow:hidden;white-space:nowrap;">
          <span contenteditable="true" data-field="exam-title-text" style="font-size:clamp(8px,2.25cqw,13.5pt);font-weight:800;color:#0f172a;letter-spacing:0.2px;outline:none;cursor:text;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;width:100%;">${escapeHtmlStr(examTitle)}</span>
        </div>

        ${isEvalGrid ? `
        <!-- Row 3: Class | Subject | Roll No (Eval Grid) -->
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;overflow:hidden;gap:4px;">
          <div style="flex:0 1 auto;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">
            <span contenteditable="true" data-field="class-text" style="outline:none;cursor:text;">${escapeHtmlStr(classStd)}</span>
          </div>
          <div style="flex:1 1 auto;font-size:clamp(8.5px,2.0cqw,12.5pt);font-weight:800;color:#0f172a;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;min-width:0;">
            <span contenteditable="true" data-field="subject-text" style="outline:none;cursor:text;">${escapeHtmlStr(displaySubject)}</span>
          </div>
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:clamp(2px,0.6cqw,5px);white-space:nowrap;">
            <span style="font-size:clamp(7px,1.7cqw,10.5pt);font-weight:700;color:#0f172a;white-space:nowrap;">हजेरी क्रमांक -</span>
            <div contenteditable="true" data-field="roll-no-box" style="width:clamp(20px,4.4cqw,32px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;flex-shrink:0;cursor:text;outline:none;"></div>
          </div>
        </div>

        <!-- Row 4: Student Name | Total Marks (Eval Grid) -->
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;overflow:hidden;gap:4px;">
          <div style="display:flex;align-items:center;flex:1 1 auto;min-width:0;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;">
            <span style="flex-shrink:0;">विद्यार्थ्याचे नाव :- </span>
            <span style="display:inline-block;flex:1;border-bottom:1.5px solid #0f172a;margin-left:4px;height:1em;vertical-align:middle;min-width:16px;"></span>
          </div>
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:clamp(2px,0.6cqw,5px);white-space:nowrap;">
            <span style="font-size:clamp(7px,1.7cqw,10.5pt);font-weight:700;color:#0f172a;white-space:nowrap;">एकूण गुण -</span>
            <div contenteditable="true" data-field="total-marks-box" title="एकूण गुण संपादित करा" style="width:clamp(22px,4.6cqw,34px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:800;color:#0f172a;flex-shrink:0;cursor:text;outline:none;">${escapeHtmlStr(totalMarks)}</div>
          </div>
        </div>

        <!-- Row 5: Date | Obtained Marks (Eval Grid) -->
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;overflow:hidden;gap:4px;">
          <div data-field="exam-date" style="flex:0 0 auto;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <span>दि. </span><span contenteditable="true" data-field="date-text" style="outline:none;cursor:text;">${escapeHtmlStr(displayDate)}</span>
          </div>
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:clamp(2px,0.6cqw,5px);white-space:nowrap;">
            <span style="font-size:clamp(7px,1.7cqw,10.5pt);font-weight:700;color:#0f172a;white-space:nowrap;">मिळालेले गुण -</span>
            <div contenteditable="true" data-field="obtained-marks-box" style="width:clamp(20px,4.4cqw,32px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;flex-shrink:0;cursor:text;outline:none;"></div>
          </div>
        </div>
        ` : `
        <!-- Row 3: Class | Subject | Date (Standard Class 5-8) -->
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;overflow:hidden;gap:6px;">
          <div style="flex:0 1 auto;font-size:clamp(8px,1.85cqw,11.5pt);font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">
            <span contenteditable="true" data-field="class-text" style="outline:none;cursor:text;">${escapeHtmlStr(classStd)}</span>
          </div>
          <div style="flex:1 1 auto;font-size:clamp(8.5px,2.0cqw,12.5pt);font-weight:800;color:#0f172a;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 6px;min-width:0;">
            <span contenteditable="true" data-field="subject-text" style="outline:none;cursor:text;">${escapeHtmlStr(displaySubject)}</span>
          </div>
          <div data-field="exam-date" style="flex:0 0 auto;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            <span>दि. </span><span contenteditable="true" data-field="date-text" style="outline:none;cursor:text;">${escapeHtmlStr(displayDate)}</span>
          </div>
        </div>

        <!-- Row 4: Student Name (Standard Class 5-8) -->
        <div style="width:100%;display:flex;align-items:center;overflow:hidden;gap:4px;">
          <div style="display:flex;align-items:center;width:100%;min-width:0;font-size:clamp(8px,1.85cqw,11.5pt);font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;">
            <span style="flex-shrink:0;">विद्यार्थ्याचे नाव :- </span>
            <span style="display:inline-block;flex:1;border-bottom:1.5px solid #0f172a;margin-left:4px;height:1em;vertical-align:middle;min-width:40px;"></span>
          </div>
        </div>

        <!-- Row 5: Roll No | Division | Teacher Signature | Total Marks | Obtained Marks (Standard Class 5-8) -->
        <div style="width:100%;display:flex;align-items:center;justify-content:space-between;overflow:hidden;gap:clamp(3px,0.8cqw,8px);flex-wrap:nowrap;">
          <!-- Roll No -->
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:3px;white-space:nowrap;">
            <span style="font-size:clamp(7px,1.6cqw,10pt);font-weight:700;color:#0f172a;white-space:nowrap;">हजेरी क्रमांक -</span>
            <div contenteditable="true" data-field="roll-no-box" style="width:clamp(18px,3.8cqw,28px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;flex-shrink:0;cursor:text;outline:none;"></div>
          </div>

          <!-- Division -->
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:3px;white-space:nowrap;">
            <span style="font-size:clamp(7px,1.6cqw,10pt);font-weight:700;color:#0f172a;white-space:nowrap;">तुकडी -</span>
            <div contenteditable="true" data-field="division-box" style="width:clamp(16px,3.2cqw,24px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;flex-shrink:0;cursor:text;outline:none;"></div>
          </div>

          <!-- Teacher Signature -->
          <div style="flex:0 1 auto;display:flex;align-items:center;gap:2px;white-space:nowrap;min-width:0;overflow:hidden;">
            <span style="font-size:clamp(6.5px,1.5cqw,9.5pt);font-weight:700;color:#0f172a;white-space:nowrap;flex-shrink:0;">शिक्षकांची स्वाक्षरी -</span>
            <span style="display:inline-block;width:clamp(25px,6cqw,60px);border-bottom:1.5px dotted #0f172a;margin-left:2px;height:1em;vertical-align:middle;flex-shrink:1;"></span>
          </div>

          <!-- Total Marks -->
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:3px;white-space:nowrap;">
            <span style="font-size:clamp(7px,1.6cqw,10pt);font-weight:700;color:#0f172a;white-space:nowrap;">एकूण गुण -</span>
            <div contenteditable="true" data-field="total-marks-box" title="एकूण गुण संपादित करा" style="width:clamp(20px,4.2cqw,32px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:800;color:#0f172a;flex-shrink:0;cursor:text;outline:none;">${escapeHtmlStr(totalMarks)}</div>
          </div>

          <!-- Obtained Marks -->
          <div style="flex:0 0 auto;display:flex;align-items:center;gap:3px;white-space:nowrap;">
            <span style="font-size:clamp(7px,1.6cqw,10pt);font-weight:700;color:#0f172a;white-space:nowrap;">मिळालेले गुण -</span>
            <div contenteditable="true" data-field="obtained-marks-box" style="width:clamp(18px,3.8cqw,28px);height:clamp(13px,3.0cqw,20px);border:1.5px solid #0f172a;border-radius:3px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:clamp(8px,1.85cqw,11pt);font-weight:700;color:#0f172a;flex-shrink:0;cursor:text;outline:none;"></div>
          </div>
        </div>
        `}
      `;

      updatedSchool = true;
      updatedDate = true;
    });

    // 2. Also check standard docx tables/paragraphs if VML wasn't matched
    if (!updatedSchool) {
      const allTextEls = containerRef.current.querySelectorAll<HTMLElement>("p, td, span, div");
      for (const el of Array.from(allTextEls)) {
        const text = el.textContent || "";
        if (el.children.length === 0 && (text.includes("शाळेचे नाव") || /school\s*name/i.test(text))) {
          const isEng = /school/i.test(text);
          const labelText = isEng ? "SCHOOL NAME -" : "शाळेचे नाव :";
          if (cleanSchool) {
            const clean = cleanSchool.replace(/^(?:शाळेचे\s*नाव|school\s*name)\s*[:\-–—]?\s*/i, "").trim();
            el.innerHTML = `
              <div style="display: flex; flex-direction: column; width: 100%; max-width: 100%; overflow: visible; font-size: inherit; line-height: 1.3;">
                <div class="qp-school-name-block" style="display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; overflow: visible;">
                  <strong style="white-space: nowrap; color: #0f172a; font-size: inherit; font-weight: 700;">${labelText} </strong>
                  <span class="qp-school-text" style="font-weight: 700; color: #0f172a; margin-left: 4px; font-size: inherit; white-space: normal; word-break: break-word;">${escapeHtmlStr(clean)}</span>
                </div>
                ${subInfoHtml ? `<div style="display: flex; align-items: center; justify-content: center; width: 100%; margin-top: 2px; font-size: inherit; overflow: visible;">${subInfoHtml}</div>` : ""}
              </div>
            `;
          } else {
            el.innerHTML = `
              <div style="display: flex; flex-direction: column; width: 100%; overflow: visible; font-size: inherit; line-height: 1.3;">
                <div class="qp-school-name-block" style="display: flex; align-items: center; justify-content: center; text-align: center; width: 100%; overflow: visible;">
                  <strong style="white-space: nowrap; color: #0f172a; font-size: inherit; font-weight: 700;">${labelText} </strong>....................................................
                </div>
                ${subInfoHtml ? `<div style="display: flex; align-items: center; justify-content: center; width: 100%; margin-top: 2px; font-size: inherit; overflow: visible;">${subInfoHtml}</div>` : ""}
              </div>
            `;
          }
          updatedSchool = true;
          break;
        }
      }
    }

    // 4. Inject signature block on the last page of each subject section.
    // Use data-is-subject-end stamped at parse time from raw XML — never from textContent
    // (which would be contaminated by injected "विषय -" text from the header box).
    containerRef.current.querySelectorAll('.qp-signatures-block').forEach(el => el.remove());

    if (vmlPages.length > 0) {
      const hasDataAttrs = Array.from(vmlPages).some(p => p.hasAttribute("data-is-subject-end"));

      if (hasDataAttrs) {
        // ── Reliable path: use parse-time attributes ──
        vmlPages.forEach((page) => {
          if (page.getAttribute("data-is-subject-end") !== "true") return;

          const pageText = page.textContent || "";
          const isEnglishSubject = /english|oral\s*&amp;\s*practical|listen and act/i.test(pageText);
          const teacherLabel = isEnglishSubject ? "Class Teacher :" : "वर्ग शिक्षक :";
          const hmLabel = isEnglishSubject ? "Headmaster :" : "मुख्याध्यापक :";
          const teacherDisplay = cleanTeacher || "_______________";
          const hmDisplay = cleanHm || "_______________";

          const sigBlock = document.createElement("div");
          sigBlock.className = "qp-signatures-block";
          sigBlock.setAttribute("data-field", "qp-signatures-block");
          sigBlock.style.cssText = `
            position: absolute;
            left: 8.27%;
            width: 83.46%;
            bottom: 1.8%;
            z-index: 15;
            background: #ffffff;
            padding: 8px 18px;
            border-top: 1.5px dashed #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: clamp(8.5px, 2.0cqw, 11pt);
            font-weight: 700;
            color: #0f172a;
            box-sizing: border-box;
            pointer-events: auto;
          `;
          sigBlock.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: inherit;">
              <span style="color: #475569; font-size: inherit;">${teacherLabel}</span>
              <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px dotted #64748b; min-width: 90px; padding: 0 4px; display: inline-block; font-size: inherit;">${escapeHtmlStr(teacherDisplay)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: inherit;">
              <span style="color: #475569; font-size: inherit;">${hmLabel}</span>
              <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px dotted #64748b; min-width: 90px; padding: 0 4px; display: inline-block; font-size: inherit;">${escapeHtmlStr(hmDisplay)}</span>
            </div>
          `;
          page.appendChild(sigBlock);
        });
      } else {
        // ── Legacy fallback: detect subject sections from raw .vml-shape-text content ──
        // (Used for non-VML or older cached documents that lack data-is-subject-end)
        const subjectStartIndices: number[] = [];
        const subjectNames: string[] = [];

        vmlPages.forEach((page, pIdx) => {
          // ONLY look at actual vml-shape-text elements, NOT the injected header box
          const rawShapes = Array.from(page.querySelectorAll<HTMLElement>('.vml-shape-text'));
          let foundSubjectName = "";
          let isStart = false;

          for (const s of rawShapes) {
            const t = (s.textContent || '').trim();
            const match = t.match(/(?:विषय|subject|sub)\s*[-–:]\s*([^\n\r]+)/i);
            if (match && match[1]) {
              foundSubjectName = match[1].trim();
              isStart = true;
              break;
            }
          }

          // Only check page.textContent if no shape matched — and exclude header box text
          if (!isStart) {
            // Get text from shapes only, not from injected boxes
            const rawText = rawShapes.map(s => s.textContent || "").join(" ");
            const rawMatch = rawText.match(/(?:विषय|subject)\s*[-–:]\s*(भाषा|मराठी|english|इंग्रजी|गणित|math|विज्ञान|परिसर)/i);
            if (rawMatch && rawMatch[1]) {
              foundSubjectName = rawMatch[1].trim();
              isStart = true;
            }
          }

          if (pIdx === 0) isStart = true;

          if (isStart) {
            subjectStartIndices.push(pIdx);
            subjectNames.push(foundSubjectName || `Subject ${subjectStartIndices.length}`);
          }
        });

        const subjectEndIndices: number[] = [];
        for (let k = 0; k < subjectStartIndices.length; k++) {
          if (k + 1 < subjectStartIndices.length) {
            subjectEndIndices.push(Math.max(subjectStartIndices[k], subjectStartIndices[k + 1] - 1));
          } else {
            subjectEndIndices.push(vmlPages.length - 1);
          }
        }
        const uniqueEndIndices = Array.from(new Set(subjectEndIndices));

        uniqueEndIndices.forEach((endIdx) => {
          const targetPage = vmlPages[endIdx];
          if (!targetPage) return;

          const pageText = targetPage.textContent || "";
          const isEnglishSubject = /english|oral\s*&amp;\s*practical|listen and act/i.test(pageText);
          const teacherLabel = isEnglishSubject ? "Class Teacher :" : "वर्ग शिक्षक :";
          const hmLabel = isEnglishSubject ? "Headmaster :" : "मुख्याध्यापक :";
          const teacherDisplay = cleanTeacher || "_______________";
          const hmDisplay = cleanHm || "_______________";

          const sigBlock = document.createElement("div");
          sigBlock.className = "qp-signatures-block";
          sigBlock.setAttribute("data-field", "qp-signatures-block");
          sigBlock.style.cssText = `
            position: absolute;
            left: 8.27%;
            width: 83.46%;
            bottom: 1.8%;
            z-index: 15;
            background: #ffffff;
            padding: 8px 18px;
            border-top: 1.5px dashed #334155;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: clamp(8.5px, 2.0cqw, 11pt);
            font-weight: 700;
            color: #0f172a;
            box-sizing: border-box;
            pointer-events: auto;
          `;
          sigBlock.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: inherit;">
              <span style="color: #475569; font-size: inherit;">${teacherLabel}</span>
              <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px dotted #64748b; min-width: 90px; padding: 0 4px; display: inline-block; font-size: inherit;">${escapeHtmlStr(teacherDisplay)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: inherit;">
              <span style="color: #475569; font-size: inherit;">${hmLabel}</span>
              <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px dotted #64748b; min-width: 90px; padding: 0 4px; display: inline-block; font-size: inherit;">${escapeHtmlStr(hmDisplay)}</span>
            </div>
          `;
          targetPage.appendChild(sigBlock);
        });
      }
    } else {
      let sigBlock = containerRef.current.querySelector<HTMLElement>('[data-field="qp-signatures-block"]');
      if (!sigBlock) {
        sigBlock = document.createElement("div");
        sigBlock.className = "qp-signatures-block";
        sigBlock.setAttribute("data-field", "qp-signatures-block");
        containerRef.current.appendChild(sigBlock);
      }
      const teacherDisplay = cleanTeacher || "_______________";
      const hmDisplay = cleanHm || "_______________";
      sigBlock.style.cssText = `
        margin-top: 36px;
        padding: 12px 18px;
        border-top: 1.5px dashed #475569;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        background: #ffffff;
      `;
      sigBlock.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
          <span style="color: #475569;">वर्ग शिक्षक :</span>
          <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px dotted #64748b; min-width: 90px; padding: 0 4px;">${escapeHtmlStr(teacherDisplay)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
          <span style="color: #475569;">मुख्याध्यापक :</span>
          <span style="font-weight: 700; color: #1e3a8a; border-bottom: 1px dotted #64748b; min-width: 90px; padding: 0 4px;">${escapeHtmlStr(hmDisplay)}</span>
        </div>
      `;
    }

    // Save strictly for this specific user
    const userKey = `user_school_name_${userId || "guest"}`;
    if (cleanSchool) {
      localStorage.setItem(userKey, cleanSchool);
      if (userId && userId !== "guest" && userId !== "guest_teacher") {
        localStorage.setItem(
          `qp_school_info_${userId}`,
          JSON.stringify({
            schoolName: cleanSchool,
            kendra: cleanKendra,
            taluka: cleanTaluka,
            jilha: cleanJilha,
            teacherName: cleanTeacher,
            headmaster: cleanHm,
            headmasterName: cleanHm,
          })
        );
      }
    }
    localStorage.removeItem("last_paper_school_name");

    try {
      saveUnifiedSchoolProfileToFirestore(
        {
          schoolName: cleanSchool,
          kendra: cleanKendra,
          taluka: cleanTaluka,
          jilha: cleanJilha,
          teacherName: cleanTeacher,
          headmaster: cleanHm,
        },
        userId
      );
    } catch (err) {
      console.warn("Could not save unified profile to Firestore:", err);
    }

    setHasUnsavedChanges(true);

    if (notify) {
      toast.success("शाळेचे नाव, केंद्र, तालुका, जिल्हा व स्वाक्षरी माहिती प्रश्नपत्रिकेत अचूक भरली गेली!");
    }
  };

  const handleSchoolNameChange = (val: string) => {
    setSchoolNameInput(val);
    applyHeaderInfo(val, examDateInput, kendraInput, talukaInput, jilhaInput, teacherNameInput, headmasterNameInput, false);
  };

  const handleExamDateChange = (val: string) => {
    setExamDateInput(val);
    applyHeaderInfo(schoolNameInput, val, kendraInput, talukaInput, jilhaInput, teacherNameInput, headmasterNameInput, false);
  };

  // Paginate homework document into clean, exact A4 page sheets (Page 1 = Marathi, Page 2 = English + Math, etc.)
  const paginateHomeworkDocument = () => {
    if (!containerRef.current) return;

    // If already paginated with multiple sheets, don't re-run
    const existingSheets = containerRef.current.querySelectorAll(".homework-page-sheet");
    if (existingSheets.length > 1) return;

    // Find the elements to paginate:
    // docx-preview puts elements inside .docx-wrapper > section.docx > article
    // Mammoth puts elements directly inside containerRef.current
    let contentParent: HTMLElement | null = null;
    const docxArticle = containerRef.current.querySelector<HTMLElement>(".docx-wrapper > section.docx > article");
    const docxSection = containerRef.current.querySelector<HTMLElement>(".docx-wrapper > section.docx");

    if (docxArticle) {
      contentParent = docxArticle;
    } else if (docxSection) {
      contentParent = docxSection;
    } else {
      contentParent = containerRef.current;
    }

    const rawChildren = Array.from(contentParent.children) as HTMLElement[];
    if (rawChildren.length < 2) return;

    // Clean empty spacer paragraphs from page transitions
    const isBlankElement = (el: HTMLElement) => {
      if (el.querySelector("img, svg, table, canvas, iframe")) return false;
      const text = (el.textContent || "").trim();
      return text.length === 0;
    };

    // Group elements into distinct pages
    const pages: HTMLElement[][] = [[]];
    let curPageIndex = 0;

    for (let i = 0; i < rawChildren.length; i++) {
      const el = rawChildren[i];
      const text = (el.textContent || "").trim();

      // Check for page break triggers:
      // 1. Explicit page break classes/styles
      const isExplicitBreak =
        el.style.pageBreakBefore === "always" ||
        el.style.breakBefore === "page" ||
        el.classList.contains("docx-page-break") ||
        el.classList.contains("page-break");

      // 2. Secondary homework page header (e.g. "घरचा अभ्यास • इयत्ता..." or "घरचा अभ्यास -...")
      const isHwPageHeader =
        (text.includes("घरचा अभ्यास •") ||
         text.includes("घरचा अभ्यास -") ||
         text.includes("घरचा अभ्यास –") ||
         text.includes("घरचा अभ्यास —") ||
         (text.includes("घरचा अभ्यास") && text.includes("इयत्ता") && !text.includes("शाळेचे नाव"))) &&
        pages[curPageIndex].length > 0;

      // 3. New subject header (e.g. "२) My English Book", "३) गणित", "४) परिसर अभ्यास", "विषय : ...", etc.)
      // Any new subject starts on a brand new page!
      const isSubjectHeader =
        // Matches subject names with number 2-9 (Marathi or English numerals)
        ((/^[२-९2-9]\s*[\)\.\-–]\s*(My English Book|English|इंग्रजी|गणित|Mathematics|Maths|बालभारती|मराठी|परिसर अभ्यास|परिसर|Science|विज्ञान|इतिहास|भूगोल|हिंदी|Hindi|कला|कार्यानुभव|शारीरिक)/i.test(text) ||
          // Matches "विषय :" or "Subject :" headings
          /^(विषय\s*[:\-–]|Subject\s*[:\-–])/i.test(text) ||
          // Matches generic numbered headings like "२) ...", "३) ...", "४) ..." with dash/colon, not starting with sub-question "("
          (/^[२-९2-9]\s*[\)\.\-–]\s+[^\n\r]{3,}/.test(text) &&
           !text.startsWith("(") &&
           (text.includes("–") || text.includes("-") || text.includes(":")))) &&
         pages[curPageIndex].length >= 2);

      const shouldBreak = isExplicitBreak || isHwPageHeader || isSubjectHeader;

      if (shouldBreak && pages[curPageIndex].length > 0) {
        curPageIndex++;
        pages[curPageIndex] = [];
      }

      pages[curPageIndex].push(el);
    }

    // Only apply if we split into 2 or more pages
    if (pages.length <= 1) return;

    // Clean container styling to transparent so each page sheet shows as its own white paper
    containerRef.current.style.backgroundColor = "transparent";
    containerRef.current.style.boxShadow = "none";

    // Clean blank elements from start and end of each page
    pages.forEach((pageEls) => {
      while (pageEls.length > 0 && isBlankElement(pageEls[0])) {
        pageEls.shift();
      }
      while (pageEls.length > 0 && isBlankElement(pageEls[pageEls.length - 1])) {
        pageEls.pop();
      }
    });

    // Build paginated container
    const newWrapper = document.createElement("div");
    newWrapper.className = "docx-wrapper hw-paginated-wrapper";

    pages.forEach((pageEls, pIdx) => {
      if (pageEls.length === 0) return;
      const section = document.createElement("section");
      section.className = "docx homework-page-sheet";
      section.setAttribute("data-page-index", String(pIdx + 1));

      const article = document.createElement("article");
      article.className = "docx-article";

      pageEls.forEach((child) => {
        article.appendChild(child);
      });

      section.appendChild(article);
      newWrapper.appendChild(section);
    });

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(newWrapper);
  };

  // Apply all homework header fields and fit them properly across the page
  const applyHomeworkHeaderInfo = (notify = true, overrideProfile?: HomeworkHeaderProfile) => {
    if (!containerRef.current) return;

    // Resolve profile values from: 1) overrideProfile, 2) fresh from localStorage, 3) React state
    const savedProf = overrideProfile || getHomeworkHeaderProfile(userId);
    const activeSchool = (hwSchoolName || savedProf.schoolName || "").trim();
    const activeKendra = (hwKendra || savedProf.kendra || "").trim();
    const activeTaluka = (hwTaluka || savedProf.taluka || "").trim();
    const activeDistrict = (hwDistrict || savedProf.district || "").trim();
    const activeTeacher = (hwTeacherName || savedProf.teacherName || "").trim();
    const activeHeadmaster = (hwHeadmasterName || savedProf.headmasterName || "").trim();

    // Synchronize React states if state was empty but profile had values
    if (!hwSchoolName && activeSchool) setHwSchoolName(activeSchool);
    if (!hwKendra && activeKendra) setHwKendra(activeKendra);
    if (!hwTaluka && activeTaluka) setHwTaluka(activeTaluka);
    if (!hwDistrict && activeDistrict) setHwDistrict(activeDistrict);
    if (!hwTeacherName && activeTeacher) setHwTeacherName(activeTeacher);
    if (!hwHeadmasterName && activeHeadmaster) setHwHeadmasterName(activeHeadmaster);

    // Dynamic font size for Line 1 to guarantee 100% fit on one line without breaking margins
    const schoolLen = activeSchool.length;
    const line1FontSize = schoolLen > 36 ? "10pt" : schoolLen > 24 ? "11pt" : "11.5pt";

    const displaySchool = activeSchool
      ? escapeHtmlStr(activeSchool)
      : '<span style="color: #64748b; letter-spacing: 1px;">....................................</span>';
    const displayKendra = activeKendra
      ? escapeHtmlStr(activeKendra)
      : '<span style="color: #64748b; letter-spacing: 1px;">................</span>';
    const displayTaluka = activeTaluka
      ? escapeHtmlStr(activeTaluka)
      : '<span style="color: #64748b; letter-spacing: 1px;">................</span>';
    const displayDistrict = activeDistrict
      ? escapeHtmlStr(activeDistrict)
      : '<span style="color: #64748b; letter-spacing: 1px;">................</span>';

    // Helper to format Line 1: शाळेचे नाव, केंद्र, तालुका, जिल्हा (Borderless 4-cell table)
    const line1Html = `
      <table data-header-field="hw-line-1" style="width: 100% !important; border-collapse: collapse !important; border: none !important; margin: 6px 0 3px 0 !important; font-size: ${line1FontSize} !important; line-height: 1.4 !important; color: #000000 !important; background: transparent !important; table-layout: fixed !important;">
        <tbody>
          <tr style="border: none !important; background: transparent !important;">
            <td style="border: none !important; padding: 2px 4px 2px 0 !important; text-align: left !important; width: 40% !important; vertical-align: middle !important; background: transparent !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
              <strong style="white-space: nowrap !important;">शाळेचे नाव : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${displaySchool}</span>
            </td>
            <td style="border: none !important; padding: 2px 4px !important; text-align: center !important; width: 20% !important; vertical-align: middle !important; background: transparent !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
              <strong style="white-space: nowrap !important;">केंद्र : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${displayKendra}</span>
            </td>
            <td style="border: none !important; padding: 2px 4px !important; text-align: center !important; width: 20% !important; vertical-align: middle !important; background: transparent !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
              <strong style="white-space: nowrap !important;">तालुका : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${displayTaluka}</span>
            </td>
            <td style="border: none !important; padding: 2px 0 2px 4px !important; text-align: right !important; width: 20% !important; vertical-align: middle !important; background: transparent !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
              <strong style="white-space: nowrap !important;">जिल्हा : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${displayDistrict}</span>
            </td>
          </tr>
        </tbody>
      </table>
    `.trim();

    // Helper to format Line 2: वार, दिनांक, इयत्ता (Borderless 3-cell table)
    const line2Html = `
      <table data-header-field="hw-line-2" style="width: 100% !important; border-collapse: collapse !important; border: none !important; margin: 3px 0 4px 0 !important; font-size: 11.5pt !important; line-height: 1.4 !important; color: #000000 !important; background: transparent !important; table-layout: fixed !important;">
        <tbody>
          <tr style="border: none !important; background: transparent !important;">
            <td style="border: none !important; padding: 2px 4px 2px 0 !important; text-align: left !important; width: 30% !important; vertical-align: middle !important; background: transparent !important;">
              <strong>वार : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${escapeHtmlStr(hwDayOfWeek || "शुक्रवार")}</span>
            </td>
            <td style="border: none !important; padding: 2px 4px !important; text-align: center !important; width: 45% !important; vertical-align: middle !important; background: transparent !important;">
              <strong>दिनांक : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${escapeHtmlStr(hwDateStr || "१२ ऑक्टोबर २०२६")}</span>
            </td>
            <td style="border: none !important; padding: 2px 0 2px 4px !important; text-align: right !important; width: 25% !important; vertical-align: middle !important; background: transparent !important;">
              <strong>इयत्ता : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a;">${escapeHtmlStr(hwClassName || "१ ली")}</span>
            </td>
          </tr>
        </tbody>
      </table>
    `.trim();

    // Helper to format Line 3: विद्यार्थ्याचे नाव
    const line3Html = `
      <p data-header-field="hw-line-3" style="width: 100% !important; margin: 4px 0 8px 0 !important; font-size: 11.5pt !important; line-height: 1.4 !important; color: #000000 !important; background: transparent !important; text-align: left !important;">
        <strong>विद्यार्थ्याचे नाव : </strong><span contenteditable="true" style="font-weight: 700; color: #0f172a; margin-left: 4px;">${escapeHtmlStr(hwStudentName || "....................................................................................")}</span>
      </p>
    `.trim();

    let updatedLine1 = false;
    let updatedLine2 = false;
    let updatedLine3 = false;
    let updatedSign = false;

    // Helper to format Signature block: शिक्षकाचे नाव, स्वाक्षरी आणि मुख्याध्यापकाचे नाव, स्वाक्षरी व शिक्का
    const teacherDisplay = escapeHtmlStr(activeTeacher || "....................................");
    const hmDisplay = escapeHtmlStr(activeHeadmaster || "....................................");
    const lineSignHtml = `
      <table data-header-field="hw-signature-block" style="width: 100% !important; border-collapse: collapse !important; border: none !important; margin: 32px 0 12px 0 !important; font-size: 11.5pt !important; line-height: 1.5 !important; color: #000000 !important; background: transparent !important; table-layout: fixed !important;">
        <tbody>
          <tr style="border: none !important; background: transparent !important;">
            <td style="border: none !important; padding: 6px 12px 6px 0 !important; text-align: left !important; width: 50% !important; vertical-align: bottom !important; background: transparent !important;">
              <div style="font-size: 10pt; color: #334155; margin-bottom: 24px;">
                स्वाक्षरी : <span style="display: inline-block; width: 140px; border-bottom: 1.5px dotted #64748b; vertical-align: middle;"></span>
              </div>
              <div style="font-weight: 700; font-size: 11.5pt; color: #0f172a;">
                शिक्षकाचे नाव : <span contenteditable="true" style="font-weight: 700; color: #1e293b;">${teacherDisplay}</span>
              </div>
              <div style="font-size: 9.5pt; color: #64748b; margin-top: 3px;">(वर्ग शिक्षक स्वाक्षरी)</div>
            </td>
            <td style="border: none !important; padding: 6px 0 6px 12px !important; text-align: right !important; width: 50% !important; vertical-align: bottom !important; background: transparent !important;">
              <div style="font-size: 10pt; color: #334155; margin-bottom: 24px; text-align: right;">
                स्वाक्षरी व शिक्का : <span style="display: inline-block; width: 140px; border-bottom: 1.5px dotted #64748b; vertical-align: middle;"></span>
              </div>
              <div style="font-weight: 700; font-size: 11.5pt; color: #0f172a; text-align: right;">
                मुख्याध्यापकाचे नाव : <span contenteditable="true" style="font-weight: 700; color: #1e293b;">${hmDisplay}</span>
              </div>
              <div style="font-size: 9.5pt; color: #64748b; margin-top: 3px; text-align: right;">(मुख्याध्यापक स्वाक्षरी व शिक्का)</div>
            </td>
          </tr>
        </tbody>
      </table>
    `.trim();

    // 1. Check if previously marked elements exist
    const existing1 = containerRef.current.querySelector('[data-header-field="hw-line-1"]');
    if (existing1) {
      existing1.outerHTML = line1Html;
      updatedLine1 = true;
    }

    const existing2 = containerRef.current.querySelector('[data-header-field="hw-line-2"]');
    if (existing2) {
      existing2.outerHTML = line2Html;
      updatedLine2 = true;
    }

    const existing3 = containerRef.current.querySelector('[data-header-field="hw-line-3"]');
    if (existing3) {
      existing3.outerHTML = line3Html;
      updatedLine3 = true;
    }

    const existingSign = containerRef.current.querySelector('[data-header-field="hw-signature-block"]');
    if (existingSign) {
      existingSign.outerHTML = lineSignHtml;
      updatedSign = true;
    }

    // 2. If not previously updated, search matching paragraph elements strictly (avoiding wrapper divs/sections)
    const allPs = Array.from(containerRef.current.querySelectorAll<HTMLElement>("p"));
    for (const el of allPs) {
      const txt = (el.textContent || "").trim();
      if (!updatedLine1 && (txt.includes("शाळेचे नाव") || (txt.includes("केंद्र") && txt.includes("तालुका")))) {
        el.outerHTML = line1Html;
        updatedLine1 = true;
        continue;
      }
      if (!updatedLine2 && ((txt.includes("वार") || txt.includes("वार :")) && (txt.includes("दिनांक") || txt.includes("इयत्ता")))) {
        el.outerHTML = line2Html;
        updatedLine2 = true;
        continue;
      }
      if (!updatedLine3 && txt.includes("विद्यार्थ्याचे नाव")) {
        el.outerHTML = line3Html;
        updatedLine3 = true;
        continue;
      }
      if (
        !updatedSign &&
        ((txt.includes("शिक्षकाचे नाव") && (txt.includes("मुख्याध्यापक") || txt.includes("मुख्याध्यापकाचे"))) ||
          (txt.includes("शिक्षक") && txt.includes("मुख्याध्यापक") && (txt.includes("नाव") || txt.includes("सही") || txt.includes("स्वाक्षरी"))))
      ) {
        el.outerHTML = lineSignHtml;
        updatedSign = true;
        continue;
      }
    }

    // 3. Fallback: only if <p> was not found, check leaf elements (must not contain child p, div, table)
    if (!updatedLine1 || !updatedLine2 || !updatedLine3 || !updatedSign) {
      const leafEls = Array.from(containerRef.current.querySelectorAll<HTMLElement>("td, div, span")).filter(
        (el) => el.querySelectorAll("p, table, div").length === 0
      );
      for (const el of leafEls) {
        const txt = (el.textContent || "").trim();
        if (!updatedLine1 && (txt.includes("शाळेचे नाव") || (txt.includes("केंद्र") && txt.includes("तालुका")))) {
          el.outerHTML = line1Html;
          updatedLine1 = true;
          continue;
        }
        if (!updatedLine2 && ((txt.includes("वार") || txt.includes("वार :")) && (txt.includes("दिनांक") || txt.includes("इयत्ता")))) {
          el.outerHTML = line2Html;
          updatedLine2 = true;
          continue;
        }
        if (!updatedLine3 && txt.includes("विद्यार्थ्याचे नाव")) {
          el.outerHTML = line3Html;
          updatedLine3 = true;
          continue;
        }
        if (
          !updatedSign &&
          ((txt.includes("शिक्षकाचे नाव") && (txt.includes("मुख्याध्यापक") || txt.includes("मुख्याध्यापकाचे"))) ||
            (txt.includes("शिक्षक") && txt.includes("मुख्याध्यापक") && (txt.includes("नाव") || txt.includes("सही") || txt.includes("स्वाक्षरी"))))
        ) {
          el.outerHTML = lineSignHtml;
          updatedSign = true;
          continue;
        }
      }
    }

    // 3b. Also check if separate elements exist for teacher and headmaster signatures
    if (!updatedSign) {
      const allLeafs = Array.from(containerRef.current.querySelectorAll<HTMLElement>("p, div, td")).filter(
        (el) => el.querySelectorAll("p, table, div").length === 0
      );
      const teacherEl = allLeafs.find((p) => {
        const t = (p.textContent || "").trim();
        return t.includes("शिक्षकाचे नाव") || (t.includes("शिक्षक") && (t.includes("सही") || t.includes("स्वाक्षरी")));
      });
      const hmEl = allLeafs.find((p) => {
        const t = (p.textContent || "").trim();
        return t.includes("मुख्याध्यापक") || t.includes("मुख्याध्यापकाचे");
      });
      if (teacherEl && hmEl && teacherEl !== hmEl) {
        teacherEl.outerHTML = lineSignHtml;
        hmEl.remove();
        updatedSign = true;
      } else if (teacherEl) {
        teacherEl.outerHTML = lineSignHtml;
        updatedSign = true;
      }
    }

    // 3c. If signature line wasn't found in text, place it at the bottom of the worksheet sheet
    if (!updatedSign) {
      const targetParent =
        containerRef.current.querySelector(".homework-page-sheet:last-of-type .docx-article") ||
        containerRef.current.querySelector(".homework-page-sheet:last-of-type") ||
        containerRef.current.querySelector(".docx-wrapper") ||
        containerRef.current;
      if (targetParent) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = lineSignHtml;
        if (tempDiv.firstElementChild) {
          targetParent.appendChild(tempDiv.firstElementChild);
          updatedSign = true;
        }
      }
    }

    // 4. Also synchronize secondary page header on Page 2 if present
    const allHeaders = Array.from(containerRef.current.querySelectorAll<HTMLElement>("p"));
    for (const p of allHeaders) {
      const txt = (p.textContent || "").trim();
      if ((txt.includes("घरचा अभ्यास •") || txt.includes("घरचा अभ्यास -")) && !txt.includes("शाळेचे नाव")) {
        p.innerHTML = `<strong>घरचा अभ्यास • इयत्ता ${escapeHtmlStr(hwClassName || "१ ली")}</strong>`;
        p.style.textAlign = "center";
        p.style.fontWeight = "bold";
        p.style.margin = "6px 0 10px 0";
      }
    }

    // Remember School, Kendra, Taluka, District, Teacher Name, Headmaster Name in localStorage only when user explicitly submits
    if (notify) {
      saveHomeworkHeaderProfile(userId, {
        schoolName: activeSchool,
        kendra: activeKendra,
        taluka: activeTaluka,
        district: activeDistrict,
        teacherName: activeTeacher,
        headmasterName: activeHeadmaster,
      });
    }

    setHasUnsavedChanges(true);
    setShowHwHeaderModal(false);

    if (notify) {
      if (updatedLine1 || updatedLine2 || updatedLine3 || updatedSign) {
        toast.success("सर्व माहिती व स्वाक्षरी गृहपाठात अचूक बसवण्यात आली!");
      } else {
        toast.info("माहिती अपडेट झाली!");
      }
    }
  };

  // Helper: Renders any page element at 100% desktop A4 fidelity (794px width) in an offscreen container.
  // This guarantees that in Android WebViews and mobile browsers, the downloaded PDF has
  // zero text wrapping divergence, zero overlapping text, and matches desktop web exactly!
  const renderElementToA4Canvas = async (pageEl: HTMLElement): Promise<{ canvas: HTMLCanvasElement; aspect: number }> => {
    // 1. Determine target dimensions
    // Standard A4 width = 595.28 pt, height = 841.89 pt.
    // In CSS screen pixels at 96 DPI: 595.28 * 4/3 = ~794px, 841.89 * 4/3 = ~1123px.
    let aspect = 841.89 / 595.28; // 1.4142
    const aspectMatch = pageEl.style.aspectRatio?.match(/([0-9.]+)\s*\/\s*([0-9.]+)/);
    if (aspectMatch) {
      const wPt = parseFloat(aspectMatch[1]) || 595.28;
      const hPt = parseFloat(aspectMatch[2]) || 841.89;
      aspect = hPt / wPt;
    }

    const targetWidthPx = 794;
    const targetHeightPx = Math.round(targetWidthPx * aspect);

    // 2. Create off-screen desktop capture wrapper with fixed 794px desktop width
    // Placed at (0, 0) with zIndex: -99999 and pointerEvents: none so Android WebView
    // paints it inside the viewport raster tree without flickering or culling (fixes blank PDF in WebView)
    const captureContainer = document.createElement("div");
    captureContainer.style.position = "fixed";
    captureContainer.style.left = "0px";
    captureContainer.style.top = "0px";
    captureContainer.style.width = `${targetWidthPx}px`;
    captureContainer.style.minWidth = `${targetWidthPx}px`;
    captureContainer.style.maxWidth = `${targetWidthPx}px`;
    captureContainer.style.height = `${targetHeightPx}px`;
    captureContainer.style.minHeight = `${targetHeightPx}px`;
    captureContainer.style.maxHeight = `${targetHeightPx}px`;
    captureContainer.style.overflow = "hidden";
    captureContainer.style.zIndex = "-99999";
    captureContainer.style.pointerEvents = "none";
    captureContainer.style.background = "#ffffff";
    captureContainer.style.boxSizing = "border-box";

    // 3. Clone the element
    const clone = pageEl.cloneNode(true) as HTMLElement;
    clone.style.width = `${targetWidthPx}px`;
    clone.style.minWidth = `${targetWidthPx}px`;
    clone.style.maxWidth = `${targetWidthPx}px`;
    clone.style.height = `${targetHeightPx}px`;
    clone.style.minHeight = `${targetHeightPx}px`;
    clone.style.maxHeight = `${targetHeightPx}px`;
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0px";
    clone.style.transform = "none";
    clone.style.boxSizing = "border-box";
    clone.style.position = "relative";
    clone.style.overflow = "hidden";

    // 4. In clone, lock all VML shape text boxes to exact desktop pixel font sizes
    // This prevents html2canvas in Android WebView from failing on cqw or miscomputing font scale!
    const shapeTexts = Array.from(clone.querySelectorAll<HTMLElement>(".vml-shape-text"));
    shapeTexts.forEach((el) => {
      const inlineStyle = el.getAttribute("style") || "";
      const ptMatch = inlineStyle.match(/font-size:\s*([0-9.]+)pt/i);
      if (ptMatch) {
        const ptVal = parseFloat(ptMatch[1]);
        const pxVal = (ptVal * (4 / 3)).toFixed(2);
        el.style.fontSize = `${pxVal}px`;
      }
    });

    captureContainer.appendChild(clone);
    document.body.appendChild(captureContainer);

    try {
      // 5. Ensure all images in clone are completely loaded
      const cloneImages = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(
        cloneImages.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );

      // Wait 2 animation frames for browser to lay out the off-screen clone
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // 6. Capture with high-DPI desktop scale
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: targetWidthPx,
        windowHeight: targetHeightPx,
        width: targetWidthPx,
        height: targetHeightPx,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: (clonedDoc) => {
          try {
            const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"));
            styleTags.forEach((st) => {
              clonedDoc.head.appendChild(st.cloneNode(true));
            });
          } catch (_) {}
        },
      });

      return { canvas, aspect };
    } finally {
      if (captureContainer.parentNode) {
        captureContainer.parentNode.removeChild(captureContainer);
      }
    }
  };

  // Download as-it-is PDF
  const handleDownloadPdf = async () => {
    if (!containerRef.current) return;
    try {
      setIsDownloadingPdf(true);
      toast.info("PDF तयार होत आहे, कृपया प्रतीक्षा करा...", { duration: 3500 });

      // Unfocus any active element to remove editor focus outlines
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Ensure all web fonts and images are completely loaded
      await document.fonts.ready;
      const images = Array.from(containerRef.current.querySelectorAll<HTMLImageElement>("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );

      // Find visible pages to capture
      const vmlPages = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(".vml-page-wrapper")
      ).filter((p) => p.style.display !== "none" && !p.classList.contains("vml-page-hidden"));

      let pageElements: HTMLElement[] = [];
      if (vmlPages.length > 0) {
        pageElements = vmlPages;
      } else {
        const docxPages = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(
            ".homework-page-sheet, .docx-wrapper > section.docx, .docx-wrapper > section.docx-doc"
          )
        ).filter((p) => p.style.display !== "none");
        if (docxPages.length > 0) {
          pageElements = docxPages;
        } else {
          pageElements = [containerRef.current];
        }
      }

      let pdf: jsPDF | null = null;

      if (vmlPages.length > 0 || pageElements.length > 1) {
        // Multi-page document: capture each page individually with exact desktop A4 fidelity
        for (let i = 0; i < pageElements.length; i++) {
          const pageEl = pageElements[i];
          const { canvas, aspect } = await renderElementToA4Canvas(pageEl);

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const isHomeworkSheet = pageEl.classList.contains("homework-page-sheet") || documentType === "homework";
          const pdfWidth = 595.28; // Standard A4 width in pt
          // For homework sheets or standard A4 pages, guarantee exact standard A4 (841.89 pt)
          const pdfHeight = (isHomeworkSheet || (aspect >= 1.25 && aspect <= 1.55)) ? 841.89 : pdfWidth * aspect;

          if (!pdf) {
            pdf = new jsPDF({
              orientation: "portrait",
              unit: "pt",
              format: [pdfWidth, pdfHeight],
              compress: true,
            });
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
          } else {
            pdf.addPage([pdfWidth, pdfHeight], "portrait");
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
          }
        }
      } else {
        // Single continuous container or fallback
        const targetEl = pageElements[0] || containerRef.current;
        const { canvas } = await renderElementToA4Canvas(targetEl);

        const imgWidth = 595.28;
        const pageHeightPt = 841.89; // Standard A4 height
        const pxPerPt = canvas.width / imgWidth;
        const pageHeightPx = Math.floor(pageHeightPt * pxPerPt);

        if (canvas.height <= pageHeightPx * 1.05) {
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const pdfHeight = (canvas.height / canvas.width) * imgWidth;
          pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: [imgWidth, pdfHeight],
            compress: true,
          });
          pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, pdfHeight, undefined, "FAST");
        } else {
          pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
            compress: true,
          });

          // Smart slice: Search for clean whitespace rows near pageHeightPx to avoid cutting text/images
          const ctx = canvas.getContext("2d");
          let currentY = 0;
          let isFirst = true;

          while (currentY < canvas.height) {
            let sliceHeight = Math.min(pageHeightPx, canvas.height - currentY);

            if (currentY + sliceHeight < canvas.height && ctx) {
              const maxSearch = Math.floor(pageHeightPx * 0.22);
              const startCheck = currentY + sliceHeight;
              let bestBreak = startCheck;
              let foundBreak = false;

              for (let testY = startCheck; testY > startCheck - maxSearch; testY -= 2) {
                const imgDataRow = ctx.getImageData(0, testY, canvas.width, 1).data;
                let isBlank = true;
                for (let px = 0; px < canvas.width; px += 8) {
                  const idx = px * 4;
                  if (imgDataRow[idx] < 245 || imgDataRow[idx + 1] < 245 || imgDataRow[idx + 2] < 245) {
                    isBlank = false;
                    break;
                  }
                }
                if (isBlank) {
                  bestBreak = testY;
                  foundBreak = true;
                  break;
                }
              }

              if (foundBreak && bestBreak > currentY + pageHeightPx * 0.70) {
                sliceHeight = bestBreak - currentY;
              }
            }

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeight;

            const sliceCtx = sliceCanvas.getContext("2d");
            if (sliceCtx) {
              sliceCtx.drawImage(
                canvas,
                0,
                currentY,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight
              );
            }

            const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
            const sliceHeightPt = (sliceHeight / canvas.width) * imgWidth;

            if (!isFirst) {
              pdf.addPage();
            }
            pdf.addImage(sliceData, "JPEG", 0, 0, imgWidth, sliceHeightPt, undefined, "FAST");
            isFirst = false;
            currentY += sliceHeight;
          }
        }
      }

      if (pdf) {
        const cleanTitle =
          documentType === "homework"
            ? formatHomeworkFileName(homeworkClass || paperTitle)
            : `${(paperTitle || "question_paper").replace(/[/\\?%*:|"<>]/g, "_")}.pdf`;

        // Support Android WebView native download bridge if present, fallback to standard pdf.save
        const win = window as any;
        const pdfBase64 = pdf.output("datauristring");
        if (typeof win.Android?.downloadBase64Pdf === "function") {
          win.Android.downloadBase64Pdf(pdfBase64, cleanTitle);
        } else if (typeof win.AndroidBridge?.downloadBase64Pdf === "function") {
          win.AndroidBridge.downloadBase64Pdf(pdfBase64, cleanTitle);
        } else {
          pdf.save(cleanTitle);
        }
        toast.success("PDF यशस्वीरित्या डाऊनलोड झाली!");
      }
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error("PDF डाऊनलोड करताना त्रुटी: " + (err.message || "अनोळखी त्रुटी"));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Share Word Homework as PDF directly to WhatsApp
  const handleSharePdfToWhatsApp = async () => {
    if (!containerRef.current) return;
    setIsSharingWhatsApp(true);
    toast.info("WhatsApp साठी PDF तयार होत आहे...");

    try {
      const filename = formatHomeworkFileName(homeworkClass || paperTitle);

      const pages = containerRef.current.querySelectorAll<HTMLElement>(
        ".vml-page-wrapper, .homework-page-sheet, .docx-wrapper > section.docx, .docx-wrapper > section.docx-doc, .docx-page, .homework-a4-page"
      );
      let pdf: jsPDF | null = null;

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          const pg = pages[i];
          const { canvas } = await renderElementToA4Canvas(pg);
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          if (i === 0) {
            pdf = new jsPDF({
              orientation: "portrait",
              unit: "pt",
              format: "a4",
              compress: true,
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
          } else if (pdf) {
            pdf.addPage();
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
          }
        }
      } else {
        const { canvas } = await renderElementToA4Canvas(containerRef.current);
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf = new jsPDF({
          orientation: "portrait",
          unit: "pt",
          format: "a4",
          compress: true,
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      if (pdf) {
        const blob = pdf.output("blob");
        const file = new File([blob], filename, { type: "application/pdf" });

        if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
            });
            toast.success("गृहपाठ PDF WhatsApp वर शेअर केली!");
            return;
          } catch (shareErr: any) {
            if (shareErr.name === "AbortError") return;
          }
        }

        // Fallback for Desktop
        pdf.save(filename);
        window.open("https://web.whatsapp.com", "_blank");
        toast.success("PDF डाऊनलोड झाली आणि WhatsApp उघडले! कृपया फाईल अटॅच करा.");
      }
    } catch (err: any) {
      console.error("WhatsApp PDF share error:", err);
      toast.error("WhatsApp वर PDF शेअर करताना त्रुटी: " + err.message);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 min-h-[600px] select-text">
      {/* Container for styles dynamically generated by docx-preview */}
      <div ref={styleContainerRef} className="hidden" />

      {/* Top Main Action Bar */}
      <div className="bg-slate-900 text-white px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-800 print:hidden shadow-md">
        <div className="flex items-center justify-between gap-2.5 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 sm:size-9 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="font-bold text-xs sm:text-base text-white truncate max-w-[190px] sm:max-w-md">
                  {paperTitle}
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="size-2.5 sm:size-3" /> {documentType === "homework" ? "Word गृहपाठ" : "Word फाईल"}
                </span>
                {hasUnsavedChanges && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 shrink-0">
                    <AlertCircle className="size-2.5 sm:size-3" /> न जतन केलेले बदल
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block truncate max-w-sm sm:max-w-xl">
                {documentType === "homework"
                  ? "गृहपाठ थेट संपादन • मजकूर, कोष्टके, चित्रे व उत्तरे संपादित करा"
                  : `${userRole === "admin" ? "सुपर ॲडमिन थेट संपादन" : "शिक्षक थेट संपादन"} • प्रश्नपत्रिकेत कुठेही क्लिक करून मजकूर बदला`}
              </p>
            </div>
          </div>

          {/* Close button on mobile top-right */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer shrink-0"
              title="बंद करा"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Mobile Screen Fit Toggle */}
          <button
            type="button"
            onClick={() => setMobileFitWidth((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              mobileFitWidth
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
            }`}
            title={mobileFitWidth ? "१००% आकार पहा (Full Size)" : "मोबाईल स्क्रीनवर बसवा (Fit Screen)"}
          >
            {mobileFitWidth ? <Minimize2 className="size-3.5 text-indigo-200" /> : <Maximize2 className="size-3.5 text-amber-300" />}
            <span>{mobileFitWidth ? "१००% आकार" : "स्क्रीनवर बसवा"}</span>
          </button>

          {hasSavedVersion && (
            <button
              onClick={handleRestoreSaved}
              className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
              title="मागील जतन केलेले संपादन लोड करा"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">जतन केलेले लोड करा</span>
            </button>
          )}

          <button
            onClick={handleResetToOriginal}
            className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            title="मूळ Word फाईल पुन्हा लोड करा"
          >
            <RotateCcw className="size-3.5" />
            <span>मूळ फाईल</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            title="जशी आहे तशी मूळ PDF डाऊनलोड करा"
          >
            {isDownloadingPdf ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>PDF</span>
          </button>

          {documentType === "homework" && (
            <button
              onClick={handleSharePdfToWhatsApp}
              disabled={isSharingWhatsApp}
              className="px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
              title="हा Word गृहपाठ PDF स्वरूपात WhatsApp वर पाठवा"
            >
              {isSharingWhatsApp ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MessageCircle className="size-3.5" />
              )}
              <span>WhatsApp वर पाठवा</span>
            </button>
          )}

          {documentType === "homework" && (
            <button
              onClick={() => setShowHwHeaderModal(true)}
              className="px-3 sm:px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
              title="शाळेचे नाव, केंद्र, तालुका, जिल्हा, वार, दिनांक इत्यादी माहिती भरा"
            >
              <Edit3 className="size-3.5 text-amber-300" />
              <span>माहिती भरा</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 sm:px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 disabled:opacity-50"
            title="केलेले बदल जतन करा"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>जतन करा</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="hidden md:inline-flex p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all cursor-pointer"
              title="बंद करा"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Header Details Bar (शाळेचे नाव & दिनांक) - Only for question papers */}
      {documentType !== "homework" && (
        <div className="bg-slate-800 text-white px-3 sm:px-4 py-2 border-b border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 print:hidden shadow-sm">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full min-w-0">
            {/* School Name Input */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 transition-all flex-1 min-w-0">
              <Building2 className="size-4 text-amber-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-300 shrink-0">शाळेचे नाव:</span>
              <input
                type="text"
                value={schoolNameInput}
                onChange={(e) => handleSchoolNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyHeaderInfo(schoolNameInput, examDateInput, kendraInput, talukaInput, jilhaInput, teacherNameInput, headmasterNameInput, true);
                }}
                placeholder="येथे शाळेचे नाव टाईप करा..."
                className="bg-transparent text-white placeholder-slate-500 text-xs outline-none w-full font-medium"
              />
            </div>

            {/* Exam Date Input */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 focus-within:border-blue-500 transition-all w-full sm:w-44 shrink-0">
              <Calendar className="size-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-300 shrink-0">दिनांक:</span>
              <input
                type="text"
                value={examDateInput}
                onChange={(e) => handleExamDateChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyHeaderInfo(schoolNameInput, examDateInput, kendraInput, talukaInput, jilhaInput, teacherNameInput, headmasterNameInput, true);
                }}
                placeholder="DD/MM/YYYY"
                className="bg-transparent text-white placeholder-slate-500 text-xs outline-none w-full font-medium"
              />
            </div>

            {/* Apply Button */}
            <button
              onClick={() => applyHeaderInfo(schoolNameInput, examDateInput, kendraInput, talukaInput, jilhaInput, teacherNameInput, headmasterNameInput, true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 shrink-0"
              title="शाळेचे नाव व दिनांक थेट प्रश्नपत्रिकेतील चौकटीत योग्य जागी भरा"
            >
              <Sparkles className="size-3.5 text-amber-300" />
              <span>चौकटीत भरा</span>
            </button>

            {/* Complete Profile Details Modal Button */}
            <button
              onClick={() => setShowQpHeaderModal(true)}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 shrink-0"
              title="शाळेचे नाव, केंद्र, तालुका, जिल्हा, शिक्षक व मुख्याध्यापक नाव भरा / बदला"
            >
              <Edit3 className="size-3.5 text-amber-300" />
              <span>तपशील भरा</span>
            </button>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-400">
            <Check className="size-3.5 text-emerald-400" />
            <span>शाळेचे नाव, केंद्र, तालुका, जिल्हा व स्वाक्षरी अचूक बसतील</span>
          </div>
        </div>
      )}

      {/* Quick Header Details Bar for Homework */}
      {documentType === "homework" && (
        <div className="bg-slate-800 text-white px-3 sm:px-4 py-2 border-b border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 print:hidden shadow-sm">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5 sm:size-4 text-amber-300" />
              <span>शीर्षक माहिती:</span>
            </span>
            <span className="text-slate-300 font-medium text-[11px] sm:text-xs">
              {hwSchoolName ? `शाळा: ${hwSchoolName} • ` : ""}
              {hwTeacherName ? `शिक्षक: ${hwTeacherName} • ` : ""}
              {hwHeadmasterName ? `मुख्याध्यापक: ${hwHeadmasterName} • ` : ""}
              वार: {hwDayOfWeek} • दिनांक: {hwDateStr} • इयत्ता: {hwClassName}
              {!hwSchoolName && !hwTeacherName && !hwHeadmasterName && (
                <span className="text-amber-300 ml-1 font-normal">
                  (माहिती भरण्यासाठी उजवीकडील बटण वापरा)
                </span>
              )}
            </span>
          </div>

          <button
            onClick={() => setShowHwHeaderModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-95 shrink-0"
          >
            <Edit3 className="size-3.5 text-amber-300" />
            <span>माहिती भरा व पृष्ठात बसवा</span>
          </button>
        </div>
      )}

      {/* Main Document Content Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto overflow-y-auto p-1 sm:p-8 flex justify-center bg-slate-200/70 print:p-0 print:bg-white custom-scrollbar touch-pan-x">
        <div className="relative w-full max-w-[850px] min-h-0 sm:min-h-[1123px]">
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-14 sm:pt-20 p-6 sm:p-8 text-center bg-white/95 rounded-sm shadow-xl border border-slate-300">
              <div className="sticky top-16 sm:top-24 flex flex-col items-center justify-center max-w-md mx-auto">
                <div className="size-14 rounded-full bg-orange-50 border-2 border-orange-200 flex items-center justify-center mb-3.5 shadow-xs">
                  <Loader2 className="size-8 animate-spin text-orange-500" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">
                  {loadingMsg}
                </h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Word फाईलची रचना, कोष्टक व मजकूर मूळ स्थितीत लोड होत आहे...
                </p>
              </div>
            </div>
          )}

          {loadError && !loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-start pt-12 sm:pt-16 p-6 sm:p-8 text-center bg-white/98 rounded-sm shadow-xl border border-rose-200">
              <div className="sticky top-14 sm:top-20 flex flex-col items-center justify-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-600 shadow-inner">
                  <AlertCircle className="size-8" />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  {documentType === "homework" ? "Word गृहपाठ लोड होऊ शकला नाही" : "Word प्रश्नपत्रिका लोड होऊ शकली नाही"}
                </h3>
                <p className="text-xs text-rose-700 font-medium max-w-md mb-4 bg-rose-50 px-3.5 py-2.5 rounded-lg border border-rose-200">
                  {loadError}
                </p>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <button
                    onClick={() => setReloadCounter((c) => c + 1)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>पुन्हा प्रयत्न करा (Retry)</span>
                  </button>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 border border-slate-300 transition-all cursor-pointer"
                    >
                      <Download className="size-3.5" />
                      <span>थेट डाऊनलोड करा</span>
                    </a>
                  )}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      बंद करा
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Floating Action Button directly on homework document page */}
          {documentType === "homework" && !loading && (
            <div className="absolute top-3 right-4 z-30 print:hidden flex items-center gap-2">
              <button
                onClick={() => setShowHwHeaderModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 border border-white/20"
                title="शाळेचे नाव, केंद्र, तालुका, जिल्हा, दिनांक इत्यादी माहिती भरा व पृष्ठात बसवा"
              >
                <Edit3 className="size-3.5 text-amber-300" />
                <span>माहिती भरा</span>
              </button>
            </div>
          )}

          <div
            id="word-paper-container"
            ref={containerRef}
            className={`word-editor-paper bg-white shadow-xl rounded-sm text-slate-900 min-h-0 sm:min-h-[1123px] w-full outline-none transition-all print:shadow-none print:max-w-none print:w-full print:m-0 ${
              mobileFitWidth ? "mobile-fit-active" : ""
            }`}
            style={{
              padding: "0",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Custom Styles for docx-preview & Mammoth inline editable container & printing */}
      <style>{`
        /* Let docx-preview render exact Word pages without overriding borders or fonts */
        .docx-wrapper {
          background: transparent !important;
          padding: 8px 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        .docx-wrapper > section.docx {
          background: #ffffff !important;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15) !important;
          margin-bottom: 24px !important;
          border-radius: 2px !important;
          cursor: text !important;
          outline: none !important;
        }

        .docx-wrapper > section.docx:hover {
          box-shadow: 0 6px 24px -2px rgba(37, 99, 235, 0.2) !important;
        }


        /* Solid white mask that completely wipes background image borders/columns behind header */
        .qp-header-bg-mask {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 26.2% !important;
          background: #ffffff !important;
          z-index: 2 !important;
          pointer-events: none !important;
        }

        /* Unified Question Paper Header Box — STANDARD (for Class 3, 4, 5, 6, 7, 8, etc.) */
        .qp-unified-header-box {
          position: absolute !important;
          left: var(--header-left, 7.6%) !important;
          top: var(--header-top, 2.2%) !important;
          width: var(--header-width, 84.8%) !important;
          height: var(--header-height, 22.2%) !important;
          min-height: var(--header-height, 22.2%) !important;
          max-height: calc(var(--header-height, 22.2%) + 1.5%) !important;
          background: #ffffff !important;
          border: 2px solid #0f172a !important;
          border-radius: clamp(10px, 2.5cqw, 18px) !important;
          outline: none !important;
          box-shadow: none !important;
          z-index: 10 !important;
          box-sizing: border-box !important;
          padding: clamp(3px, 0.6cqw, 6px) clamp(6px, 1.3cqw, 12px) !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-evenly !important;
          align-items: stretch !important;
          overflow: hidden !important;
          font-family: 'Noto Sans Devanagari', 'Tiro Devanagari Marathi', 'Nirmala UI', sans-serif !important;
          color: #0f172a !important;
          pointer-events: auto !important;
          line-height: 1.25 !important;
          gap: clamp(1px, 0.35cqw, 3px) !important;
        }

        /* Unified Question Paper Header Box — EVAL-GRID ONLY (specifically for Class 1 & 2 with background boxes) */
        .qp-unified-header-box[data-header-variant="eval-grid"],
        .vml-page-wrapper[data-has-eval-grid="true"] .qp-unified-header-box {
          left: 6.8% !important;
          top: 1.8% !important;
          width: 86.4% !important;
          height: 23.4% !important;
          min-height: 23.4% !important;
          max-height: 25.0% !important;
          border: 2px solid #0f172a !important;
          border-radius: clamp(10px, 2.8cqw, 20px) !important;
          padding: clamp(4px, 0.9cqw, 10px) clamp(8px, 1.8cqw, 16px) !important;
        }

        /* Every direct child row stays inside, no overflow, no extra growth */
        .qp-unified-header-box > div {
          overflow: hidden !important;
          max-width: 100% !important;
          width: 100% !important;
          flex-shrink: 1 !important;
          flex-grow: 0 !important;
          min-height: 0 !important;
          white-space: nowrap !important;
        }

        .qp-unified-header-box * {
          box-sizing: border-box !important;
          max-width: 100% !important;
          min-width: 0 !important;
        }

        /* School name row: plain text-align:center block, label+name inline */
        .qp-unified-header-box [data-field="school-name"] {
          display: block !important;
          position: static !important;
          width: 100% !important;
          text-align: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          font-weight: 700 !important;
          padding: 0 !important;
        }

        /* School name editable span — inline so it flows with the label */
        .qp-unified-header-box [data-field="school-name-text"] {
          display: inline !important;
          outline: none !important;
          cursor: text !important;
          font-weight: 700 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
        }

        /* Exam title row */
        .qp-unified-header-box [data-field="exam-title"] {
          position: static !important;
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          overflow: hidden !important;
          padding: 0 !important;
          margin: 0 !important;
        }

        .qp-unified-header-box [data-field="exam-title-text"] {
          display: block !important;
          width: 100% !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          text-align: center !important;
          font-size: clamp(8px, 2.2cqw, 13.5pt) !important;
        }

        /* Date field */
        .qp-unified-header-box [data-field="exam-date"] {
          display: inline !important;
          white-space: nowrap !important;
          overflow: hidden !important;
        }

        [data-hidden-by-unified-header="true"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

        /* Kendra/Taluka/Jilha row */
        .qp-sub-location {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          width: 100% !important;
          max-width: 100% !important;
          gap: 4px !important;
          flex-shrink: 1 !important;
          flex-wrap: nowrap !important;
          overflow: hidden !important;
          font-size: clamp(6.5px, 1.55cqw, 9.5pt) !important;
          font-weight: 700 !important;
          line-height: 1.2 !important;
        }
        .qp-sub-location strong,
        .qp-sub-location span {
          white-space: nowrap !important;
          font-size: inherit !important;
          font-weight: inherit !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        .qp-signatures-block {
          box-sizing: border-box !important;
          font-family: inherit !important;
        }
        @media print {
          .qp-signatures-block {
            display: flex !important;
            position: absolute !important;
          }
          .qp-header-bg-mask {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 26.2% !important;
            background: #ffffff !important;
            z-index: 2 !important;
            pointer-events: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .qp-unified-header-box {
            border: 2px solid #000000 !important;
            border-radius: 12px !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .qp-unified-header-box[data-header-variant="eval-grid"],
          .vml-page-wrapper[data-has-eval-grid="true"] .qp-unified-header-box {
            border: 2px solid #000000 !important;
            border-radius: 12px !important;
          }
          [data-hidden-by-unified-header="true"] {
            display: none !important;
            visibility: hidden !important;
          }
        }

        /* Mobile responsiveness for Word document view */
        @media screen and (max-width: 768px) {
          .word-editor-paper.mobile-fit-active .docx-wrapper,
          .word-editor-paper.mobile-fit-active .hw-paginated-wrapper {
            zoom: 0.44;
            -moz-transform: scale(0.44);
            -moz-transform-origin: top center;
          }
          .word-editor-paper.mobile-fit-active {
            max-width: 100% !important;
            overflow-x: hidden !important;
          }

          /* Ensure entire VML question paper page fits flush and sharp on mobile */
          .word-editor-paper {
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .vml-page-wrapper {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto 16px auto !important;
            border-radius: 2px !important;
          }

          /* Unified Question Paper Header Box on Mobile — STANDARD */
          .qp-unified-header-box {
            left: var(--header-left, 7.6%) !important;
            top: var(--header-top, 2.2%) !important;
            width: var(--header-width, 84.8%) !important;
            height: var(--header-height, 22.2%) !important;
            min-height: var(--header-height, 22.2%) !important;
            max-height: calc(var(--header-height, 22.2%) + 1.5%) !important;
            border: 1.5px solid #0f172a !important;
            border-radius: clamp(8px, 2.2cqw, 14px) !important;
            padding: clamp(2px, 0.5cqw, 5px) clamp(4px, 1.0cqw, 9px) !important;
            overflow: hidden !important;
            justify-content: space-evenly !important;
          }

          /* Unified Question Paper Header Box on Mobile — EVAL-GRID ONLY */
          .qp-unified-header-box[data-header-variant="eval-grid"],
          .vml-page-wrapper[data-has-eval-grid="true"] .qp-unified-header-box {
            left: 6.8% !important;
            top: 1.8% !important;
            width: 86.4% !important;
            height: 23.4% !important;
            min-height: 23.4% !important;
            max-height: 25.0% !important;
            border: 1.5px solid #0f172a !important;
            border-radius: clamp(10px, 2.8cqw, 20px) !important;
            padding: clamp(3px, 0.7cqw, 6px) clamp(6px, 1.4cqw, 12px) !important;
          }

          .qp-unified-header-box [data-field="exam-title-text"] {
            font-size: clamp(7px, 2.0cqw, 12pt) !important;
          }

          .qp-sub-location {
            font-size: clamp(5.5px, 1.4cqw, 8.5pt) !important;
          }

          .qp-signatures-block {
            font-size: clamp(7.5px, 1.8cqw, 10.5pt) !important;
            padding: 4px 6px !important;
          }
        }
        @media screen and (min-width: 480px) and (max-width: 768px) {
          .word-editor-paper.mobile-fit-active .docx-wrapper,
          .word-editor-paper.mobile-fit-active .hw-paginated-wrapper {
            zoom: 0.62;
          }
        }

        /* ONLY apply fallback styles when Mammoth HTML fallback is active */
        .word-editor-paper.mammoth-fallback {
          padding: 32px 40px !important;
        }

        .word-editor-paper.mammoth-fallback table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 14px 0 !important;
        }

        .word-editor-paper.mammoth-fallback td, 
        .word-editor-paper.mammoth-fallback th {
          border: 1px solid #1e293b !important;
          padding: 8px 12px !important;
          vertical-align: top !important;
          cursor: text !important;
        }

        .word-editor-paper.mammoth-fallback p {
          margin: 8px 0 !important;
          line-height: 1.7 !important;
          font-size: 15px !important;
        }

        .word-editor-paper.mammoth-fallback h1, 
        .word-editor-paper.mammoth-fallback h2, 
        .word-editor-paper.mammoth-fallback h3 {
          font-weight: 800 !important;
          margin: 16px 0 8px 0 !important;
          color: #0f172a !important;
        }

        .word-editor-paper.mammoth-fallback img {
          max-width: 100% !important;
          height: auto !important;
          margin: 8px auto !important;
          display: block !important;
        }

        /* Ensure all text runs and paragraphs inside Word document are clearly selectable and editable */
        .word-editor-paper * {
          user-select: text !important;
          -webkit-user-select: text !important;
        }

        .word-editor-paper p:focus,
        .word-editor-paper td:focus,
        .word-editor-paper h1:focus,
        .word-editor-paper h2:focus,
        .word-editor-paper h3:focus,
        .word-editor-paper span:focus,
        .vml-shape-text:focus {
          outline: 1px dashed #3b82f6 !important;
          background-color: rgba(59, 130, 246, 0.05) !important;
          border-radius: 2px !important;
        }

        .vml-shape-text:hover {
          outline: 1px dotted rgba(59, 130, 246, 0.4);
        }

        /* Ensure homework header tables are completely borderless and fit flush */
        .word-editor-paper table[data-header-field^="hw-line-"],
        .word-editor-paper table[data-header-field^="hw-line-"] td,
        .word-editor-paper table[data-header-field^="hw-line-"] th {
          border: none !important;
          padding: 2px 4px !important;
          margin: 4px 0 !important;
          background: transparent !important;
        }

        .word-editor-paper table[data-header-field^="hw-line-"] strong {
          color: #1e293b !important;
        }

        /* Homework Page Sheet - Exact A4 Page Layout */
        .homework-page-sheet {
          background: #ffffff !important;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.15) !important;
          margin-bottom: 28px !important;
          border-radius: 2px !important;
          cursor: text !important;
          outline: none !important;
          width: 100% !important;
          max-width: 794px !important;
          min-height: 1123px !important;
          padding: 34px 40px !important;
          box-sizing: border-box !important;
          position: relative !important;
        }

        .homework-page-sheet:hover {
          box-shadow: 0 6px 24px -2px rgba(37, 99, 235, 0.2) !important;
        }

        .hw-paginated-wrapper {
          background: transparent !important;
          padding: 8px 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 24px !important;
        }

        .word-editor-paper:has(.homework-page-sheet) {
          background: transparent !important;
          box-shadow: none !important;
        }

        /* Compact, clean typography so each homework subject fits properly without overflow */
        .homework-page-sheet p {
          margin: 4px 0 !important;
          line-height: 1.5 !important;
          font-size: 13.5px !important;
        }

        .homework-page-sheet table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 6px 0 !important;
        }

        .homework-page-sheet td, 
        .homework-page-sheet th {
          border: 1px solid #1e293b !important;
          padding: 4px 8px !important;
          vertical-align: middle !important;
          font-size: 13px !important;
        }

        .homework-page-sheet table[data-header-field^="hw-line-"],
        .homework-page-sheet table[data-header-field^="hw-line-"] tr,
        .homework-page-sheet table[data-header-field^="hw-line-"] td,
        .homework-page-sheet table[data-header-field="hw-signature-block"],
        .homework-page-sheet table[data-header-field="hw-signature-block"] tr,
        .homework-page-sheet table[data-header-field="hw-signature-block"] td {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          padding: 2px 4px !important;
        }

        .homework-page-sheet img {
          max-width: 100% !important;
          max-height: 440px !important;
          height: auto !important;
          display: block !important;
          margin: 8px auto !important;
          object-fit: contain !important;
        }

        /* Print media styling */
        @media print {
          body * {
            visibility: hidden;
          }
          #word-paper-container,
          #word-paper-container * {
            visibility: visible;
          }
          #word-paper-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .homework-page-sheet,
          .docx-wrapper > section.docx,
          .docx-wrapper > section.docx-doc,
          .vml-page-wrapper {
            box-shadow: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .vml-page-wrapper.vml-page-hidden {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Homework Header Information Modal Dialog */}
      {showHwHeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-9 sm:size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles className="size-4 sm:size-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">
                    गृहपाठ शीर्षक माहिती भरा (Homework Header Details)
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                    माहिती भरल्यावर ती मूळ Word पृष्ठात योग्य जागी अचूक बसेल
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHwHeaderModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {/* Section 1: शाळा व ठिकाण तपशील */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-blue-600" />
                  <span>शाळा व ठिकाण तपशील (School & Location Details)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* शाळेचे नाव */}
                  <div className="sm:col-span-2 md:col-span-4 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3 text-amber-500" />
                        <span>शाळेचे नाव (School Name)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">उदा. जि. प. प्राथमिक शाळा...</span>
                    </label>
                    <input
                      type="text"
                      value={hwSchoolName}
                      onChange={(e) => setHwSchoolName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="येथे शाळेचे संपूर्ण नाव टाईप करा..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* केंद्र */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">केंद्र (Kendra)</label>
                    <input
                      type="text"
                      value={hwKendra}
                      onChange={(e) => setHwKendra(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="उदा. बोरगाव"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* तालुका */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">तालुका (Taluka)</label>
                    <input
                      type="text"
                      value={hwTaluka}
                      onChange={(e) => setHwTaluka(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="उदा. मिरज"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* जिल्हा */}
                  <div className="sm:col-span-2 md:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">जिल्हा (District)</label>
                    <input
                      type="text"
                      value={hwDistrict}
                      onChange={(e) => setHwDistrict(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="उदा. सांगली"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: दिनांक, वार व वर्ग तपशील */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-emerald-600" />
                  <span>दिनांक, वार व वर्ग तपशील (Date & Class Details)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* वार */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">वार (Day)</label>
                    <input
                      type="text"
                      value={hwDayOfWeek}
                      onChange={(e) => setHwDayOfWeek(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="उदा. शुक्रवार"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* दिनांक */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar className="size-3 text-emerald-500" />
                      <span>दिनांक (Date)</span>
                    </label>
                    <input
                      type="text"
                      value={hwDateStr}
                      onChange={(e) => setHwDateStr(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="उदा. १२ ऑक्टोबर २०२६"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* इयत्ता */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">इयत्ता (Class)</label>
                    <input
                      type="text"
                      value={hwClassName}
                      onChange={(e) => setHwClassName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="उदा. १ ली"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* विद्यार्थ्याचे नाव */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="size-3.5 text-indigo-500" />
                        <span>विद्यार्थ्याचे नाव (Student Name - ऐच्छिक)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">रिकामे ठेवल्यास रेघ राहील</span>
                    </label>
                    <input
                      type="text"
                      value={hwStudentName}
                      onChange={(e) => setHwStudentName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="विद्यार्थ्याचे नाव टाका, किंवा रेघ ठेवण्यासाठी रिकामे ठेवा..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>
                </div>
              </div>
              {/* Section 3: शिक्षक, मुख्याध्यापक व स्वाक्षरी तपशील */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="size-3.5 text-indigo-600" />
                  <span>शिक्षक, मुख्याध्यापक व स्वाक्षरी तपशील (Teacher & Headmaster Details)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* शिक्षकाचे नाव */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="size-3 text-indigo-500" />
                        <span>शिक्षकाचे नाव (Teacher Name)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">उदा. बाळासाहेब केंद्रे</span>
                    </label>
                    <input
                      type="text"
                      value={hwTeacherName}
                      onChange={(e) => setHwTeacherName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="येथे वर्गशिक्षकाचे नाव टाका..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>

                  {/* मुख्याध्यापकाचे नाव */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3 text-emerald-500" />
                        <span>मुख्याध्यापकाचे नाव (Headmaster Name)</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">उदा. मुख्याध्यापक नाव</span>
                    </label>
                    <input
                      type="text"
                      value={hwHeadmasterName}
                      onChange={(e) => setHwHeadmasterName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyHomeworkHeaderInfo(true); }}
                      placeholder="येथे मुख्याध्यापकाचे नाव टाका..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs font-semibold outline-none transition-all bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
                * शाळेचे नाव, शिक्षकाचे नाव व मुख्याध्यापकाचे नाव एकदा भरल्यावर कायम आठवणीत राहतील.
              </span>
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowHwHeaderModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                >
                  रद्द करा
                </button>
                <button
                  type="button"
                  onClick={() => applyHomeworkHeaderInfo(true)}
                  className="flex-1 sm:flex-none px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="size-4 text-amber-300" />
                  <span>माहिती भरा व बसवा</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Paper Header & Signatures Details Modal */}
      {showQpHeaderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-md">
                  <Sparkles className="size-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">प्रश्नपत्रिका शाळा व स्वाक्षरी तपशील</h3>
                  <p className="text-xs text-blue-100">
                    शाळेचे नाव, केंद्र, तालुका, जिल्हा व शिक्षक/मुख्याध्यापक स्वाक्षरी
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQpHeaderModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="p-5 overflow-y-auto space-y-4 text-slate-800">
              {/* Section 1: शाळा व ठिकाण तपशील */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Building2 className="size-4 text-blue-600" />
                  <span>शाळा व ठिकाण तपशील (School & Location)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-700">शाळेचे नाव (School Name)</label>
                    <input
                      type="text"
                      value={schoolNameInput}
                      onChange={(e) => setSchoolNameInput(e.target.value)}
                      placeholder="उदा. जि. प. प्राथमिक शाळा..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">केंद्र (Kendra)</label>
                    <input
                      type="text"
                      value={kendraInput}
                      onChange={(e) => setKendraInput(e.target.value)}
                      placeholder="उदा. बोरगाव"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">तालुका (Taluka)</label>
                    <input
                      type="text"
                      value={talukaInput}
                      onChange={(e) => setTalukaInput(e.target.value)}
                      placeholder="उदा. मिरज"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">जिल्हा (District)</label>
                    <input
                      type="text"
                      value={jilhaInput}
                      onChange={(e) => setJilhaInput(e.target.value)}
                      placeholder="उदा. सांगली"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: दिनांक व स्वाक्षरी तपशील */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <User className="size-4 text-emerald-600" />
                  <span>दिनांक व स्वाक्षरी तपशील (Date & Signatures)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="size-3.5 text-blue-500" />
                      <span>परीक्षा दिनांक (Date)</span>
                    </label>
                    <input
                      type="text"
                      value={examDateInput}
                      onChange={(e) => setExamDateInput(e.target.value)}
                      placeholder="उदा. 19/10/2026"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <User className="size-3.5 text-indigo-500" />
                      <span>वर्ग शिक्षक (Class Teacher)</span>
                    </label>
                    <input
                      type="text"
                      value={teacherNameInput}
                      onChange={(e) => setTeacherNameInput(e.target.value)}
                      placeholder="उदा. श्री. शिक्षक नाव"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Building2 className="size-3.5 text-purple-500" />
                      <span>मुख्याध्यापक नाव (Headmaster Name)</span>
                    </label>
                    <input
                      type="text"
                      value={headmasterNameInput}
                      onChange={(e) => setHeadmasterNameInput(e.target.value)}
                      placeholder="उदा. मुख्याध्यापक नाव"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none font-medium bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                * ही माहिती जतन केल्यावर प्रश्नपत्रिकेच्या चौकटीत व शेवटी स्वाक्षरीत आपोआप बसेल.
              </span>
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowQpHeaderModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="button"
                  onClick={() => {
                    applyHeaderInfo(
                      schoolNameInput,
                      examDateInput,
                      kendraInput,
                      talukaInput,
                      jilhaInput,
                      teacherNameInput,
                      headmasterNameInput,
                      true
                    );
                    setShowQpHeaderModal(false);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="size-4 text-amber-300" />
                  <span>प्रश्नपत्रिकेत सेव्ह करा</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordQuestionPaperEditor;
