import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Search,
  BookOpen,
  Loader2,
  RefreshCw,
  Layers,
  Globe,
  Filter,
  CheckCircle2,
  X,
  FileText,
  FolderPlus,
  FileSpreadsheet,
  FileUp,
  CheckCheck,
  Upload,
  Database,
} from "lucide-react";
import { Footer } from "@/components/Footer";
import { getClassRemarks } from "@/data/classRemarksData";
import { getClassSpecificCCESubjects, type ClassSubjectConfigItem } from "@/data/cceSubjects";
import { uploadBlobToBunny, saveJsonToBunny } from "@/lib/bunnyStorage";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cce-remarks")({
  head: () => ({
    meta: [{ title: "वर्णनात्मक नोंदी व्यवस्थापन (Admin CCE Remarks Manager) — SMART LEARNING" }],
  }),
  component: AdminCCERemarksPage,
});

const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली (1st)" },
  { id: "2nd", label: "इयत्ता २ री (2nd)" },
  { id: "3rd", label: "इयत्ता ३ री (3rd)" },
  { id: "4th", label: "इयत्ता ४ थी (4th)" },
  { id: "5th", label: "इयत्ता ५ वी (5th)" },
  { id: "6th", label: "इयत्ता ६ वी (6th)" },
  { id: "7th", label: "इयत्ता ७ वी (7th)" },
  { id: "8th", label: "इयत्ता ८ वी (8th)" },
  { id: "9th", label: "इयत्ता ९ वी (9th)" },
  { id: "10th", label: "इयत्ता १० वी (10th)" },
];

const MEDIUMS_LIST = [
  { id: "marathi", label: "मराठी माध्यम (Marathi Medium)" },
  { id: "semi", label: "सेमी इंग्रजी माध्यम (Semi-English Medium)" },
];

interface CustomSubjectItem extends ClassSubjectConfigItem {
  isCustom?: boolean;
}

