import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  ArrowLeft,
  BookOpen,
  Sparkles,
  RefreshCw,
  Eye,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  X,
  ExternalLink,
  Download,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { uploadBlobToBunny } from "@/lib/bunnyStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cce-remarks")({
  head: () => ({
    meta: [{ title: "CCE Remarks Admin Uploader & Bunny Storage Manager — SMART LEARNING" }],
  }),
  component: AdminCCERemarksPage,
});

const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली (Class 1)" },
  { id: "2nd", label: "इयत्ता २ री (Class 2)" },
  { id: "3rd", label: "इयत्ता ३ री (Class 3)" },
  { id: "4th", label: "इयत्ता ४ थी (Class 4)" },
  { id: "5th", label: "इयत्ता ५ वी (Class 5)" },
  { id: "6th", label: "इयत्ता ६ वी (Class 6)" },
  { id: "7th", label: "इयत्ता ७ वी (Class 7)" },
  { id: "8th", label: "इयत्ता ८ वी (Class 8)" },
  { id: "9th", label: "इयत्ता ९ वी (Class 9)" },
  { id: "10th", label: "इयत्ता १० वी (Class 10)" },
];

const SUBJECTS_CONFIG = [
  { key: "prathambhasha", label: "प्रथम भाषा (मराठी)" },
  { key: "dvitiybhasha", label: "द्वितीय भाषा (इंग्रजी)" },
  { key: "ganit", label: "गणित" },
  { key: "kala", label: "कला" },
  { key: "karyanubhav", label: "कार्यानुभव" },
  { key: "sharirik", label: "शारीरिक शिक्षण" },
  { key: "visheshpragati", label: "विशेष प्रगती" },
  { key: "aavad", label: "आवड / छंद" },
  { key: "sudharna", label: "सुधारणा आवश्यक" },
  { key: "vyaktimatva", label: "व्यक्तिमत्व गुणविशेष" },
];

