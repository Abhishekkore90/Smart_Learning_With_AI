import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { PDFDocument } from "pdf-lib";
import {
  BookOpen,
  BookCheck,
  Languages,
  Calendar,
  FileText,
  Upload,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  X,
  FileCheck,
  Sparkles,
  Layers,
  GraduationCap,
  FolderOpen,
  RefreshCw,
  Trash2,
  ExternalLink,
  Plus,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Pencil,
  Edit3,
  Type,
  Highlighter,
  Eraser,
  Save,
  RotateCcw,
  FileUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { saveFileToIndexedDB, getFileFromIndexedDB } from "@/lib/indexedDbStorage";
import { extractTableRowsFromPdf } from "@/lib/pdfParser";
import * as XLSX from "xlsx";

const extractTableRowsFromExcel = async (file: File): Promise<PlanningTableRow[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    if (!rawData || rawData.length === 0) return [];

    const extractedRows: PlanningTableRow[] = [];

    rawData.forEach((row, idx) => {
      if (!row || row.length === 0) return;

      const strCells = row.map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ""));
      const rowText = strCells.join(" ").toLowerCase();

      // Skip header row if it contains header keywords
      if (idx === 0 && (rowText.includes("महिना") || rowText.includes("month") || rowText.includes("विषय") || rowText.includes("subject"))) {
        return;
      }

      if (strCells.some((c) => c.length > 0)) {
        extractedRows.push({
          id: `${Date.now()}_${idx}`,
          month: strCells[0] || `महिना ${idx + 1}`,
          subject: strCells[1] || "मराठी",
          weeks: strCells[2] || "4",
          workingDays: strCells[3] || "20",
          periods: strCells[4] || "50",
          topics: strCells[5] || strCells.slice(5, 7).filter(Boolean).join(" - ") || "घटक माहिती",
          outcomes: strCells[6] || strCells.slice(7).filter(Boolean).join(" - ") || "अध्ययन निष्पत्ती",
        });
      }
    });

    return extractedRows;
  } catch (err) {
    console.error("Excel parsing error:", err);
    return [];
  }
};

export interface PlanningFileRecord {
  id: string;
  classId: string;
  mediumId: string;
  subjectId: string;
  planningType: "annual" | "monthly" | "question_bank";
  fileName: string;
  fileUrl: string;
  fileSize: string;
  fileType: string;
  uploadedBy: "teacher" | "admin";
  uploadedAt: string;
  tableRows?: PlanningTableRow[];
}

export interface PlanningTableRow {
  id: string;
  month: string;
  subject?: string;
  weeks: string;
  workingDays: string;
  periods: string;
  topics: string;
  outcomes: string;
}

const DEFAULT_ANNUAL_ROWS: PlanningTableRow[] = [
  { id: "1", month: "जून", subject: "मराठी", weeks: "2", workingDays: "13", periods: "33", topics: "वर्ग पूर्वतयारी अभ्यासक्रम\nसराव व उजळणी", outcomes: "चित्र वाचन, अक्षर ओळख व पूर्वतयारी" },
  { id: "2", month: "जुलै", subject: "मराठी", weeks: "5", workingDays: "26", periods: "70", topics: "१. माझ्या या दारातून २. चित्र गप्पा ३. मी आणि माझे कुटुंब\n४. माझी जोडी ५. मला घरापर्यंत पोहोचव", outcomes: "वाचन, लेखन व शब्दसंपदा वाढवणे" },
  { id: "3", month: "ऑगस्ट", subject: "मराठी", weeks: "4", workingDays: "22", periods: "58", topics: "९. अक्षर गट क्र. १ - क म ल आ १०. सोहमचा दिवस\nप्रथम घटक चाचणी", outcomes: "अक्षर व ध्वनी जोडणे, वाक्य वाचन" },
  { id: "4", month: "सप्टेंबर", subject: "मराठी", weeks: "4", workingDays: "24", periods: "64", topics: "(भाग - २) १४. चांगल्या सवयी १५. झुक झुक झुक (कविता)", outcomes: "चित्रकथा वर्णन व स्व-अभिव्यक्ती" },
  { id: "5", month: "ऑक्टोबर", subject: "मराठी", weeks: "4", workingDays: "25", periods: "68", topics: "२०. अक्षरगट क्र. ६ - ध य फ ज श ओ\nप्रथम सत्र संकलित मूल्यमापन क्र. १", outcomes: "प्रथम सत्र संकलित मूल्यमापन व उजळणी" },
];

const DEFAULT_ALL_SUBJECTS_ANNUAL_ROWS: PlanningTableRow[] = [
  // 1. मराठी
  { id: "m1", month: "जून - जुलै", subject: "मराठी", weeks: "7", workingDays: "39", periods: "103", topics: "१. माझ्या या दारातून २. चित्र गप्पा\n३. मी आणि माझे कुटुंब ४. माझी जोडी\n५. फिफ्टी रोड व गिरव ६. राधाचे कुटुंब", outcomes: "चित्र वाचन, शब्द ओळख व वाचन पूर्वतयारी" },
  { id: "m2", month: "ऑगस्ट - सप्टें", subject: "मराठी", weeks: "8", workingDays: "46", periods: "122", topics: "अक्षरगट १ ते ४ (क, म, ल, आ, घर, ब, इ, ई, न, स, प, त)\nप्रथम घटक चाचणी (तोंडी व लेखी)", outcomes: "अक्षर व ध्वनी जोडणे, वाक्य वाचन" },
  { id: "m3", month: "ऑक्टोबर - नोव्हें", subject: "मराठी", weeks: "7", workingDays: "43", periods: "116", topics: "अक्षरगट ५ ते ७ व प्रथम सत्र संकलित मूल्यमापन\nदिवाळी सुट्टी उपक्रम व प्रकल्प", outcomes: "प्रकल्प सादरीकरण व संकलित मूल्यमापन" },
  { id: "m4", month: "डिसें - एप्रिल", subject: "मराठी", weeks: "17", workingDays: "99", periods: "252", topics: "अक्षरगट ८ व संवाद, कविता, चित्रकथा\nद्वितीय सत्र संकलित मूल्यमापन क्र. २", outcomes: "वाचन-लेखन समृद्धी व द्वितीय सत्र मूल्यमापन" },

  // 2. गणित
  { id: "g1", month: "जून - जुलै", subject: "गणित", weeks: "7", workingDays: "39", periods: "95", topics: "१. लहान-मोठा २. मागे-पुढे ३. वर-खाली\n४. १ ते ५ संख्यांची ओळख व लेखन\n५. शून्य (०) ची संकल्पना", outcomes: "स्थानिक संकल्पना व १ ते ५ अंक ओळख" },
  { id: "g2", month: "ऑगस्ट - सप्टें", subject: "गणित", weeks: "8", workingDays: "46", periods: "110", topics: "६. ६ ते ९ संख्यांची ओळख\n७. बेरीज (१ ते ९ पर्यंत)\n८. वजाबाकी (१ ते ९ पर्यंत)\nप्रथम घटक चाचणी", outcomes: "अंक गती व १ ते ९ बेरीज-वजाबाकी" },
  { id: "g3", month: "ऑक्टोबर - नोव्हें", subject: "गणित", weeks: "7", workingDays: "43", periods: "100", topics: "९. १० ची ओळख व दशक संकल्पना\n१०. ११ ते २० संख्या ज्ञान\nप्रथम सत्र संकलित मूल्यमापन", outcomes: "दशक संकल्पना व संकलित मूल्यमापन" },
  { id: "g4", month: "डिसें - एप्रिल", subject: "गणित", weeks: "17", workingDays: "99", periods: "230", topics: "११. २१ ते १०० संख्या ज्ञान\n१२. नाणी व नोटा १३. भौमितिक आकृत्या\nद्वितीय सत्र संकलित मूल्यमापन", outcomes: "व्यवहारी गणित व आकार ओळख" },

  // 3. इंग्रजी
  { id: "e1", month: "जून - जुलै", subject: "इंग्रजी", weeks: "7", workingDays: "39", periods: "80", topics: "1. Greetings & Introduction (Hello, Good Morning)\n2. Rhymes & Action Songs (Johnny Johnny, Twinkle Twinkle)\n3. Look, Listen & Say", outcomes: "Basic English listening & vocabulary" },
  { id: "e2", month: "ऑगस्ट - सप्टें", subject: "इंग्रजी", weeks: "8", workingDays: "46", periods: "95", topics: "4. Alphabet Identification (A to M)\n5. Words starting with A-M\nFirst Unit Test", outcomes: "Recognizing capital & small letters A to M" },
  { id: "e3", month: "ऑक्टोबर - नोव्हें", subject: "इंग्रजी", weeks: "7", workingDays: "43", periods: "88", topics: "6. Alphabet N to Z & Vocabulary\n7. Colors and Numbers (1 to 10 in English)\nFirst Term Summative Assessment", outcomes: "Letter recognition N to Z & term assessment" },
  { id: "e4", month: "डिसें - एप्रिल", subject: "इंग्रजी", weeks: "17", workingDays: "99", periods: "210", topics: "8. Short Conversation & Dialogues\n9. Reading Simple 3-letter Words (cat, bat, mat)\nSecond Term Summative Assessment", outcomes: "3-letter word reading & oral communication" },

  // 4. परिसर अभ्यास / विज्ञान
  { id: "p1", month: "जून - जुलै", subject: "परिसर अभ्यास", weeks: "7", workingDays: "39", periods: "75", topics: "१. माझे कुटुंब व माझा परिसर\n२. परिसर स्वच्छता व वैयक्तिक आरोग्य\n३. आपल्या सभोवतालचे प्राणी व पक्षी", outcomes: "पर्यावरण जाणीव व आरोग्यदायी सवयी" },
  { id: "p2", month: "ऑगस्ट - सप्टें", subject: "परिसर अभ्यास", weeks: "8", workingDays: "46", periods: "85", topics: "४. झाडे व त्यांची काळजी ५. पाणी - आपले जीवन\n६. सण व उत्सव (स्वातंत्र्य दिन, गणेशोत्सव)\nप्रथम घटक चाचणी", outcomes: "झाडे व पाण्याचे महत्त्व समजणे" },
  { id: "p3", month: "ऑक्टोबर - नोव्हें", subject: "परिसर अभ्यास", weeks: "7", workingDays: "43", periods: "80", topics: "७. ऋतुचक्र व कपडे\n८. आपली वाहतूक साधने व नियम\nप्रथम सत्र संकलित मूल्यमापन", outcomes: "वाहतूक नियम व प्रथम सत्र मूल्यमापन" },
  { id: "p4", month: "डिसें - एप्रिल", subject: "परिसर अभ्यास", weeks: "17", workingDays: "99", periods: "190", topics: "९. दिशा व आमचा गाव/शहर\n१०. आपल्या गरजा (अन्न, वस्त्र, निवारा)\nद्वितीय सत्र संकलित मूल्यमापन", outcomes: "दिशा ज्ञान व द्वितीय सत्र मूल्यमापन" },

  // 5. कला, कार्यानुभव व शारीरिक शिक्षण
  { id: "k1", month: "वार्षिक उपक्रम", subject: "कला / क्रीडा", weeks: "36", workingDays: "220", periods: "120", topics: "चित्रकला, रंगभरण, कागदी काम, मातीचे काम, मैदानी खेळ, योगासने व कवायत प्रकार", outcomes: "शारीरिक सुदृढता, कल्पकता व कला कौशल्य विकास" },
];