function AdminCCERemarksPage() {
  const navigate = useNavigate();

  const [selectedClass, setSelectedClass] = useState("1st");
  const [selectedMedium, setSelectedMedium] = useState<"marathi" | "semi">("marathi");
  const [activeSubjectKey, setActiveSubjectKey] = useState("prathambhasha");

  // Subject-wise remarks store: { prathambhasha: ["...", "..."], ganit: [...] }
  const [remarksStore, setRemarksStore] = useState<Record<string, string[]>>({});
  // Custom subjects added by admin for this class & medium
  const [customSubjects, setCustomSubjects] = useState<CustomSubjectItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migratingAll, setMigratingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // New remark input & inline edit state
  const [newRemarkText, setNewRemarkText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // New Subject Modal State
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState("📚");

  // Excel / Word File Upload & Fullscreen Popup Modal State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [fetchedRemarks, setFetchedRemarks] = useState<string[]>([]);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  const docId = `${selectedClass}_${selectedMedium}`;

  // Class & Medium specific exact CCE Dashboard subjects
  const classSubjects = useMemo(() => {
    return getClassSpecificCCESubjects(selectedClass, selectedMedium);
  }, [selectedClass, selectedMedium]);

  // Combined subjects list (Class CCE Subjects + Custom Admin Subjects)
  const allSubjects = useMemo<CustomSubjectItem[]>(() => {
    return [...classSubjects, ...customSubjects];
  }, [classSubjects, customSubjects]);

  // Keep activeSubjectKey valid when switching Class or Medium
  useEffect(() => {
    if (allSubjects.length > 0 && !allSubjects.some((s) => s.key === activeSubjectKey)) {
      setActiveSubjectKey(allSubjects[0].key);
      setEditingIndex(null);
      setEditingText("");
      setSearchTerm("");
    }
  }, [allSubjects, activeSubjectKey]);

  // ── Helper: Save/Sync Remarks Store directly to Backend (Firestore, LocalStorage & Bunny) ──
  const persistStoreToFirestore = async (
    newStore: Record<string, string[]>,
    newCustomSubjects?: CustomSubjectItem[],
    updatedBy: string = "admin"
  ) => {
    try {
      const firestoreRef = doc(db, "cce_admin_remarks", docId);
      await setDoc(firestoreRef, {
        classId: selectedClass,
        mediumId: selectedMedium,
        remarks: newStore,
        customSubjects: newCustomSubjects || customSubjects,
        updatedAt: new Date().toISOString(),
        updatedBy,
      });

      // Local Cache update
      localStorage.setItem(`cce_custom_remarks_${selectedClass}_${selectedMedium}`, JSON.stringify(newStore));

      // Asynchronously update Bunny Storage CDN
      const bunnyPath = `cce_remarks/class_${selectedClass}_${selectedMedium}_remarks.json`;
      await saveJsonToBunny(bunnyPath, newStore).catch(() => {});
    } catch (e: any) {
      console.error("Firestore auto-persist error:", e);
      toast.error("बॅकएंडमध्ये सेव्ह करताना त्रुटी आली: " + (e?.message || e));
    }
  };

  // ── Load Master Remarks & Custom Subjects for Class & Medium ──
  useEffect(() => {
    let isMounted = true;
    let firestoreAuthoritative = false;
    setLoading(true);

    const rawDefaultMaster = getClassRemarks(selectedClass, selectedMedium) || {};
    const allowedKeys = new Set(getClassSpecificCCESubjects(selectedClass, selectedMedium).map((s) => s.key));
    const defaultMaster: Record<string, string[]> = {};
    allowedKeys.forEach((k) => {
      defaultMaster[k] = rawDefaultMaster[k] || [];
    });

    // 1. Listen for Firestore Admin Remarks & Custom Subjects
    const unsubDoc = onSnapshot(
      doc(db, "cce_admin_remarks", docId),
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists() && docSnap.data().remarks !== undefined) {
          firestoreAuthoritative = true;
          const data = docSnap.data();
          const remoteRemarks = data.remarks || {};
          const remoteCustomSubjects = data.customSubjects || [];

          setRemarksStore(remoteRemarks);
          setCustomSubjects(remoteCustomSubjects);
        } else {
          // If not in Firestore yet, automatically seed into Firestore backend
          setRemarksStore(defaultMaster);
          setCustomSubjects([]);
          setDoc(
            doc(db, "cce_admin_remarks", docId),
            {
              classId: selectedClass,
              mediumId: selectedMedium,
              remarks: defaultMaster,
              customSubjects: [],
              updatedAt: new Date().toISOString(),
              updatedBy: "system_init",
            },
            { merge: true }
          ).catch((e) => console.warn("Auto-seed error:", e));
        }
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore snapshot notice:", err);
        setLoading(false);
      }
    );

    // 2. Fetch Bunny CDN JSON fallback ONLY if Firestore hasn't resolved yet
    async function fetchFromBunnyCdn() {
      try {
        const cdnBase = import.meta.env.DEV ? "/api/bunny-cdn" : "https://sgkbrainova.b-cdn.net";
        const cdnUrl = `${cdnBase}/cce_remarks/class_${selectedClass}_${selectedMedium}_remarks.json?t=${Date.now()}`;
        const res = await fetch(cdnUrl);
        if (isMounted && !firestoreAuthoritative && res.ok) {
          const data = await res.json();
          if (data && Object.keys(data).length > 0) {
            setRemarksStore(data);
          }
        }
      } catch (e) {
        console.warn("Bunny CDN fetch notice:", e);
      }
    }
    fetchFromBunnyCdn();

    return () => {
      isMounted = false;
      unsubDoc();
    };
  }, [selectedClass, selectedMedium, docId]);

  // Current Active List of Remarks
  const currentSubjectRemarks = useMemo(() => {
    return remarksStore[activeSubjectKey] || [];
  }, [remarksStore, activeSubjectKey]);

  // Total Remarks across all subjects in active Class & Medium
  const totalClassRemarksCount = useMemo(() => {
    return allSubjects.reduce(
      (sum, subj) => sum + (Array.isArray(remarksStore[subj.key]) ? remarksStore[subj.key].length : 0),
      0
    );
  }, [remarksStore, allSubjects]);

  // Filtered Remarks by search term
  const filteredRemarks = useMemo(() => {
    if (!searchTerm.trim()) return currentSubjectRemarks;
    const q = searchTerm.toLowerCase().trim();
    return currentSubjectRemarks.filter((r) => r.toLowerCase().includes(q));
  }, [currentSubjectRemarks, searchTerm]);

  // Filtered Remarks in Modal
  const filteredModalRemarks = useMemo(() => {
    if (!modalSearchTerm.trim()) return fetchedRemarks;
    const q = modalSearchTerm.toLowerCase().trim();
    return fetchedRemarks.filter((r) => r.toLowerCase().includes(q));
  }, [fetchedRemarks, modalSearchTerm]);

  // ── Handle Add New Custom Subject ──
  const handleAddNewSubject = async () => {
    const trimmed = newSubjectName.trim();
    if (!trimmed) {
      toast.error("कृपया विषयाचे नाव टाका!");
      return;
    }

    const key = `subj_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;
    const newSubjectItem: CustomSubjectItem = {
      key,
      label: trimmed,
      icon: newSubjectIcon || "📚",
      isCustom: true,
    };

    const updatedCustomSubjects = [...customSubjects, newSubjectItem];
    const updatedRemarksStore = { ...remarksStore, [key]: [] };

    setCustomSubjects(updatedCustomSubjects);
    setRemarksStore(updatedRemarksStore);
    setActiveSubjectKey(key);

    setNewSubjectName("");
    setIsAddSubjectOpen(false);

    await persistStoreToFirestore(updatedRemarksStore, updatedCustomSubjects);
    toast.success(`🎉 '${trimmed}' हा नवीन विषय जोडला गेला व बॅकएंडमध्ये सेव्ह झाला!`);
  };

  // ── Handle Delete Custom Subject ──
  const handleDeleteCustomSubject = async (subjKey: string, subjName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`नक्की '${subjName}' हा विषय हटवायचा आहे का?`)) return;

    const updatedCustomSubjects = customSubjects.filter((s) => s.key !== subjKey);
    const updatedRemarksStore = { ...remarksStore };
    delete updatedRemarksStore[subjKey];

    setCustomSubjects(updatedCustomSubjects);
    setRemarksStore(updatedRemarksStore);
    setActiveSubjectKey(allSubjects[0]?.key || "prathambhasha");

    await persistStoreToFirestore(updatedRemarksStore, updatedCustomSubjects);
    toast.success(`'${subjName}' विषय बॅकएंडमधून यशस्वीरित्या हटवला गेला.`);
  };

  // ── Handle Add New Remark ──
  const handleAddRemark = async () => {
    const trimmed = newRemarkText.trim();
    if (!trimmed) {
      toast.error("कृपया नोंदीचे वर्णन टाका!");
      return;
    }

    if (currentSubjectRemarks.includes(trimmed)) {
      toast.error("ही नोंद आधीपासूनच समाविष्ट आहे!");
      return;
    }

    const updatedList = [trimmed, ...currentSubjectRemarks];
    const updatedStore = { ...remarksStore, [activeSubjectKey]: updatedList };

    setRemarksStore(updatedStore);
    setNewRemarkText("");

    await persistStoreToFirestore(updatedStore);
    toast.success("✅ नोंद समाविष्ट केली व बॅकएंडमध्ये सेव्ह झाली!");
  };

  // ── Handle Edit Existing Remark ──
  const handleSaveEdit = async (originalIndex: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      toast.error("नोंद रिकामी असू शकत नाही!");
      return;
    }

    const updatedList = [...currentSubjectRemarks];
    updatedList[originalIndex] = trimmed;
    const updatedStore = { ...remarksStore, [activeSubjectKey]: updatedList };

    setRemarksStore(updatedStore);
    setEditingIndex(null);
    setEditingText("");

    await persistStoreToFirestore(updatedStore);
    toast.success("✅ नोंद बॅकएंडमध्ये अपडेट केली व CCE डॅशबोर्डवर त्वरित लागू झाली!");
  };

  // ── Handle Delete Remark ──
  const handleDeleteRemark = async (indexToDelete: number) => {
    if (!confirm("तुम्हाला नक्की ही नोंद हटवायची आहे का? CCE डॅशबोर्डवरूनही ती तात्काळ निघून जाईल.")) return;

    const updatedList = currentSubjectRemarks.filter((_, idx) => idx !== indexToDelete);
    const updatedStore = { ...remarksStore, [activeSubjectKey]: updatedList };

    setRemarksStore(updatedStore);

    await persistStoreToFirestore(updatedStore);
    toast.success("🗑️ नोंद बॅकएंडमधून कायमची हटवली व CCE डॅशबोर्डवरूनही काढून टाकली!");
  };

  // ── Handle Delete All Remarks for Active Subject ──
  const handleDeleteAllSubjectRemarks = async () => {
    if (currentSubjectRemarks.length === 0) return;
    if (
      !confirm(
        `तुम्हाला नक्की '${activeSubjectInfo.label}' या विषयातील सर्व ${currentSubjectRemarks.length} नोंदी हटवायच्या आहेत का? त्या बॅकएंड (Firestore/Bunny) आणि CCE डॅशबोर्डवरूनही कायमच्या काढून टाकल्या जातील.`
      )
    ) {
      return;
    }

    setDeletingAll(true);
    try {
      const updatedStore = { ...remarksStore, [activeSubjectKey]: [] };
      setRemarksStore(updatedStore);
      setEditingIndex(null);
      setEditingText("");
      setSearchTerm("");

      await persistStoreToFirestore(updatedStore, customSubjects, "admin_delete_subject_all");
      toast.success(`🗑️ '${activeSubjectInfo.label}' विषयाच्या सर्व नोंदी बॅकएंड व CCE डॅशबोर्डवरून हटवल्या!`);
    } finally {
      setDeletingAll(false);
    }
  };

  // ── Handle Delete All Remarks for Active Class & Medium ──
  const handleDeleteAllClassRemarks = async () => {
    if (totalClassRemarksCount === 0) return;
    if (
      !confirm(
        `तुम्हाला नक्की इयत्ता '${selectedClass}' (${selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी"}) मधील सर्व विषयांच्या एकूण ${totalClassRemarksCount} नोंदी हटवायच्या आहेत का? या सर्व नोंदी बॅकएंड आणि CCE डॅशबोर्डवरून कायमच्या काढून टाकल्या जातील.`
      )
    ) {
      return;
    }

    setDeletingAll(true);
    try {
      const clearedStore: Record<string, string[]> = {};
      allSubjects.forEach((subj) => {
        clearedStore[subj.key] = [];
      });
      Object.keys(remarksStore).forEach((key) => {
        clearedStore[key] = [];
      });

      setRemarksStore(clearedStore);
      setEditingIndex(null);
      setEditingText("");
      setSearchTerm("");

      await persistStoreToFirestore(clearedStore, customSubjects, "admin_delete_class_all");
      toast.success(`🗑️ इयत्ता '${selectedClass}' मधील सर्व विषयांच्या नोंदी बॅकएंड व CCE डॅशबोर्डवरून हटवल्या!`);
    } finally {
      setDeletingAll(false);
    }
  };

  // ── Bulk Migrate All Code Remarks to Firestore Backend ──
  const handleMigrateAllCodeRemarksToBackend = async () => {
    if (!confirm("तुम्हाला नक्की सर्व १० वर्गांच्या सर्व विषयांच्या डीफॉल्ट नोंदी Firestore बॅकएंडमध्ये सेव्ह/मायग्रेट करायच्या आहेत का?")) return;
    setMigratingAll(true);
    toast.info("⚡ सर्व १० वर्गांच्या नोंदी Firestore बॅकएंडमध्ये सुरक्षित सेव्ह होत आहेत...", { duration: 6000 });

    try {
      let updatedCount = 0;
      for (const c of CLASSES_LIST) {
        for (const m of MEDIUMS_LIST) {
          const dId = `${c.id}_${m.id}`;
          const rawDefaultData = getClassRemarks(c.id, m.id) || {};
          const classAllowedKeys = new Set(getClassSpecificCCESubjects(c.id, m.id).map((s) => s.key));
          const defaultData: Record<string, string[]> = {};
          classAllowedKeys.forEach((k) => {
            defaultData[k] = rawDefaultData[k] || [];
          });
          const snap = await getDoc(doc(db, "cce_admin_remarks", dId));
          if (!snap.exists() || !snap.data().remarks) {
            await setDoc(doc(db, "cce_admin_remarks", dId), {
              classId: c.id,
              mediumId: m.id,
              remarks: defaultData,
              customSubjects: [],
              updatedAt: new Date().toISOString(),
              updatedBy: "admin_bulk_seed",
            }, { merge: true });
            updatedCount++;
          }
        }
      }
      toast.success(`🎉 सर्व वर्गांच्या नोंदी बॅकएंड डेटाबेसमध्ये सुरक्षित सेव्ह झाल्या!`);
    } catch (e: any) {
      console.error("Migration error:", e);
      toast.error("मायग्रेशनमध्ये त्रुटी: " + (e?.message || e));
    } finally {
      setMigratingAll(false);
    }
  };

  // ── Handle File Upload & Extract Nondis (Excel / Word) ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = ""; // Reset file input

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["xlsx", "xls", "csv", "docx", "doc"].includes(ext)) {
      toast.error("कृपया फक्त एक्सेल (.xlsx, .xls, .csv) किंवा वर्ड (.docx) फाईल निवडा!");
      return;
    }

    setIsParsingFile(true);
    setUploadedFileName(file.name);
    toast.info(`"${file.name}" मधून नोंदी वाचत आहे... (Parsing file...)`);

    try {
      const buffer = await file.arrayBuffer();
      const extracted: string[] = [];

      // Helper to check if a cell or string is an index number, serial label, or table column header
      const isIndexOrHeader = (text: string): boolean => {
        const t = text.trim();
        if (!t) return true;

        // Pure numbers, Marathi numerals, Roman numerals, symbols, dates or punctuation
        // e.g. "1", "२", "1.", "१)", "(1)", "1 - 10", "1/8/2026", "#", etc.
        if (/^[\d०-९IVXLCDMivxlcdm\s\.\,\-\:\/\(\)\[\]\{\}\#\*\_\+\\\%\@\&\;\।\|\'\"`~^=]+$/.test(t)) {
          return true;
        }

        // Strip leading/trailing punctuation and whitespace for comparison
        const cleanHeader = t.replace(/^[\s\.\:\-\(\)\[\]\,\;\।\|\'\"`~^=]+|[\s\.\:\-\(\)\[\]\,\;\।\|\'\"`~^=]+$/g, "").toLowerCase();

        // Variations of index headers:
        // अ. क्र., अ.क्र., अ क्र, अ.क्रं., अनुक्रमांक, क्रमांक, क्र., क्र, Sr. No., S.No, etc.
        const headerPatterns = [
          /^अ[\.\s]*क्र[\.\s]*ं?[\.\s]*$/i,
          /^अ[\.\s]*नं[\.\s]*$/i,
          /^अनुक्रमांक[\.\s]*$/i,
          /^क्रमांक[\.\s]*$/i,
          /^क्र[\.\s]*ं?[\.\s]*$/i,
          /^sr[\.\s]*no[\.\s]*$/i,
          /^sr[\.\s]*$/i,
          /^s[\.\s]*no[\.\s]*$/i,
          /^no[\.\s]*$/i,
          /^sl[\.\s]*no[\.\s]*$/i,
          /^serial[\.\s]*no[\.\s]*$/i,
          /^index[\.\s]*$/i,
          /^(?:वर्णनात्मक\s*)?नोंद(?:ी)?[\.\s]*$/i,
          /^remark(?:s)?[\.\s]*$/i,
          /^विषय[\.\s]*$/i,
          /^तपशील[\.\s]*$/i,
          /^घटक[\.\s]*$/i,
          /^पाठ[\.\s]*$/i,
          /^मुद्दा[\.\s]*$/i,
          /^कौशल्य[\.\s]*$/i,
          /^विद्यार्थी(?:\s*नाव)?[\.\s]*$/i,
          /^नाव[\.\s]*$/i,
          /^इयत्ता[\.\s]*$/i,
          /^वर्ग[\.\s]*$/i,
          /^श्रेणी[\.\s]*$/i,
          /^गुण[\.\s]*$/i,
          /^शेरा[\.\s]*$/i,
          /^अध्ययन\s*निष्पत्ती$/i,
          /^अध्ययन\s*अनुभव$/i,
          /^साधन\s*तंत्रे$/i,
          /^शैक्षणिक\s*साहित्य$/i,
        ];

        if (headerPatterns.some((pattern) => pattern.test(cleanHeader) || pattern.test(t))) {
          return true;
        }

        return false;
      };

      // Helper to process a text candidate and add genuine remarks
      const processCandidate = (candidate: string) => {
        if (!candidate) return;
        const raw = candidate.trim();
        if (!raw || raw.length < 3) return;

        // 1. Skip if raw is an index or header
        if (isIndexOrHeader(raw)) return;

        // 2. Remove leading serial numbers e.g. "1. ", "१. ", "1) ", "१) ", "१ ", "1 - ", "• ", "- "
        const cleaned = raw
          .replace(/^[\d०-९]+[\.\)\-\:\s]+/g, "")
          .replace(/^[\(（][\d०-९]+[\)）]\s*/g, "")
          .replace(/^[•\-\*\>]\s*/g, "")
          .trim();

        // 3. Skip if after cleaning it's too short, empty, or an index/header
        if (!cleaned || cleaned.length < 4) return;
        if (isIndexOrHeader(cleaned)) return;

        // 4. Skip pure numbers or dates that might remain
        if (/^[\d०-९\s\.\,\-\:\/\(\)\[\]\{\}\#\*\_\+]+$/.test(cleaned)) return;

        if (!extracted.includes(cleaned)) {
          extracted.push(cleaned);
        }
      };

      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "array" });

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) return;
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

          rows.forEach((row) => {
            if (!Array.isArray(row)) return;
            row.forEach((cell) => {
              if (cell === null || cell === undefined) return;
              processCandidate(String(cell));
            });
          });
        });
      } else if (ext === "docx" || ext === "doc") {
        const mammoth = await import("mammoth");
        const res = await mammoth.extractRawText({ arrayBuffer: buffer });
        const text = res.value || "";
        const lines = text.split(/\r?\n+/);

        lines.forEach((line) => {
          // Split by tabs as well in case of Word tables
          const parts = line.split(/\t+/);
          parts.forEach((part) => {
            processCandidate(part);
          });
        });
      }

      if (extracted.length === 0) {
        toast.error("या फाईलमध्ये कोणतीही योग्य वर्णनात्मक नोंद आढळली नाही. कृपया फाईल तपासा.");
        return;
      }

      setFetchedRemarks(extracted);
      setModalSearchTerm("");
      setIsPreviewModalOpen(true);
      toast.success(`🎉 फाईलवरून ${extracted.length} नोंदी फेच झाल्या! फुलस्क्रीन पॉपअपमध्ये तपासा.`);
    } catch (err: any) {
      console.error("File parse error:", err);
      toast.error("फाईल वाचताना त्रुटी आली: " + (err?.message || "काहीतरी अडचण आली"));
    } finally {
      setIsParsingFile(false);
    }
  };

  // ── Modal Actions: Edit, Delete, Add Row ──
  const updateFetchedRemark = (idx: number, newText: string) => {
    const updated = [...fetchedRemarks];
    updated[idx] = newText;
    setFetchedRemarks(updated);
  };

  const deleteFetchedRemark = (idx: number) => {
    const updated = fetchedRemarks.filter((_, i) => i !== idx);
    setFetchedRemarks(updated);
    toast.info("नोंद वगळली.");
  };

  const addExtraFetchedRemark = () => {
    setFetchedRemarks((prev) => [...prev, ""]);
  };

  // ── Add All Fetched Remarks into CCE (Appended after last existing remark) ──
  const handleAddAllFetchedRemarks = async () => {
    const validNewRemarks = fetchedRemarks
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    if (validNewRemarks.length === 0) {
      toast.error("जोडण्यासाठी कोणतीही नोंद शिल्लक नाही!");
      return;
    }

    // Filter out items already present in currentSubjectRemarks to avoid exact duplicates
    const existingSet = new Set(currentSubjectRemarks);
    const toAdd = validNewRemarks.filter((r) => !existingSet.has(r));

    if (toAdd.length === 0) {
      toast.info("या सर्व नोंदी आधीपासूनच CCE मध्ये अस्तित्वात आहेत!");
      setIsPreviewModalOpen(false);
      return;
    }

    // Append after the last existing remark (after the before nondis)
    const updatedList = [...currentSubjectRemarks, ...toAdd];
    const updatedStore = {
      ...remarksStore,
      [activeSubjectKey]: updatedList,
    };

    setRemarksStore(updatedStore);
    setIsPreviewModalOpen(false);

    // Save to Firestore backend immediately
    await persistStoreToFirestore(updatedStore);

    toast.success(`🎉 ${toAdd.length} नवीन नोंदी CCE बॅकएंडमध्ये यशस्वीरित्या जोडल्या गेल्या! CCE डॅशबोर्डवर लगेच दिसतील.`);
  };

  // ── Handle Save & Sync All to Backend (Firestore + Bunny CDN + LocalStorage) ──
  const handleSaveAllToBackend = async () => {
    setSaving(true);
    toast.info("⚡ विषय व वर्णनात्मक नोंदी Firestore व Bunny Storage CDN वर सेव्ह होत आहेत...", { duration: 4000 });

    try {
      // 1. Save to Firestore
      const firestoreRef = doc(db, "cce_admin_remarks", docId);
      await setDoc(
        firestoreRef,
        {
          classId: selectedClass,
          mediumId: selectedMedium,
          remarks: remarksStore,
          customSubjects: customSubjects,
          updatedAt: new Date().toISOString(),
          updatedBy: "admin",
        }
      );

      // 2. Save JSON to Bunny Storage CDN for instant public access across all user sessions
      const bunnyPath = `cce_remarks/class_${selectedClass}_${selectedMedium}_remarks.json`;
      await saveJsonToBunny(bunnyPath, remarksStore);

      // 3. Local Cache update
      localStorage.setItem(`cce_custom_remarks_${selectedClass}_${selectedMedium}`, JSON.stringify(remarksStore));

      toast.success("🎉 विषय व वर्णनात्मक नोंदी यशस्वीरित्या जतन आणि पब्लिश झाल्या! युजर पॅनेलमध्ये लगेच अपडेट होतील.");
    } catch (err: any) {
      console.error("Save remarks error:", err);
      toast.error("सेव्ह करताना त्रुटी आली: " + (err?.message || "काहीतरी अडचण आली"));
    } finally {
      setSaving(false);
    }
  };

  const activeSubjectInfo = allSubjects.find((s) => s.key === activeSubjectKey) || allSubjects[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/admin" })}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-xs"
            title="मागे जा"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
              <Sparkles className="size-5 text-amber-500 animate-pulse shrink-0" />
              <span>वर्णनात्मक नोंदी व्यवस्थापन (Admin CCE Remarks)</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">वर्ग, माध्यम व विषय जोडा, नोंदी संपादित करा व पब्लिश करा</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleDeleteAllClassRemarks}
            disabled={deletingAll || totalClassRemarksCount === 0}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="या वर्गातील सर्व विषयांच्या सर्व नोंदी बॅकएंड व CCE डॅशबोर्डवरून हटवा"
          >
            {deletingAll ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            <span>सर्व नोंदी हटवा (Delete All)</span>
          </button>

          <button
            onClick={handleMigrateAllCodeRemarksToBackend}
            disabled={migratingAll}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title="सर्व १० वर्गांच्या सर्व विषयांच्या डीफॉल्ट नोंदी थेट Firestore डेटाबेसमध्ये सेव्ह करा"
          >
            {migratingAll ? <Loader2 className="size-3.5 animate-spin text-blue-600" /> : <Database className="size-3.5 text-blue-600" />}
            <span>सर्व नोंदी बॅकएंडमध्ये सेव्ह करा</span>
          </button>

          <button
            onClick={handleSaveAllToBackend}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer transform hover:scale-105 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin text-white" /> : <Save className="size-4 text-white" />}
            <span>💾 सर्व सेव्ह करा (Save & Publish All)</span>
          </button>
        </div>
      </div>

      {/* ── FILTERS BAR (CLASS & MEDIUM) ────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Class selector pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none max-w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="size-3.5 text-blue-600" />
              <span>वर्ग:</span>
            </span>
            {CLASSES_LIST.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                  selectedClass === c.id
                    ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Medium selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {MEDIUMS_LIST.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMedium(m.id as "marathi" | "semi")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedMedium === m.id
                    ? "bg-white text-blue-700 shadow-xs border border-slate-200 font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN WORKSPACE ─────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT SIDE: SUBJECT TABS + ADD SUBJECT BUTTON ─────────────────── */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="size-4 text-blue-600" />
                <span>विषय व घटक यादी</span>
              </h2>

              <button
                onClick={() => setIsAddSubjectOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] font-black transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>विषय जोडा</span>
              </button>
            </div>

            {/* Subject List */}
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {allSubjects.map((subj) => {
                const count = (remarksStore[subj.key] || []).length;
                const isActive = activeSubjectKey === subj.key;

                return (
                  <div
                    key={subj.key}
                    onClick={() => {
                      setActiveSubjectKey(subj.key);
                      setEditingIndex(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer border group ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-600 text-white shadow-md font-extrabold"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-bold"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      <span className="text-base">{subj.icon}</span>
                      <span className="text-xs truncate">{subj.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isActive
                            ? "bg-amber-300 text-slate-950"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {count}
                      </span>

                      {subj.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustomSubject(subj.key, subj.label, e)}
                          className={`p-1 rounded-md transition-colors ${
                            isActive ? "hover:bg-rose-600 text-amber-200" : "hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                          }`}
                          title="विषय हटवा"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDE: REMARKS EDITOR & MANAGEMENT ────────────────────────── */}
        <div className="lg:col-span-8 space-y-5">
          {/* Header Banner for Selected Subject */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl p-3 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600">
                {activeSubjectInfo.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">
                    {selectedClass}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                    {selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी माध्यम"}
                  </span>
                  {activeSubjectInfo.isCustom && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-200">
                      सानुकूल विषय (Custom)
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  {activeSubjectInfo.label} — वर्णनात्मक नोंदी
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-right">
                <div className="text-xs font-bold text-slate-500">एकूण नोंद संख्या</div>
                <div className="text-xl font-black text-blue-700">{currentSubjectRemarks.length}</div>
              </div>

              {currentSubjectRemarks.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllSubjectRemarks}
                  disabled={deletingAll}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 font-black text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                  title="या विषयातील सर्व नोंदी बॅकएंड व CCE डॅशबोर्डवरून हटवा"
                >
                  {deletingAll ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  <span>या विषयाच्या सर्व नोंदी हटवा</span>
                </button>
              )}
            </div>
          </div>

          {/* ── EXCEL / WORD FILE UPLOAD BANNER ────────────────────────────────── */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="p-3 rounded-2xl bg-white border border-emerald-300 text-emerald-600 shadow-xs shrink-0">
                <FileSpreadsheet className="size-6" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5 flex-wrap">
                  <span>फाईलवरून नोंदी अपलोड करा (Excel / Word Upload)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 text-[10px] font-black">
                    .xlsx / .xls / .docx
                  </span>
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  या विषयासाठी एक्सेल शीट किंवा वर्ड फाईलमधून नोंदी फेच करून फुलस्क्रीन पॉपअपमध्ये तपासा, संपादित करा व CCE मध्ये जोडा.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingFile}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isParsingFile ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <FileUp className="size-4 stroke-[2.5]" />
                )}
                <span>📥 फाईल अपलोड करा (Upload File)</span>
              </button>
            </div>
          </div>

          {/* Add New Remark Input Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md space-y-3">
            <label className="text-xs font-black text-blue-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Plus className="size-4 text-blue-600" />
              <span>या विषयात नवीन नोंद समाविष्ट करा (Add New Remark)</span>
            </label>

            <div className="flex gap-2.5">
              <textarea
                value={newRemarkText}
                onChange={(e) => setNewRemarkText(e.target.value)}
                placeholder="येथे नवीन वर्णनात्मक नोंद टाईप करा... (उदा. चित्राचे वाचन करून माहिती सांगतो)"
                rows={2}
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none font-sans leading-relaxed transition-all"
              />
              <button
                onClick={handleAddRemark}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md cursor-pointer self-end transform hover:scale-105"
              >
                <Plus className="size-4 stroke-[3]" />
                <span>जोडा (Add)</span>
              </button>
            </div>
          </div>

          {/* Search & List Header */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="नोंदीमध्ये शोधा (Search remarks)..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-slate-500">
              दाखवत आहे: <span className="text-blue-700 font-black">{filteredRemarks.length}</span> नोंदी
            </div>
          </div>

          {/* Remarks List Container */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-12 text-center text-slate-500 space-y-3 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="size-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs font-bold">डेटा लोड होत आहे...</p>
              </div>
            ) : filteredRemarks.length > 0 ? (
              filteredRemarks.map((remark, idx) => {
                const originalIndex = currentSubjectRemarks.indexOf(remark);
                const isEditing = editingIndex === originalIndex;

                return (
                  <div
                    key={`${idx}-${remark.slice(0, 15)}`}
                    className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 transition-all flex items-start gap-3 shadow-xs group"
                  >
                    <span className="size-6 rounded-lg bg-blue-50 text-blue-700 font-black text-[11px] flex items-center justify-center shrink-0 border border-blue-100 mt-0.5">
                      {originalIndex + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-slate-50 border border-blue-600 rounded-lg p-2 text-xs text-slate-900 focus:outline-none resize-none font-sans"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(originalIndex)}
                            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer shadow-xs"
                            title="सेव्ह करा"
                          >
                            <Check className="size-4 stroke-[3]" />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-all cursor-pointer"
                            title="रद्द करा"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 text-xs text-slate-800 font-semibold leading-relaxed pt-0.5 font-sans">
                          {remark}
                        </div>

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setEditingIndex(originalIndex);
                              setEditingText(remark);
                            }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="संपादन करा (Edit)"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRemark(originalIndex)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="हटवा (Delete)"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
                <p className="text-xs font-bold">या विषयात कोणत्याही वर्णनात्मक नोंदी सापडल्या नाहीत.</p>
                <p className="text-[11px] text-slate-400">वरील फॉर्म वापरून नवीन नोंद जोडा.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ADD NEW SUBJECT MODAL ────────────────────────────────────────────── */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="size-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">नवीन विषय जोडा</h3>
              </div>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  विषयाचे नाव (Subject Name)*
                </label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="उदा. संगणक, संस्कृत, खेळू करू शिकू, इ."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  आयकॉन / इमोजी (Emoji Icon)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubjectIcon}
                    onChange={(e) => setNewSubjectIcon(e.target.value)}
                    placeholder="📚"
                    className="w-16 bg-slate-50 border border-slate-300 focus:border-blue-600 rounded-xl px-3 py-2 text-center text-base focus:outline-none"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {["📚", "💻", "🌿", "🏆", "🎨", "🧩", "🧪", "🎯"].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewSubjectIcon(icon)}
                        className={`size-8 rounded-lg border text-sm flex items-center justify-center transition-all cursor-pointer ${
                          newSubjectIcon === icon ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleAddNewSubject}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md cursor-pointer"
              >
                ➕ विषय जोडा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN POPUP: FETCHED NONDIS PREVIEW & EDIT MODAL ────────────────── */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between p-2 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-6xl w-full h-full mx-auto flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Top Header */}
            <div className="bg-slate-900 text-white px-5 sm:px-8 py-4 sm:py-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <FileSpreadsheet className="size-6" />
                </span>
                <div>
                  <h3 className="text-base sm:text-xl font-extrabold flex items-center gap-2 flex-wrap">
                    <span>फाईलवरून फेच केलेल्या नोंदी (Fetched Nondis Preview)</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                      {fetchedRemarks.length} नोंदी
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-1 font-medium">
                    <span className="text-amber-300 font-bold flex items-center gap-1">
                      <FileText className="size-3.5" />
                      {uploadedFileName}
                    </span>
                    <span>•</span>
                    <span>वर्ग: <b className="text-white">{selectedClass}</b></span>
                    <span>•</span>
                    <span>माध्यम: <b className="text-white">{selectedMedium === "semi" ? "सेमी इंग्रजी" : "मराठी"}</b></span>
                    <span>•</span>
                    <span>विषय: <b className="text-white">{activeSubjectInfo.icon} {activeSubjectInfo.label}</b></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddAllFetchedRemarks}
                  disabled={saving || fetchedRemarks.filter((r) => r.trim()).length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <CheckCheck className="size-4 stroke-[3]" />
                  <span>या सर्व नोंदी CCE मध्ये जोडा (Add All in CCE)</span>
                </button>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="बंद करा"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Sub-Header Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="size-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  placeholder="फेच केलेल्या नोंदींमध्ये शोधा..."
                  className="w-full bg-white border border-slate-300 focus:border-blue-600 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={addExtraFetchedRemark}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>एक नोंद जोडा</span>
                </button>
                <span className="text-xs text-slate-500 font-semibold">
                  दाखवत आहे: <b className="text-slate-900">{filteredModalRemarks.length}</b> नोंदी
                </span>
              </div>
            </div>

            {/* Info notice bar */}
            <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 sm:px-8 py-2 text-[11px] sm:text-xs text-amber-900 flex items-center gap-2 shrink-0">
              <Sparkles className="size-4 text-amber-600 shrink-0" />
              <span>
                <b>सूचना:</b> खालील प्रत्येक नोंद एडिटेबल आहे. तुम्हाला हवी असलेली दुरुस्ती थेट बॉक्समध्ये क्लिक करून करू शकता किंवा नको असलेली नोंद <b>🗑️</b> वर क्लिक करून वगळू शकता. <b>'या सर्व नोंदी CCE मध्ये जोडा'</b> वर क्लिक करताच या सर्व नोंदी सध्याच्या शेवटच्या नोंदीनंतर ({currentSubjectRemarks.length} व्या नोंदीनंतर) थेट बॅकएंडमध्ये सेव्ह केल्या जातील.
              </span>
            </div>

            {/* Modal Body: List of Editable Rows */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-3 bg-slate-100/60">
              {filteredModalRemarks.map((remark, fIdx) => {
                const originalIdx = fetchedRemarks.indexOf(remark);
                return (
                  <div
                    key={originalIdx}
                    className="bg-white border-2 border-slate-200 hover:border-blue-300 rounded-2xl p-3 sm:p-4 shadow-sm flex items-start gap-3 transition-all group"
                  >
                    <span className="size-7 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-100 mt-1">
                      {originalIdx + 1}
                    </span>

                    <textarea
                      value={remark}
                      onChange={(e) => updateFetchedRemark(originalIdx, e.target.value)}
                      rows={2}
                      className="flex-1 bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none font-sans font-medium leading-relaxed transition-all"
                      placeholder="नोंदीचे वर्णन येथे संपादित करा..."
                    />

                    <button
                      onClick={() => deleteFetchedRemark(originalIdx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 mt-1 cursor-pointer"
                      title="ही नोंद वगळा"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Modal Bottom Footer */}
            <div className="bg-white border-t border-slate-200 px-5 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
              <div className="text-xs sm:text-sm text-slate-600 font-bold flex flex-wrap items-center gap-3">
                <span>आधीच्या नोंदी: <b className="text-slate-900 font-black">{currentSubjectRemarks.length}</b></span>
                <span>+</span>
                <span>नवीन जोडल्या जाणाऱ्या नोंदी: <b className="text-emerald-700 font-black">{fetchedRemarks.filter((r) => r.trim()).length}</b></span>
                <span>=</span>
                <span>एकूण नोंदी होतील: <b className="text-blue-700 font-black">{currentSubjectRemarks.length + fetchedRemarks.filter((r) => r.trim()).length}</b></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  रद्द करा (Cancel)
                </button>
                <button
                  onClick={handleAddAllFetchedRemarks}
                  disabled={saving || fetchedRemarks.filter((r) => r.trim()).length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm transition-all flex items-center gap-2 shadow-md cursor-pointer transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <CheckCheck className="size-4 stroke-[3]" />
                  <span>या सर्व नोंदी CCE मध्ये जोडा</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