const CLEANUP_MAP: [string, string][] = [
  ["स9र्व", "सर्व"],
  ["9'र्वनात्मक", "वर्णनात्मक"],
  ["⳪9षयाच्या", "विषयाच्या"],
  ["⳪9षय", "विषय"],
  ["समपर्पक", "समर्पक"],
  ["पटवूनि", "पटवून"],
  ["म् हणींचा", "म्हणींचा"],
  ["प्र माणभाषेचा", "प्रमाणभाषेचा"],
  ["प्र माण", "प्रमाण"],
  ["काडार्गवरील", "कार्डावरील"],
  ["वणर्गनि", "वर्णन"],
  ["वणगन", "वर्णन"],
  ["हिोतो", "होतो"],
  ["वचारतो", "विचारतो"],
  ["ठकाणाचे", "ठिकाणाचे"],
  ["क ु टुंबाविषयी", "कुटुंबाविषयी"],
  ["क ु टुंब", "कुटुंब"],
  ["ऐक ू नि", "ऐकून"],
  ["ऐक ू न", "ऐकून"],
  ["लिखिता", "लिहिता"],
  ["लहिता", "लिहिता"],
  ["दलेल्या", "दिलेल्या"],
  ["कवतेच्या", "कवितेच्या"],
  ["कवतेचे", "कवितेचे"],
  ["चत्राचे", "चित्राचे"],
  ["चत्र", "चित्र"],
  ["मत्रांशी", "मित्रांशी"],
  ["परपाठात", "परिपाठात"],
  ["शारीरक", "शारीरिक"],
  ["शिारिीरिक", "शारीरिक"],
  ["शिक्षणि", "शिक्षण"],
  ["भाषक", "भाषिक"],
  ["मत्र", "मित्र"],
  ["अभनय", "अभिनय"],
  ["अभनिय", "अभिनय"],
  ["मळवलेल्या", "मिळवलेल्या"],
  ["फ ु लांचे", "फुलांचे"],
  ["दनक्रमाचे", "दिनक्रमाची"],
  ["दनक्रमाची", "दिनक्रमाची"],
  ["मजक ु राचे", "मजकुराचे"],
  ["समुहिात", "समूहात"],
  ["निाहिी", "नाही"],
  ["निाहिीत", "नाहीत"],
  ["नाहिी", "नाही"],
  ["नाहिीत", "नाहीत"],
  ["अंगवक्षेप", "अंगविक्षेप"],
  ["ठ े वत", "ठेवत"],
  ["ठ े वतानि", "ठेवताना"],
  ["आहिे", "आहे"],
  ["अथर्ग", "अर्थ"],
  ["अपरचत", "अपरिचित"],
  ["कवता", "कविता"],
  ["पूणर्ग", "पूर्ण"],
  ["मजक ू र", "मजकूर"],
  ["संया", "संख्या"],
  ["संयाकाडार्गचे", "संख्याकार्डाचे"],
  ["क्रया", "क्रिया"],
  ["ग णत", "गणित"],
  ["म्हिनतो", "म्हणतो"],
  ["म्हिणतो", "म्हणतो"],
  ["म्हिणता", "म्हणता"],
  ["म्हिनता", "म्हणता"],
  ["लहिान", "लहान"],
  ["परचय", "परिचय"],
  ["गणतीय", "गणितीय"],
  ["सहिाय्याने", "सहाय्याने"],
  ["वतर्गमानपत्राच्या", "वर्तमानपत्राच्या"],
  ["दनदशर्शिक े च्या", "दिनदर्शिकेच्या"],
  ["मोठ े पणा", "मोठेपणा"],
  ["उदाहिरणे", "उदाहरणे"],
  ["उदाहिरणाची", "उदाहरणाची"],
  [" क ृ ती", " कृती"],
  ["क ृ ती", "कृती"],
  ["आक ृ ती", "आकृती"],
  ["आक ृ त्या", "आकृत्या"],
  ["नसगार्गची", "निसर्गाची"],
  ["पर्यात", "पर्यंत"],
  ["पयर्वंत", "पर्यंत"],
  ["सहिभागी", "सहभागी"],
  ["सहिजपणे", "सहजपणे"],
  ["अथार्गसहि", "अर्थासहित"],
  ["परस्परांनिा", "परस्परांना"],
  ["स्वताच्या", "स्वतःच्या"],
  ["स्वताचे", "स्वतःचे"],
  ["पानिा", "पाने"],
  ["ध्वनिीमधील", "ध्वनीमधील"],
  ["बोलतांनिा", "बोलताना"],
  ["मोठ्यांचा", "मोठ्यांचा"],
  ["मानि", "मान"],
  ["सूचनिेचा", "सूचनेचा"],
  ["सूचनिा", "सूचना"],
  ["निाव्यानिे", "नावाने"],
  ["मुद्द्याच्या", "मुद्यांच्या"],
  ["पद्धतीनिे", "पद्धतीने"],
  ["वाचनि", "वाचन"],
  ["वाचनिाचा", "वाचनाचा"],
  ["T ells", "Tells"],
];

function cleanDevanagari(text: string): string {
  let res = text;
  for (const [oldVal, newVal] of CLEANUP_MAP) {
    res = res.replaceAll(oldVal, newVal);
  }

  // 1. Remove space inside Devanagari conjunct letters with halant (् + space + letter)
  // e.g. "म् हणींचा" -> "म्हणींचा", "स् त" -> "स्त"
  res = res.replace(/([\u0900-\u097F]्)\s+([\u0900-\u097F])/g, "$1$2");

  // 2. Remove space after conjunct prefixes like प्र , ग्र , त्र , द्र , भ्र , क्र , द्व , स्म , स्त
  res = res.replace(/(प्र|ग्र|त्र|द्र|भ्र|क्र|श्र|द्व|स्म|स्त|म्ह)\s+([\u0900-\u097F])/g, "$1$2");

  // 3. Remove space before Devanagari matras
  res = res.replace(/\s+([\u093E-\u094D])/g, "$1");

  return res.replace(/\s+/g, " ").trim();
}