interface AcademicPlanningSystemProps {
  mode?: "teacher" | "admin";
  initialClass?: string;
  onBack?: () => void;
}

const CLASS_OPTIONS = [
  { id: "1st", mr: "इयत्ता पहिली", en: "Class 1st" },
  { id: "2nd", mr: "इयत्ता दुसरी", en: "Class 2nd" },
  { id: "3rd", mr: "इयत्ता तिसरी", en: "Class 3rd" },
  { id: "4th", mr: "इयत्ता चौथी", en: "Class 4th" },
  { id: "5th", mr: "इयत्ता पाचवी", en: "Class 5th" },
  { id: "6th", mr: "इयत्ता सहावी", en: "Class 6th" },
  { id: "7th", mr: "इयत्ता सातवी", en: "Class 7th" },
  { id: "8th", mr: "इयत्ता आठवी", en: "Class 8th" },
];

const MEDIUM_OPTIONS = [
  { id: "marathi", labelMr: "मराठी माध्यम", labelEn: "Marathi Medium", color: "from-amber-500 to-orange-600" },
  { id: "semi", labelMr: "सेमी-इंग्रजी माध्यम", labelEn: "Semi-English Medium", color: "from-teal-500 to-emerald-600" },
];

export function AcademicPlanningSystem({
  mode = "teacher",
  initialClass,
  onBack,
}: AcademicPlanningSystemProps) {
  // Wizard Steps: 1: Medium -> 2: Class -> 3: Planning Type -> 4: Subject & Files
  const [step, setStep] = useState<"medium" | "class" | "type" | "subject">("medium");
  const [selectedPlanningType, setSelectedPlanningType] = useState<"annual" | "monthly" | "question_bank">("annual");

  const [selectedClass, setSelectedClass] = useState<string>(initialClass || "5th");
  const [selectedMedium, setSelectedMedium] = useState<string>("marathi");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Real-time planning files map: key -> PlanningFileRecord
  const [planningFiles, setPlanningFiles] = useState<Record<string, PlanningFileRecord>>({});
  const [loadingFiles, setLoadingFiles] = useState<boolean>(true);

  // Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [uploadingType, setUploadingType] = useState<"annual" | "monthly" | "question_bank">("annual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // View Preview Modal State
  const [viewModalFile, setViewModalFile] = useState<PlanningFileRecord | null>(null);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(true);

  // Annotation / PDF Edit States
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [annotationTool, setAnnotationTool] = useState<"draw" | "highlight" | "text" | "erase" | "whiteout">("draw");
  const [annotationColor, setAnnotationColor] = useState<string>("#ef4444");
  const [lineWidth, setLineWidth] = useState<number>(3);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasAnnotations, setHasAnnotations] = useState<boolean>(false);

  // Sync canvas size with container when annotating starts
  useEffect(() => {
    if (isAnnotating && canvasRef.current) {
      const canvas = canvasRef.current;
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    }
  }, [isAnnotating, isPdfFullscreen]);

  const handleStartDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (annotationTool === "text") {
      const input = prompt("खालील टीप किंवा नवीन माहिती टाइप करा (Type new text):");
      if (input && input.trim()) {
        ctx.font = "bold 16px sans-serif";
        ctx.fillStyle = annotationColor;
        ctx.fillText(input.trim(), x, y);
        setHasAnnotations(true);
      }
      return;
    }

    if (annotationTool === "whiteout") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 14, y - 10, 28, 20);
      setIsDrawing(true);
      setHasAnnotations(true);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (annotationTool === "erase") {
      ctx.clearRect(x - 12, y - 12, 24, 24);
      return;
    }

    if (annotationTool === "whiteout") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x - 14, y - 10, 28, 20);
      setHasAnnotations(true);
      return;
    }

    ctx.strokeStyle = annotationColor;
    ctx.lineWidth = annotationTool === "highlight" ? 18 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = annotationTool === "highlight" ? 0.35 : 1.0;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasAnnotations(true);
  };

  const handleStopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.globalAlpha = 1.0;
      }
    }
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasAnnotations(false);
      toast.info("अॅनोटेशन्स साफ केले गेले.");
    }
  };

  const handleSaveAnnotatedPdf = async () => {
    if (!viewModalFile) return;
    try {
      toast.info("संपादित फाईल जतन होत आहे...");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output("blob");

      const recordKey = viewModalFile.id;
      await saveFileToIndexedDB(recordKey, pdfBlob);
      const newBlobUrl = URL.createObjectURL(pdfBlob);

      const updatedRecord: PlanningFileRecord = {
        ...viewModalFile,
        fileUrl: newBlobUrl,
        uploadedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "academic_plannings", recordKey), updatedRecord, { merge: true });
      } catch (e) {}

      setPlanningFiles((prev) => ({ ...prev, [recordKey]: updatedRecord }));
      setViewModalFile(updatedRecord);
      setIsAnnotating(false);
      toast.success("संपादित PDF यशस्वीरित्या जतन झाली!");
    } catch (err) {
      console.error("Save annotated PDF error:", err);
      toast.error("PDF जतन करताना अडथळा आला.");
    }
  };

  // Table Editor & Information Editing States
  const [isTableEditorOpen, setIsTableEditorOpen] = useState<boolean>(false);
  const [editingFileRecord, setEditingFileRecord] = useState<PlanningFileRecord | null>(null);
  const [tableRows, setTableRows] = useState<PlanningTableRow[]>(DEFAULT_ANNUAL_ROWS);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const printableTableRef = useRef<HTMLDivElement | null>(null);

  const handleOpenTableEditor = (e: React.MouseEvent, rec?: PlanningFileRecord | null) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingFileRecord(rec || null);
    if (rec && rec.tableRows && rec.tableRows.length > 0) {
      setTableRows(rec.tableRows);
    } else {
      setTableRows(DEFAULT_ANNUAL_ROWS);
    }
    setIsTableEditorOpen(true);
  };

  const handleUpdateTableRow = (id: string, field: keyof PlanningTableRow, value: string) => {
    setTableRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddTableRow = () => {
    const newRow: PlanningTableRow = {
      id: Date.now().toString(),
      month: "नवीन महिना",
      subject: selectedSubject || "मराठी",
      weeks: "4",
      workingDays: "20",
      periods: "50",
      topics: "नवीन घटक / पाठ माहिती",
      outcomes: "अध्ययन निष्पत्ती माहिती",
    };
    setTableRows((prev) => [...prev, newRow]);
    toast.success("तक्त्यात नवीन ओळ जोडली गेली.");
  };

  const handleRemoveTableRow = (id: string) => {
    if (tableRows.length <= 1) {
      toast.error("किमान एक नोंद असणे आवश्यक आहे.");
      return;
    }
    setTableRows((prev) => prev.filter((r) => r.id !== id));
    toast.info("नोंद हटवली गेली.");
  };

  const handleGeneratePdfFromEditedTable = async () => {
    const container = document.getElementById("printable-pdf-container");
    try {
      setIsGeneratingPdf(true);
      toast.info("संपादित माहितीची नवीन PDF तयार होत आहे...");

      const printElement = printableTableRef.current;
      if (!printElement) {
        toast.error("प्रिंट घटक सापडला नाही.");
        setIsGeneratingPdf(false);
        return;
      }

      if (container) {
        container.style.display = "block";
        container.style.visibility = "visible";
        container.style.opacity = "1";
      }

      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const subjectName = selectedSubject || "मराठी";
      const fileNameStr = `${selectedClass}_${subjectName}_annual_planning.pdf`;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: fileNameStr,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowHeight: Math.max(printElement.scrollHeight || 0, 2500),
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      const pdfBlob = await (html2pdf() as any).from(printElement).set(opt).output("blob");

      if (container) {
        container.style.display = "none";
        container.style.visibility = "hidden";
        container.style.opacity = "0";
      }

      if (!pdfBlob) throw new Error("PDF generation failed");

      const recordKey = editingFileRecord ? editingFileRecord.id : getFileRecordKey(selectedPlanningType, selectedSubject);
      await saveFileToIndexedDB(recordKey, pdfBlob);
      const newBlobUrl = URL.createObjectURL(pdfBlob);

      const fileSizeMb = (pdfBlob.size / (1024 * 1024)).toFixed(2);
      const updatedRecord: PlanningFileRecord = {
        ...(editingFileRecord || {}),
        id: recordKey,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: editingFileRecord?.subjectId || selectedSubject || "मराठी",
        planningType: editingFileRecord?.planningType || selectedPlanningType,
        fileName: editingFileRecord?.fileName || fileNameStr,
        fileUrl: newBlobUrl,
        fileSize: `${fileSizeMb} MB`,
        fileType: "application/pdf",
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        tableRows: tableRows,
      };

      try {
        await setDoc(doc(db, "academic_plannings", recordKey), updatedRecord, { merge: true });
      } catch (e) {}

      setPlanningFiles((prev) => ({ ...prev, [recordKey]: updatedRecord }));
      setIsTableEditorOpen(false);
      setIsGeneratingPdf(false);

      // Trigger automatic browser download
      const a = document.createElement("a");
      a.href = newBlobUrl;
      a.download = fileNameStr;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("🎉 संपादित तक्त्याची PDF यशस्वीरित्या तयार होऊन डाऊनलोड झाली!");
    } catch (err) {
      console.error("Generate PDF error:", err);
      if (container) {
        container.style.display = "none";
        container.style.visibility = "hidden";
        container.style.opacity = "0";
      }
      setIsGeneratingPdf(false);
      toast.error("PDF तयार करताना अडथळा आला.");
    }
  };



  // Upload progress & compression states
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compressing, setCompressing] = useState<boolean>(false);

  /**
   * Fast client-side PDF compressor using pdf-lib object stream compression
   */
  const compressPdfFile = async (file: File): Promise<Blob> => {
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      return file;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const compressedPdfBytes = await pdfDoc.save({ useObjectStreams: true });
      if (compressedPdfBytes.byteLength < file.size) {
        const exactBytes = new Uint8Array(compressedPdfBytes);
        return new Blob([exactBytes], { type: "application/pdf" });
      }
    } catch (err) {
      console.warn("PDF compression notice (using original):", err);
    }
    return file;
  };

  // Custom Subjects State
  const [customSubjectsMap, setCustomSubjectsMap] = useState<Record<string, string[]>>(() => {
    try {
      const cached = localStorage.getItem("cce_academic_custom_subjects_cache");
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>("");
  const [isSavingSubject, setIsSavingSubject] = useState<boolean>(false);

  // Real-time Firestore sync listener for custom subjects
  useEffect(() => {
    const unsubCustom = onSnapshot(
      collection(db, "academic_custom_subjects"),
      (snapshot) => {
        const cMap: Record<string, string[]> = {};
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && Array.isArray(data.subjects)) {
            cMap[docSnap.id] = data.subjects;
          }
        });
        try {
          const cached = localStorage.getItem("cce_academic_custom_subjects_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            Object.assign(cMap, parsed);
          }
        } catch (e) {}
        setCustomSubjectsMap(cMap);
      },
      (err) => {
        console.warn("Custom subjects listener notice:", err);
      }
    );

    return () => unsubCustom();
  }, []);

  // Real-time Firestore sync listener for planning_files
  useEffect(() => {
    setLoadingFiles(true);
    const unsub = onSnapshot(
      collection(db, "academic_plannings"),
      (snapshot) => {
        const filesMap: Record<string, PlanningFileRecord> = {};
        snapshot.docs.forEach((docSnap) => {
          filesMap[docSnap.id] = docSnap.data() as PlanningFileRecord;
        });

        // Also check localStorage fallback cache (Only fill missing keys, do NOT overwrite Firestore)
        try {
          const cached = localStorage.getItem("cce_academic_plannings_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            Object.keys(parsed).forEach((k) => {
              if (!filesMap[k]) {
                filesMap[k] = parsed[k];
              }
            });
          }
        } catch (e) {}

        setPlanningFiles(filesMap);
        setLoadingFiles(false);
      },
      (err) => {
        console.warn("Planning files realtime listener notice:", err);
        // Fallback to localStorage
        try {
          const cached = localStorage.getItem("cce_academic_plannings_cache");
          if (cached) {
            setPlanningFiles(JSON.parse(cached));
          }
        } catch (e) {}
        setLoadingFiles(false);
      }
    );

    return () => unsub();
  }, []);

  const customKey = `${selectedClass}_${selectedMedium}`;

  // Compute available subjects for selected class & medium (combining defaults + custom subjects)
  const availableSubjects = React.useMemo(() => {
    if (!selectedClass || !selectedMedium) return [];
    const defaults = getDefaultSubjectsForClass(selectedClass, selectedMedium);
    const customs = customSubjectsMap[customKey] || [];
    const combined = [...defaults];
    customs.forEach((cs) => {
      if (!combined.includes(cs)) {
        combined.push(cs);
      }
    });
    return combined;
  }, [selectedClass, selectedMedium, customSubjectsMap, customKey]);

  // Handle Add Custom Subject
  const handleAddSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) {
      toast.error("कृपया विषयाचे नाव टाका!");
      return;
    }

    if (availableSubjects.includes(trimmed)) {
      toast.error("हा विषय आधीपासूनच उपलब्ध आहे!");
      return;
    }

    setIsSavingSubject(true);
    try {
      const currentCustoms = customSubjectsMap[customKey] || [];
      const updatedCustoms = [...currentCustoms, trimmed];

      const docRef = doc(db, "academic_custom_subjects", customKey);
      await setDoc(docRef, { subjects: updatedCustoms, updatedAt: new Date().toISOString() }, { merge: true });

      const newMap = { ...customSubjectsMap, [customKey]: updatedCustoms };
      setCustomSubjectsMap(newMap);
      localStorage.setItem("cce_academic_custom_subjects_cache", JSON.stringify(newMap));

      toast.success(`'${trimmed}' हा विषय यशस्वीरित्या जोडला!`);
      setNewSubjectName("");
      setIsAddSubjectOpen(false);
    } catch (err: any) {
      console.error("Error adding custom subject:", err);
      const currentCustoms = customSubjectsMap[customKey] || [];
      const updatedCustoms = [...currentCustoms, trimmed];
      const newMap = { ...customSubjectsMap, [customKey]: updatedCustoms };
      setCustomSubjectsMap(newMap);
      localStorage.setItem("cce_academic_custom_subjects_cache", JSON.stringify(newMap));

      toast.success(`'${trimmed}' विषय जोडला गेला (Local Cache)!`);
      setNewSubjectName("");
      setIsAddSubjectOpen(false);
    } finally {
      setIsSavingSubject(false);
    }
  };

  // Handle Delete Custom Subject
  const handleDeleteCustomSubject = async (e: React.MouseEvent, subjToDelete: string) => {
    e.stopPropagation();
    if (!confirm(`'${subjToDelete}' हा विषय हटवायचा आहे का?`)) return;

    try {
      const currentCustoms = customSubjectsMap[customKey] || [];
      const updatedCustoms = currentCustoms.filter((s) => s !== subjToDelete);

      const docRef = doc(db, "academic_custom_subjects", customKey);
      await setDoc(docRef, { subjects: updatedCustoms, updatedAt: new Date().toISOString() }, { merge: true });

      const newMap = { ...customSubjectsMap, [customKey]: updatedCustoms };
      setCustomSubjectsMap(newMap);
      localStorage.setItem("cce_academic_custom_subjects_cache", JSON.stringify(newMap));

      toast.success(`'${subjToDelete}' विषय हटवला गेला.`);
    } catch (err) {
      console.error("Error deleting custom subject:", err);
      toast.error("विषय हटवताना त्रुटी आली.");
    }
  };

  // Helper to construct record ID
  const getFileRecordKey = (
    pType: "annual" | "monthly" | "question_bank" = selectedPlanningType,
    subjName?: string
  ) => {
    const s = subjName || selectedSubject;
    return `${selectedClass}_${selectedMedium}_${s}_${pType}`;
  };

  // Handle File Select with Validations (Max 20MB, Allowed Formats: PDF, DOC, DOCX)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("फाइल खूप मोठी आहे! (कमाल मर्यादा: 20MB)");
      setSelectedFile(null);
      return;
    }

    // Validate type (PDF, DOC, DOCX, XLS, XLSX, CSV)
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "csv"];
    if (!validTypes.includes(file.type) && !validExtensions.includes(ext || "")) {
      toast.error("केवळ PDF, Word (DOC/DOCX), किंवा Excel (XLS/XLSX) फाईल्स स्वीकारल्या जातात.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    toast.success(`फाईल निवडली: ${file.name}`);
  };

  // Submit / Save File Upload (PDF Compression + High-Speed Direct Upload)
  const handleSaveFileUpload = async () => {
    if (!selectedFile) {
      toast.error("कृपया अपलोड करण्यासाठी फाईल निवडा.");
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    setCompressing(true);

    try {
      const recordKey = getFileRecordKey(uploadingType);
      const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf";
      const cleanStoragePath = `academic_plannings/${recordKey}_${Date.now()}.${ext}`;

      const originalSizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);

      let finalFileBlob: Blob = selectedFile;
      if (ext === "pdf" || selectedFile.type === "application/pdf") {
        toast.info("⚡ PDF फाईल कॉम्प्रेस होत आहे...");
        finalFileBlob = await compressPdfFile(selectedFile);
      } else {
        toast.info("⚡ फाईल जोडली जात आहे...");
      }
      setCompressing(false);
      setUploadProgress(45);

      const compressedSizeMb = (finalFileBlob.size / (1024 * 1024)).toFixed(2);

      // 1. Save binary Blob persistently to IndexedDB for 100% cross-refresh availability
      await saveFileToIndexedDB(recordKey, finalFileBlob);

      // Create instant local Blob URL (0ms)
      const blobUrl = URL.createObjectURL(finalFileBlob);
      let fileUrl = blobUrl;

      // 2. Direct upload to Firebase Storage with 2.5s fallback timeout
      if (storage) {
        try {
          const storageRef = ref(storage, cleanStoragePath);
          setUploadProgress(75);

          const storageUploadPromise = (async () => {
            const uploadSnapshot = await uploadBytes(storageRef, finalFileBlob);
            return await getDownloadURL(uploadSnapshot.ref);
          })();

          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("Firebase storage response timeout")), 2500)
          );

          fileUrl = await Promise.race([storageUploadPromise, timeoutPromise]);
          setUploadProgress(95);
        } catch (fbErr) {
          console.warn("Firebase Storage timeout/notice, using persistent IndexedDB blob:", fbErr);
          fileUrl = blobUrl;
        }
      }

      setUploadProgress(95);

      // 2. Extract structured table rows from uploaded file (PDF or Excel)
      toast.info("🔍 फाईलमधून तक्ता व माहिती ऑटो-एक्सट्रॅक्ट होत आहे...");
      let extractedRows: PlanningTableRow[] = [];
      try {
        if (ext === "xls" || ext === "xlsx" || ext === "csv") {
          extractedRows = await extractTableRowsFromExcel(selectedFile);
        } else {
          extractedRows = await extractTableRowsFromPdf(selectedFile);
        }
      } catch (exErr) {
        console.warn("File extraction notice:", exErr);
      }

      const rowsToSave =
        extractedRows.length > 0
          ? extractedRows
          : uploadingType === "annual"
          ? DEFAULT_ALL_SUBJECTS_ANNUAL_ROWS
          : DEFAULT_ANNUAL_ROWS;

      setUploadProgress(100);

      const fileSizeDisplay = `${compressedSizeMb} MB`;

      const newRecord: PlanningFileRecord = {
        id: recordKey,
        classId: selectedClass,
        mediumId: selectedMedium,
        subjectId: selectedSubject,
        planningType: uploadingType,
        fileName: selectedFile.name,
        fileUrl: fileUrl,
        fileSize: fileSizeDisplay,
        fileType: selectedFile.type || "application/pdf",
        uploadedBy: mode,
        uploadedAt: new Date().toISOString(),
        tableRows: rowsToSave,
      };

      // 3. Save metadata to Firestore (~250 bytes document -> ~50ms save!)
      try {
        await setDoc(doc(db, "academic_plannings", recordKey), newRecord, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore setDoc notice:", fsErr);
      }

      // 4. Update Local State and Cache
      setPlanningFiles((prev) => {
        const updated = { ...prev, [recordKey]: newRecord };
        try {
          localStorage.setItem("cce_academic_plannings_cache", JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      toast.success(
        `🎉 फाईल यशस्वीरित्या जतन झाली! (${originalSizeMb}MB -> ${compressedSizeMb}MB कॉम्प्रेस झाली)`
      );

      setUploading(false);
      setUploadProgress(0);
      setSelectedFile(null);
      setUploadModalOpen(false);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("अपलोड अयशस्वी: " + (err?.message || "काहीतरी अडचण आली"));
      setUploading(false);
      setUploadProgress(0);
      setCompressing(false);
    }
  };

  // Helper to trigger VIEW preview (checks IndexedDB for persistent blob across page refreshes)
  const handleViewFile = async (rec: PlanningFileRecord) => {
    if (!rec) return;
    let targetUrl = rec.fileUrl;

    const blobFromDb = await getFileFromIndexedDB(rec.id);
    if (blobFromDb) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("अद्याप फाईल उपलब्ध नाही, कृपया फाईल निवडून पुन्हा अपलोड करा.");
      return;
    }

    setViewModalFile({ ...rec, fileUrl: targetUrl });
  };

  // Helper to trigger Direct Full Screen PDF Editor
  const handleOpenDirectPdfEditor = async (
    e?: React.MouseEvent,
    rec?: PlanningFileRecord | null
  ) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!rec) {
      toast.error("एडमिनने अद्याप या विषयाची PDF फाईल अपलोड केलेली नाही.");
      return;
    }

    let targetUrl = rec.fileUrl;
    const blobFromDb = await getFileFromIndexedDB(rec.id);
    if (blobFromDb) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("अद्याप फाईल उपलब्ध नाही, कृपया फाईल निवडून पुन्हा अपलोड करा.");
      return;
    }

    setViewModalFile({ ...rec, fileUrl: targetUrl });
    setIsAnnotating(true);
    setIsPdfFullscreen(true);
  };

  // Helper to trigger download / open (checks IndexedDB for persistent blob across page refreshes)
  const handleDownloadFile = async (rec: PlanningFileRecord) => {
    if (!rec) return;
    let targetUrl = rec.fileUrl;

    const blobFromDb = await getFileFromIndexedDB(rec.id);
    if (blobFromDb) {
      targetUrl = URL.createObjectURL(blobFromDb);
    }

    if (!targetUrl) {
      toast.error("डाउनलोड करण्यासाठी फाईल उपलब्ध नाही.");
      return;
    }

    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = rec.fileName || `${rec.planningType}_planning.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("फाईल डाऊनलोड होत आहे...");
  };

  const stepsList = [
    { id: "medium", labelMr: "माध्यम", labelEn: "Medium" },
    { id: "class", labelMr: "इयत्ता", labelEn: "Class" },
    { id: "type", labelMr: "नियोजन प्रकार", labelEn: "Planning Type" },
    { id: "subject", labelMr: "विषय व फाईल", labelEn: "Subject & Files" },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 p-2 sm:p-4 md:p-6 font-sans">
      {/* Top Header Bar */}
      <div className="w-full max-w-full mx-auto mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer border border-white/10 active:scale-95"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-black uppercase tracking-wider">
                {mode === "admin" ? "ADMIN MANAGEMENT" : "TEACHER SECTION"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 mt-1">
              <BookCheck className="size-6 text-amber-400" />
              <span>वार्षिक व मासिक नियोजन प्रणाली (Academic Planning)</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              माध्यम, इयत्ता व विषयनिहाय वार्षिक नियोजन, मासिक नियोजन आणि प्रश्नपेढी
            </p>
          </div>
        </div>

        {/* Current Selections Summary Badge */}
        {selectedMedium && (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs font-bold">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">माध्यम:</span>
              <span className="text-teal-300">
                {selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}
              </span>
            </div>
            {selectedClass && (
              <>
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">इयत्ता:</span>
                  <span className="text-amber-300">{selectedClass}</span>
                </div>
              </>
            )}
            {step === "subject" && (
              <>
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">प्रकार:</span>
                  <span className="text-emerald-300">
                    {selectedPlanningType === "annual"
                      ? "वार्षिक नियोजन"
                      : selectedPlanningType === "monthly"
                      ? "मासिक नियोजन"
                      : "प्रश्नपेढी"}
                  </span>
                </div>
              </>
            )}
            {selectedSubject && (
              <>
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">विषय:</span>
                  <span className="text-purple-300">{selectedSubject}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress Breadcrumbs Stepper */}
      <div className="w-full max-w-full mx-auto mb-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              PLANNING PROGRESS / टप्पे
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {step === "medium" && "१. माध्यम निवडा (Select Medium: मराठी / सेमी)"}
              {step === "class" && "२. इयत्ता निवडा (Select Class: 1st - 8th)"}
              {step === "type" && "३. नियोजन प्रकार निवडा (Select Type: वार्षिक / मासिक / प्रश्नपेढी)"}
              {step === "subject" && "४. विषय निवडा व नियोजन पहा/एडिट करा (Select Subject & Files)"}
            </p>
          </div>
        </div>

        {/* Step Circles */}
        <div className="flex items-center gap-3">
          {stepsList.map((s, idx) => {
            const stepsOrder = ["medium", "class", "type", "subject"];
            const currIdx = stepsOrder.indexOf(step);
            const thisIdx = stepsOrder.indexOf(s.id);
            const isCompleted = thisIdx < currIdx;
            const isActive = s.id === step;

            return (
              <React.Fragment key={s.id}>
                {idx > 0 && (
                  <div
                    className={`h-1 w-6 sm:w-10 rounded-full transition-all ${
                      isCompleted ? "bg-indigo-600" : "bg-slate-200"
                    }`}
                  />
                )}
                <button
                  disabled={thisIdx > currIdx}
                  onClick={() => setStep(s.id as any)}
                  className={`size-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-100 scale-110"
                      : isCompleted
                      ? "bg-slate-900 text-white hover:bg-slate-800"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="size-4 text-emerald-400" /> : idx + 1}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-full mx-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: MEDIUM SELECTION */}
          {step === "medium" && (
            <motion.div
              key="step-medium"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 w-full max-w-full mx-auto"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Select Medium / माध्यम निवडा</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  वार्षिक व मासिक नियोजनासाठी प्रथम माध्यम निवडा (मराठी किंवा सेमी-इंग्रजी)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {MEDIUM_OPTIONS.map((med) => {
                  const isSelected = selectedMedium === med.id;
                  return (
                    <button
                      key={med.id}
                      onClick={() => {
                        setSelectedMedium(med.id);
                        setStep("class");
                      }}
                      className={`p-8 rounded-3xl border text-left transition-all duration-300 cursor-pointer flex flex-col justify-between gap-6 relative overflow-hidden group ${
                        isSelected
                          ? "bg-gradient-to-br from-indigo-700 to-purple-800 text-white border-indigo-700 shadow-2xl scale-102"
                          : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:scale-101"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center font-black text-lg ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                          }`}
                        >
                          <Languages className="size-7" />
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                          {med.id === "semi" ? "Semi English" : "Marathi"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-black">{med.labelMr}</h3>
                        <p className={`text-xs font-semibold mt-1 ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                          {med.labelEn}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 group-hover:text-indigo-600">
                        <span>इयत्ता निवडीसाठी पुढे जा</span>
                        <span>→</span>
                      </div>
                    </button>
                  );
                })}
              </div>


            </motion.div>
          )}

          {/* STEP 2: CLASS SELECTION */}
          {step === "class" && (
            <motion.div
              key="step-class"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Select Class / इयत्ता निवडा</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  निवडलेले माध्यम: <span className="font-bold text-indigo-600">{selectedMedium === "semi" ? "सेमी-इंग्रजी माध्यम" : "मराठी माध्यम"}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = selectedClass === cls.id;
                  return (
                    <button
                      key={cls.id}
                      onClick={() => {
                        setSelectedClass(cls.id);
                        setStep("type");
                      }}
                      className={`p-6 rounded-3xl border text-center transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 relative overflow-hidden group ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 scale-105"
                          : "bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:scale-102"
                      }`}
                    >
                      <div
                        className={`size-12 rounded-2xl flex items-center justify-center font-black text-base ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                        }`}
                      >
                        <GraduationCap className="size-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-base">{cls.mr}</h4>
                        <p className={`text-[10px] font-bold ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                          {cls.en}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("class")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Class)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: PLANNING TYPE SELECTION (ANNUAL PLANNING ALL SUBJECTS + MONTHLY/QB BY SUBJECT) */}
          {step === "type" && (
            <motion.div
              key="step-type"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">
                  Select Planning Type / नियोजन प्रकार निवडा
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  माध्यम: <span className="font-bold text-indigo-600">{selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}</span> | इयत्ता: <span className="font-bold text-indigo-600">{selectedClass}</span> साठी नियोजन पर्याय:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-full mx-auto">
                {/* 1. Annual Planning Card (सर्व विषयांचे एकत्र संपूर्ण नियोजन - Direct Action) */}
                {(() => {
                  const annualRecKey = getFileRecordKey("annual", "all");
                  const annualFile = planningFiles[annualRecKey];
                  return (
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-[2.5rem] p-7 border border-indigo-500/30 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                            <BookOpen className="size-7 text-amber-300" />
                          </div>
                          {annualFile ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Available
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                              मास्टर नियोजन
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-2xl font-black">Annual Planning</h3>
                          <p className="text-xs font-semibold text-indigo-100/90 mt-1">
                            (वार्षिक नियोजन - एकत्र सर्व विषय)
                          </p>
                          <p className="text-xs text-slate-200 mt-3 leading-relaxed">
                            {annualFile
                              ? `फाईल: ${annualFile.fileName} (${annualFile.fileSize})`
                              : "इयत्ता १ ली ते ८ वी मधील सर्व विषयांचे एकच संपूर्ण वार्षिक नियोजन पत्रक"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-white/15">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleViewFile(annualFile);
                              else toast.error("अद्याप संपूर्ण वार्षिक नियोजनाची फाईल अपलोड केलेली नाही.");
                            }}
                            className="py-3 px-4 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-xs shadow-sm"
                          >
                            <Eye className="size-4 text-amber-300" /> VIEW PDF
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (annualFile) handleDownloadFile(annualFile);
                              else toast.error("अद्याप संपूर्ण वार्षिक नियोजनाची फाईल उपलब्ध नाही.");
                            }}
                            className="py-3 px-4 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <Download className="size-4" /> DOWNLOAD
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleOpenTableEditor(e, annualFile)}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
                        >
                          <Edit3 className="size-4" /> <span>✏️ ऑनलाईन एडिट करा (Edit on Site)</span>
                        </button>



                        {/* Admin Upload / Replace Master File */}
                        {mode === "admin" && (
                          <button
                            onClick={() => {
                              setSelectedSubject("all");
                              setUploadingType("annual");
                              setUploadModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-1"
                          >
                            <Upload className="size-4" />
                            {annualFile ? "REPLACE MASTER FILE (बदला)" : "UPLOAD ANNUAL REPORT (अपलोड करा)"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Monthly Planning Card (विषयनिहाय - Sub-selection) */}
                <div
                  onClick={() => {
                    setSelectedPlanningType("monthly");
                    setStep("subject");
                  }}
                  className="bg-gradient-to-br from-teal-700 via-emerald-800 to-slate-900 text-white rounded-[2.5rem] p-7 border border-teal-500/30 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl hover:scale-102 transition-all cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                        <Calendar className="size-7 text-amber-300" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        विषयनिहाय
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black">Monthly Planning</h3>
                      <p className="text-xs font-semibold text-teal-100/90 mt-1">
                        (मासिक नियोजन - विषयानुसार)
                      </p>
                      <p className="text-xs text-slate-200 mt-3 leading-relaxed">
                        मराठी, गणित, इंग्रजी इत्यादी विषयानुसार मासिक घटक व पाठ नियोजनाची पत्रके पाहण्यासाठी
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex items-center justify-between font-black text-xs text-amber-300 group-hover:text-white transition-colors">
                    <span>विषय निवडा व नियोजन पहा</span>
                    <span>→</span>
                  </div>
                </div>

                {/* 3. Question Bank Card (विषयनिहाय - Sub-selection) */}
                <div
                  onClick={() => {
                    setSelectedPlanningType("question_bank");
                    setStep("subject");
                  }}
                  className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2.5rem] p-7 border border-slate-700/50 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl hover:scale-102 transition-all cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="size-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                        <FolderOpen className="size-7 text-amber-300" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-purple-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        विषयनिहाय
                      </span>
                    </div>

                    <div>
                      <h3 className="text-2xl font-black">Question Bank</h3>
                      <p className="text-xs font-semibold text-slate-300 mt-1">
                        (प्रश्नपेढी दालन)
                      </p>
                      <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                        सर्व विषयांचे घटकनिहाय प्रश्न संच व सराव प्रश्नपत्रिका पहा किंवा डाऊनलोड करा
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/15 flex items-center justify-between font-black text-xs text-amber-300 group-hover:text-white transition-colors">
                    <span>विषय निवडा व प्रश्नपेढी पहा</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("class")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Class)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUBJECT SELECTION & FILE ACTIONS FOR CHOSEN PLANNING TYPE */}
          {step === "subject" && (
            <motion.div
              key="step-subject"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Dashboard Sub-Header */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Select Subject & Access Files / विषय व नियोजन फाईल्स
                  </h2>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                    MEDIUM: {selectedMedium === "semi" ? "Semi-English" : "Marathi"} | CLASS: {selectedClass} | TYPE: {selectedPlanningType === "annual" ? "वार्षिक नियोजन (Annual)" : selectedPlanningType === "monthly" ? "मासिक नियोजन (Monthly)" : "प्रश्नपेढी (Question Bank)"}
                  </p>
                </div>

                <button
                  onClick={() => setStep("type")}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="size-4" /> &lt; BACK (प्रकार निवडीकडे)
                </button>
              </div>

              {/* Grid of Subjects with File Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-full mx-auto">
                {availableSubjects.map((subjName, idx) => {
                  const recKey = getFileRecordKey(selectedPlanningType, subjName);
                  const fileRec = planningFiles[recKey];
                  const isCustom = (customSubjectsMap[customKey] || []).includes(subjName);

                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-md flex flex-col justify-between gap-6 hover:shadow-xl hover:border-indigo-300 transition-all relative group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="size-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                            <BookOpen className="size-5" />
                          </div>
                          {fileRec ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-emerald-600" /> Available
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider">
                              Not Uploaded
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-slate-900 truncate">{subjName}</h3>
                            {isCustom && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                                नवीन
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-1 truncate">
                            {fileRec
                              ? `फाईल: ${fileRec.fileName} (${fileRec.fileSize})`
                              : `${selectedPlanningType === "annual" ? "वार्षिक नियोजन" : selectedPlanningType === "monthly" ? "मासिक नियोजन" : "प्रश्नपेढी"} पत्रक`}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleViewFile(fileRec);
                              else toast.error(`अद्याप ${subjName} ची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="size-4 text-indigo-600" /> VIEW PDF
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (fileRec) handleDownloadFile(fileRec);
                              else toast.error(`अद्याप ${subjName} ची फाईल उपलब्ध नाही.`);
                            }}
                            className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Download className="size-4" /> DOWNLOAD
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleOpenTableEditor(e, fileRec)}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
                        >
                          <Edit3 className="size-4" /> <span>✏️ ऑनलाईन एडिट करा (Edit on Site)</span>
                        </button>



                        {/* Admin Upload / Replace Button */}
                        {mode === "admin" && (
                          <button
                            onClick={() => {
                              setSelectedSubject(subjName);
                              setUploadingType(selectedPlanningType);
                              setUploadModalOpen(true);
                            }}
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
                          >
                            <Upload className="size-4" />
                            {fileRec ? "REPLACE FILE (बदला)" : "UPLOAD FILE (अपलोड करा)"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* ADD NEW SUBJECT CARD (ADMIN ONLY) */}
                {mode === "admin" && (
                  <button
                    onClick={() => setIsAddSubjectOpen(true)}
                    className="p-6 rounded-[2rem] border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/60 hover:border-indigo-500 text-indigo-700 transition-all duration-300 cursor-pointer flex flex-col justify-center items-center text-center gap-3 group hover:shadow-md"
                  >
                    <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-bold transition-colors">
                      <Plus className="size-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-indigo-900">+ नवीन विषय जोडा</h4>
                      <p className="text-[11px] font-bold text-indigo-600/80">
                        Add Custom Subject (Admin Only)
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("type")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Planning Type)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* UPLOAD FILE MODAL (Steps 10, 11, 12 in flowchart) */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-left space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Upload className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Upload Planning File / फाईल अपलोड
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {uploadingType === "annual"
                      ? "वार्षिक नियोजन"
                      : uploadingType === "monthly"
                      ? "मासिक नियोजन"
                      : "प्रश्नपेढी"}{" "}
                    | {selectedClass} | {selectedMedium === "semi" ? "सेमी" : "मराठी"} | {selectedSubject}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>



            {/* Dropzone File Input */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                Select File (फाईल निवडा):
              </label>

              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl p-6 text-center bg-indigo-50/40 hover:bg-indigo-50 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />

                <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileCheck className="size-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-black text-indigo-900">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">
                      आकार: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">
                      इथे फाईल drag करा किंवा कॉम्प्युटरवरून निवडा
                    </p>
                    <p className="text-[11px] text-indigo-600 font-bold">
                      PDF, Word (.docx) किंवा Excel (.xlsx) फाईल (कमाल २०MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar & Compression Indicator */}
            {uploading && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span className="flex items-center gap-1.5">
                    {compressing ? (
                      <>
                        <Sparkles className="size-4 text-amber-500 animate-bounce" />
                        <span>⚡ PDF कॉम्प्रेस व कॉम्पॅक्ट होत आहे...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="size-4 text-indigo-600 animate-spin" />
                        <span>अपलोड प्रगती (Uploading): {uploadProgress}%</span>
                      </>
                    )}
                  </span>
                  <span className="font-extrabold">{compressing ? "25%" : `${uploadProgress}%`}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${compressing ? 25 : uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>

              <button
                type="button"
                disabled={!selectedFile || uploading}
                onClick={handleSaveFileUpload}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    अपलोड होत आहे...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    SUBMIT & SAVE (जतन करा)
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* VIEW FILE PREVIEW MODAL */}
      {viewModalFile && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-white rounded-2xl sm:rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden border border-slate-700/50 transition-all duration-300 ${
              isPdfFullscreen
                ? "h-full max-w-none max-h-none rounded-xl sm:rounded-2xl"
                : "max-w-5xl h-[85vh] max-h-[90vh]"
            }`}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 font-bold shrink-0">
                  <Eye className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black truncate max-w-xs sm:max-w-md md:max-w-lg">{viewModalFile.fileName}</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                    आकार: {viewModalFile.fileSize} | अपलोड दिनांक: {new Date(viewModalFile.uploadedAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">
                {/* OPEN IN NEW TAB */}
                <button
                  onClick={() => window.open(viewModalFile.fileUrl, "_blank")}
                  title="नव्या टॅबमध्ये उघडा (Open in New Tab)"
                  className="p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <ExternalLink className="size-4 sm:size-5" />
                </button>

                {/* INBUILT BROWSER PDF EDITOR BUTTON */}
                <button
                  onClick={() => window.open(viewModalFile.fileUrl, "_blank")}
                  title="ब्राऊझरच्या इन-बिल्ट PDF एडिटरमध्ये उघडून थेट मजकूर एडिट करा (Open Browser Built-in PDF Editor)"
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Edit3 className="size-4 text-amber-300" />
                  <span>✏️ इनबिल्ट एडिटरमध्ये एडिट करा (Edit PDF)</span>
                </button>

                {/* OPEN IN NEW TAB */}
                <button
                  onClick={() => window.open(viewModalFile.fileUrl, "_blank")}
                  title="नव्या टॅबमध्ये उघडा (Open in New Tab)"
                  className="p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <ExternalLink className="size-4 sm:size-5" />
                </button>

                {/* FULLSCREEN TOGGLE */}
                <button
                  onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}
                  title={isPdfFullscreen ? "लहान आकार करा (Normal Size)" : "फुल स्क्रीन करा (Full Screen)"}
                  className="p-2 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  {isPdfFullscreen ? <Minimize2 className="size-4 sm:size-5" /> : <Maximize2 className="size-4 sm:size-5" />}
                </button>

                {/* DOWNLOAD */}
                <button
                  onClick={() => handleDownloadFile(viewModalFile)}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="size-4" /> <span className="hidden sm:inline">DOWNLOAD</span>
                </button>

                {/* CLOSE */}
                <button
                  onClick={() => {
                    setViewModalFile(null);
                    setIsAnnotating(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="flex-1 p-2 sm:p-4 overflow-hidden bg-slate-950/80 flex flex-col items-center justify-center relative">
              {viewModalFile.fileUrl.startsWith("data:application/pdf") ||
              viewModalFile.fileUrl.includes(".pdf") ||
              viewModalFile.fileType?.includes("pdf") ||
              viewModalFile.fileName?.toLowerCase().endsWith(".pdf") ? (
                <div className="w-full h-full min-h-0 flex-1 relative rounded-xl overflow-hidden bg-white shadow-2xl">
                  <iframe
                    src={`${viewModalFile.fileUrl}#toolbar=1&navpanes=1&view=FitH`}
                    className="w-full h-full border-0 bg-white"
                    title="PDF Preview"
                  />
                </div>
              ) : viewModalFile.fileUrl.startsWith("http") ? (
                <div className="w-full h-full min-h-0 flex-1 relative rounded-xl overflow-hidden bg-white shadow-2xl">
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(viewModalFile.fileUrl)}&embedded=true`}
                    className="w-full h-full border-0 bg-white"
                    title="Document PDF Preview"
                  />
                </div>
              ) : (
                <div className="w-full h-full min-h-0 flex-1 relative rounded-2xl overflow-y-auto bg-white p-6 shadow-2xl flex flex-col gap-4">
                  <div className="bg-indigo-900 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 font-bold">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm">{viewModalFile.fileName} (PDF लेआऊट प्रिव्ह्यू)</h4>
                        <p className="text-xs text-indigo-200">Word/Excel फाईलचे ऑनलाईन PDF लेआऊट प्रिव्ह्यू</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(viewModalFile)}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className="size-4" /> डाऊनलोड करा
                    </button>
                  </div>

                  <div className="border border-slate-300 rounded-2xl p-6 bg-slate-50 flex-1 space-y-4">
                    <div className="text-center border-b-2 border-slate-900 pb-3">
                      <h2 className="text-lg font-black text-slate-950 uppercase">
                        इयत्ता : {selectedClass} {selectedPlanningType === "annual" ? "संपूर्ण वार्षिक नियोजन" : selectedPlanningType === "monthly" ? "मासिक नियोजन" : "प्रश्नपेढी"} सन 2026-27
                      </h2>
                      <p className="text-xs font-bold text-slate-700 mt-1">
                        विषय: {selectedSubject || "सर्व विषय"} | माध्यम: {selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}
                      </p>
                    </div>

                    <table className="w-full border-collapse border border-slate-900 text-xs bg-white">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold text-center">
                          <th className="border border-slate-900 p-2">महिना</th>
                          <th className="border border-slate-900 p-2">आठवडा</th>
                          <th className="border border-slate-900 p-2">कामाचे दिवस</th>
                          <th className="border border-slate-900 p-2">प्राप्त तासिका</th>
                          <th className="border border-slate-900 p-2 text-left">विषय / घटक विवरण</th>
                          <th className="border border-slate-900 p-2 text-left">अध्ययन निष्पत्ती</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewModalFile.tableRows && viewModalFile.tableRows.length > 0 ? viewModalFile.tableRows : DEFAULT_ANNUAL_ROWS).map((r) => (
                          <tr key={r.id} className="border-b border-slate-800">
                            <td className="border border-slate-800 p-2 text-center font-bold">{r.month}</td>
                            <td className="border border-slate-800 p-2 text-center">{r.weeks}</td>
                            <td className="border border-slate-800 p-2 text-center">{r.workingDays}</td>
                            <td className="border border-slate-800 p-2 text-center">{r.periods}</td>
                            <td className="border border-slate-800 p-2 font-medium">{r.topics}</td>
                            <td className="border border-slate-800 p-2">{r.outcomes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ADD CUSTOM SUBJECT MODAL */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-600">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">नवीन विषय जोडा</h3>
                  <p className="text-xs font-semibold text-slate-500">
                    इयत्ता {selectedClass} ({selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddSubjectOpen(false);
                  setNewSubjectName("");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                विषयाचे नाव (Subject Name): <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="उदा. संगणक / Computer / चित्रकला"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-800"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubject();
                }}
                autoFocus
              />
              <p className="text-[11px] text-slate-400 font-medium">
                * जोडलेला विषय या इयत्ता आणि माध्यमासाठी सेव्ह होईल व सर्वांना दिसेल.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setIsAddSubjectOpen(false);
                  setNewSubjectName("");
                }}
                className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>
              <button
                onClick={handleAddSubject}
                disabled={isSavingSubject}
                className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSavingSubject ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                <span>विषय जोडा (Add Subject)</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* LIVE SITE DOCUMENT EDITOR MODAL */}
      {isTableEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-[95vw] h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-indigo-800/50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-300 flex items-center justify-center font-bold">
                  <Edit3 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    वेबसाईटवर ऑनलाईन संपादन (In-Site Document Sheet Editor)
                  </h3>
                  <p className="text-xs text-indigo-200 font-semibold">
                    इयत्ता: {selectedClass} | विषय: {selectedSubject || "सर्व विषय"} | सन: 2026-27
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddTableRow}
                  className="px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="size-4" /> <span className="hidden sm:inline">+ ओळ जोडा (Add Row)</span>
                </button>

                <button
                  onClick={handleGeneratePdfFromEditedTable}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" /> PDF तयार होत आहे...
                    </>
                  ) : (
                    <>
                      <Download className="size-4" /> बदलांसह PDF डाऊनलोड करा (Save & Download PDF)
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsTableEditorOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Table Body & Direct Cell Text Editors */}
            <div className="flex-1 p-3 sm:p-5 overflow-y-auto bg-slate-100 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 font-medium flex items-center gap-2.5 shadow-xs">
                <Sparkles className="size-4 text-amber-600 shrink-0" />
                <span>
                  तक्त्यामधील कोणत्याही चौकटीत (महिना, तासिका, घटक विवरण, अध्ययन निष्पत्ती) थेट क्लिक करून माहिती वेबसाईटवर ऑनलाईन टाईप/संपादित करा. बदल पूर्ण झाल्यावर <b>"बदलांसह PDF डाऊनलोड करा"</b> वर क्लिक करा.
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white flex-1">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                      <th className="p-3 w-28 text-center border-r border-slate-800">महिना</th>
                      {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                        <th className="p-3 w-32 text-center border-r border-slate-800">विषय (Subject)</th>
                      )}
                      <th className="p-3 w-20 text-center border-r border-slate-800">आठवडा</th>
                      <th className="p-3 w-24 text-center border-r border-slate-800">कामाचे दिवस</th>
                      <th className="p-3 w-24 text-center border-r border-slate-800">प्राप्त तासिका</th>
                      <th className="p-3 border-r border-slate-800">विषय / घटक विवरण</th>
                      <th className="p-3 border-r border-slate-800">अध्ययन निष्पत्ती</th>
                      <th className="p-3 w-14 text-center">कृती</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {tableRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.month}
                            onChange={(e) => handleUpdateTableRow(row.id, "month", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-center text-xs"
                          />
                        </td>
                        {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                          <td className="p-2 border-r border-slate-200">
                            <input
                              type="text"
                              value={row.subject || "मराठी"}
                              onChange={(e) => handleUpdateTableRow(row.id, "subject", e.target.value)}
                              className="w-full px-2 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 focus:ring-2 focus:ring-indigo-500 font-black text-indigo-900 text-center text-xs"
                            />
                          </td>
                        )}
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.weeks}
                            onChange={(e) => handleUpdateTableRow(row.id, "weeks", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800 text-center text-xs font-semibold"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.workingDays}
                            onChange={(e) => handleUpdateTableRow(row.id, "workingDays", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800 text-center text-xs font-semibold"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.periods}
                            onChange={(e) => handleUpdateTableRow(row.id, "periods", e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-800 text-center text-xs font-semibold"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <textarea
                            rows={2}
                            value={row.topics}
                            onChange={(e) => handleUpdateTableRow(row.id, "topics", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium text-xs resize-y"
                          />
                        </td>
                        <td className="p-2 border-r border-slate-200">
                          <textarea
                            rows={2}
                            value={row.outcomes}
                            onChange={(e) => handleUpdateTableRow(row.id, "outcomes", e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium text-xs resize-y"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => handleRemoveTableRow(row.id)}
                            title="ओळ हटवा"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={handleAddTableRow}
                  className="px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-4" /> + तक्त्यात नवीन ओळ जोडा (Add Row)
                </button>

                <button
                  onClick={handleGeneratePdfFromEditedTable}
                  disabled={isGeneratingPdf}
                  className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  <Download className="size-4" /> बदलांसह PDF डाऊनलोड करा (Save & Download PDF)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* PRINTABLE HTML CONTAINER FOR PDF GENERATION */}
      <div
        id="printable-pdf-container"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "195mm",
          height: "auto",
          zIndex: -9999,
          display: "none",
          visibility: "hidden",
          opacity: 0,
          pointerEvents: "none",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          ref={printableTableRef}
          className="p-5 bg-white text-slate-950 font-sans shadow-none"
          style={{ width: "195mm", boxSizing: "border-box" }}
        >
          <div className="text-center border-b-2 border-slate-950 pb-3 mb-4 space-y-1">
            <h2 className="text-lg font-black tracking-tight text-slate-950 uppercase">
              इयत्ता : {selectedClass === "1st" ? "पहिली" : selectedClass === "2nd" ? "दुसरी" : selectedClass === "3rd" ? "तिसरी" : selectedClass === "4th" ? "चौथी" : selectedClass === "5th" ? "पाचवी" : selectedClass} {selectedPlanningType === "annual" ? "संपूर्ण वार्षिक नियोजन (सर्व विषय एकत्र)" : "वार्षिक नियोजन"} सन :- 2026-27
            </h2>
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 pt-1">
              <span>विषय : {selectedPlanningType === "annual" ? "सर्व विषय (All Subjects)" : (selectedSubject || "मराठी")}</span>
              <span>माध्यम : {selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}</span>
              <span>वर्ष : 2026-27</span>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-950 text-xs table-fixed">
            <thead>
              <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-950 text-center">
                <th className="border border-slate-950 p-2 text-center" style={{ width: selectedPlanningType === "annual" ? "10%" : "12%" }}>महिना</th>
                {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                  <th className="border border-slate-950 p-2 text-center" style={{ width: "12%" }}>विषय</th>
                )}
                <th className="border border-slate-950 p-2 text-center" style={{ width: selectedPlanningType === "annual" ? "7%" : "8%" }}>आठवडा</th>
                <th className="border border-slate-950 p-2 text-center" style={{ width: selectedPlanningType === "annual" ? "9%" : "10%" }}>कामाचे दिवस</th>
                <th className="border border-slate-950 p-2 text-center" style={{ width: selectedPlanningType === "annual" ? "9%" : "10%" }}>प्राप्त तासिका</th>
                <th className="border border-slate-950 p-2 text-left" style={{ width: selectedPlanningType === "annual" ? "27%" : "32%" }}>विषय / घटक विवरण</th>
                <th className="border border-slate-950 p-2 text-left" style={{ width: selectedPlanningType === "annual" ? "26%" : "28%" }}>अध्ययन निष्पत्ती</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-950" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
                  <td className="border border-slate-950 p-2 text-center font-bold break-words">{r.month}</td>
                  {(selectedPlanningType === "annual" || selectedSubject === "सर्व विषय" || selectedSubject === "all") && (
                    <td className="border border-slate-950 p-2 text-center font-black text-indigo-950 bg-slate-50 break-words">{r.subject || "सर्व विषय"}</td>
                  )}
                  <td className="border border-slate-950 p-2 text-center break-words">{r.weeks}</td>
                  <td className="border border-slate-950 p-2 text-center break-words">{r.workingDays}</td>
                  <td className="border border-slate-950 p-2 text-center break-words">{r.periods}</td>
                  <td className="border border-slate-950 p-2 whitespace-pre-line break-words font-medium text-left">{r.topics}</td>
                  <td className="border border-slate-950 p-2 whitespace-pre-line break-words text-left">{r.outcomes}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center pt-8 text-xs font-bold text-slate-900" style={{ pageBreakInside: "avoid", breakInside: "avoid" }}>
            <div>शिक्षक स्वाक्षरी: ___________________</div>
            <div>मुख्याध्यापक स्वाक्षरी: ___________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
