import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Sparkles,
  BookOpen,
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  Save,
  Search,
  ArrowLeft,
  Settings,
  ShieldCheck,
  Award,
  Users,
  Compass,
  GraduationCap,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Eye,
  HelpCircle,
  MessageSquare,
  ListOrdered,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  HpcStageId,
  HpcCurricularGoal,
  HpcCompetency,
  HpcDynamicActivity,
  HpcDynamicRubric,
  HpcDynamicRemark,
} from "@/hpc/types/hpc";
import {
  HPC_STAGES_INFO,
  HPC_CURRICULAR_GOALS,
  HPC_COMPETENCIES,
  getAreasForStage,
} from "@/hpc/data/hpcCurricularGoals";
import { HPC_CORE_RUBRICS } from "@/hpc/data/hpcRubrics";
import {
  getHpcDynamicActivities,
  saveHpcDynamicActivity,
  deleteHpcDynamicActivity,
  deleteAllHpcActivities,
  bulkUploadHpcActivities,
  getHpcDynamicRemarks,
  saveHpcDynamicRemark,
  deleteHpcDynamicRemark,
  deleteAllHpcRemarks,
  resetEntireHpcDatabase,
  bulkUploadHpcRemarks,
  getHpcDynamicRubrics,
  saveHpcDynamicRubric,
  deleteHpcDynamicRubric,
  deleteAllHpcRubrics,
  bulkUploadHpcRubrics,
  bulkUploadHpcGoalsAndCompetencies,
  deleteHpcGoal,
  deleteHpcCompetency,
  deleteAllHpcGoals,
  deleteAllHpcCompetencies,
} from "@/hpc/services/hpcService";
import { HPC_ACTIVITIES_BANK } from "@/hpc/data/hpcActivitiesBank";

export const Route = createFileRoute("/admin/hpc-management")({
  head: () => ({
    meta: [{ title: "HPC समग्र प्रगतिपत्रक व्यवस्थापन (Admin HPC Management) — SMART LEARNING" }],
  }),
  component: AdminHpcManagementPage,
});

type TabType = "goals" | "competencies" | "activities" | "excel_sync" | "remarks" | "rubrics";

function AdminHpcManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("activities");
  const [selectedStage, setSelectedStage] = useState<HpcStageId>("foundational");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom goals & competencies from Firestore
  const [customGoals, setCustomGoals] = useState<HpcCurricularGoal[]>([]);
  const [customCompetencies, setCustomCompetencies] = useState<HpcCompetency[]>([]);
  const [loading, setLoading] = useState(false);
  const [compGoalFilter, setCompGoalFilter] = useState<string>("all");

  // Dynamic Activities from Firestore
  const [activitiesList, setActivitiesList] = useState<HpcDynamicActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [selectedCompFilter, setSelectedCompFilter] = useState<string>("all");

  // Dynamic Remarks from Firestore
  const [remarksList, setRemarksList] = useState<HpcDynamicRemark[]>([]);
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarkLevelFilter, setRemarkLevelFilter] = useState<string>("all");

  // Count by Stage for instant badges
  const countByStage = useMemo(() => {
    const counts: Record<HpcStageId, number> = { foundational: 0, preparatory: 0, middle: 0 };
    activitiesList.forEach((a) => {
      if (a.stageId === "foundational") counts.foundational++;
      else if (a.stageId === "preparatory") counts.preparatory++;
      else if (a.stageId === "middle") counts.middle++;
    });
    return counts;
  }, [activitiesList]);

  // Excel Upload & Sync State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploadClass, setSelectedUploadClass] = useState<string>("all");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [parsedActivities, setParsedActivities] = useState<HpcDynamicActivity[]>([]);
  const [parsedRemarks, setParsedRemarks] = useState<HpcDynamicRemark[]>([]);
  const [parsedRubrics, setParsedRubrics] = useState<HpcDynamicRubric[]>([]);
  const [parsedGoals, setParsedGoals] = useState<HpcCurricularGoal[]>([]);
  const [parsedCompetencies, setParsedCompetencies] = useState<HpcCompetency[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  // New/Edit Goal Modal
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalCode, setNewGoalCode] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalArea, setNewGoalArea] = useState("");

  // New/Edit Competency Modal
  const [showAddComp, setShowAddComp] = useState(false);
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompTitle, setNewCompTitle] = useState("");
  const [newCompGoalId, setNewCompGoalId] = useState("");

  // New/Edit Activity Modal
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [actStage, setActStage] = useState<HpcStageId>("preparatory");
  const [actSubject, setActSubject] = useState("");
  const [actGoalCode, setActGoalCode] = useState("");
  const [actGoalTitle, setActGoalTitle] = useState("");
  const [actCompCode, setActCompCode] = useState("");
  const [actCompTitle, setActCompTitle] = useState("");
  const [actNumber, setActNumber] = useState<number>(1);
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actQuestions, setActQuestions] = useState<string[]>(["", "", "", "", ""]);
  const [actTeacherFeedback, setActTeacherFeedback] = useState("");
  const [actParentFeedback, setActParentFeedback] = useState("");

  // Dynamic Rubrics from Firestore
  const [rubricsList, setRubricsList] = useState<HpcDynamicRubric[]>([]);
  const [rubricsLoading, setRubricsLoading] = useState(false);
  const [rubricDimensionFilter, setRubricDimensionFilter] = useState<string>("all");

  // New/Edit Rubric Modal
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingRubricId, setEditingRubricId] = useState<string | null>(null);
  const [rubStage, setRubStage] = useState<HpcStageId>("preparatory");
  const [rubDimension, setRubDimension] = useState("जाणीवजागृती");
  const [rubCompCode, setRubCompCode] = useState("");
  const [rubActTitle, setRubActTitle] = useState("");
  const [rubBeginner, setRubBeginner] = useState("");
  const [rubProficient, setRubProficient] = useState("");
  const [rubAdvanced, setRubAdvanced] = useState("");

  // New/Edit Remark Modal
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [remSubject, setRemSubject] = useState("");
  const [remLevel, setRemLevel] = useState<string>("प्रगत");
  const [remText, setRemText] = useState("");
  const [remarkAreaFilter, setRemarkAreaFilter] = useState<string>("all");

  const areas = getAreasForStage(selectedStage);

  // Load Goals & Competencies from Firestore
  const fetchGoalsAndCompetencies = async () => {
    setLoading(true);
    try {
      const goalsSnap = await getDocs(collection(db, "hpc_custom_goals"));
      const gList: HpcCurricularGoal[] = [];
      goalsSnap.forEach((d) => gList.push({ id: d.id, ...d.data() } as any));
      setCustomGoals(gList);

      const compSnap = await getDocs(collection(db, "hpc_custom_competencies"));
      const cList: HpcCompetency[] = [];
      compSnap.forEach((d) => cList.push({ id: d.id, ...d.data() } as any));
      setCustomCompetencies(cList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsAndCompetencies();
  }, []);

  // Load Activities from Firestore
  const fetchActivities = async () => {
    setActivitiesLoading(true);
    try {
      const list = await getHpcDynamicActivities();
      setActivitiesList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Load Remarks from Firestore
  const fetchRemarks = async () => {
    setRemarksLoading(true);
    try {
      const list = await getHpcDynamicRemarks();
      setRemarksList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setRemarksLoading(false);
    }
  };

  useEffect(() => {
    fetchRemarks();
  }, []);

  // Load Dynamic Rubrics from Firestore
  const fetchRubrics = async () => {
    setRubricsLoading(true);
    try {
      const list = await getHpcDynamicRubrics();
      setRubricsList(list);
    } catch (err) {
      console.error(err);
    } finally {
      setRubricsLoading(false);
    }
  };

  useEffect(() => {
    fetchRubrics();
  }, []);

  // SHOW ONLY UPLOADED / CUSTOM GOALS (Dheya)
  const allGoals = useMemo(() => {
    const list: HpcCurricularGoal[] = customGoals.map((g) => ({
      ...g,
      titleMarathi: g.titleMarathi || (g as any).nameMarathi || g.code || "",
    }));
    // Also include goals from uploaded activities if not already present
    activitiesList.forEach((act) => {
      if (act.goalCode) {
        const cleanCode = act.goalCode.trim();
        const gId = `CUSTOM-${cleanCode}`;
        if (!list.some((g) => g.code === cleanCode || g.id === gId)) {
          list.push({
            id: gId,
            code: cleanCode,
            titleMarathi: act.goalTitle || cleanCode,
            stageId: act.stageId,
            areaOrSubjectId: act.subjectOrArea || "general",
          });
        }
      }
    });

    return list.filter((g) => g.stageId === selectedStage);
  }, [selectedStage, customGoals, activitiesList]);

  // SHOW ONLY UPLOADED / CUSTOM COMPETENCIES (Kshmata)
  const allCompetencies = useMemo(() => {
    const list: HpcCompetency[] = customCompetencies.map((c) => ({
      ...c,
      titleMarathi: c.titleMarathi || (c as any).nameMarathi || c.code || "",
      goalId: c.goalId || ((c as any).goalCode ? `CUSTOM-${(c as any).goalCode}` : ""),
    }));
    activitiesList.forEach((act) => {
      if (act.competencyCode) {
        const cleanCode = act.competencyCode.trim();
        const cId = `CUSTOM-${cleanCode}`;
        if (!list.some((c) => c.code === cleanCode || c.id === cId)) {
          list.push({
            id: cId,
            code: cleanCode,
            titleMarathi: act.competencyTitle || cleanCode,
            goalId: act.goalCode ? `CUSTOM-${act.goalCode.trim()}` : "",
            stageId: act.stageId,
            applicableClassIds:
              act.stageId === "foundational"
                ? ["1st", "2nd"]
                : act.stageId === "preparatory"
                ? ["3rd", "4th", "5th"]
                : ["6th", "7th", "8th"],
            applicableSession: "both",
          });
        }
      }
    });

    return list.filter((c) => c.stageId === selectedStage);
  }, [selectedStage, customCompetencies, activitiesList]);

  // Filtered Competencies for Tab 5
  const filteredCompetencies = useMemo(() => {
    return allCompetencies.filter((c) => {
      if (compGoalFilter !== "all") {
        const cleanCompGoal = (c.goalId || "").replace(/^CUSTOM[-_]/i, "").trim().toLowerCase();
        const cleanFilter = compGoalFilter.replace(/^CUSTOM[-_]/i, "").trim().toLowerCase();
        if (cleanCompGoal !== cleanFilter) return false;
      }
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        return (
          (c.code || "").toLowerCase().includes(q) ||
          (c.titleMarathi || (c as any).nameMarathi || "").toLowerCase().includes(q) ||
          (c.goalId && c.goalId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allCompetencies, compGoalFilter, searchQuery]);

  // Filtered Rubrics
  const filteredRubrics = useMemo(() => {
    return rubricsList.filter((rub) => {
      const matchesStage = !rub.stageId || rub.stageId === selectedStage;
      const matchesDim =
        rubricDimensionFilter === "all" ||
        rub.dimension?.trim().toLowerCase() === rubricDimensionFilter.trim().toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (rub.activityTitle && rub.activityTitle.toLowerCase().includes(q)) ||
        (rub.dimension && rub.dimension.toLowerCase().includes(q)) ||
        (rub.competencyCode && rub.competencyCode.toLowerCase().includes(q)) ||
        (rub.beginner && rub.beginner.toLowerCase().includes(q)) ||
        (rub.proficient && rub.proficient.toLowerCase().includes(q)) ||
        (rub.advanced && rub.advanced.toLowerCase().includes(q));
      return matchesStage && matchesDim && matchesQuery;
    });
  }, [rubricsList, selectedStage, rubricDimensionFilter, searchQuery]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activitiesList.filter((act) => {
      const matchesStage = act.stageId === selectedStage;
      const matchesComp = selectedCompFilter === "all" || act.competencyCode === selectedCompFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        act.activityTitle.toLowerCase().includes(q) ||
        act.competencyCode.toLowerCase().includes(q) ||
        act.subjectOrArea.toLowerCase().includes(q) ||
        act.questions?.some((qu) => qu.toLowerCase().includes(q));
      return matchesStage && matchesComp && matchesQuery;
    });
  }, [activitiesList, selectedStage, selectedCompFilter, searchQuery]);

  // Filtered Remarks
  const filteredRemarks = useMemo(() => {
    return remarksList.filter((rem) => {
      const matchesLevel = remarkLevelFilter === "all" || rem.level === remarkLevelFilter;
      const matchesArea = remarkAreaFilter === "all" || rem.subjectOrArea === remarkAreaFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (rem.subjectOrArea && rem.subjectOrArea.toLowerCase().includes(q)) ||
        (rem.remarkText && rem.remarkText.toLowerCase().includes(q));
      return matchesLevel && matchesArea && matchesQuery;
    });
  }, [remarksList, remarkLevelFilter, remarkAreaFilter, searchQuery]);

  // Handle Add Goal
  const handleAddGoal = async () => {
    if (!newGoalCode.trim() || !newGoalTitle.trim() || !newGoalArea) {
      toast.error("कृपया सर्व आवश्यक माहिती भरा.");
      return;
    }
    try {
      const id = `CUSTOM-${newGoalCode.replace(/\s+/g, "_")}`;
      const newGoal: HpcCurricularGoal = {
        id,
        code: newGoalCode.trim(),
        titleMarathi: newGoalTitle.trim(),
        stageId: selectedStage,
        areaOrSubjectId: newGoalArea,
      };
      await setDoc(doc(db, "hpc_custom_goals", id), newGoal);
      setCustomGoals((prev) => [...prev, newGoal]);
      toast.success("नवीन अभ्यासक्रम ध्येय (CG) जोडले गेले!");
      setShowAddGoal(false);
      setNewGoalCode("");
      setNewGoalTitle("");
    } catch (err: any) {
      toast.error("ध्येय जोडताना त्रुटी: " + err.message);
    }
  };

  // Handle Add Competency
  const handleAddCompetency = async () => {
    if (!newCompCode.trim() || !newCompTitle.trim() || !newCompGoalId) {
      toast.error("कृपया सर्व आवश्यक माहिती भरा.");
      return;
    }
    try {
      const id = `CUSTOM-${newCompCode.replace(/\s+/g, "_")}`;
      const newComp: HpcCompetency = {
        id,
        code: newCompCode.trim(),
        titleMarathi: newCompTitle.trim(),
        goalId: newCompGoalId,
        stageId: selectedStage,
        applicableClassIds: selectedStage === "foundational" ? ["1st", "2nd"] : ["3rd", "4th", "5th"],
        applicableSession: "both",
      };
      await setDoc(doc(db, "hpc_custom_competencies", id), newComp);
      setCustomCompetencies((prev) => [...prev, newComp]);
      toast.success("नवीन क्षमता (C) जोडली गेली!");
      setShowAddComp(false);
      setNewCompCode("");
      setNewCompTitle("");
    } catch (err: any) {
      toast.error("क्षमता जोडताना त्रुटी: " + err.message);
    }
  };

  // Open Activity Modal for Create or Edit
  const handleOpenAddActivity = () => {
    setEditingActivityId(null);
    setActStage(selectedStage);
    setActSubject(areas[0]?.nameMarathi || "");
    const firstGoal = allGoals[0];
    setActGoalCode(firstGoal?.code || "");
    setActGoalTitle(firstGoal?.titleMarathi || "");
    const firstComp = allCompetencies[0];
    setActCompCode(firstComp?.code || "");
    setActCompTitle(firstComp?.titleMarathi || "");
    setActNumber(1);
    setActTitle("");
    setActDesc("");
    setActQuestions(["", "", "", "", ""]);
    setActTeacherFeedback("");
    setActParentFeedback("");
    setShowActivityModal(true);
  };

  const handleOpenEditActivity = (act: HpcDynamicActivity) => {
    setEditingActivityId(act.id);
    setActStage(act.stageId);
    setActSubject(act.subjectOrArea);
    setActGoalCode(act.goalCode);
    setActGoalTitle(act.goalTitle);
    setActCompCode(act.competencyCode);
    setActCompTitle(act.competencyTitle);
    setActNumber(act.activityNumber || 1);
    setActTitle(act.activityTitle);
    setActDesc(act.activityDescription);
    const qs = [...(act.questions || [])];
    while (qs.length < 5) qs.push("");
    setActQuestions(qs.slice(0, 5));
    setActTeacherFeedback(act.teacherFeedbackSample || "");
    setActParentFeedback(act.parentFeedbackSample || "");
    setShowActivityModal(true);
  };

  const handleSaveActivity = async () => {
    if (!actTitle.trim() || !actCompCode.trim()) {
      toast.error("कृपया उपक्रमाचे नाव आणि क्षमता कोड आवश्यक भरा.");
      return;
    }
    try {
      const cleanQuestions = actQuestions.map((q) => q.trim()).filter(Boolean);
      await saveHpcDynamicActivity({
        id: editingActivityId || undefined,
        stageId: actStage,
        subjectOrArea: actSubject,
        goalCode: actGoalCode,
        goalTitle: actGoalTitle,
        competencyCode: actCompCode,
        competencyTitle: actCompTitle,
        activityNumber: actNumber,
        activityTitle: actTitle.trim(),
        activityDescription: actDesc.trim(),
        questions: cleanQuestions,
        teacherFeedbackSample: actTeacherFeedback.trim(),
        parentFeedbackSample: actParentFeedback.trim(),
      });

      toast.success(editingActivityId ? "उपक्रम यशस्वीरीत्या संपादित झाला!" : "नवीन उपक्रम जोडला गेला!");
      setShowActivityModal(false);
      fetchActivities();
    } catch (err: any) {
      toast.error("उपक्रम सेव्ह करताना त्रुटी: " + err.message);
    }
  };

  const handleDeleteActivity = async (id: string, title: string) => {
    if (!window.confirm(`खरोखर "${title.slice(0, 30)}..." हा उपक्रम हटवायचा आहे का?`)) return;
    try {
      await deleteHpcDynamicActivity(id);
      toast.success("उपक्रम हटवला गेला!");
      setActivitiesList((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      toast.error("हटवताना त्रुटी: " + err.message);
    }
  };

  const handleClearStageActivities = async (stageToClear: HpcStageId) => {
    const stageInfo = HPC_STAGES_INFO.find((s) => s.id === stageToClear);
    const stageTitle = stageInfo?.titleMarathi || stageToClear;
    const stageClasses = stageInfo?.classesLabelMarathi || "";
    const count = countByStage[stageToClear] || 0;

    if (count === 0) {
      toast.info(`'${stageTitle}' मध्ये हटवण्यासाठी कोणतेही उपक्रम उपलब्ध नाहीत.`);
      return;
    }

    if (
      !window.confirm(
        `सावधान: खरोखर फक्त '${stageTitle} (${stageClasses})' मधील सर्व ${count} उपक्रम हटवायचे आहेत का?\n\nमहत्त्वाचे: इतर दोन स्तरांमधील डेटा पूर्णपणे सुरक्षित राहील आणि डिलीट होणार नाही.`
      )
    )
      return;

    try {
      setActivitiesLoading(true);
      const deletedCount = await deleteAllHpcActivities(stageToClear);
      toast.success(
        `'${stageTitle}' चे ${deletedCount} उपक्रम यशस्वीरीत्या हटवले गेले! इतर स्तरांचा डेटा सुरक्षित आहे.`
      );
      await fetchActivities();
    } catch (err: any) {
      toast.error("हटवताना त्रुटी: " + err.message);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Open Remark Modal
  const handleOpenAddRemark = () => {
    setEditingRemarkId(null);
    setRemSubject(areas[0]?.nameMarathi || "");
    setRemLevel("प्रगत");
    setRemText("");
    setShowRemarkModal(true);
  };

  const handleOpenEditRemark = (rem: HpcDynamicRemark) => {
    setEditingRemarkId(rem.id);
    setRemSubject(rem.subjectOrArea);
    setRemLevel(rem.level);
    setRemText(rem.remarkText);
    setShowRemarkModal(true);
  };

  const handleSaveRemark = async () => {
    if (!remSubject.trim() || !remText.trim()) {
      toast.error("कृपया विषय व शेरा आवश्यक भरा.");
      return;
    }
    try {
      await saveHpcDynamicRemark({
        id: editingRemarkId || undefined,
        stageId: selectedStage,
        subjectOrArea: remSubject,
        level: remLevel,
        remarkText: remText.trim(),
      });
      toast.success(editingRemarkId ? "शेरा संपादित झाला!" : "नवीन शेरा जोडला गेला!");
      setShowRemarkModal(false);
      fetchRemarks();
    } catch (err: any) {
      toast.error("शेरा सेव्ह करताना त्रुटी: " + err.message);
    }
  };

  const handleDeleteRemark = async (id: string) => {
    if (!window.confirm("खरोखर हा शेरा हटवायचा आहे का?")) return;
    try {
      await deleteHpcDynamicRemark(id);
      toast.success("शेरा हटवला गेला!");
      setRemarksList((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      toast.error("हटवताना त्रुटी: " + err.message);
    }
  };

  const handleClearAllRemarks = async () => {
    if (!window.confirm("सावधान: खरोखर सर्व वार्षिक शेरे डेटाबेसमधून कायमचे हटवायचे आहेत का?")) return;
    try {
      setRemarksLoading(true);
      const count = await deleteAllHpcRemarks();
      toast.success(`${count} शेरे यशस्वीरीत्या हटवले गेले!`);
      fetchRemarks();
    } catch (err: any) {
      toast.error("हटवताना त्रुटी: " + err.message);
    } finally {
      setRemarksLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string, code: string) => {
    if (!window.confirm(`खरोखर ध्येय "${code}" डेटाबेसमधून हटवायचे आहे का?`)) return;
    try {
      await deleteHpcGoal(id);
      toast.success("ध्येय यशस्वीरीत्या हटवले गेले!");
      fetchGoalsAndCompetencies();
    } catch (err: any) {
      toast.error("ध्येय हटवताना त्रुटी: " + err.message);
    }
  };

  const handleClearStageGoals = async (stage: HpcStageId) => {
    if (!window.confirm(`सावधान: खरोखर या स्तरातील सर्व अभ्यासक्रम ध्येये (CG) हटवायची आहेत का?`)) return;
    try {
      setLoading(true);
      const count = await deleteAllHpcGoals(stage);
      toast.success(`${count} ध्येये यशस्वीरीत्या हटवली गेली!`);
      fetchGoalsAndCompetencies();
    } catch (err: any) {
      toast.error("ध्येये हटवताना त्रुटी: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompetency = async (id: string, code: string) => {
    if (!window.confirm(`खरोखर क्षमता "${code}" डेटाबेसमधून हटवायची आहे का?`)) return;
    try {
      await deleteHpcCompetency(id);
      toast.success("क्षमता यशस्वीरीत्या हटवली गेली!");
      fetchGoalsAndCompetencies();
    } catch (err: any) {
      toast.error("क्षमता हटवताना त्रुटी: " + err.message);
    }
  };

  const handleClearStageCompetencies = async (stage: HpcStageId) => {
    if (!window.confirm(`सावधान: खरोखर या स्तरातील सर्व क्षमता (C) हटवायच्या आहेत का?`)) return;
    try {
      setLoading(true);
      const count = await deleteAllHpcCompetencies(stage);
      toast.success(`${count} क्षमता यशस्वीरीत्या हटवल्या गेल्या!`);
      fetchGoalsAndCompetencies();
    } catch (err: any) {
      toast.error("क्षमता हटवताना त्रुटी: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Open Rubric Modal
  const handleOpenAddRubric = () => {
    setEditingRubricId(null);
    setRubStage(selectedStage);
    setRubDimension("जाणीवजागृती");
    setRubCompCode("");
    setRubActTitle("");
    setRubBeginner("");
    setRubProficient("");
    setRubAdvanced("");
    setShowRubricModal(true);
  };

  const handleOpenEditRubric = (rub: HpcDynamicRubric) => {
    setEditingRubricId(rub.id);
    setRubStage(rub.stageId || selectedStage);
    setRubDimension(rub.dimension || "जाणीवजागृती");
    setRubCompCode(rub.competencyCode || "");
    setRubActTitle(rub.activityTitle || "");
    setRubBeginner(rub.beginner || "");
    setRubProficient(rub.proficient || "");
    setRubAdvanced(rub.advanced || "");
    setShowRubricModal(true);
  };

  const handleSaveRubric = async () => {
    if (!rubDimension.trim() || (!rubBeginner.trim() && !rubProficient.trim() && !rubAdvanced.trim())) {
      toast.error("कृपया परिमाण/पैलू आणि किमान एक कामगिरी स्तर मजकूर प्रविष्ट करा.");
      return;
    }
    try {
      await saveHpcDynamicRubric({
        id: editingRubricId || undefined,
        stageId: rubStage,
        competencyCode: rubCompCode.trim(),
        activityTitle: rubActTitle.trim(),
        dimension: rubDimension.trim(),
        beginner: rubBeginner.trim(),
        proficient: rubProficient.trim(),
        advanced: rubAdvanced.trim(),
      });
      toast.success(editingRubricId ? "मूल्यांकन निकष संपादित झाला!" : "नवीन मूल्यांकन निकष जोडला गेला!");
      setShowRubricModal(false);
      fetchRubrics();
    } catch (err: any) {
      toast.error("निकष सेव्ह करताना त्रुटी: " + err.message);
    }
  };

  const handleDeleteRubric = async (id: string) => {
    if (!window.confirm("खरोखर हा निकष हटवायचा आहे का?")) return;
    try {
      await deleteHpcDynamicRubric(id);
      toast.success("निकष हटवला गेला!");
      setRubricsList((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      toast.error("हटवताना त्रुटी: " + err.message);
    }
  };

  const handleClearAllRubrics = async () => {
    if (!window.confirm("सावधान: खरोखर सर्व मूल्यांकन रुब्रिक्स डेटाबेसमधून कायमचे हटवायचे आहेत का?")) return;
    try {
      setRubricsLoading(true);
      const count = await deleteAllHpcRubrics();
      toast.success(`${count} रुब्रिक्स यशस्वीरीत्या हटवले गेले!`);
      fetchRubrics();
    } catch (err: any) {
      toast.error("हटवताना त्रुटी: " + err.message);
    } finally {
      setRubricsLoading(false);
    }
  };

  const handleResetEntireDatabase = async () => {
    const confirmation = window.prompt(
      "सावधान: यामुळे सर्व उपक्रम, ५ प्रश्न, मूल्यांकन रुब्रिक्स, वार्षिक शेरे, अभ्यासक्रम ध्येये आणि क्षमता डेटाबेसमधून कायमचे डिलीट होतील!\n\nसहमतीसाठी खाली 'RESET' टाइप करा आणि OK दाबा:"
    );
    if (confirmation !== "RESET") {
      toast.info("रीसेट रद्द केले.");
      return;
    }
    try {
      setActivitiesLoading(true);
      setRemarksLoading(true);
      setRubricsLoading(true);
      setLoading(true);
      const res = await resetEntireHpcDatabase();
      toast.success(
        `डेटाबेस पूर्णपणे स्वच्छ केला गेला! (उपक्रम: ${res.activitiesDeleted}, शेरे: ${res.remarksDeleted}, रुब्रिक्स: ${res.rubricsDeleted}, ध्येये: ${res.goalsDeleted}, क्षमता: ${res.compsDeleted})`
      );
      fetchActivities();
      fetchRemarks();
      fetchRubrics();
      fetchGoalsAndCompetencies();
    } catch (err: any) {
      toast.error("डेटाबेस रीसेट करताना त्रुटी: " + err.message);
    } finally {
      setActivitiesLoading(false);
      setRemarksLoading(false);
      setRubricsLoading(false);
      setLoading(false);
    }
  };

  // ---------------- Excel File Parsing Logic ----------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsing(true);
    setParsedActivities([]);
    setParsedRemarks([]);
    setParsedRubrics([]);
    setParsedGoals([]);
    setParsedCompetencies([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Auto parse entire workbook across all sheets
        parseEntireWorkbook(wb);
      } catch (err: any) {
        toast.error("एक्सेल फाईल वाचताना त्रुटी: " + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const cleanActivityTitle = (text: string): string => {
    if (!text) return "";
    return text
      .trim()
      .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const parseEntireWorkbook = (wb: XLSX.WorkBook) => {
    const allActivities: HpcDynamicActivity[] = [];
    const allRemarks: HpcDynamicRemark[] = [];
    const allRubrics: HpcDynamicRubric[] = [];
    const goalsMap = new Map<string, HpcCurricularGoal>();
    const compsMap = new Map<string, HpcCompetency>();

    wb.SheetNames.forEach((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) return;

      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rawRows.length === 0) return;

      const lowerName = sheetName.toLowerCase();
      const isRubricSheet =
        lowerName.includes("रुब्रिक") ||
        lowerName.includes("निकष") ||
        lowerName.includes("rubric") ||
        lowerName.includes("मूल्यांकन");

      const isFinalRemarksSheet =
        lowerName.includes("अंतिम") ||
        lowerName.includes("सर्वंकष") ||
        lowerName.includes("final") ||
        lowerName.includes("comprehensive") ||
        lowerName.includes("शीट 4") ||
        lowerName.includes("sheet 4");

      const isRecommendationsSheet =
        lowerName.includes("शिफारस") ||
        lowerName.includes("मार्गदर्शन") ||
        lowerName.includes("recommendation") ||
        lowerName.includes("शीट 5") ||
        lowerName.includes("sheet 5");

      const isRemarksSheet =
        !isFinalRemarksSheet &&
        !isRecommendationsSheet &&
        (lowerName.includes("वार्षिक") ||
          lowerName.includes("सारांश") ||
          lowerName.includes("अभिप्राय") ||
          lowerName.includes("remark") ||
          lowerName.includes("विकासक्षेत्र"));

      const hasActivityCol = rawRows.some(
        (r) => r["उपक्रम (थोडक्यात कृतीसह)"] || (r["उपक्रम"] && !isRubricSheet)
      );

      // 1. RUBRICS SHEET
      if (isRubricSheet) {
        let currAct = "";
        let currGoal = "";
        let currComp = "";

        // Header array parser for format: ['उपक्रम', 'क्षमता', 'निर्झर', 'पर्वत', 'आकाश']
        const headerRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        for (let rIdx = 1; rIdx < headerRows.length; rIdx++) {
          const rowArr = headerRows[rIdx];
          if (!rowArr || rowArr.length === 0) continue;

          const c0 = String(rowArr[0] || "").trim();
          const c1 = String(rowArr[1] || "").trim();
          const c2 = String(rowArr[2] || "").trim();
          const c3 = String(rowArr[3] || "").trim();
          const c4 = String(rowArr[4] || "").trim();

          // Goal header row e.g. "ध्येय: CG-1 ..."
          if (c0.startsWith("ध्येय:") || c0.startsWith("ध्येय :") || /^(CG-[0-9]+|ध्येय)/.test(c0)) {
            const gMatch = c0.match(/CG-[0-9]+/);
            if (gMatch) currGoal = gMatch[0];
            continue;
          }

          // Competency header row e.g. "क्षमता: C-1.1 ..."
          if (c0.startsWith("क्षमता:") || c0.startsWith("क्षमता :") || /^(C-[0-9]+(\.[0-9]+)?|क्षमता)/.test(c0)) {
            const cMatch = c0.match(/C-[0-9]+(\.[0-9]+)?/);
            if (cMatch) currComp = cMatch[0];
            continue;
          }

          if (c0) {
            currAct = c0;
          }

          if (c1 && (c2 || c3 || c4)) {
            allRubrics.push({
              id: `rub_${currComp || "comp"}_${rIdx}_${Date.now()}`,
              stageId: selectedStage,
              goalCode: currGoal,
              competencyCode: currComp,
              activityTitle: cleanActivityTitle(currAct) || currAct,
              dimension: c1,
              beginner: c2,
              proficient: c3,
              advanced: c4,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Object-based fallback if headerRows didn't match
        if (allRubrics.length === 0) {
          rawRows.forEach((row, idx) => {
            const act = String(row["उपक्रम"] || row["उपक्रमाचे नाव"] || row["Activity"] || "").trim();
            const goal = String(row["ध्येय"] || row["ध्येय कोड"] || row["Goal"] || "").trim();
            const comp = String(row["क्षमता कोड"] || row["क्षमता"] || row["Competency"] || "").trim();
            const dim = String(
              row["क्षमता / पैलू"] ||
                row["पैलू"] ||
                row["निकष"] ||
                row["परिमाण"] ||
                row["Dimension"] ||
                row["क्षमता"] ||
                ""
            ).trim();
            const beg = String(row["प्रारंभिक"] || row["प्रवाह"] || row["निर्झर"] || row["Beginner"] || "").trim();
            const pro = String(row["प्रवीण"] || row["पर्वत"] || row["Proficient"] || "").trim();
            const adv = String(row["प्रगत"] || row["आकाश"] || row["Advanced"] || "").trim();

            if (act.startsWith("ध्येय:") || act.startsWith("ध्येय :")) {
              const gMatch = act.match(/CG-[0-9]+/);
              if (gMatch) currGoal = gMatch[0];
              return;
            }
            if (goal) {
              const gMatch = goal.match(/CG-[0-9]+/);
              if (gMatch) currGoal = gMatch[0];
            }

            if (act.startsWith("क्षमता:") || act.startsWith("क्षमता :")) {
              const cMatch = act.match(/C-[0-9]+(\.[0-9]+)?/);
              if (cMatch) currComp = cMatch[0];
              return;
            }
            if (comp && !["जाणीवजागृती", "संवेदनशीलता", "सर्जनशीलता"].includes(comp)) {
              const cMatch = comp.match(/C-[0-9]+(\.[0-9]+)?/);
              if (cMatch) currComp = cMatch[0];
            }

            if (act && !act.startsWith("ध्येय:") && !act.startsWith("क्षमता:")) currAct = act;

            if (dim && (beg || pro || adv)) {
              allRubrics.push({
                id: `rub_${currComp || "comp"}_${idx}_${Date.now()}`,
                stageId: selectedStage,
                goalCode: currGoal,
                competencyCode: currComp,
                activityTitle: cleanActivityTitle(currAct) || currAct,
                dimension: dim,
                beginner: beg,
                proficient: pro,
                advanced: adv,
                createdAt: new Date().toISOString(),
              });
            }
          });
        }
      }
      // 2. FINAL COMPREHENSIVE REMARKS SHEET (Sheet 4)
      else if (isFinalRemarksSheet) {
        const headerRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        for (let rIdx = 1; rIdx < headerRows.length; rIdx++) {
          const rowArr = headerRows[rIdx];
          if (!rowArr || rowArr.length === 0) continue;

          const level = String(rowArr[1] || rowArr[0] || "").trim();
          const remarkText = String(rowArr[2] || rowArr[1] || "").trim();

          if (level && remarkText && remarkText !== level) {
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `final_rem_${cleanLvl}_${rIdx}`,
              stageId: selectedStage,
              subjectOrArea: "अंतिम सर्वंकष वार्षिक अभिप्राय",
              level,
              remarkText,
              type: "final_comprehensive" as any,
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (allRemarks.filter((r) => r.subjectOrArea === "अंतिम सर्वंकष वार्षिक अभिप्राय").length === 0) {
          rawRows.forEach((row, idx) => {
            const level = String(row["कामगिरी स्तर"] || row["स्तर"] || "").trim();
            const remarkText = String(
              row["शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय"] ||
                row["शिक्षकांचा अभिप्राय"] ||
                row["अभिप्राय"] ||
                ""
            ).trim();

            if (level && remarkText) {
              const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
              allRemarks.push({
                id: `final_rem_${cleanLvl}_${idx}`,
                stageId: selectedStage,
                subjectOrArea: "अंतिम सर्वंकष वार्षिक अभिप्राय",
                level,
                remarkText,
                type: "final_comprehensive" as any,
                createdAt: new Date().toISOString(),
              });
            }
          });
        }
      }
      // 3. NEXT CLASS RECOMMENDATIONS SHEET (Sheet 5)
      else if (isRecommendationsSheet) {
        const headerRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        for (let rIdx = 1; rIdx < headerRows.length; rIdx++) {
          const rowArr = headerRows[rIdx];
          if (!rowArr || rowArr.length === 0) continue;

          const level = String(rowArr[1] || rowArr[0] || "").trim();
          const remarkText = String(rowArr[2] || rowArr[1] || "").trim();

          if (level && remarkText && remarkText !== level) {
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `next_rec_${cleanLvl}_${rIdx}`,
              stageId: selectedStage,
              subjectOrArea: "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस",
              level,
              remarkText,
              recommendationText: remarkText,
              type: "next_class_recommendation" as any,
              createdAt: new Date().toISOString(),
            });
          }
        }

        if (allRemarks.filter((r) => r.subjectOrArea === "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस").length === 0) {
          rawRows.forEach((row, idx) => {
            const level = String(row["कामगिरी स्तर"] || row["स्तर"] || "").trim();
            const remarkText = String(
              row["पुढील इयत्तेसाठी विद्यार्थ्यास मार्गदर्शन, शिफारस व सुधारावयाच्या बाबी"] ||
                row["पुढील इयत्तेसाठी मार्गदर्शन व शिफारस"] ||
                row["मार्गदर्शन"] ||
                row["शिफारस"] ||
                ""
            ).trim();

            if (level && remarkText) {
              const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
              allRemarks.push({
                id: `next_rec_${cleanLvl}_${idx}`,
                stageId: selectedStage,
                subjectOrArea: "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस",
                level,
                remarkText,
                recommendationText: remarkText,
                type: "next_class_recommendation" as any,
                createdAt: new Date().toISOString(),
              });
            }
          });
        }
      }
      // 4. DEVELOPMENTAL AREA REMARKS SHEET (Sheet 3)
      else if (isRemarksSheet) {
        let currSub = "";
        const headerRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        for (let rIdx = 1; rIdx < headerRows.length; rIdx++) {
          const rowArr = headerRows[rIdx];
          if (!rowArr || rowArr.length === 0) continue;

          const c0 = String(rowArr[0] || "").trim();
          const c1 = String(rowArr[1] || "").trim();
          const c2 = String(rowArr[2] || "").trim();
          const c3 = String(rowArr[3] || "").trim();

          if (c0.startsWith("विकास क्षेत्र:") || c0.startsWith("विकास क्षेत्र :")) {
            currSub = c0.replace(/^विकास\s*क्षेत्र\s*:\s*/, "").trim();
            continue;
          }

          const area = c1 || currSub;
          const level = c2;
          const remarkText = c3;

          if (area) currSub = area;

          if (currSub && level && remarkText) {
            const cleanAreaId = (currSub || "area").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `rem_${cleanAreaId}_${cleanLvl}_${rIdx}`,
              stageId: selectedStage,
              subjectOrArea: currSub,
              level,
              remarkText,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Fallback for object format
        if (allRemarks.length === 0) {
          rawRows.forEach((row, idx) => {
            const sub = String(row["विषय"] || row["विकास क्षेत्र"] || "").trim();
            if (sub && !sub.startsWith("विषय:") && !sub.startsWith("विकास क्षेत्र:")) {
              currSub = sub;
            }
            const level = String(row["कामगिरी स्तर"] || row["स्तर"] || "").trim();
            const remarkText = String(
              row["शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)"] ||
                row["शिक्षकांचा अभिप्राय"] ||
                row["अभिप्राय"] ||
                ""
            ).trim();

            if (!remarkText || !level) return;

            const cleanAreaId = (currSub || sub || "area").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `rem_${cleanAreaId}_${cleanLvl}_${idx}`,
              stageId: selectedStage,
              subjectOrArea: currSub || sub,
              level,
              remarkText,
              createdAt: new Date().toISOString(),
            });
          });
        }
      }
      // 3. ACTIVITIES SHEET (And Extract Goals, Competencies, and Rubrics from rows!)
      else if (hasActivityCol) {
        let currSub = "";
        let currGoalCode = "";
        let currGoalTitle = "";
        let currCompCode = "";
        let currCompTitle = "";
        let currLoList: string[] = [];
        let currLoText = "";
        let lastAct: HpcDynamicActivity | null = null;

        rawRows.forEach((row, idx) => {
          const rowSub = String(
            row["विकास क्षेत्र / विषय"] || row["विषय"] || row["विकास क्षेत्र"] || ""
          ).trim();
          const rowGoal = String(
            row["ध्येय क्रमांक व ध्येयाचे संपूर्ण वर्णन"] || row["ध्येय"] || ""
          ).trim();
          const rowComp = String(
            row["क्षमता क्रमांक व क्षमतेचे संपूर्ण वर्णन"] || row["क्षमता"] || ""
          ).trim();
          const rowLo = String(
            row["अध्ययन निष्पत्ती"] || row["निष्पत्ती"] || row["अध्ययन निष्पत्ती (LO)"] || ""
          ).trim();

          if (rowSub) currSub = rowSub;
          if (rowGoal) {
            const gm = rowGoal.match(/^([A-Za-z0-9\-\.]+)\s*(.*)/);
            currGoalCode = gm ? gm[1] : rowGoal.slice(0, 10);
            currGoalTitle = gm && gm[2] ? gm[2] : rowGoal;
          }
          if (rowComp) {
            const cm = rowComp.match(/^([A-Za-z0-9\-\.]+)\s*(.*)/);
            currCompCode = cm ? cm[1] : rowComp.slice(0, 10);
            currCompTitle = cm && cm[2] ? cm[2] : rowComp;
          }
          if (rowLo) {
            currLoText = rowLo;
            currLoList = rowLo
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
          }

          let stage: HpcStageId = selectedStage;
          if (currCompCode.startsWith("CG-") || currCompCode.startsWith("C-")) {
            stage = "foundational";
          } else if (
            currCompCode.startsWith("L1") ||
            currCompCode.startsWith("MC") ||
            currCompCode.startsWith("TWC") ||
            currCompCode.startsWith("VA")
          ) {
            stage = "preparatory";
          }

          // EXTRACT GOALS INTO GOALSMAP
          if (currGoalCode) {
            const gId = `CUSTOM-${currGoalCode}`;
            if (!goalsMap.has(gId)) {
              goalsMap.set(gId, {
                id: gId,
                code: currGoalCode,
                titleMarathi: currGoalTitle || currGoalCode,
                stageId: stage,
                areaOrSubjectId: currSub || "general",
              });
            }
          }

          // EXTRACT COMPETENCIES INTO COMPSMAP
          if (currCompCode) {
            const cId = `CUSTOM-${currCompCode}`;
            if (!compsMap.has(cId)) {
              compsMap.set(cId, {
                id: cId,
                code: currCompCode,
                titleMarathi: currCompTitle || currCompCode,
                goalId: currGoalCode ? `CUSTOM-${currGoalCode}` : "",
                stageId: stage,
                applicableClassIds:
                  selectedUploadClass !== "all"
                    ? [selectedUploadClass]
                    : stage === "foundational"
                    ? ["1st", "2nd"]
                    : stage === "preparatory"
                    ? ["3rd", "4th", "5th"]
                    : ["6th", "7th", "8th"],
                applicableSession: "both",
                learningOutcomes: currLoList,
              });
            } else if (currLoList.length > 0) {
              const existing = compsMap.get(cId)!;
              existing.learningOutcomes = Array.from(
                new Set([...(existing.learningOutcomes || []), ...currLoList])
              );
            }
          }

          const actRaw = String(row["उपक्रम (थोडक्यात कृतीसह)"] || row["उपक्रम"] || "").trim();
          const questionsRaw = String(row["उपक्रमावर आधारित प्रश्न"] || row["प्रश्न"] || "").trim();
          const teacherFeedback = String(row["शिक्षकांचा अभिप्राय"] || "").trim();
          const parentFeedback = String(row["पालकांचा अभिप्राय"] || "").trim();

          if (actRaw) {
            let activityTitle = actRaw;
            let activityDesc = "";
            let activityNum = 1;

            if (actRaw.includes("\n\nकृती:")) {
              const parts = actRaw.split("\n\nकृती:");
              activityTitle = parts[0].trim();
              activityDesc = parts.slice(1).join("\n\nकृती:").trim();
            } else if (actRaw.includes("कृती:")) {
              const parts = actRaw.split("कृती:");
              activityTitle = parts[0].trim();
              activityDesc = parts.slice(1).join("कृती:").trim();
            } else {
              const lines = actRaw.split("\n");
              activityTitle = lines[0].trim();
              activityDesc = lines.slice(1).join("\n").trim();
            }

            const numMatch = activityTitle.match(/^(\d+)[\.\)]\s*(.*)/);
            if (numMatch) {
              activityNum = parseInt(numMatch[1], 10);
              activityTitle = numMatch[2].trim();
            }

            const questions = questionsRaw
              .split("\n")
              .map((q) => q.replace(/^[0-9\u0966-\u096F]+[\.\)\-]\s*/, "").trim())
              .filter(Boolean);

            const classPrefix = selectedUploadClass !== "all" ? selectedUploadClass : stage;
            const docId = `act_${classPrefix}_${currCompCode}_${activityNum}`;

            lastAct = {
              id: docId,
              classId: selectedUploadClass !== "all" ? selectedUploadClass : undefined,
              stageId: stage,
              subjectOrArea: currSub,
              goalCode: currGoalCode,
              goalTitle: currGoalTitle,
              competencyCode: currCompCode,
              competencyTitle: currCompTitle,
              activityNumber: activityNum,
              activityTitle,
              activityDescription: activityDesc,
              description: activityDesc,
              learningOutcomes: currLoList,
              learningOutcomeText: currLoText,
              questions,
              teacherFeedbackSample: teacherFeedback,
              parentFeedbackSample: parentFeedback,
              createdAt: new Date().toISOString(),
            };

            allActivities.push(lastAct);

            // ALSO EXTRACT RUBRICS FROM ROW IF RUBRIC COLUMNS EXIST
            const rBeg = String(row["प्रारंभिक"] || row["प्रवाह"] || row["निर्झर"] || "").trim();
            const rPro = String(row["प्रवीण"] || row["पर्वत"] || "").trim();
            const rAdv = String(row["प्रगत"] || row["आकाश"] || "").trim();
            const rDim = String(row["क्षमता"] || row["पैलू"] || row["निकष"] || "सर्वसाधारण").trim();
            if (rBeg || rPro || rAdv) {
              allRubrics.push({
                id: `rub_${selectedUploadClass !== "all" ? selectedUploadClass : "stage"}_${Date.now()}_${idx}`,
                classId: selectedUploadClass !== "all" ? selectedUploadClass : undefined,
                stageId: stage,
                goalCode: currGoalCode,
                competencyCode: currCompCode,
                activityTitle,
                dimension: rDim,
                beginner: rBeg,
                proficient: rPro,
                advanced: rAdv,
                createdAt: new Date().toISOString(),
              });
            }
          } else if (lastAct && (teacherFeedback || parentFeedback)) {
            if (teacherFeedback && !lastAct.teacherFeedbackSample?.includes(teacherFeedback)) {
              lastAct.teacherFeedbackSample = lastAct.teacherFeedbackSample
                ? `${lastAct.teacherFeedbackSample} | ${teacherFeedback}`
                : teacherFeedback;
            }
            if (parentFeedback && !lastAct.parentFeedbackSample?.includes(parentFeedback)) {
              lastAct.parentFeedbackSample = lastAct.parentFeedbackSample
                ? `${lastAct.parentFeedbackSample} | ${parentFeedback}`
                : parentFeedback;
            }
          }
        });
      }
      // 4. GOALS & COMPETENCIES ONLY SHEET
      else {
        let currSub = "";
        let currGoalRaw = "";

        rawRows.forEach((row) => {
          const sub = String(row["विकास क्षेत्र / विषय"] || row["विषय"] || "").trim();
          const goalStr = String(row["ध्येय क्रमांक व ध्येयाचे संपूर्ण वर्णन"] || row["ध्येय"] || "").trim();
          const compStr = String(row["क्षमता क्रमांक व क्षमतेचे संपूर्ण वर्णन"] || row["क्षमता"] || "").trim();

          if (sub) currSub = sub;
          if (goalStr) {
            currGoalRaw = goalStr;
            const gm = goalStr.match(/^([A-Za-z0-9\-\.]+)\s*(.*)/);
            const gCode = gm ? gm[1] : goalStr.slice(0, 10);
            const gTitle = gm && gm[2] ? gm[2] : goalStr;
            const gId = `CUSTOM-${gCode}`;
            if (!goalsMap.has(gId)) {
              goalsMap.set(gId, {
                id: gId,
                code: gCode,
                titleMarathi: gTitle,
                stageId: selectedStage,
                areaOrSubjectId: currSub || "general",
              });
            }
          }

          if (compStr) {
            const cm = compStr.match(/^([A-Za-z0-9\-\.]+)\s*(.*)/);
            const cCode = cm ? cm[1] : compStr.slice(0, 10);
            const cTitle = cm && cm[2] ? cm[2] : compStr;
            const cId = `CUSTOM-${cCode}`;
            const currentGoalCode = currGoalRaw.match(/^([A-Za-z0-9\-\.]+)/)?.[1] || "";
            if (!compsMap.has(cId)) {
              compsMap.set(cId, {
                id: cId,
                code: cCode,
                titleMarathi: cTitle,
                goalId: `CUSTOM-${currentGoalCode}`,
                stageId: selectedStage,
                applicableClassIds:
                  selectedStage === "foundational" ? ["1st", "2nd"] : ["3rd", "4th", "5th"],
                applicableSession: "both",
              });
            }
          }
        });
      }
    });

    setParsedActivities(allActivities);
    setParsedRemarks(allRemarks);
    setParsedRubrics(allRubrics);
    const parsedG = Array.from(goalsMap.values());
    const parsedC = Array.from(compsMap.values());
    setParsedGoals(parsedG);
    setParsedCompetencies(parsedC);

    const defaultSheet =
      wb.SheetNames.find((s) => s.includes("ध्येय") || s.includes("उपक्रम")) || wb.SheetNames[0] || "";
    setSelectedSheetName(defaultSheet);

    toast.success(
      `एक्सेल फाईलमधून डेटा अचूक वाचला गेला! (उपक्रम: ${allActivities.length}, ध्येये: ${parsedG.length}, क्षमता: ${parsedC.length}, रुब्रिक्स: ${allRubrics.length}, शेरे: ${allRemarks.length})`
    );
  };

  const handleSyncToFirestore = async () => {
    setIsSyncing(true);
    setSyncProgress(null);
    try {
      let savedCount = 0;

      if (parsedActivities.length > 0) {
        savedCount = await bulkUploadHpcActivities(parsedActivities, (current, total) => {
          setSyncProgress({ current, total });
        });
        toast.success(`${savedCount} उपक्रम व प्रश्न बँक डेटाबेसमध्ये यशस्वीरीत्या सिंक झाले!`);
        fetchActivities();
      }

      if (parsedRemarks.length > 0) {
        const rCount = await bulkUploadHpcRemarks(parsedRemarks);
        toast.success(`${rCount} शेरे डेटाबेसमध्ये सिंक झाले!`);
        fetchRemarks();
      }

      if (parsedRubrics.length > 0) {
        const rubCount = await bulkUploadHpcRubrics(parsedRubrics);
        toast.success(`${rubCount} रुब्रिक्स डेटाबेसमध्ये सिंक झाले!`);
        fetchRubrics();
      }

      if (parsedGoals.length > 0 || parsedCompetencies.length > 0) {
        const res = await bulkUploadHpcGoalsAndCompetencies(parsedGoals, parsedCompetencies);
        toast.success(`${res.goalsCount} ध्येये व ${res.compsCount} क्षमता डेटाबेसमध्ये सिंक झाल्या!`);
        fetchGoalsAndCompetencies();
      }

      if (
        parsedActivities.length === 0 &&
        parsedRemarks.length === 0 &&
        parsedRubrics.length === 0 &&
        parsedGoals.length === 0 &&
        parsedCompetencies.length === 0
      ) {
        toast.error("सिंक करण्यासाठी कोणताही डेटा सापडला नाही.");
      }
    } catch (err: any) {
      toast.error("डेटाबेसमध्ये सेव्ह करताना त्रुटी: " + err.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Download Ready Template
  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: ध्येय-क्षमता सूची (उपक्रम व ५ प्रश्न)
      const activitiesSample = [
        {
          "अ.क्र.": 1,
          "विकास क्षेत्र / विषय": "प्रथम भाषा (R1)",
          "ध्येय क्रमांक व ध्येयाचे संपूर्ण वर्णन": "L1CG1 सुसंगतपणे कल्पना समजून घेण्यासाठी आणि संवाद साधण्यासाठी मौखिक भाषा कौशल्य विकसित करतो.",
          "क्षमता क्रमांक व क्षमतेचे संपूर्ण वर्णन": "L1C1.1 विविध संदर्भांत अखंडित आणि अर्थपूर्ण संवाद साधतो.",
          "अध्ययन निष्पत्ती": "L1C1.1.1: परिचित संदर्भात स्पष्ट व ओघवते बोलतो.\nL1C1.1.2: सणांची माहिती स्वतःच्या शब्दांत सांगतो.",
          "उपक्रम (थोडक्यात कृतीसह)": "1. आपल्या आवडत्या सणाबद्दल पाच वाक्यांत सलग बोला.\n\nकृती: विद्यार्थ्यांनी आवडत्या सणाबद्दल पाच वाक्ये सलगपणे सांगावीत. शिक्षकांनी बोलण्यातील क्रम व स्पष्टता यावर अभिप्राय द्यावा.",
          "उपक्रमावर आधारित प्रश्न": "1. तुमचा आवडता सण कोणता?\n2. तो कधी येतो?\n3. त्या दिवशी तुम्ही काय करता?\n4. तुम्हाला त्यातील सर्वात काय आवडते?\n5. हा सण इतरांसोबत का साजरा करतात?",
          "शिक्षकांचा अभिप्राय": "विद्यार्थी आत्मविश्वासाने बोलतो व विचारलेल्या प्रश्नांची अचूक उत्तरे देतो.",
          "पालकांचा अभिप्राय": "माझा पाल्य आवडीने सणाबद्दल घरी माहिती सांगतो.",
        },
        {
          "अ.क्र.": 2,
          "विकास क्षेत्र / विषय": "गणित (M)",
          "ध्येय क्रमांक व ध्येयाचे संपूर्ण वर्णन": "MCG1 दैनंदिन जीवनातील संख्यांची संकल्पना समजतो.",
          "क्षमता क्रमांक व क्षमतेचे संपूर्ण वर्णन": "MC1.1 1 ते 100 पर्यंतच्या संख्या ओळखतो व मोजतो.",
          "उपक्रम (थोडक्यात कृतीसह)": "1. वस्तू मोजून योग्य संख्याकार्ड दाखवा.\n\nकृती: विद्यार्थ्यांनी दिलेल्या मण्यांच्या किंवा बियांच्या राशी मोजून योग्य संख्याकार्ड उचलून दाखवावे.",
          "उपक्रमावर आधारित प्रश्न": "1. तुमच्यासमोर किती मणी आहेत?\n2. त्यातील ५ मणी वेगळे काढा.\n3. उरलेले मणी किती आहेत?\n4. कोणती संख्या मोठी आहे?\n5. हा अंक पाटीवर लिहून दाखवा.",
          "शिक्षकांचा अभिप्राय": "विद्यार्थी संख्या अचूक मोजतो व कार्ड दाखवतो.",
          "पालकांचा अभिप्राय": "घरीही वस्तू मोजण्याचा सराव करतो.",
        },
      ];
      const ws1 = XLSX.utils.json_to_sheet(activitiesSample);
      XLSX.utils.book_append_sheet(wb, ws1, "ध्येय-क्षमता सूची");

      // Sheet 2: मूल्यांकन रुब्रिक
      const rubricsSample = [
        {
          "उपक्रम": "1. आपल्या आवडत्या सणाबद्दल पाच वाक्यांत सलग बोला.",
          "क्षमता": "जाणीवजागृती",
          "प्रारंभिक": "विद्यार्थ्याला आवडत्या सणाबद्दल पाच वाक्ये सलग सांगण्यात अडचण येते, मदतीची गरज लागते.",
          "प्रवीण": "विद्यार्थी बहुतांश टप्पे योग्य रीतीने पार पाडतो, मुद्दे स्पष्ट सांगतो.",
          "प्रगत": "विद्यार्थी स्वतंत्रपणे, आत्मविश्वासाने व सलगपणे आपल्या भावना व्यक्त करतो.",
        },
        {
          "उपक्रम": "1. आपल्या आवडत्या सणाबद्दल पाच वाक्यांत सलग बोला.",
          "क्षमता": "संवेदनशीलता",
          "प्रारंभिक": "इतरांचे म्हणणे ऐकताना संकोच करतो, सहभाग कमी असतो.",
          "प्रवीण": "काही प्रमाणात आपले म्हणणे मांडतो व इतरांचे ऐकतो.",
          "प्रगत": "उत्साहाने सर्वांचा आदर करतो आणि मित्रांना प्रोत्साहन देतो.",
        },
        {
          "उपक्रम": "1. आपल्या आवडत्या सणाबद्दल पाच वाक्यांत सलग बोला.",
          "क्षमता": "सर्जनशीलता",
          "प्रारंभिक": "स्वतःची स्वतंत्र कल्पना सुचवत नाही, दिलेले उदाहरण सांगतो.",
          "प्रवीण": "काही प्रमाणात स्वतःच्या कल्पना वापरतो.",
          "प्रगत": "स्वतःच्या मूळ व वेगळ्या कल्पना वापरून कारणांसह स्पष्ट करतो.",
        },
      ];
      const ws2 = XLSX.utils.json_to_sheet(rubricsSample);
      XLSX.utils.book_append_sheet(wb, ws2, "मूल्यांकन रुब्रिक");

      // Sheet 3: भाग क - वार्षिक सारांश
      const remarksSample = [
        {
          "क्र.": 1,
          "विषय": "प्रथम भाषा (R1)",
          "कामगिरी स्तर": "प्रगत",
          "शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)": "विद्यार्थ्याची मौखिक अभिव्यक्ती अत्यंत समृद्ध आहे. तो विचारलेल्या प्रश्नांची उत्तरे स्पष्ट व स्वतंत्रपणे देतो.",
        },
        {
          "क्र.": 2,
          "विषय": "प्रथम भाषा (R1)",
          "कामगिरी स्तर": "प्रवीण",
          "शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)": "विद्यार्थी संवादात नियमित सहभागी होतो, शब्दसंग्रह चांगला आहे. नियमित वाचनाचा सराव वाढवावा.",
        },
        {
          "क्र.": 3,
          "विषय": "गणित (M)",
          "कामगिरी स्तर": "प्रगत",
          "शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)": "विद्यार्थी संख्याज्ञान व मूलभूत गणिती क्रिया अचूक करतो. गणितातील कोडी आवडीने सोडवतो.",
        },
      ];
      const ws3 = XLSX.utils.json_to_sheet(remarksSample);
      XLSX.utils.book_append_sheet(wb, ws3, "भाग क - वार्षिक सारांश");

      XLSX.writeFile(wb, "HPC_Activities_Questions_Rubrics_Template.xlsx");
      toast.success("नमुना एक्सेल टेम्पलेट यशस्वीरीत्या डाऊनलोड झाले!");
    } catch (err: any) {
      toast.error("टेम्पलेट डाऊनलोड करताना त्रुटी: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Breadcrumb & Return */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft className="size-4" /> मुख्य ॲडमिन डॅशबोर्ड (Back to Admin)
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="size-3.5" /> नमुना एक्सेल टेम्पलेट डाऊनलोड (Sample Template)
            </button>
            <Link
              to="/teacher/hpc"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Sparkles className="size-4" /> शिक्षक HPC पोर्टल पहा
            </Link>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black shadow-lg">
              <ShieldCheck className="size-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                Super Admin Configuration • HPC Master Database
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                समग्र प्रगतिपत्रक (HPC) व्यवस्थापन केंद्र
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                अभ्यासक्रमाची ध्येये (CG), क्षमता (C), उपक्रम व ५ प्रश्न बँक, एक्सेल अपलोड व सिंक आणि सर्वंकष शेरे नियंत्रण
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls & Stage Selector */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Tabs */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab("activities")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "activities"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListOrdered className="size-3.5" />
              १. उपक्रम व ५ प्रश्न बँक ({activitiesList.length})
            </button>
            <button
              onClick={() => setActiveTab("excel_sync")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "excel_sync"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="size-3.5" />
              २. एक्सेल अपलोड व सिंक
            </button>
            <button
              onClick={() => setActiveTab("remarks")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "remarks"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="size-3.5" />
              ३. वार्षिक शेरे बँक ({remarksList.length})
            </button>
            <button
              onClick={() => setActiveTab("goals")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "goals"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="size-3.5" />
              ४. अभ्यासक्रम ध्येये (CG) ({allGoals.length})
            </button>
            <button
              onClick={() => setActiveTab("competencies")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "competencies"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Award className="size-3.5" />
              ५. क्षमता यादी (C) ({allCompetencies.length})
            </button>
            <button
              onClick={() => setActiveTab("rubrics")}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "rubrics"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Compass className="size-3.5" />
              ६. निकषसंच (Rubrics) ({rubricsList.length})
            </button>
          </div>

          {/* Stage Switcher */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs font-bold text-slate-500">स्तर:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 flex-wrap gap-1">
              {HPC_STAGES_INFO.map((stg) => (
                <button
                  key={stg.id}
                  onClick={() => {
                    setSelectedStage(stg.id);
                    setSelectedCompFilter("all");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedStage === stg.id
                      ? "bg-slate-900 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{stg.titleMarathi}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      selectedStage === stg.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {stg.classesLabelMarathi} • {countByStage[stg.id] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ACTIVITIES & 5 QUESTIONS BANK */}
        {/* ========================================================================= */}
        {activeTab === "activities" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            {/* 3 Dedicated Spaces for the 3 Stages (separated as per classes) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="size-3.5 text-indigo-600" />
                  इयत्तेनुसार ३ स्वतंत्र स्तर कक्ष (3 Independent Stage Spaces)
                </span>
                <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                  🛡️ एका स्तराचा डेटा साफ केल्यास इतर स्तर पूर्णपणे सुरक्षित राहतात
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HPC_STAGES_INFO.map((stg) => {
                  const isSelected = selectedStage === stg.id;
                  const count = countByStage[stg.id] || 0;

                  const theme =
                    stg.id === "foundational"
                      ? {
                          border: isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40"
                            : "border-slate-200 hover:border-emerald-300 bg-white",
                          badge: "bg-emerald-100 text-emerald-800",
                          accent: "text-emerald-700",
                          dot: "bg-emerald-500",
                        }
                      : stg.id === "preparatory"
                      ? {
                          border: isSelected
                            ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40"
                            : "border-slate-200 hover:border-indigo-300 bg-white",
                          badge: "bg-indigo-100 text-indigo-800",
                          accent: "text-indigo-700",
                          dot: "bg-indigo-500",
                        }
                      : {
                          border: isSelected
                            ? "border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40"
                            : "border-slate-200 hover:border-purple-300 bg-white",
                          badge: "bg-purple-100 text-purple-800",
                          accent: "text-purple-700",
                          dot: "bg-purple-500",
                        };

                  return (
                    <div
                      key={stg.id}
                      onClick={() => {
                        setSelectedStage(stg.id);
                        setSelectedCompFilter("all");
                      }}
                      className={`relative rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${theme.border}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span
                            className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme.badge}`}
                          >
                            {stg.classesLabelMarathi}
                          </span>
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[11px] font-black text-indigo-700 bg-white px-2 py-0.5 rounded-full shadow-2xs border border-indigo-200">
                              <CheckCircle2 className="size-3 text-indigo-600" /> सध्या उघडलेला कक्ष
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">
                              उघडण्यासाठी क्लिक करा
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <span className={`size-2.5 rounded-full ${theme.dot}`} />
                          <span>{stg.titleMarathi}</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                          {stg.id === "foundational" && "इयत्ता १ली व २री (भाग १ - पायाभूत शिक्षण)"}
                          {stg.id === "preparatory" && "इयत्ता ३री, ४थी व ५वी (भाग २ - प्राथमिक पूर्वतयारी)"}
                          {stg.id === "middle" && "इयत्ता ६वी, ७वी व ८वी (भाग ३ - उच्च प्राथमिक / माध्यमिक)"}
                        </p>

                        <div className="mt-3.5 py-2.5 px-3 rounded-2xl bg-white/90 border border-slate-200/80 flex items-center justify-between shadow-2xs">
                          <span className="text-xs font-bold text-slate-600">उपलब्ध उपक्रम संख्या:</span>
                          <span className={`text-sm font-black ${theme.accent}`}>
                            {count} उपक्रम
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStage(stg.id);
                            setSelectedCompFilter("all");
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white font-black"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {isSelected ? "सक्रिय कक्ष (Active)" : "हा कक्ष उघडा"}
                        </button>

                        {count > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearStageActivities(stg.id);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            title={`फक्त ${stg.titleMarathi} मधील उपक्रम डेटाबेसमधून हटवा`}
                          >
                            <Trash2 className="size-3" />
                            <span>फक्त हा स्तर साफ करा</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Header for Selected Stage Activities */}
            <div className="flex items-center justify-between pt-2 pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>उपक्रम व ५ प्रश्न बँक —</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-black">
                    {HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi} ({HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.classesLabelMarathi})
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  या स्तरातील एकूण उपक्रम: <b>{filteredActivities.length}</b> (शिक्षकांच्या मूल्यमापन फॉर्ममध्ये थेट वापरले जातात)
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchActivities}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="रिफ्रेश करा"
                >
                  <RefreshCw className="size-3.5" />
                  <span>रिफ्रेश</span>
                </button>
                {filteredActivities.length > 0 && (
                  <button
                    onClick={() => handleClearStageActivities(selectedStage)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    title={`फक्त ${HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi} मधील उपक्रम हटवा`}
                  >
                    <Trash2 className="size-3.5" />
                    <span>फक्त हा स्तर साफ करा ({filteredActivities.length})</span>
                  </button>
                )}
                <button
                  onClick={handleOpenAddActivity}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>नवीन उपक्रम जोडा (Add Activity)</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="उपक्रम, प्रश्न किंवा कोड शोधा..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <select
                  value={selectedCompFilter}
                  onChange={(e) => setSelectedCompFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="all">सर्व क्षमता (All Competencies)</option>
                  {allCompetencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}: {(c.titleMarathi || (c as any).nameMarathi || c.code || "").slice(0, 45)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end text-xs font-bold text-slate-500">
                दाखवत आहे: {filteredActivities.length} उपक्रम
              </div>
            </div>

            {/* Activities List */}
            {activitiesLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs font-bold">उपक्रम लोड होत आहेत...</span>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="py-10 text-center bg-amber-50/70 border border-amber-200 rounded-3xl p-6 space-y-4">
                <AlertCircle className="size-9 text-amber-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    निवडलेल्या '{HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi} ({HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.classesLabelMarathi})' मध्ये सध्या कोणतेही उपक्रम उपलब्ध नाहीत.
                  </h4>
                  {countByStage.foundational > 0 && selectedStage !== "foundational" && (
                    <p className="text-xs font-bold text-emerald-800">
                      💡 तुमच्या डेटाबेसमध्ये <b>पायाभूत स्तर (इ. १ली व २री)</b> मध्ये <b>{countByStage.foundational} उपक्रम</b> उपलब्ध आहेत!
                    </p>
                  )}
                  {countByStage.preparatory > 0 && selectedStage !== "preparatory" && (
                    <p className="text-xs font-bold text-indigo-800">
                      💡 तुमच्या डेटाबेसमध्ये <b>पूर्वतयारी स्तर (इ. ३री ते ५वी)</b> मध्ये <b>{countByStage.preparatory} उपक्रम</b> उपलब्ध आहेत!
                    </p>
                  )}
                  {countByStage.middle > 0 && selectedStage !== "middle" && (
                    <p className="text-xs font-bold text-purple-800">
                      💡 तुमच्या डेटाबेसमध्ये <b>मध्य स्तर (इ. ६वी ते ८वी)</b> मध्ये <b>{countByStage.middle} उपक्रम</b> उपलब्ध आहेत!
                    </p>
                  )}
                </div>

                <div className="flex justify-center gap-2.5 pt-1 flex-wrap">
                  {countByStage.foundational > 0 && selectedStage !== "foundational" && (
                    <button
                      onClick={() => setSelectedStage("foundational")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs cursor-pointer"
                    >
                      पायाभूत स्तर उघडा ({countByStage.foundational} उपक्रम)
                    </button>
                  )}
                  {countByStage.preparatory > 0 && selectedStage !== "preparatory" && (
                    <button
                      onClick={() => setSelectedStage("preparatory")}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs cursor-pointer"
                    >
                      पूर्वतयारी स्तर उघडा ({countByStage.preparatory} उपक्रम)
                    </button>
                  )}
                  {countByStage.middle > 0 && selectedStage !== "middle" && (
                    <button
                      onClick={() => setSelectedStage("middle")}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-xs cursor-pointer"
                    >
                      मध्य स्तर उघडा ({countByStage.middle} उपक्रम)
                    </button>
                  )}
                  <button
                    onClick={handleOpenAddActivity}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    + मॅन्युअल उपक्रम जोडा
                  </button>
                  <button
                    onClick={() => setActiveTab("excel_sync")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    <span>एक्सेल फाईल अपलोड करा</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-mono">
                            {act.competencyCode}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            विषय / क्षेत्र: <b className="text-slate-800">{act.subjectOrArea}</b>
                          </span>
                          {act.goalCode && (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                              ध्येय: {act.goalCode}
                            </span>
                          )}
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                            उपक्रम क्र. {act.activityNumber || 1}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                            {act.stageId === "foundational"
                              ? "पायाभूत (१ली-२री)"
                              : act.stageId === "preparatory"
                              ? "पूर्वतयारी (३री-५वी)"
                              : "मध्य स्तर"}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 pt-1">
                          {act.activityTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 self-start shrink-0">
                        <button
                          onClick={() => handleOpenEditActivity(act)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="संपादित करा"
                        >
                          <Edit2 className="size-3.5" />
                          <span>संपादित करा (Edit)</span>
                        </button>
                        <button
                          onClick={() => handleDeleteActivity(act.id, act.activityTitle)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                          title="हटवा"
                        >
                          <Trash2 className="size-3.5" />
                          <span>हटवा (Delete)</span>
                        </button>
                      </div>
                    </div>

                    {act.activityDescription && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                        <b className="text-slate-700">कृती तपशील:</b> {act.activityDescription}
                      </p>
                    )}

                    {/* Learning Outcomes for this activity/competency */}
                    {((act.learningOutcomes && act.learningOutcomes.length > 0) || act.learningOutcomeText) && (
                      <div className="text-xs bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/70 space-y-1">
                        <span className="text-[11px] font-black text-indigo-900 flex items-center gap-1.5 flex-wrap">
                          <GraduationCap className="size-3.5 text-indigo-700" />
                          <span>अध्ययन निष्पत्ती (Learning Outcomes):</span>
                          {act.classId && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900 font-bold">
                              {act.classId === "1st" ? "इयत्ता १ ली" : act.classId === "2nd" ? "इयत्ता २ री" : `इयत्ता ${act.classId}`}
                            </span>
                          )}
                        </span>
                        <div className="text-[11px] text-slate-800 space-y-0.5 pl-2 leading-relaxed font-medium">
                          {act.learningOutcomes && act.learningOutcomes.length > 0 ? (
                            act.learningOutcomes.map((lo, lIdx) => (
                              <div key={lIdx} className="flex items-start gap-1.5">
                                <span className="text-indigo-600 font-bold">•</span>
                                <span>{lo}</span>
                              </div>
                            ))
                          ) : (
                            <p>{act.learningOutcomeText}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 5 Questions */}
                    {act.questions && act.questions.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                          <HelpCircle className="size-3 text-indigo-600" /> मूल्यमापनासाठी ५ प्रश्न:
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {act.questions.map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="text-xs text-slate-700 bg-indigo-50/40 border border-indigo-100/60 p-2 rounded-xl flex items-start gap-2"
                            >
                              <span className="size-4 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {qIdx + 1}
                              </span>
                              <span className="font-medium">{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sample Feedbacks */}
                    {(act.teacherFeedbackSample || act.parentFeedbackSample) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px]">
                        {act.teacherFeedbackSample && (
                          <div className="bg-emerald-50/60 border border-emerald-200/60 p-2.5 rounded-xl text-emerald-900">
                            <b>शिक्षकांचा अभिप्राय नमुना:</b> {act.teacherFeedbackSample}
                          </div>
                        )}
                        {act.parentFeedbackSample && (
                          <div className="bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-xl text-amber-900">
                            <b>पालकांचा अभिप्राय नमुना:</b> {act.parentFeedbackSample}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: EXCEL / CSV UPLOAD & SYNC */}
        {/* ========================================================================= */}
        {activeTab === "excel_sync" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  एक्सेल / CSV फाईल अपलोड व सिंक (Excel Bulk Upload & Sync)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  SCERT व HPC मार्गदर्शक तत्त्वांचे एक्सेल वर्कशीट (ध्येय-क्षमता, उपक्रम, ५ प्रश्न, रुब्रिक्स व सारांश शेरे) थेट अपलोड करून डेटाबेसमध्ये सिंक करा
                </p>
              </div>

              {(activitiesList.length > 0 || remarksList.length > 0) && (
                <button
                  onClick={handleResetEntireDatabase}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="सर्व HPC डेटाबेस स्वच्छ करा"
                >
                  <Trash2 className="size-3.5" />
                  <span>संपूर्ण डेटाबेस रीसेट करा (Reset Entire Master Database)</span>
                </button>
              )}
            </div>

            {/* Class Selector for Upload */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-indigo-50/40 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    इयत्ता निवडा (Select Class for Excel Upload & Fetching):
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-semibold">
                  प्रत्येक इयत्तेच्या अध्ययन निष्पत्ती वेगळ्या असल्याने, ज्या इयत्तेची फाईल अपलोड करत आहात ती इयत्ता निवडा
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "सर्व वर्ग (All)" },
                  { id: "1st", label: "इयत्ता १ ली" },
                  { id: "2nd", label: "इयत्ता २ री" },
                  { id: "3rd", label: "इयत्ता ३ री" },
                  { id: "4th", label: "इयत्ता ४ थी" },
                  { id: "5th", label: "इयत्ता ५ वी" },
                  { id: "6th", label: "इयत्ता ६ वी" },
                  { id: "7th", label: "इयत्ता ७ वी" },
                  { id: "8th", label: "इयत्ता ८ वी" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedUploadClass(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedUploadClass === c.id
                        ? "bg-orange-600 text-white shadow-xs scale-105"
                        : "bg-white text-slate-700 hover:bg-orange-100/50 border border-slate-200"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="p-6 sm:p-8 border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-3xl text-center space-y-4">
              <div className="size-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto shadow-sm">
                <FileSpreadsheet className="size-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900">
                  {uploadedFileName ? uploadedFileName : "येथे एक्सेल फाईल निवडा किंवा ड्रॅग करा"}
                </h4>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                  सपोर्टेड फॉरमॅट: .xlsx, .xls, .csv (ध्येय-क्षमता सूची, ५ प्रश्न, मूल्यांकन रुब्रिक, वार्षिक सारांश शेरे)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Upload className="size-4" /> फाईल निवडा (Browse File)
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="size-4 text-emerald-600" /> नमुना टेम्पलेट डाऊनलोड करा
                </button>
              </div>
            </div>

            {/* Workbook Sheets Selector & Summary */}
            {sheetNames.length > 0 && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">उपलब्ध शीट्स (Sheets):</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {sheetNames.map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            setSelectedSheetName(name);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedSheetName === name
                              ? "bg-indigo-600 text-white font-black shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sync Button */}
                  <button
                    onClick={handleSyncToFirestore}
                    disabled={
                      isSyncing ||
                      (parsedActivities.length === 0 &&
                        parsedRemarks.length === 0 &&
                        parsedRubrics.length === 0 &&
                        parsedGoals.length === 0 &&
                        parsedCompetencies.length === 0)
                    }
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>डेटाबेसमध्ये सेव्ह होत आहे...</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>
                          डेटाबेसमध्ये सेव्ह करा (Save {parsedActivities.length + parsedRemarks.length + parsedRubrics.length + parsedGoals.length + parsedCompetencies.length} Records)
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Progress bar */}
                {syncProgress && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>अपलोड प्रगती:</span>
                      <span>
                        {syncProgress.current} / {syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedActivities.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>वाचलेले उपक्रम व ५ प्रश्न (Preview: {parsedActivities.length} नोंदी)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    पहिले १५ उपक्रम दाखवत आहे
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-36">विषय / क्षेत्र</th>
                          <th className="p-3 w-28">क्षमता कोड</th>
                          <th className="p-3 min-w-[200px]">अध्ययन निष्पत्ती (LO)</th>
                          <th className="p-3 min-w-[200px]">उपक्रम नाव</th>
                          <th className="p-3 min-w-[220px]">५ प्रश्न नमुना</th>
                          <th className="p-3 min-w-[160px]">शिक्षकांचा अभिप्राय</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedActivities.slice(0, 15).map((act, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{act.subjectOrArea}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono font-bold text-[11px]">
                                {act.competencyCode}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-indigo-900 font-medium">
                              {act.learningOutcomes && act.learningOutcomes.length > 0 ? (
                                <ul className="space-y-0.5 list-disc list-inside">
                                  {act.learningOutcomes.slice(0, 2).map((lo, li) => (
                                    <li key={li} className="truncate max-w-xs">{lo}</li>
                                  ))}
                                  {act.learningOutcomes.length > 2 && (
                                    <span className="text-[10px] text-indigo-600 font-bold block">
                                      +{act.learningOutcomes.length - 2} आणखी...
                                    </span>
                                  )}
                                </ul>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-3 font-bold text-slate-900">{act.activityTitle}</td>
                            <td className="p-3 text-[11px] text-slate-600">
                              {act.questions && act.questions.length > 0 ? (
                                <ol className="list-decimal list-inside space-y-0.5">
                                  {act.questions.slice(0, 3).map((q, qi) => (
                                    <li key={qi} className="truncate max-w-xs">{q}</li>
                                  ))}
                                  {act.questions.length > 3 && (
                                    <li className="text-slate-400 font-medium">आणखी {act.questions.length - 3} प्रश्न...</li>
                                  )}
                                </ol>
                              ) : (
                                <span className="text-slate-400">प्रश्न नाहीत</span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 truncate max-w-xs">
                              {act.teacherFeedbackSample || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Remarks Preview */}
            {parsedRemarks.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>वाचलेले वार्षिक शेरे (Preview: {parsedRemarks.length} शेरे)</span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-36">विषय / क्षेत्र</th>
                          <th className="p-3 w-28">कामगिरी स्तर</th>
                          <th className="p-3">शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRemarks.slice(0, 15).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{r.subjectOrArea}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                                {r.level}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 font-medium">{r.remarkText}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Rubrics Preview */}
            {parsedRubrics.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>वाचलेले मूल्यांकन रुब्रिक्स (Preview: {parsedRubrics.length} निकष नोंदी)</span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 min-w-[180px]">उपक्रम</th>
                          <th className="p-3 w-28">परिमाण</th>
                          <th className="p-3 min-w-[200px]">प्रारंभिक / निर्झर</th>
                          <th className="p-3 min-w-[200px]">प्रवीण / पर्वत</th>
                          <th className="p-3 min-w-[200px]">प्रगत / आकाश</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRubrics.slice(0, 10).map((rub, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                            <td className="p-3 font-bold text-slate-800">{rub.activityTitle || "-"}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[11px]">
                                {rub.dimension}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 text-[11px] font-medium">{rub.beginner}</td>
                            <td className="p-3 text-slate-600 text-[11px] font-medium">{rub.proficient}</td>
                            <td className="p-3 text-slate-600 text-[11px] font-medium">{rub.advanced}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Goals & Competencies Preview */}
            {(parsedGoals.length > 0 || parsedCompetencies.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>
                    वाचलेली ध्येये व क्षमता (Preview: {parsedGoals.length} ध्येये, {parsedCompetencies.length} क्षमता)
                  </span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-28">क्षमता कोड</th>
                          <th className="p-3 w-28">संबंधित ध्येय</th>
                          <th className="p-3">क्षमतेचे वर्णन</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedCompetencies.slice(0, 15).map((comp, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                            <td className="p-3 font-mono font-bold text-purple-900">{comp.code}</td>
                            <td className="p-3 font-mono font-bold text-indigo-900">{comp.goalId.replace("CUSTOM-", "")}</td>
                            <td className="p-3 text-slate-700 font-medium">{comp.titleMarathi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: YEAR-END REMARKS BANK (वार्षिक शेरे बँक) */}
        {/* ========================================================================= */}
        {activeTab === "remarks" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  वार्षिक शेरे बँक (Year-End Summary Remarks Bank)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  विषयानुसार व कामगिरी स्तरानुसार (प्रारंभिक, प्रवीण, प्रगत) शिक्षकांच्या अंतिम सर्वंकष शेऱ्यांची बँक
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchRemarks}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="रिफ्रेश करा"
                >
                  <RefreshCw className="size-4" />
                </button>
                {remarksList.length > 0 && (
                  <button
                    onClick={handleClearAllRemarks}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="सर्व शेरे हटवा"
                  >
                    <Trash2 className="size-3.5" />
                    <span>सर्व शेरे साफ करा (Clear Remarks)</span>
                  </button>
                )}
                <button
                  onClick={handleOpenAddRemark}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>नवीन शेरा जोडा (Add Remark)</span>
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="विषय किंवा शेरा शोधा..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <select
                  value={remarkAreaFilter}
                  onChange={(e) => setRemarkAreaFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="all">सर्व विकास क्षेत्र / विषय (All Areas)</option>
                  {Array.from(new Set(remarksList.map((r) => r.subjectOrArea).filter(Boolean))).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={remarkLevelFilter}
                  onChange={(e) => setRemarkLevelFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="all">सर्व कामगिरी स्तर (All Levels)</option>
                  <option value="प्रगत">प्रगत (Advanced)</option>
                  <option value="प्रवीण">प्रवीण (Proficient)</option>
                  <option value="प्रारंभिक">प्रारंभिक (Beginner)</option>
                  <option value="आकाश">आकाश</option>
                  <option value="पर्वत">पर्वत</option>
                  <option value="निर्झर">निर्झर</option>
                </select>
              </div>

              <div className="flex items-center justify-end text-xs font-bold text-slate-500">
                दाखवत आहे: {filteredRemarks.length} शेरे
              </div>
            </div>

            {/* Remarks Table */}
            {remarksLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs font-bold">शेरे लोड होत आहेत...</span>
              </div>
            ) : filteredRemarks.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                <AlertCircle className="size-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">अद्याप कोणताही शेरा डेटाबेसमध्ये जोडलेला नाही.</p>
                <p className="text-xs text-slate-500">
                  तुम्ही वरून "नवीन शेरा जोडा" वापरू शकता किंवा एक्सेल अपलोड टॅबमधून 'भाग क - वार्षिक सारांश' शीट थेट अपलोड करू शकता.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRemarks.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-purple-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">
                          विषय: <b className="text-slate-900">{rem.subjectOrArea}</b>
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                          {rem.level}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {rem.remarkText}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleOpenEditRemark(rem)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-600 hover:text-purple-800 transition-all cursor-pointer"
                        title="संपादित करा"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRemark(rem.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-800 transition-all cursor-pointer"
                        title="हटवा"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CURRICULAR GOALS */}
        {/* ========================================================================= */}
        {activeTab === "goals" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  अभ्यासक्रमाची ध्येये (Curricular Goals) — {HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  फक्त एक्सेल शीटद्वारे अपलोड केलेली व जोडलेली ध्येये (एकूण: {allGoals.length})
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchGoalsAndCompetencies}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="रिफ्रेश करा"
                >
                  <RefreshCw className="size-4" />
                </button>
                {allGoals.length > 0 && (
                  <button
                    onClick={() => handleClearStageGoals(selectedStage)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="या स्तरातील सर्व ध्येये हटवा"
                  >
                    <Trash2 className="size-3.5" />
                    <span>सर्व ध्येये साफ करा</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setNewGoalArea(areas[0]?.id || "");
                    setShowAddGoal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>नवीन ध्येय जोडा (Add CG)</span>
                </button>
              </div>
            </div>

            {allGoals.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                <AlertCircle className="size-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">या स्तरासाठी अद्याप कोणतेही ध्येय (CG) जोडलेले नाही.</p>
                <p className="text-xs text-slate-500">
                  तुम्ही 'एक्सेल अपलोड व सिंक' टॅबमधून एक्सेल फाईल अपलोड करू शकता किंवा वरून "नवीन ध्येय जोडा" वापरू शकता.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allGoals.map((g) => {
                  const area = areas.find((a) => a.id === g.areaOrSubjectId);
                  return (
                    <div
                      key={g.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 transition-all shadow-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-mono">
                            {g.code}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            विषय / क्षेत्र: <b>{area?.nameMarathi || g.areaOrSubjectId}</b>
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                          {g.titleMarathi}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                          सक्रिय
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(g.id, g.code)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition-all cursor-pointer"
                          title="ध्येय हटवा"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: COMPETENCIES */}
        {/* ========================================================================= */}
        {activeTab === "competencies" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  क्षमता यादी (Competencies) — {HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  फक्त एक्सेल शीटद्वारे अपलोड केलेल्या व जोडलेल्या क्षमता (एकूण: {allCompetencies.length})
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchGoalsAndCompetencies}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="रिफ्रेश करा"
                >
                  <RefreshCw className="size-4" />
                </button>
                {allCompetencies.length > 0 && (
                  <button
                    onClick={() => handleClearStageCompetencies(selectedStage)}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="या स्तरातील सर्व क्षमता हटवा"
                  >
                    <Trash2 className="size-3.5" />
                    <span>सर्व क्षमता साफ करा</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setNewCompGoalId(allGoals[0]?.id || "");
                    setShowAddComp(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>नवीन क्षमता जोडा (Add C)</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="क्षमता कोड किंवा नाव शोधा..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <select
                  value={compGoalFilter}
                  onChange={(e) => setCompGoalFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="all">सर्व अभ्यासक्रम ध्येये (All Goals)</option>
                  {allGoals.map((g) => (
                    <option key={g.id} value={g.code}>
                      {g.code}: {(g.titleMarathi || (g as any).nameMarathi || g.code || "").slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end text-xs font-bold text-slate-500">
                दाखवत आहे: {filteredCompetencies.length} क्षमता
              </div>
            </div>

            {allCompetencies.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                <AlertCircle className="size-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">या स्तरासाठी अद्याप कोणतीही क्षमता (C) जोडलेली नाही.</p>
                <p className="text-xs text-slate-500">
                  तुम्ही 'एक्सेल अपलोड व सिंक' टॅबमधून एक्सेल फाईल अपलोड करू शकता किंवा वरून "नवीन क्षमता जोडा" वापरू शकता.
                </p>
              </div>
            ) : filteredCompetencies.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                <AlertCircle className="size-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">निवडलेल्या ध्येयासाठी कोणतीही क्षमता आढळली नाही.</p>
                <p className="text-xs text-slate-500">कृपया वरील फिल्टर तपासा किंवा नवीन क्षमता जोडा.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCompetencies.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-300 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono">
                          {c.code}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          ध्येय: <b>{c.goalId}</b>
                        </span>
                        {c.applicableSession && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {c.applicableSession === "session1"
                              ? "सत्र १"
                              : c.applicableSession === "session2"
                              ? "सत्र २"
                              : "दोन्ही सत्रे"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1 leading-relaxed">
                        {c.titleMarathi}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        सक्रिय
                      </span>
                      <button
                        onClick={() => handleDeleteCompetency(c.id, c.code)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition-all cursor-pointer"
                        title="क्षमता हटवा"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: RUBRICS */}
        {/* ========================================================================= */}
        {activeTab === "rubrics" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  कामगिरी स्तर निकषसंच (Performance Indicators & Rubrics)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  फक्त एक्सेल शीटद्वारे अपलोड केलेले व जोडलेले मूल्यांकन रुब्रिक्स (एकूण: {rubricsList.length})
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={fetchRubrics}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  title="रिफ्रेश करा"
                >
                  <RefreshCw className="size-4" />
                </button>
                {rubricsList.length > 0 && (
                  <button
                    onClick={handleClearAllRubrics}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
                    title="सर्व रुब्रिक्स हटवा"
                  >
                    <Trash2 className="size-3.5" />
                    <span>सर्व रुब्रिक्स साफ करा</span>
                  </button>
                )}
                <button
                  onClick={handleOpenAddRubric}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>नवीन निकष जोडा (Add Rubric)</span>
                </button>
              </div>
            </div>

            {/* Rubrics Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="उपक्रम किंवा निकष मजकूर शोधा..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <select
                  value={rubricDimensionFilter}
                  onChange={(e) => setRubricDimensionFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="all">सर्व परिमाणे (All Dimensions)</option>
                  <option value="जाणीवजागृती">जाणीवजागृती (Awareness)</option>
                  <option value="संवेदनशीलता">संवेदनशीलता (Sensitivity)</option>
                  <option value="सर्जनशीलता">सर्जनशीलता (Creativity)</option>
                </select>
              </div>

              <div className="flex items-center justify-end text-xs font-bold text-slate-500">
                दाखवत आहे: {filteredRubrics.length} निकष
              </div>
            </div>

            {/* Rubrics Cards List */}
            {rubricsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-xs font-bold">रुब्रिक्स लोड होत आहेत...</span>
              </div>
            ) : filteredRubrics.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                <AlertCircle className="size-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-700">अद्याप कोणताही निकष (Rubric) डेटाबेसमध्ये अपलोड केलेला नाही.</p>
                <p className="text-xs text-slate-500">
                  तुम्ही वरून "नवीन निकष जोडा" वापरू शकता किंवा 'एक्सेल अपलोड व सिंक' टॅबमधून 'मूल्यांकन रुब्रिक' शीट थेट अपलोड करू शकता.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRubrics.map((rub) => (
                  <div
                    key={rub.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-900 text-white">
                          {rub.dimension}
                        </span>
                        {rub.activityTitle && (
                          <span className="text-xs font-bold text-slate-800">
                            उपक्रम: <b>{rub.activityTitle}</b>
                          </span>
                        )}
                        {rub.competencyCode && (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900">
                            {rub.competencyCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenEditRubric(rub)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 transition-all cursor-pointer"
                          title="संपादित करा"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRubric(rub.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-800 transition-all cursor-pointer"
                          title="हटवा"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Beginner */}
                      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-900">
                            {selectedStage === "foundational" ? "प्रवाह / निर्झर" : "प्रारंभिक (Beginner)"}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            स्तर १
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {rub.beginner || "-"}
                        </p>
                      </div>

                      {/* Proficient */}
                      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-900">
                            {selectedStage === "foundational" ? "पर्वत" : "प्रवीण (Proficient)"}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            स्तर २
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {rub.proficient || "-"}
                        </p>
                      </div>

                      {/* Advanced */}
                      <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-900">
                            {selectedStage === "foundational" ? "आकाश" : "प्रगत (Advanced)"}
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            स्तर ३
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {rub.advanced || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT ACTIVITY & 5 QUESTIONS */}
      {/* ========================================================================= */}
      {showActivityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingActivityId ? "उपक्रम व ५ प्रश्न संपादित करा (Edit Activity)" : "नवीन उपक्रम व ५ प्रश्न जोडा (Add Activity)"}
              </h3>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Row 1: Stage & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">शैक्षणिक स्तर (Stage):</label>
                  <select
                    value={actStage}
                    onChange={(e) => setActStage(e.target.value as HpcStageId)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="foundational">पायाभूत स्तर (इ. १ली व २री)</option>
                    <option value="preparatory">पूर्वतयारी स्तर (इ. ३री ते ५वी)</option>
                    <option value="middle">मध्य स्तर (इ. ६वी ते ८वी)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">विकास क्षेत्र / विषय:</label>
                  <input
                    type="text"
                    value={actSubject}
                    onChange={(e) => setActSubject(e.target.value)}
                    placeholder="उदा. प्रथम भाषा (R1), गणित, शारीरिक विकास"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Competency Code & Number */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">क्षमता कोड (Competency Code):</label>
                  <input
                    type="text"
                    value={actCompCode}
                    onChange={(e) => setActCompCode(e.target.value)}
                    placeholder="उदा. L1C1.1 किंवा C-1.1 किंवा MC1.2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">उपक्रम क्र. (1-5):</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={actNumber}
                    onChange={(e) => setActNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Row 3: Activity Title */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">उपक्रमाचे नाव / कृती शीर्षक * :</label>
                <input
                  type="text"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  placeholder="उदा. आपल्या आवडत्या सणाबद्दल पाच वाक्यांत सलग बोला."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>

              {/* Row 4: Activity Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">उपक्रमाचे सविस्तर वर्णन (कृती):</label>
                <textarea
                  rows={3}
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  placeholder="शिक्षकांनी हात धुण्याच्या सहा पायऱ्या दाखवाव्यात..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              {/* Row 5: 5 Assessment Questions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-800">
                  मूल्यांकनासाठी विचारलेले ५ प्रश्न (5 Assessment Questions):
                </label>
                {actQuestions.map((q, qIndex) => (
                  <div key={qIndex} className="flex items-center gap-2">
                    <span className="size-6 rounded-lg bg-indigo-100 text-indigo-900 text-xs font-black flex items-center justify-center shrink-0">
                      {qIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => {
                        const updated = [...actQuestions];
                        updated[qIndex] = e.target.value;
                        setActQuestions(updated);
                      }}
                      placeholder={`प्रश्न क्र. ${qIndex + 1} प्रविष्ट करा...`}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                    />
                  </div>
                ))}
              </div>

              {/* Row 6: Sample Feedbacks */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">शिक्षकांचा नमुना अभिप्राय:</label>
                  <textarea
                    rows={2}
                    value={actTeacherFeedback}
                    onChange={(e) => setActTeacherFeedback(e.target.value)}
                    placeholder="या कृतीत विद्यार्थ्याची कामगिरी समाधानकारक आहे..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">पालकांचा नमुना अभिप्राय:</label>
                  <textarea
                    rows={2}
                    value={actParentFeedback}
                    onChange={(e) => setActParentFeedback(e.target.value)}
                    placeholder="आमच्या निरीक्षणानुसार पाल्याला या उपक्रमात विशेष रुची आहे..."
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowActivityModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleSaveActivity}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer shadow-xs"
              >
                सेव्ह करा (Save Activity)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT YEAR-END REMARK */}
      {/* ========================================================================= */}
      {showRemarkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingRemarkId ? "वार्षिक शेरा संपादित करा" : "नवीन वार्षिक शेरा जोडा"}
              </h3>
              <button
                onClick={() => setShowRemarkModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">विषय / विकास क्षेत्र:</label>
              <input
                type="text"
                value={remSubject}
                onChange={(e) => setRemSubject(e.target.value)}
                placeholder="उदा. प्रथम भाषा (R1), गणित, शारीरिक विकास"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">कामगिरी स्तर:</label>
              <select
                value={remLevel}
                onChange={(e) => setRemLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                <option value="प्रगत">प्रगत (Advanced)</option>
                <option value="प्रवीण">प्रवीण (Proficient)</option>
                <option value="प्रारंभिक">प्रारंभिक (Beginner)</option>
                <option value="आकाश">आकाश</option>
                <option value="पर्वत">पर्वत</option>
                <option value="निर्झर">निर्झर</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">शिक्षकांचा अभिप्राय मजकूर (शेरा):</label>
              <textarea
                rows={4}
                value={remText}
                onChange={(e) => setRemText(e.target.value)}
                placeholder="उदा. विद्यार्थ्याची मौखिक अभिव्यक्ती अत्यंत समृद्ध आहे..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRemarkModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleSaveRemark}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-black cursor-pointer shadow-xs"
              >
                सेव्ह करा (Save Remark)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Goal */}
      {showAddGoal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-base font-black text-slate-900">नवीन अभ्यासक्रम ध्येय जोडा (Add CG)</h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ध्येय कोड (Code):</label>
              <input
                type="text"
                value={newGoalCode}
                onChange={(e) => setNewGoalCode(e.target.value)}
                placeholder="उदा. CG-14 किंवा R1CG-3"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">विषय / क्षेत्र:</label>
              <select
                value={newGoalArea}
                onChange={(e) => setNewGoalArea(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nameMarathi}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ध्येयाचे वर्णन (मराठी):</label>
              <textarea
                rows={3}
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="ध्येयाचे स्पष्ट वर्णन..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddGoal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleAddGoal}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer shadow-xs"
              >
                जोडा (Add)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Competency */}
      {showAddComp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="text-base font-black text-slate-900">नवीन क्षमता जोडा (Add Competency)</h3>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">क्षमता कोड (Code):</label>
              <input
                type="text"
                value={newCompCode}
                onChange={(e) => setNewCompCode(e.target.value)}
                placeholder="उदा. C-2.6 किंवा R1C-3"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">संबंधित ध्येय (Goal):</label>
              <select
                value={newCompGoalId}
                onChange={(e) => setNewCompGoalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
              >
                {allGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.code}: {(g.titleMarathi || (g as any).nameMarathi || g.code || "").slice(0, 40)}...
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">क्षमतेचे वर्णन (मराठी):</label>
              <textarea
                rows={3}
                value={newCompTitle}
                onChange={(e) => setNewCompTitle(e.target.value)}
                placeholder="क्षमतेचे स्पष्ट वर्णन..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddComp(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleAddCompetency}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-black cursor-pointer shadow-xs"
              >
                जोडा (Add)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Rubric */}
      {showRubricModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingRubricId ? "मूल्यांकन निकष संपादित करा (Edit Rubric)" : "नवीन मूल्यांकन निकष जोडा (Add Rubric)"}
              </h3>
              <button
                onClick={() => setShowRubricModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">शैक्षणिक स्तर (Stage):</label>
                  <select
                    value={rubStage}
                    onChange={(e) => setRubStage(e.target.value as HpcStageId)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="foundational">पायाभूत स्तर (इ. १ली व २री)</option>
                    <option value="preparatory">पूर्वतयारी स्तर (इ. ३री ते ५वी)</option>
                    <option value="middle">मध्य स्तर (इ. ६वी ते ८वी)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">परिमाण / पैलू (Dimension) *:</label>
                  <input
                    type="text"
                    value={rubDimension}
                    onChange={(e) => setRubDimension(e.target.value)}
                    placeholder="उदा. जाणीवजागृती / संवेदनशीलता / सर्जनशीलता"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">क्षमता कोड (ऐच्छिक):</label>
                  <input
                    type="text"
                    value={rubCompCode}
                    onChange={(e) => setRubCompCode(e.target.value)}
                    placeholder="उदा. L1C1.1 किंवा C-1.1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">उपक्रमाचे नाव / कृती (ऐच्छिक):</label>
                  <input
                    type="text"
                    value={rubActTitle}
                    onChange={(e) => setRubActTitle(e.target.value)}
                    placeholder="उदा. आपल्या आवडत्या सणाबद्दल बोला"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">
                  स्तर १: {rubStage === "foundational" ? "प्रवाह / निर्झर" : "प्रारंभिक (Beginner)"} निकष वर्णन:
                </label>
                <textarea
                  rows={2}
                  value={rubBeginner}
                  onChange={(e) => setRubBeginner(e.target.value)}
                  placeholder="विद्यार्थ्याला कृती करताना मदतीची गरज लागते..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 mb-1">
                  स्तर २: {rubStage === "foundational" ? "पर्वत" : "प्रवीण (Proficient)"} निकष वर्णन:
                </label>
                <textarea
                  rows={2}
                  value={rubProficient}
                  onChange={(e) => setRubProficient(e.target.value)}
                  placeholder="विद्यार्थी बहुतांश टप्पे योग्यरीतीने पार पाडतो..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-800 mb-1">
                  स्तर ३: {rubStage === "foundational" ? "आकाश" : "प्रगत (Advanced)"} निकष वर्णन:
                </label>
                <textarea
                  rows={2}
                  value={rubAdvanced}
                  onChange={(e) => setRubAdvanced(e.target.value)}
                  placeholder="विद्यार्थी स्वतंत्रपणे, आत्मविश्वासाने भावना व्यक्त करतो..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowRubricModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                रद्द करा
              </button>
              <button
                onClick={handleSaveRubric}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black cursor-pointer shadow-xs"
              >
                सेव्ह करा (Save Rubric)
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
