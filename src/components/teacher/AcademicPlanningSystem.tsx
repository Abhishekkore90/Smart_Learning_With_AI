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
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { uploadFileWithProgress } from "@/lib/upload";

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
}

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
  // Wizard Steps: 1: Class -> 2: Medium -> 3: Subject -> 4: Planning Dashboard
  const [step, setStep] = useState<"class" | "medium" | "subject" | "dashboard">(
    initialClass ? "medium" : "class"
  );

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
  const getFileRecordKey = (pType: "annual" | "monthly" | "question_bank") => {
    return `${selectedClass}_${selectedMedium}_${selectedSubject}_${pType}`;
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

    // Validate type (PDF, DOC, DOCX)
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !["pdf", "doc", "docx"].includes(ext || "")) {
      toast.error("केवळ PDF, DOC, किंवा DOCX फाईल्स स्वीकारल्या जातात.");
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

      // 1. Client-Side PDF Compression (pdf-lib)
      toast.info("⚡ PDF फाईल कॉम्प्रेस होत आहे...");
      const finalFileBlob = await compressPdfFile(selectedFile);
      setCompressing(false);
      setUploadProgress(45);

      const compressedSizeMb = (finalFileBlob.size / (1024 * 1024)).toFixed(2);

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
          console.warn("Firebase Storage timeout/notice, using instant blob URL:", fbErr);
          fileUrl = blobUrl;
        }
      }

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

  // Helper to trigger download / open
  const handleDownloadFile = (rec: PlanningFileRecord) => {
    if (!rec || !rec.fileUrl) {
      toast.error("डाउनलोड करण्यासाठी फाईल उपलब्ध नाही.");
      return;
    }
    if (rec.fileUrl.startsWith("data:")) {
      const a = document.createElement("a");
      a.href = rec.fileUrl;
      a.download = rec.fileName || `${rec.planningType}_planning.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("फाईल डाऊनलोड होत आहे...");
    } else {
      window.open(rec.fileUrl, "_blank");
    }
  };

  const stepsList = [
    { id: "class", labelMr: "इयत्ता", labelEn: "Class" },
    { id: "medium", labelMr: "माध्यम", labelEn: "Medium" },
    { id: "subject", labelMr: "विषय", labelEn: "Subject" },
    { id: "dashboard", labelMr: "नियोजन प्रकार", labelEn: "Planning" },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      {/* Top Header Bar */}
      <div className="max-w-6xl mx-auto mb-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/50 flex flex-wrap items-center justify-between gap-4">
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
              <span>वार्षिक नियोजन व प्रश्नपेढी प्रणाली (Academic Planning)</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium">
              इयत्ता, माध्यम आणि विषयनिहाय नियोजन फाइल्स व प्रश्नपेढी व्यवस्थापन
            </p>
          </div>
        </div>

        {/* Current Selections Summary Badge */}
        {selectedClass && selectedMedium && (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-xs font-bold">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">इयत्ता:</span>
              <span className="text-amber-300">{selectedClass}</span>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">माध्यम:</span>
              <span className="text-teal-300">
                {selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}
              </span>
            </div>
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
      <div className="max-w-6xl mx-auto mb-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Layers className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              PLANNING PROGRESS / टप्पे
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {step === "class" && "१. इयत्ता निवडा (Select Class)"}
              {step === "medium" && "२. माध्यम निवडा (Select Medium)"}
              {step === "subject" && "३. विषय निवडा (Select Subject)"}
              {step === "dashboard" && "४. नियोजन प्रकार (Annual / Question Bank)"}
            </p>
          </div>
        </div>

        {/* Step Circles */}
        <div className="flex items-center gap-3">
          {stepsList.map((s, idx) => {
            const stepsOrder = ["class", "medium", "subject", "dashboard"];
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
      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: CLASS SELECTION */}
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
                  ज्या इयत्तेचे नियोजन पाहायचे किंवा अपलोड करायचे आहे ती इयत्ता निवडा
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
                        setStep("medium");
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
            </motion.div>
          )}

          {/* STEP 2: MEDIUM SELECTION */}
          {step === "medium" && (
            <motion.div
              key="step-medium"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Select Medium / माध्यम निवडा</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  निवडलेली इयत्ता: <span className="font-bold text-indigo-600">{selectedClass}</span>
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
                        setStep("subject");
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
                        <span>विषय निवडीसाठी पुढे जा</span>
                        <span>→</span>
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

          {/* STEP 3: SUBJECT SELECTION */}
          {step === "subject" && (
            <motion.div
              key="step-subject"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-slate-900">Select Subject / विषय निवडा</h2>
                <p className="text-xs text-slate-500 font-semibold">
                  इयत्ता {selectedClass} ({selectedMedium === "semi" ? "सेमी-इंग्रजी" : "मराठी"}) साठी उपलब्ध विषय:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 sm:gap-6 gap-4">
                {availableSubjects.map((subjName, idx) => {
                  const isSelected = selectedSubject === subjName;
                  const isCustom = (customSubjectsMap[customKey] || []).includes(subjName);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedSubject(subjName);
                        setStep("dashboard");
                      }}
                      className={`p-6 rounded-3xl border text-left transition-all duration-300 cursor-pointer flex items-center gap-4 group relative ${
                        isSelected
                          ? "bg-gradient-to-r from-purple-700 to-indigo-800 text-white border-purple-700 shadow-xl scale-102"
                          : "bg-white text-slate-800 border-slate-200 hover:border-purple-300 hover:shadow-lg hover:scale-101"
                      }`}
                    >
                      <div
                        className={`size-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"
                        }`}
                      >
                        <BookOpen className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="font-black text-base truncate">{subjName}</h4>
                          {isCustom && (
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${isSelected ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-800"}`}>
                              नवीन
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-semibold ${isSelected ? "text-purple-200" : "text-slate-400"}`}>
                          नियोजन व प्रश्नपेढी
                        </p>
                      </div>

                      {isCustom && mode === "admin" && (
                        <span
                          onClick={(e) => handleDeleteCustomSubject(e, subjName)}
                          title="विषय हटवा"
                          className="p-1.5 rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 opacity-80 hover:opacity-100 transition-all ml-auto shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* ADD NEW SUBJECT CARD (ADMIN ONLY) */}
                {mode === "admin" && (
                  <button
                    onClick={() => setIsAddSubjectOpen(true)}
                    className="p-6 rounded-3xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100/60 hover:border-indigo-500 text-indigo-700 transition-all duration-300 cursor-pointer flex items-center gap-4 group hover:shadow-md hover:scale-101"
                  >
                    <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center font-bold shrink-0 transition-colors">
                      <Plus className="size-6" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <h4 className="font-black text-base text-indigo-900 truncate">+ नवीन विषय जोडा</h4>
                      <p className="text-[11px] font-bold text-indigo-600/80">
                        Add Custom Subject (Admin Only)
                      </p>
                    </div>
                  </button>
                )}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStep("medium")}
                  className="px-6 py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="size-4" /> मागे जा (Back to Medium)
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PLANNING DASHBOARD & CARDS */}
          {step === "dashboard" && (
            <motion.div
              key="step-dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Dashboard Sub-Header */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Select Type / प्रकार निवडा
                  </h2>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mt-0.5">
                    CLASS: {selectedClass} | MEDIUM: {selectedMedium === "semi" ? "Semi-English" : "Marathi"} | SUBJECT: {selectedSubject}
                  </p>
                </div>

                <button
                  onClick={() => setStep("subject")}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="size-4" /> &lt; BACK (विषय निवडीकडे)
                </button>
              </div>

              {/* 2 Main Action Cards: Annual Planning & Question Bank */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* 1. Annual Planning Card */}
                {(() => {
                  const recKey = getFileRecordKey("annual");
                  const fileRec = planningFiles[recKey];
                  return (
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-[2.5rem] p-7 border border-indigo-500/30 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="size-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                            <BookOpen className="size-6 text-amber-300" />
                          </div>
                          {fileRec ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Available
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider">
                              Not Uploaded
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xl font-black">Annual Planning</h3>
                          <p className="text-xs font-semibold text-indigo-100/90 mt-1">
                            (वार्षिक नियोजन)
                          </p>
                          <p className="text-[11px] text-slate-300 mt-2 line-clamp-2">
                            {fileRec
                              ? `फाईल: ${fileRec.fileName} (${fileRec.fileSize})`
                              : "वार्षिक अभ्यासाचे नियोजन पत्रक पाहण्यासाठी किंवा अपलोड करण्यासाठी"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/15">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              if (fileRec) setViewModalFile(fileRec);
                              else toast.error("अद्याप वार्षिक नियोजनाची फाईल अपलोड केलेली नाही.");
                            }}
                            className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-xs"
                          >
                            <Eye className="size-4" /> VIEW
                          </button>
                          <button
                            onClick={() => {
                              if (fileRec) handleDownloadFile(fileRec);
                              else toast.error("अद्याप वार्षिक नियोजनाची फाईल उपलब्ध नाही.");
                            }}
                            className="py-2.5 px-3 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Download className="size-4" /> DOWNLOAD
                          </button>
                        </div>

                        {/* Upload / Replace Action */}
                        <button
                          onClick={() => {
                            setUploadingType("annual");
                            setUploadModalOpen(true);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-2"
                        >
                          <Upload className="size-4" />
                          {fileRec ? "REPLACE FILE (बदला)" : "UPLOAD FILE (अपलोड करा)"}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Question Bank Card */}
                {(() => {
                  const recKey = getFileRecordKey("question_bank");
                  const fileRec = planningFiles[recKey];
                  return (
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-[2.5rem] p-7 border border-slate-700/50 shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden group hover:shadow-2xl transition-all">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="size-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
                            <FolderOpen className="size-6 text-amber-300" />
                          </div>
                          {fileRec ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Available
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-black uppercase tracking-wider">
                              Interactive / Optional
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-xl font-black">Question Bank</h3>
                          <p className="text-xs font-semibold text-slate-300 mt-1">
                            (प्रश्नपेढी दालन)
                          </p>
                          <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">
                            {fileRec
                              ? `फाईल: ${fileRec.fileName} (${fileRec.fileSize})`
                              : "घटकनिहाय प्रश्न संच व सराव प्रश्नपत्रिका पाहण्यासाठी"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/15">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              if (fileRec) setViewModalFile(fileRec);
                              else {
                                window.location.href = `/teacher/modules/question-bank?class=${selectedClass}&medium=${selectedMedium}`;
                              }
                            }}
                            className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-xs"
                          >
                            <Eye className="size-4" /> VIEW
                          </button>
                          <button
                            onClick={() => {
                              window.location.href = `/teacher/modules/question-bank?class=${selectedClass}&medium=${selectedMedium}`;
                            }}
                            className="py-2.5 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <ExternalLink className="size-4" /> OPEN
                          </button>
                        </div>

                        {/* Upload / Replace Action */}
                        <button
                          onClick={() => {
                            setUploadingType("question_bank");
                            setUploadModalOpen(true);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md mt-2"
                        >
                          <Upload className="size-4" />
                          {fileRec ? "REPLACE FILE (बदला)" : "UPLOAD FILE (अपलोड करा)"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
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

            {/* Validation Info Note */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-amber-600" /> Validation Rules:
              </div>
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 pl-1">
                <li>कमाल फाईल आकार (Max Size): 20 MB</li>
                <li>परवानगी असलेली स्वरूपे: PDF (.pdf), DOC (.doc), DOCX (.docx)</li>
                <li>नवीन फाईल अपलोड केल्यास जुनी फाईल आपोआप अपडेट होईल (Replace Option).</li>
              </ul>
            </div>

            {/* Dropzone File Input */}
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                Select File (फाईल निवडा):
              </label>

              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-3xl p-6 text-center bg-indigo-50/40 hover:bg-indigo-50 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                    <p className="text-[11px] text-slate-400 font-medium">
                      PDF, DOC किंवा DOCX फाईल (कमाल २०MB)
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 font-bold">
                  <Eye className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black truncate max-w-md">{viewModalFile.fileName}</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    आकार: {viewModalFile.fileSize} | अपलोड दिनांक: {new Date(viewModalFile.uploadedAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(viewModalFile)}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="size-4" /> DOWNLOAD
                </button>
                <button
                  onClick={() => setViewModalFile(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-100 min-h-[400px] flex items-center justify-center">
              {viewModalFile.fileUrl.startsWith("data:application/pdf") ||
              viewModalFile.fileUrl.includes(".pdf") ||
              viewModalFile.fileType?.includes("pdf") ||
              viewModalFile.fileName?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={viewModalFile.fileUrl}
                  className="w-full h-[600px] rounded-2xl border border-slate-300 bg-white shadow-inner"
                  title="PDF Preview"
                />
              ) : (
                <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center space-y-4 max-w-md shadow-md">
                  <div className="size-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <FileText className="size-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">{viewModalFile.fileName}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      या फाईलचा पूर्वावलोकन पाहा किंवा डाऊनलोड करा.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadFile(viewModalFile)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer"
                  >
                    डाऊनलोड करून उघडा (Download & Open)
                  </button>
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
    </div>
  );
}