function isHeaderOrNoiseLine(line: string): boolean {
  const raw = line.trim();
  const clean = raw.replace(/[\s\d\.\:\,\-\_\'⳪9]+/g, "").toLowerCase();

  if (
    clean.includes("सर्वविषय") ||
    clean.includes("वर्णनात्मकनोंदी") ||
    clean.includes("दैनिकनिरीक्षण") ||
    clean.includes("स्वाध्याय") ||
    clean.includes("प्रकल्प") ||
    clean.includes("मूल्यमापनसाधने") ||
    clean.includes("तंत्रेवसाधने") ||
    clean.includes("प्रात्यक्षिक") ||
    clean.includes("फॉर्मेटिव्ह") ||
    clean.includes("साधने") ||
    clean.includes("अडथळे") ||
    clean === "विषय" ||
    clean === "विषयाचा" ||
    clean === "वषय" ||
    clean.length <= 2
  ) {
    return true;
  }
  return false;
}

export default function AdminCCERemarksPage() {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState("1st");
  const [mode, setMode] = useState<"pdf" | "manual">("pdf");
  const [activeSubjectTab, setActiveSubjectTab] = useState("prathambhasha");

  // Subject-wise remark arrays
  const [remarksState, setRemarksState] = useState<Record<string, string[]>>({
    prathambhasha: [],
    dvitiybhasha: [],
    ganit: [],
    kala: [],
    karyanubhav: [],
    sharirik: [],
    visheshpragati: [],
    aavad: [],
    sudharna: [],
    vyaktimatva: [],
  });

  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bunnyCdnUrl, setBunnyCdnUrl] = useState<string>("");

  // New item input & inline edit
  const [newRemarkInput, setNewRemarkInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // Load existing saved custom remarks for selectedClass from Bunny Storage & LocalStorage
  useEffect(() => {
    async function loadClassRemarks() {
      setLoading(true);
      setBunnyCdnUrl("");

      try {
        // 1. Check LocalStorage cache
        const localCached = localStorage.getItem(`cce_custom_remarks_${selectedClass}`);
        const cachedCdnUrl = localStorage.getItem(`cce_bunny_cdn_url_${selectedClass}`);
        if (cachedCdnUrl) setBunnyCdnUrl(cachedCdnUrl);

        if (localCached) {
          try {
            const parsed = JSON.parse(localCached);
            setRemarksState((prev) => ({ ...prev, ...parsed }));
          } catch (e) {
            /* ignore */
          }
        }

        // 2. Fetch directly from Bunny CDN URL
        const cdnUrl = `https://SGKBRAINOVA.b-cdn.net/cce_remarks/class_${selectedClass}_remarks.json`;
        const res = await fetch(cdnUrl);
        if (res.ok) {
          const data = await res.json();
          setRemarksState((prev) => ({ ...prev, ...data }));
          setBunnyCdnUrl(cdnUrl);
          localStorage.setItem(`cce_custom_remarks_${selectedClass}`, JSON.stringify(data));
          localStorage.setItem(`cce_bunny_cdn_url_${selectedClass}`, cdnUrl);
        }
      } catch (err: any) {
        console.warn("Could not load remarks from Bunny CDN:", err);
      } finally {
        setLoading(false);
      }
    }

    loadClassRemarks();
  }, [selectedClass]);

  // Client-side PDF Parser Handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      toast.error("कृपया वैध .pdf फाईल निवडा.");
      return;
    }

    setParsing(true);
    toast.info("PDF मधून नोंदी वाचल्या जात आहेत, कृपया प्रतीक्षा करा...");

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let extractedFullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join("\n");
        extractedFullText += `\n=== PAGE ${i} ===\n` + pageText;
      }

      // Process extracted text with smart subject & multiline parser
      const parsedSubjects: Record<string, { positive: string[]; difficulty: string[] }> = {
        prathambhasha: { positive: [], difficulty: [] },
        dvitiybhasha: { positive: [], difficulty: [] },
        ganit: { positive: [], difficulty: [] },
        kala: { positive: [], difficulty: [] },
        karyanubhav: { positive: [], difficulty: [] },
        sharirik: { positive: [], difficulty: [] },
      };

      let currentSubj = "prathambhasha";
      let currentSec: "positive" | "difficulty" = "positive";

      const lines = extractedFullText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const ENGLISH_PAIRS = [
        ["He frames meaningful sentences in English on", "his own", "He frames meaningful sentences in English on his own."],
        ["He translates sentences from English to his", "mother tongue", "He translates sentences from English to his mother tongue."],
        ["He translates sentences from his mother tongue", "to English", "He translates sentences from his mother tongue to English."],
        ["Never takes active participation in given", "projects", "Never takes active participation in given projects."],
        ["Provides practice in matching letters in the", "alphabet", "Provides practice in matching letters in the alphabet."],
        ["He picks out rhyming words from the", "poem", "He picks out rhyming words from the poem."],
        ["Narrates simple and short fables with the help", "of audio, video, and aids", "Narrates simple and short fables with the help of audio, video, and aids."],
        ["Provides opportunity to listen to the rhythm of", "rhymes", "Provides opportunity to listen to the rhythm of rhymes."],
        ["Organizes simple conversational activities for", "practice", "Organizes simple conversational activities for practice."],
        ["Presents model of simple questions and", "answers", "Presents model of simple questions and answers."],
        ["Presents nursery rhymes, prayers, and action", "songs", "Presents nursery rhymes, prayers, and action songs."],
        ["He never translates sentences from English to", "his mother tongue", "He never translates sentences from English to his mother tongue."],
        ["He is not able to tell a story using his own", "words", "He is not able to tell a story using his own words."]
      ];

      for (const line of lines) {
        if (
          line.includes("=== PAGE") ||
          line.startsWith("आकारिक") ||
          line.startsWith("मूल्यमापन") ||
          line.includes("Formative") ||
          line.includes("साधने") ||
          line.startsWith("& Observations") ||
          isHeaderOrNoiseLine(line)
        ) {
          continue;
        }

        const lLower = line.toLowerCase();

        // Robust Subject Detection
        if (lLower.includes("english") || lLower.includes("इंग्रजी") || lLower.includes("dvitiybhasha")) {
          currentSubj = "dvitiybhasha";
          continue;
        } else if (lLower.includes("मराठी") || lLower.includes("मरिाठी") || lLower.includes("प्रथम भाषा") || (lLower.includes("भाषा") && !lLower.includes("द्वितीय"))) {
          currentSubj = "prathambhasha";
          continue;
        } else if (lLower.includes("गणित") || lLower.includes("गणत") || lLower.includes("math")) {
          currentSubj = "ganit";
          continue;
        } else if (lLower.includes("कला") || lLower.includes("चित्रकला") || lLower.includes("art")) {
          currentSubj = "kala";
          continue;
        } else if (lLower.includes("कार्यानुभव") || lLower.includes("कायार्यानुभव") || lLower.includes("कायर्गनुभव") || lLower.includes("संस्कृती ओळख")) {
          currentSubj = "karyanubhav";
          continue;
        } else if (lLower.includes("शारीरिक") || lLower.includes("शिारिीरिक") || lLower.includes("शारीरक") || lLower.includes("नियमत स्वच्छ")) {
          currentSubj = "sharirik";
          continue;
        }

        // Section Detection
        if (line.includes("प्रगती") || line.includes("निरीक्षण") || line.includes("सकारात्मक") || line.includes("Daily Observation") || line.includes("(Positive)")) {
          currentSec = "positive";
          continue;
        } else if (line.includes("अडथळ्यां") || line.includes("अडचणी") || line.includes("अडचण") || line.includes("Negative Observation") || line.includes("Obstacles")) {
          currentSec = "difficulty";
          continue;
        }

        if (/^\d+\.?$/.test(line) || line.startsWith("अडथळे / दोष")) {
          continue;
        }

        let cleanedItem = cleanDevanagari(line);
        cleanedItem = cleanedItem.replace(/^\d+[\.\s]+/, "").trim();
        cleanedItem = cleanedItem.replace(/^[०-९\d\.\s]+प्रकल्प[०-९\d\.\s]+स्वाध्याय[^\s]+\s*/, "").trim();

        if (cleanedItem.length > 3 && parsedSubjects[currentSubj]) {
          const targetArr = parsedSubjects[currentSubj][currentSec];

          if (currentSubj === "dvitiybhasha") {
            let isStandalone = true;
            if (targetArr.length > 0) {
              const lastItem = targetArr[targetArr.length - 1];
              for (const [p1, p2, pFull] of ENGLISH_PAIRS) {
                if (lastItem.toLowerCase().includes(p1.toLowerCase()) && cleanedItem.toLowerCase().includes(p2.toLowerCase())) {
                  targetArr[targetArr.length - 1] = pFull;
                  isStandalone = false;
                  break;
                } else if (cleanedItem.toLowerCase() === p2.toLowerCase()) {
                  targetArr[targetArr.length - 1] = cleanDevanagari(lastItem + " " + cleanedItem);
                  isStandalone = false;
                  break;
                }
              }
            }
            if (isStandalone && cleanedItem && cleanedItem.length > 2) {
              if (!targetArr.includes(cleanedItem) && cleanedItem !== "his own" && cleanedItem !== "mother tongue" && cleanedItem !== "to English" && cleanedItem !== "projects" && cleanedItem !== "alphabet") {
                if (!cleanedItem.endsWith(".")) cleanedItem += ".";
                targetArr.push(cleanedItem);
              }
            }
          } else {
            if (!cleanedItem.endsWith(".")) {
              cleanedItem += ".";
            }
            if (!targetArr.includes(cleanedItem) && !cleanedItem.startsWith("तंत्रे व साधने") && !cleanedItem.startsWith("मूल्यमापन साधने")) {
              targetArr.push(cleanedItem);
            }
          }
        }
      }

      // Interleave positive & difficulty 1-under-1
      const interleavedState: Record<string, string[]> = { ...remarksState };
      for (const subKey of Object.keys(parsedSubjects)) {
        const posList = parsedSubjects[subKey].positive;
        const diffList = parsedSubjects[subKey].difficulty;

        const combined: string[] = [];
        const maxLen = Math.max(posList.length, diffList.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < posList.length) combined.push(posList[i]);
          if (i < diffList.length) combined.push(diffList[i]);
        }
        interleavedState[subKey] = combined;
      }

      setRemarksState(interleavedState);
      toast.success("PDF विषयनिहाय व जोडाक्षर शुद्धीकरणासह यशस्वीरीत्या पार्स झाली! खालील तक्त्यामध्ये पडताळणी करा व Bunny Storage वर सेव्ह करा.");
    } catch (err: any) {
      console.error("PDF Parsing Error:", err);
      toast.error("PDF वाचताना अडचण आली: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  // Add a new custom remark
  const handleAddRemark = () => {
    const trimmed = newRemarkInput.trim();
    if (!trimmed) return;

    let formatted = cleanDevanagari(trimmed);
    if (!formatted.endsWith(".")) formatted += ".";

    setRemarksState((prev) => ({
      ...prev,
      [activeSubjectTab]: [...(prev[activeSubjectTab] || []), formatted],
    }));

    setNewRemarkInput("");
    toast.success("नवीन नोंद जोडली गेली!");
  };

  // Start Inline Editing
  const startEditing = (index: number, val: string) => {
    setEditingIndex(index);
    setEditingValue(val);
  };

  // Save Inline Edit
  const saveInlineEdit = (index: number) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;

    let formatted = cleanDevanagari(trimmed);
    if (!formatted.endsWith(".")) formatted += ".";

    const updated = [...(remarksState[activeSubjectTab] || [])];
    updated[index] = formatted;

    setRemarksState((prev) => ({
      ...prev,
      [activeSubjectTab]: updated,
    }));

    setEditingIndex(null);
    setEditingValue("");
    toast.success("नोंद अद्ययावत झाली!");
  };

  // Delete Remark Item
  const handleDeleteRemark = (index: number) => {
    const updated = (remarksState[activeSubjectTab] || []).filter((_, idx) => idx !== index);
    setRemarksState((prev) => ({
      ...prev,
      [activeSubjectTab]: updated,
    }));
    toast.info("नोंद हटवली गेली.");
  };

  // Upload to Bunny Storage (JSON File + PDF Blob) - NO FIRESTORE WRITES
  const handleSaveToBunnyStorage = async () => {
    setSaving(true);
    toast.info("Bunny Storage CDN वर नोंदी अपलोड होत आहेत...");

    try {
      // 1. Save locally first
      localStorage.setItem(`cce_custom_remarks_${selectedClass}`, JSON.stringify(remarksState));

      // 2. Prepare JSON Blob
      const jsonContent = JSON.stringify(remarksState, null, 2);
      const jsonBlob = new Blob([jsonContent], { type: "application/json" });

      // 3. Upload JSON file to Bunny Storage
      const jsonPath = `cce_remarks/class_${selectedClass}_remarks.json`;
      const uploadedJsonCdnUrl = await uploadBlobToBunny(jsonPath, jsonBlob);

      setBunnyCdnUrl(uploadedJsonCdnUrl);
      localStorage.setItem(`cce_bunny_cdn_url_${selectedClass}`, uploadedJsonCdnUrl);

      toast.success(`इयत्ता ${selectedClass} साठी सर्व नोंदी Bunny Storage CDN वर यशस्वी सेव्ह झाल्या! 🎉`);
    } catch (err: any) {
      console.error("Bunny Storage Save Error:", err);
      toast.error("Bunny Storage वर सेव्ह करताना एरर आली: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const currentRemarksList = remarksState[activeSubjectTab] || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2.5 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
                  Admin Panel
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Bunny Storage CDN Sync
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
                वर्णनात्मक नोंदी व्यवस्थापक (Bunny CDN Storage)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Target Class Selector */}
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-600 uppercase">
                इयत्ता निवडा:
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-transparent font-black text-slate-800 text-sm focus:outline-none cursor-pointer"
              >
                {CLASSES_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Save to Bunny Button */}
            <button
              onClick={handleSaveToBunnyStorage}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>Bunny CDN वर सेव्ह करा</span>
            </button>
          </div>
        </div>

        {/* CDN Link Badge if Available */}
        {bunnyCdnUrl && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs font-medium text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600 flex-shrink-0" />
              <span>
                इयत्ता <strong>{selectedClass}</strong> च्या नोंदी <strong>Bunny Storage CDN</strong> वर सक्रिय आहेत!
              </span>
            </div>
            <a
              href={bunnyCdnUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
            >
              <span>CDN File उघडा</span>
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}

        {/* Input Mode Selector Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode("pdf")}
            className={`p-6 rounded-3xl border text-left transition-all cursor-pointer flex items-center gap-4 ${mode === "pdf"
                ? "bg-blue-50/80 border-blue-400 shadow-md ring-2 ring-blue-400/20"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
              }`}
          >
            <div className={`p-4 rounded-2xl ${mode === "pdf" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Upload className="size-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">१. PDF द्वारे नोंदी अपलोड करा</h3>
              <p className="text-xs text-slate-500 mt-1">
                इयत्तानिहाय PDF फाईल अपलोड करा, प्रणाली आपोआप सकारात्मक व अडचणींच्या नोंदी विषयनिहाय एक्स्ट्रॅक्ट करेल.
              </p>
            </div>
          </button>

          <button
            onClick={() => setMode("manual")}
            className={`p-6 rounded-3xl border text-left transition-all cursor-pointer flex items-center gap-4 ${mode === "manual"
                ? "bg-purple-50/80 border-purple-400 shadow-md ring-2 ring-purple-400/20"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
              }`}
          >
            <div className={`p-4 rounded-2xl ${mode === "manual" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Edit2 className="size-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">२. स्वतः नोंदी लिहा (Write Your Own)</h3>
              <p className="text-xs text-slate-500 mt-1">
                विषयनिहाय स्वतः नवीन नोंदी टाईप करून किंवा एडिट करून जोडा.
              </p>
            </div>
          </button>
        </div>

        {/* PDF Uploader Area */}
        {mode === "pdf" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="size-5 text-blue-600" />
              <span>PDF फाईल अपलोड व ऑटो-पार्सिंग (Select PDF)</span>
            </h2>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 rounded-3xl p-8 text-center transition-colors relative cursor-pointer group">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={parsing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="size-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {parsing ? "PDF मधील विषयनिहाय नोंदी वाचल्या जात आहेत..." : "येथे PDF फाईल ड्रॅग करा किंवा कॉम्प्युटरवरून निवडा"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    केवळ .pdf फाईल समर्थित आहे (उदा. 1li varnanatmak nondi.pdf, 2ri varnanatmak nondi.pdf)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subject Tabs */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <Eye className="size-5 text-purple-600" />
                <span>विषयनिहाय नोंदी पडताळणी व संपादन तक्ता (Subject-wise Review Grid)</span>
              </h2>
              <p className="text-xs text-slate-500">
                इयत्ता <strong>{selectedClass}</strong> साठी विषय निवडा व नोंदी तपासा/बदला.
              </p>
            </div>

            {/* Total Count Badge */}
            <span className="px-3 py-1.5 rounded-full bg-slate-100 font-bold text-xs text-slate-700 border border-slate-200">
              एकूण {currentRemarksList.length} नोंदी
            </span>
          </div>

          {/* Subject Tab Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SUBJECTS_CONFIG.map((sub) => {
              const count = (remarksState[sub.key] || []).length;
              const isActive = activeSubjectTab === sub.key;
              return (
                <button
                  key={sub.key}
                  onClick={() => {
                    setActiveSubjectTab(sub.key);
                    setEditingIndex(null);
                  }}
                  className={`px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  <span>{sub.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add New Remark Input */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <input
              type="text"
              value={newRemarkInput}
              onChange={(e) => setNewRemarkInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRemark()}
              placeholder="नवीन नोंद टाईप करा (उदा. वाचन गतीने करतो.)"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAddRemark}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              <Plus className="size-4" />
              <span>नोंद जोडा</span>
            </button>
          </div>

          {/* Remarks List Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold text-sm">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-blue-500" />
              नोंदी लोड होत आहेत...
            </div>
          ) : currentRemarksList.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <AlertCircle className="size-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">या विषयासाठी कोणतीही नोंद उपलब्ध नाही.</p>
              <p className="text-xs text-slate-400 mt-1">वर दिलेल्या बॉक्समधून नवीन नोंद जोडा किंवा PDF अपलोड करा.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {currentRemarksList.map((remarkText, idx) => {
                const isEditing = editingIndex === idx;
                const isPos = idx % 2 === 0;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${isPos
                        ? "bg-emerald-50/40 border-emerald-100 hover:border-emerald-200"
                        : "bg-amber-50/40 border-amber-100 hover:border-amber-200"
                      }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Alternating Tag */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${isPos
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                      >
                        {isPos ? "सकारात्मक (१)" : "अडचण (२)"}
                      </span>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="flex-1 bg-white border border-blue-400 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-800 flex-1 truncate">
                          {remarkText}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveInlineEdit(idx)}
                            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            title="सेव्ह करा"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="p-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
                            title="रद्द करा"
                          >
                            <X className="size-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditing(idx, remarkText)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="संपादित करा (Edit)"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRemark(idx)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="हटवा (Delete)"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
