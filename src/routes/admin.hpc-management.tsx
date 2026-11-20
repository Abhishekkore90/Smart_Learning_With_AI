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
  LayoutDashboard,
  Table as TableIcon,
  LayoutGrid,
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
  deleteHpcActivitiesByClass,
  clearSpecificClassHpcData,
} from "@/hpc/services/hpcService";
import { HPC_ACTIVITIES_BANK } from "@/hpc/data/hpcActivitiesBank";
import {
  HPC_FINAL_COMPREHENSIVE_REMARKS,
  HPC_NEXT_CLASS_RECOMMENDATIONS,
} from "@/hpc/data/hpcFinalRemarksBank";

export const Route = createFileRoute("/admin/hpc-management")({
  head: () => ({
    meta: [{ title: "HPC समग्र प्रगतिपत्रक व्यवस्थापन (Admin HPC Management) — SMART LEARNING" }],
  }),
  component: AdminHpcManagementPage,
});

type TabType = "overview" | "excel_sync";
type DashboardSection = "activities" | "goals_competencies" | "rubrics" | "remarks";

const STAGE_CLASSES_MAP: Record<HpcStageId, { id: string; label: string }[]> = {
  foundational: [
    { id: "all", label: "सर्व वर्ग (इ. १ली व २री)" },
    { id: "1st", label: "इयत्ता १ ली" },
    { id: "2nd", label: "इयत्ता २ री" },
  ],
  preparatory: [
    { id: "all", label: "सर्व वर्ग (इ. ३री ते ५वी)" },
    { id: "3rd", label: "इयत्ता ३ री" },
    { id: "4th", label: "इयत्ता ४ थी" },
    { id: "5th", label: "इयत्ता ५ वी" },
  ],
  middle: [
    { id: "all", label: "सर्व वर्ग (इ. ६वी ते ८वी)" },
    { id: "6th", label: "इयत्ता ६ वी" },
    { id: "7th", label: "इयत्ता ७ वी" },
    { id: "8th", label: "इयत्ता ८ वी" },
  ],
};

const CLASS_LABELS_MAP: Record<string, string> = {
  "1st": "इयत्ता १ ली",
  "2nd": "इयत्ता २ री",
  "3rd": "इयत्ता ३ री",
  "4th": "इयत्ता ४ थी",
  "5th": "इयत्ता ५ वी",
  "6th": "इयत्ता ६ वी",
  "7th": "इयत्ता ७ वी",
  "8th": "इयत्ता ८ वी",
};

function AdminHpcManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>("activities");
  const [goalsOrCompSubtab, setGoalsOrCompSubtab] = useState<"goals" | "competencies">("competencies");
  const [selectedStage, setSelectedStage] = useState<HpcStageId>("foundational");
  const [selectedUploadStage, setSelectedUploadStage] = useState<HpcStageId>("foundational");
  const [searchQuery, setSearchQuery] = useState("");

  // Master Explorer & Overview State
  const [explorerClassFilter, setExplorerClassFilter] = useState<string>("all");
  const [explorerStageFilter, setExplorerStageFilter] = useState<string>("all");
  const [explorerSubjectFilter, setExplorerSubjectFilter] = useState<string>("all");
  const [explorerViewMode, setExplorerViewMode] = useState<"table" | "cards">("table");
  const [viewingActivityModal, setViewingActivityModal] = useState<HpcDynamicActivity | null>(null);
  const [showMatrix, setShowMatrix] = useState<boolean>(true);

  // Single Class Data Deletion Modal
  const [showClearClassModal, setShowClearClassModal] = useState(false);
  const [targetClassToClear, setTargetClassToClear] = useState<string>("1st");
  const [clearActivitiesCheck, setClearActivitiesCheck] = useState<boolean>(true);
  const [clearAssessmentsCheck, setClearAssessmentsCheck] = useState<boolean>(false);
  const [isClearingClass, setIsClearingClass] = useState<boolean>(false);

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

  // Count by Class for instant class-wise indicators & clearing
  const countByClass = useMemo(() => {
    const counts: Record<string, number> = {
      "1st": 0, "2nd": 0, "3rd": 0, "4th": 0, "5th": 0, "6th": 0, "7th": 0, "8th": 0
    };
    activitiesList.forEach((a) => {
      let cid = a.classId;
      if (!cid) {
        if (a.id.startsWith("act_1st_")) cid = "1st";
        else if (a.id.startsWith("act_2nd_")) cid = "2nd";
        else if (a.id.startsWith("act_3rd_")) cid = "3rd";
        else if (a.id.startsWith("act_4th_")) cid = "4th";
        else if (a.id.startsWith("act_5th_")) cid = "5th";
        else if (a.id.startsWith("act_6th_")) cid = "6th";
        else if (a.id.startsWith("act_7th_")) cid = "7th";
        else if (a.id.startsWith("act_8th_")) cid = "8th";
      }
      if (cid && counts[cid] !== undefined) {
        counts[cid]++;
      }
    });
    return counts;
  }, [activitiesList]);

  // Total evaluation questions count across all activities
  const totalQuestionsCount = useMemo(() => {
    return activitiesList.reduce((sum, act) => sum + (act.questions?.filter((q) => q && q.trim())?.length || 0), 0);
  }, [activitiesList]);

  // Unique subjects list across all activities
  const uniqueSubjects = useMemo(() => {
    const subs = new Set<string>();
    activitiesList.forEach((a) => {
      if (a.subjectOrArea && a.subjectOrArea.trim()) subs.add(a.subjectOrArea.trim());
    });
    return Array.from(subs).sort();
  }, [activitiesList]);

  // Unique classes list from activities
  const uniqueClasses = useMemo(() => {
    const cls = new Set<string>();
    activitiesList.forEach((a) => {
      if (a.classId && a.classId.trim()) cls.add(a.classId.trim());
    });
    return Array.from(cls).sort();
  }, [activitiesList]);

  // Stage breakdown
  const stageBreakdown = useMemo(() => {
    const stats: Record<HpcStageId, { activities: number; questions: number; subjects: Set<string> }> = {
      foundational: { activities: 0, questions: 0, subjects: new Set() },
      preparatory: { activities: 0, questions: 0, subjects: new Set() },
      middle: { activities: 0, questions: 0, subjects: new Set() },
    };
    activitiesList.forEach((a) => {
      const stg = a.stageId || "foundational";
      if (stats[stg]) {
        stats[stg].activities++;
        stats[stg].questions += a.questions?.filter((q) => q && q.trim())?.length || 0;
        if (a.subjectOrArea) stats[stg].subjects.add(a.subjectOrArea.trim());
      }
    });
    return stats;
  }, [activitiesList]);

  // Class & Subject matrix for visualization
  const classSubjectMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const classes = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    classes.forEach((c) => {
      matrix[c] = {};
    });
    activitiesList.forEach((a) => {
      const targetClasses: string[] =
        a.classId && a.classId !== "all"
          ? [a.classId]
          : a.stageId === "foundational"
          ? ["1st", "2nd"]
          : a.stageId === "preparatory"
          ? ["3rd", "4th", "5th"]
          : ["6th", "7th", "8th"];

      const sub = a.subjectOrArea || "इतर";
      targetClasses.forEach((c) => {
        if (!matrix[c]) matrix[c] = {};
        matrix[c][sub] = (matrix[c][sub] || 0) + 1;
      });
    });
    return matrix;
  }, [activitiesList]);

  // Master Explorer filtered activities
  const masterExplorerActivities = useMemo(() => {
    return activitiesList.filter((act) => {
      // Stage filter
      if (explorerStageFilter !== "all" && act.stageId !== explorerStageFilter) return false;
      // Class filter
      if (explorerClassFilter !== "all") {
        const stageForClass = ["1st", "2nd"].includes(explorerClassFilter)
          ? "foundational"
          : ["3rd", "4th", "5th"].includes(explorerClassFilter)
          ? "preparatory"
          : "middle";
        if (act.stageId && act.stageId !== stageForClass) return false;
        if (act.classId && act.classId !== "all" && act.classId !== explorerClassFilter) return false;
      }
      // Subject filter
      if (explorerSubjectFilter !== "all" && act.subjectOrArea !== explorerSubjectFilter) return false;
      // Universal Search
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        act.activityTitle?.toLowerCase().includes(q) ||
        act.activityDescription?.toLowerCase().includes(q) ||
        act.competencyCode?.toLowerCase().includes(q) ||
        act.competencyTitle?.toLowerCase().includes(q) ||
        act.goalCode?.toLowerCase().includes(q) ||
        act.subjectOrArea?.toLowerCase().includes(q) ||
        act.classId?.toLowerCase().includes(q) ||
        act.questions?.some((qu) => qu?.toLowerCase().includes(q)) ||
        act.learningOutcomes?.some((lo) => lo?.toLowerCase().includes(q))
      );
    });
  }, [activitiesList, explorerStageFilter, explorerClassFilter, explorerSubjectFilter, searchQuery]);

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

  // Preview filtering & view limit
  const [previewLimit, setPreviewLimit] = useState<number | "all">(50);
  const [previewSearch, setPreviewSearch] = useState<string>("");
  const [previewSheetFilter, setPreviewSheetFilter] = useState<string>("all");

  // Filter parsed activities by selected sheet filter & search query
  const filteredParsedActivities = useMemo(() => {
    return parsedActivities.filter((act) => {
      if (previewSheetFilter !== "all" && act.sheetSource && act.sheetSource !== previewSheetFilter) {
        return false;
      }
      if (!previewSearch) return true;
      const q = previewSearch.toLowerCase();
      return (
        act.subjectOrArea?.toLowerCase().includes(q) ||
        act.activityTitle?.toLowerCase().includes(q) ||
        act.activityDescription?.toLowerCase().includes(q) ||
        act.competencyCode?.toLowerCase().includes(q) ||
        act.goalCode?.toLowerCase().includes(q) ||
        act.teacherFeedbackSample?.toLowerCase().includes(q) ||
        act.parentFeedbackSample?.toLowerCase().includes(q) ||
        act.questions?.some((qu) => qu.toLowerCase().includes(q)) ||
        act.learningOutcomes?.some((lo) => lo.toLowerCase().includes(q))
      );
    });
  }, [parsedActivities, previewSheetFilter, previewSearch]);

  const displayedParsedActivities = useMemo(() => {
    if (previewLimit === "all") return filteredParsedActivities;
    return filteredParsedActivities.slice(0, previewLimit);
  }, [filteredParsedActivities, previewLimit]);

  // Filter parsed remarks by selected sheet filter & search query
  const filteredParsedRemarks = useMemo(() => {
    return parsedRemarks.filter((r) => {
      if (previewSheetFilter !== "all" && r.sheetSource && r.sheetSource !== previewSheetFilter) {
        return false;
      }
      if (!previewSearch) return true;
      const q = previewSearch.toLowerCase();
      return (
        r.subjectOrArea?.toLowerCase().includes(q) ||
        r.level?.toLowerCase().includes(q) ||
        r.remarkText?.toLowerCase().includes(q) ||
        r.recommendationText?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q)
      );
    });
  }, [parsedRemarks, previewSheetFilter, previewSearch]);

  const displayedParsedRemarks = useMemo(() => {
    if (previewLimit === "all") return filteredParsedRemarks;
    return filteredParsedRemarks.slice(0, previewLimit);
  }, [filteredParsedRemarks, previewLimit]);

  // Filter parsed rubrics by selected sheet filter & search query
  const filteredParsedRubrics = useMemo(() => {
    return parsedRubrics.filter((rub) => {
      if (previewSheetFilter !== "all" && rub.sheetSource && rub.sheetSource !== previewSheetFilter) {
        return false;
      }
      if (!previewSearch) return true;
      const q = previewSearch.toLowerCase();
      return (
        rub.activityTitle?.toLowerCase().includes(q) ||
        rub.competencyCode?.toLowerCase().includes(q) ||
        rub.dimension?.toLowerCase().includes(q) ||
        rub.beginner?.toLowerCase().includes(q) ||
        rub.proficient?.toLowerCase().includes(q) ||
        rub.advanced?.toLowerCase().includes(q)
      );
    });
  }, [parsedRubrics, previewSheetFilter, previewSearch]);

  const displayedParsedRubrics = useMemo(() => {
    if (previewLimit === "all") return filteredParsedRubrics;
    return filteredParsedRubrics.slice(0, previewLimit);
  }, [filteredParsedRubrics, previewLimit]);

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
  const [remarkTypeFilter, setRemarkTypeFilter] = useState<string>("all");

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
      const matchesType =
        remarkTypeFilter === "all" ||
        (rem as any).type === remarkTypeFilter ||
        (remarkTypeFilter === "final_comprehensive" &&
          (rem.subjectOrArea === "अंतिम सर्वंकष वार्षिक अभिप्राय" || rem.subjectOrArea?.includes("अंतिम"))) ||
        (remarkTypeFilter === "next_class_recommendation" &&
          (rem.subjectOrArea === "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस" || rem.subjectOrArea?.includes("शिफारस"))) ||
        (remarkTypeFilter === "developmental_area" &&
          rem.subjectOrArea !== "अंतिम सर्वंकष वार्षिक अभिप्राय" &&
          rem.subjectOrArea !== "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस");

      const matchesLevel = remarkLevelFilter === "all" || rem.level === remarkLevelFilter;
      const matchesArea = remarkAreaFilter === "all" || rem.subjectOrArea === remarkAreaFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        (rem.subjectOrArea && rem.subjectOrArea.toLowerCase().includes(q)) ||
        (rem.remarkText && rem.remarkText.toLowerCase().includes(q));
      return matchesType && matchesLevel && matchesArea && matchesQuery;
    });
  }, [remarksList, remarkTypeFilter, remarkLevelFilter, remarkAreaFilter, searchQuery]);

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

  const handleClearSingleClass = async (
    classId: string,
    options: { deleteActivities: boolean; deleteAssessments: boolean } = {
      deleteActivities: true,
      deleteAssessments: false,
    }
  ) => {
    const classLabel = CLASS_LABELS_MAP[classId] || `इयत्ता ${classId}`;
    const actCount = countByClass[classId] || 0;

    if (!options.deleteActivities && !options.deleteAssessments) {
      toast.error("कृपया कमीत कमी एक पर्याय निवडा (उपक्रम किंवा मूल्यमापन).");
      return;
    }

    if (options.deleteActivities && actCount === 0 && !options.deleteAssessments) {
      toast.info(`'${classLabel}' मध्ये हटवण्यासाठी कोणतेही उपक्रम उपलब्ध नाहीत.`);
      return;
    }

    const confirmMsg =
      `सावधान: खरोखर फक्त '${classLabel}' चा डेटा डेटाबेसमधून कायमचा हटवायचा आहे का?\n\n` +
      (options.deleteActivities ? `• उपक्रम व ५ प्रश्न: ${actCount} नोंदी डिलीट होतील\n` : "") +
      (options.deleteAssessments ? `• विद्यार्थ्यांचे मूल्यमापन व वार्षिक सारांश नोंदी डिलीट होतील\n` : "") +
      `\nमहत्त्वाचे: इतर सर्व इयत्तांचा डेटा पूर्णपणे सुरक्षित राहील आणि डिलीट होणार नाही.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsClearingClass(true);
      const res = await clearSpecificClassHpcData(classId, options);
      let successMsg = `'${classLabel}' चा डेटा यशस्वीरीत्या हटवला गेला! `;
      if (res.activitiesDeleted > 0) successMsg += `(${res.activitiesDeleted} उपक्रम) `;
      if (res.assessmentsDeleted > 0 || res.summariesDeleted > 0) {
        successMsg += `(${res.assessmentsDeleted + res.summariesDeleted} मूल्यमापन नोंदी) `;
      }
      toast.success(successMsg);
      setShowClearClassModal(false);
      await fetchActivities();
    } catch (err: any) {
      toast.error(`'${classLabel}' चा डेटा हटवताना त्रुटी: ` + err.message);
    } finally {
      setIsClearingClass(false);
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
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        // Using array buffer with cellDates & UTF-8 preservation
        const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        setPreviewSheetFilter("all");

        // Auto parse entire workbook across all sheets
        parseEntireWorkbook(wb);
      } catch (err: any) {
        toast.error("एक्सेल फाईल वाचताना त्रुटी: " + err.message);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const GOAL_TO_AREA_MAP: Record<string, string> = {
    "CG-1": "शारीरिक विकास",
    "CG-2": "शारीरिक विकास",
    "CG-3": "शारीरिक विकास",
    "CG-4": "सामाजिक, भावनिक व नैतिक विकास",
    "CG-5": "सामाजिक, भावनिक व नैतिक विकास",
    "CG-6": "सामाजिक, भावनिक व नैतिक विकास",
    "CG-7": "बोधात्मक विकास",
    "CG-8": "बोधात्मक विकास",
    "CG-9": "भाषा आणि साक्षरता विकास",
    "CG-10": "भाषा आणि साक्षरता विकास",
    "CG-11": "भाषा आणि साक्षरता विकास",
    "CG-12": "सौंदर्यदृष्टी आणि सांस्कृतिक विकास",
    "CG-13": "सकारात्मक अध्ययन सवयी",
  };

  const cleanActivityTitle = (text: string): string => {
    if (!text) return "";
    return text
      .trim()
      .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const cleanQuestionText = (text: string): string => {
    if (!text) return "";
    return text
      .trim()
      .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
      .replace(/^प्रश्न\s*([०-९0-9]+)?[.:)\-\s]*/i, "")
      .replace(/^Q[0-9]+[.:)\-\s]*/i, "")
      .trim();
  };

  // SheetJS: Propagate merged cell contents across the entire merged range
  const propagateMergedCells = (sheet: XLSX.WorkSheet) => {
    if (!sheet || !sheet["!merges"]) return;
    const merges = sheet["!merges"];
    merges.forEach((merge) => {
      const startCellAddress = XLSX.utils.encode_cell(merge.s);
      const startCell = sheet[startCellAddress];
      if (!startCell || startCell.v === undefined || startCell.v === null || startCell.v === "") return;
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          if (r === merge.s.r && c === merge.s.c) continue;
          const targetAddress = XLSX.utils.encode_cell({ r, c });
          sheet[targetAddress] = { ...startCell };
        }
      }
    });
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

      // Fill merged cells down and across so no sub-rows lose their goal, competency, or area
      propagateMergedCells(sheet);

      const headerRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      if (headerRows.length === 0) return;

      const lowerName = sheetName.toLowerCase();

      // Determine initial section guess from sheet name if specific
      let currentSection:
        | "activities"
        | "rubrics"
        | "developmental_remarks"
        | "final_comprehensive"
        | "next_class_recommendation" = "activities";

      if (
        lowerName.includes("रुब्रिक") ||
        lowerName.includes("निकष") ||
        lowerName.includes("rubric") ||
        lowerName.includes("मूल्यांकन") ||
        lowerName.includes("sheet2") ||
        lowerName.includes("sheet 2") ||
        lowerName.includes("शीट 2") ||
        lowerName.includes("शीट2")
      ) {
        currentSection = "rubrics";
      } else if (
        lowerName.includes("शीट 4") ||
        lowerName.includes("sheet 4") ||
        lowerName.includes("sheet4") ||
        lowerName.includes("शीट4") ||
        lowerName.includes("अंतिम") ||
        lowerName.includes("सर्वंकष") ||
        lowerName.includes("final") ||
        lowerName.includes("comprehensive")
      ) {
        currentSection = "final_comprehensive";
      } else if (
        lowerName.includes("शीट 5") ||
        lowerName.includes("sheet 5") ||
        lowerName.includes("sheet5") ||
        lowerName.includes("शीट5") ||
        lowerName.includes("शिफारस") ||
        lowerName.includes("मार्गदर्शन") ||
        lowerName.includes("recommendation")
      ) {
        currentSection = "next_class_recommendation";
      } else if (
        lowerName.includes("शीट 3") ||
        lowerName.includes("sheet 3") ||
        lowerName.includes("sheet3") ||
        lowerName.includes("शीट3") ||
        lowerName.includes("वार्षिक") ||
        lowerName.includes("सारांश") ||
        lowerName.includes("शेरे") ||
        lowerName.includes("विकासक्षेत्र") ||
        lowerName.includes("development")
      ) {
        currentSection = "developmental_remarks";
      }

      // State variables across rows in this sheet
      let currSub = "";
      let currGoalCode = "";
      let currGoalTitle = "";
      let currCompCode = "";
      let currCompTitle = "";
      let currLoList: string[] = [];
      let currLoText = "";
      let lastAct: HpcDynamicActivity | null = null;

      // Rubric section state
      let currRubAct = "";
      let currRubGoal = "";
      let currRubComp = "";

      // Developmental remarks state
      let currDevArea = "";

      // Column mapping for activities table
      let colSubIdx = -1;
      let colGoalIdx = -1;
      let colCompIdx = -1;
      let colLoIdx = -1;
      let colActIdx = -1;
      let colQIdx = -1;
      let colQIndices: number[] = [];
      let colTeacherIdx = -1;
      let colParentIdx = -1;

      // Column mapping for rubrics table
      let colRubActIdx = -1;
      let colRubDimIdx = -1;
      let colRubBegIdx = -1;
      let colRubProIdx = -1;
      let colRubAdvIdx = -1;

      for (let rIdx = 0; rIdx < headerRows.length; rIdx++) {
        const rowArr = headerRows[rIdx];
        if (!rowArr || rowArr.length === 0) continue;

        const rowStr = rowArr.map((c) => String(c || "").trim()).join(" , ");
        const c0 = String(rowArr[0] || "").trim();
        const c1 = String(rowArr[1] || "").trim();
        const c2 = String(rowArr[2] || "").trim();
        const c3 = String(rowArr[3] || "").trim();
        const c4 = String(rowArr[4] || "").trim();
        const c5 = String(rowArr[5] || "").trim();

        // ----------------- SECTION TRANSITION DETECTORS -----------------
        // 1. Rubrics Table Header Detection
        if (
          (rowStr.includes("निर्झर") && rowStr.includes("पर्वत") && rowStr.includes("आकाश")) ||
          (rowStr.includes("प्रारंभिक") && rowStr.includes("प्रवीण") && rowStr.includes("प्रगत")) ||
          (rowArr.some((c) => String(c).includes("उपक्रम") || String(c).includes("कृती")) &&
            rowArr.some((c) => String(c).includes("क्षमता") || String(c).includes("पैलू") || String(c).includes("जाणीव")) &&
            rowArr.some((c) => String(c).includes("निर्झर") || String(c).includes("प्रारंभिक")))
        ) {
          currentSection = "rubrics";
          rowArr.forEach((cVal, cIdx) => {
            const s = String(cVal || "").trim().toLowerCase();
            if (s.includes("उपक्रम") || s.includes("activity") || s.includes("कृती")) colRubActIdx = cIdx;
            else if (s.includes("परिमाण") || s.includes("पैलू") || s.includes("जाणीव") || s.includes("dimension")) colRubDimIdx = cIdx;
            else if (s.includes("प्रारंभिक") || s.includes("निर्झर") || s.includes("beginner") || s.includes("स्तर १") || s.includes("स्तर 1")) colRubBegIdx = cIdx;
            else if (s.includes("प्रवीण") || s.includes("पर्वत") || s.includes("proficient") || s.includes("स्तर २") || s.includes("स्तर 2")) colRubProIdx = cIdx;
            else if (s.includes("प्रगत") || s.includes("आकाश") || s.includes("advanced") || s.includes("स्तर ३") || s.includes("स्तर 3")) colRubAdvIdx = cIdx;
          });
          continue;
        }

        // 2. Final Comprehensive Remarks Table Header Detection (Sheet 4)
        if (
          rowStr.includes("शीट 4") ||
          rowStr.includes("शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय") ||
          (rowStr.includes("अंतिम") && rowStr.includes("सर्वंकष") && rowStr.includes("अभिप्राय"))
        ) {
          currentSection = "final_comprehensive";
          continue;
        }

        // 3. Next Class Recommendation Table Header Detection (Sheet 5)
        if (
          rowStr.includes("शीट 5") ||
          rowStr.includes("पुढील इयत्तेसाठी मार्गदर्शन व शिफारस") ||
          rowStr.includes("पुढील इयत्तेसाठी विद्यार्थ्यास मार्गदर्शन") ||
          rowStr.includes("सुधारावयाच्या बाबी")
        ) {
          currentSection = "next_class_recommendation";
          continue;
        }

        // 4. Developmental Area Remarks Table Header Detection (Sheet 3)
        if (
          rowStr.includes("शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)") ||
          (rowStr.includes("विकास क्षेत्र") &&
            rowStr.includes("कामगिरी स्तर") &&
            rowStr.includes("शिक्षकांचा अभिप्राय")) ||
          c0.startsWith("विकास क्षेत्र:") ||
          c0.startsWith("विकास क्षेत्र :")
        ) {
          currentSection = "developmental_remarks";
          if (c0.startsWith("विकास क्षेत्र:") || c0.startsWith("विकास क्षेत्र :")) {
            currDevArea = c0.replace(/^विकास\s*क्षेत्र\s*:\s*/, "").trim();
            continue;
          }
        }

        // 5. Activities Table Header Detection (Sheet 1)
        if (
          rowStr.includes("उपक्रम (थोडक्यात कृतीसह)") ||
          rowStr.includes("उपक्रम") ||
          rowStr.includes("कृती") ||
          ((rowStr.includes("विकास क्षेत्र") || rowStr.includes("ध्येय क्रमांक") || rowStr.includes("विषय")) &&
            (rowStr.includes("उपक्रम") || rowStr.includes("कृती")) &&
            !rowStr.includes("निर्झर"))
        ) {
          // If this row is a header row
          if (
            rowArr.some((c) => String(c).includes("उपक्रम") || String(c).includes("कृती") || String(c).toLowerCase().includes("activity")) &&
            rowArr.some((c) => String(c).includes("क्षमता") || String(c).includes("ध्येय") || String(c).includes("प्रश्न") || String(c).includes("विकास"))
          ) {
            currentSection = "activities";
            colQIndices = [];
            rowArr.forEach((colVal, cIdx) => {
              const s = String(colVal || "").trim().toLowerCase();
              if (s.includes("विकास क्षेत्र") || s.includes("विषय") || s.includes("क्षेत्र") || s.includes("subject") || s.includes("area")) {
                colSubIdx = cIdx;
              } else if (s.includes("ध्येय") || s.includes("goal") || s.startsWith("cg")) {
                colGoalIdx = cIdx;
              } else if (s.includes("क्षमता") || s.includes("competency") || s.includes("कौशल्य")) {
                colCompIdx = cIdx;
              } else if (s.includes("निष्पत्ती") || s.includes("learning") || s.includes("lo")) {
                colLoIdx = cIdx;
              } else if (s.includes("उपक्रम") || s.includes("कृती") || s.includes("activity")) {
                colActIdx = cIdx;
              } else if (s.includes("प्रश्न") || /^(q[0-9]|quest)/i.test(s)) {
                colQIndices.push(cIdx);
                if (colQIdx < 0) colQIdx = cIdx;
              } else if (s.includes("शिक्षक") || s.includes("teacher")) {
                colTeacherIdx = cIdx;
              } else if (s.includes("पालक") || s.includes("parent")) {
                colParentIdx = cIdx;
              }
            });
            continue;
          }
        }

        // ----------------- PARSE ACCORDING TO CURRENT SECTION -----------------

        // SECTION A: ACTIVITIES TABLE
        if (currentSection === "activities") {
          const subCol = colSubIdx >= 0 ? colSubIdx : 1;
          const goalCol = colGoalIdx >= 0 ? colGoalIdx : 2;
          const compCol = colCompIdx >= 0 ? colCompIdx : 3;
          const loCol = colLoIdx >= 0 ? colLoIdx : 4;
          const actCol = colActIdx >= 0 ? colActIdx : 5;
          const teacherCol = colTeacherIdx >= 0 ? colTeacherIdx : (colQIndices.length > 1 ? colQIndices[colQIndices.length - 1] + 1 : 7);
          const parentCol = colParentIdx >= 0 ? colParentIdx : teacherCol + 1;

          const rowSub = String(rowArr[subCol] || "").trim();
          const rowGoal = String(rowArr[goalCol] || "").trim();
          const rowComp = String(rowArr[compCol] || "").trim();
          const rowLo = String(rowArr[loCol] || "").trim();
          const rowAct = String(rowArr[actCol] || "").trim();
          const rowTeacher = String(rowArr[teacherCol] || "").trim();
          const rowParent = String(rowArr[parentCol] || "").trim();

          // Skip header row if re-encountered
          if (
            rowAct === "उपक्रम" ||
            rowAct.includes("उपक्रम (थोडक्यात") ||
            rowComp.includes("क्षमता क्रमांक") ||
            rowSub.includes("विकास क्षेत्र")
          ) {
            continue;
          }

          if (rowSub && !rowSub.startsWith("अ.क्र") && !rowSub.startsWith("विकास क्षेत्र")) {
            currSub = rowSub;
          }

          if (rowGoal && !rowGoal.startsWith("ध्येय")) {
            const gm = rowGoal.match(/^([A-Za-z0-9\-\.]+)\s*(.*)/);
            currGoalCode = gm ? gm[1].trim() : rowGoal.slice(0, 10).trim();
            currGoalTitle = gm && gm[2] ? gm[2].trim() : rowGoal;
            if (!currSub && GOAL_TO_AREA_MAP[currGoalCode]) {
              currSub = GOAL_TO_AREA_MAP[currGoalCode];
            }
          }

          if (rowComp && !rowComp.startsWith("क्षमता")) {
            const cm = rowComp.match(/^([A-Za-z0-9\-\.]+)\s*(.*)/);
            currCompCode = cm ? cm[1].trim() : rowComp.slice(0, 10).trim();
            currCompTitle = cm && cm[2] ? cm[2].trim() : rowComp;
          }

          if (rowLo && !rowLo.startsWith("अध्ययन निष्पत्ती")) {
            currLoText = rowLo;
            currLoList = rowLo
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
          }

          // Detect stage
          let stage: HpcStageId = selectedUploadStage || selectedStage;
          if (selectedUploadClass === "1st" || selectedUploadClass === "2nd") {
            stage = "foundational";
          } else if (
            selectedUploadClass === "3rd" ||
            selectedUploadClass === "4th" ||
            selectedUploadClass === "5th"
          ) {
            stage = "preparatory";
          } else if (
            selectedUploadClass === "6th" ||
            selectedUploadClass === "7th" ||
            selectedUploadClass === "8th"
          ) {
            stage = "middle";
          } else if (currCompCode.startsWith("CG-") || currCompCode.startsWith("C-")) {
            stage = selectedUploadStage || "foundational";
          } else if (
            currCompCode.startsWith("L1") ||
            currCompCode.startsWith("MC") ||
            currCompCode.startsWith("TWC") ||
            currCompCode.startsWith("VA")
          ) {
            stage = selectedUploadStage || "preparatory";
          }

          if (!currSub && currGoalCode && GOAL_TO_AREA_MAP[currGoalCode]) {
            currSub = GOAL_TO_AREA_MAP[currGoalCode];
          }

          // Register Goal
          if (currGoalCode) {
            const gId = `CUSTOM-${currGoalCode}`;
            if (!goalsMap.has(gId)) {
              goalsMap.set(gId, {
                id: gId,
                code: currGoalCode,
                titleMarathi: currGoalTitle || currGoalCode,
                stageId: stage,
                areaOrSubjectId: currSub || GOAL_TO_AREA_MAP[currGoalCode] || "general",
              });
            }
          }

          // Register Competency
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

          // Extract all questions for this row (supporting multi-column question banks Q1..Q5 or single column with newlines)
          const rowQuestions: string[] = [];
          if (colQIndices.length > 0) {
            colQIndices.forEach((qColIdx) => {
              const val = String(rowArr[qColIdx] || "").trim();
              if (
                val &&
                !val.includes("प्रश्न क्र") &&
                !val.startsWith("अ.क्र") &&
                val !== "प्रश्न" &&
                !val.toLowerCase().startsWith("question")
              ) {
                const qLines = val.split(/[\r\n]+/).map(cleanQuestionText).filter(Boolean);
                rowQuestions.push(...qLines);
              }
            });
          }
          if (rowQuestions.length === 0 && colQIdx >= 0) {
            const val = String(rowArr[colQIdx] || "").trim();
            if (
              val &&
              !val.includes("प्रश्न क्र") &&
              !val.startsWith("अ.क्र") &&
              val !== "प्रश्न" &&
              !val.toLowerCase().startsWith("question")
            ) {
              const qLines = val.split(/[\r\n]+/).map(cleanQuestionText).filter(Boolean);
              rowQuestions.push(...qLines);
            }
          }

          if (rowAct) {
            let activityTitle = rowAct;
            let activityDesc = "";
            let activityNum = 1;

            if (rowAct.includes("\n\nकृती:")) {
              const parts = rowAct.split("\n\nकृती:");
              activityTitle = parts[0].trim();
              activityDesc = parts.slice(1).join("\n\nकृती:").trim();
            } else if (rowAct.includes("कृती:")) {
              const parts = rowAct.split("कृती:");
              activityTitle = parts[0].trim();
              activityDesc = parts.slice(1).join("कृती:").trim();
            } else {
              const lines = rowAct.split("\n");
              activityTitle = lines[0].trim();
              activityDesc = lines.slice(1).join("\n").trim();
            }

            const numMatch = activityTitle.match(/^([0-9\u0966-\u096F]+)[\.\)\-\s]\s*(.*)/);
            if (numMatch) {
              const rawNum = numMatch[1];
              const marathiMap: Record<string, number> = {
                "०": 0, "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9
              };
              activityNum = marathiMap[rawNum] !== undefined ? marathiMap[rawNum] : parseInt(rawNum, 10) || 1;
              activityTitle = numMatch[2].trim();
            }

            const classPrefix = selectedUploadClass !== "all" ? selectedUploadClass : stage;
            const docId = `act_${classPrefix}_${currCompCode || "comp"}_${activityNum}_${rIdx}`;

            lastAct = {
              id: docId,
              classId: selectedUploadClass !== "all" ? selectedUploadClass : undefined,
              stageId: stage,
              subjectOrArea: currSub || (currGoalCode ? GOAL_TO_AREA_MAP[currGoalCode] : "") || "शारीरिक विकास",
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
              questions: rowQuestions,
              teacherFeedbackSample: rowTeacher,
              parentFeedbackSample: rowParent,
              teacherFeedbackBank: rowTeacher ? [rowTeacher] : [],
              parentFeedbackBank: rowParent ? [rowParent] : [],
              sheetSource: sheetName,
              createdAt: new Date().toISOString(),
            };

            allActivities.push(lastAct);
          } else if (lastAct) {
            // Continuation row: collect questions or feedback under the current activity
            if (rowQuestions.length > 0) {
              const existingQ = new Set(lastAct.questions || []);
              rowQuestions.forEach((q) => {
                if (!existingQ.has(q)) {
                  lastAct!.questions.push(q);
                  existingQ.add(q);
                }
              });
            }
            if (!lastAct.teacherFeedbackBank) {
              lastAct.teacherFeedbackBank = lastAct.teacherFeedbackSample
                ? lastAct.teacherFeedbackSample.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)
                : [];
            }
            if (rowTeacher && !lastAct.teacherFeedbackBank.includes(rowTeacher)) {
              lastAct.teacherFeedbackBank.push(rowTeacher);
            }
            if (rowTeacher && !lastAct.teacherFeedbackSample?.includes(rowTeacher)) {
              lastAct.teacherFeedbackSample = lastAct.teacherFeedbackSample
                ? `${lastAct.teacherFeedbackSample} | ${rowTeacher}`
                : rowTeacher;
            }
            if (!lastAct.parentFeedbackBank) {
              lastAct.parentFeedbackBank = lastAct.parentFeedbackSample
                ? lastAct.parentFeedbackSample.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)
                : [];
            }
            if (rowParent && !lastAct.parentFeedbackBank.includes(rowParent)) {
              lastAct.parentFeedbackBank.push(rowParent);
            }
            if (rowParent && !lastAct.parentFeedbackSample?.includes(rowParent)) {
              lastAct.parentFeedbackSample = lastAct.parentFeedbackSample
                ? `${lastAct.parentFeedbackSample} | ${rowParent}`
                : rowParent;
            }
          }
        }

        // SECTION B: RUBRICS TABLE
        else if (currentSection === "rubrics") {
          // Check for Goal Header: "ध्येय: CG-1 ..."
          if (c0.startsWith("ध्येय:") || c0.startsWith("ध्येय :") || /^(CG-[0-9]+|ध्येय)/.test(c0)) {
            const gMatch = c0.match(/CG-[0-9]+/);
            if (gMatch) currRubGoal = gMatch[0];
            continue;
          }

          // Check for Competency Header: "क्षमता: C-1.1 ..."
          if (c0.startsWith("क्षमता:") || c0.startsWith("क्षमता :") || /^(C-[0-9]+(\.[0-9]+)?|क्षमता)/.test(c0)) {
            const cMatch = c0.match(/C-[0-9]+(\.[0-9]+)?/);
            if (cMatch) currRubComp = cMatch[0];
            continue;
          }

          // Skip header row
          if (
            (c0 === "उपक्रम" || c0 === "अ.क्र.") &&
            (c1 === "क्षमता" || c1 === "पैलू" || c1 === "जाणीवजागृती" || c1 === "उपक्रम" || c1 === "ध्येय")
          ) {
            continue;
          }

          let actVal = colRubActIdx >= 0 ? String(rowArr[colRubActIdx] || "").trim() : "";
          let dimVal = colRubDimIdx >= 0 ? String(rowArr[colRubDimIdx] || "").trim() : "";
          let begVal = colRubBegIdx >= 0 ? String(rowArr[colRubBegIdx] || "").trim() : "";
          let proVal = colRubProIdx >= 0 ? String(rowArr[colRubProIdx] || "").trim() : "";
          let advVal = colRubAdvIdx >= 0 ? String(rowArr[colRubAdvIdx] || "").trim() : "";

          // Fallback if column indices were not detected
          if (!dimVal && !begVal) {
            if (/^[०-९0-9]+$/.test(c0)) {
              // Row starts with Sr No (1, 2, 3...)
              actVal = c1;
              dimVal = c2;
              begVal = c3;
              proVal = c4;
              advVal = c5;
            } else {
              // Row starts directly with activity
              actVal = c0;
              dimVal = c1;
              begVal = c2;
              proVal = c3;
              advVal = c4;
            }
          }

          if (actVal && actVal !== "उपक्रम") {
            currRubAct = actVal;
          }

          if (
            dimVal &&
            !["क्षमता", "पैलू", "निकष", "परिमाण", "अ.क्र.", "अ.क्र"].includes(dimVal) &&
            (begVal || proVal || advVal)
          ) {
            const cleanDimKey = dimVal.includes("जाणीव")
              ? "awareness"
              : dimVal.includes("संवेदन")
              ? "sensitivity"
              : dimVal.includes("सर्जन")
              ? "creativity"
              : `dim_${rIdx}`;

            const cleanActSlug = cleanActivityTitle(currRubAct)
              .slice(0, 30)
              .replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");

            const rubId = `rub_${currRubComp || "comp"}_${cleanDimKey}_${cleanActSlug}_${rIdx}`;

            allRubrics.push({
              id: rubId,
              stageId: selectedUploadStage || selectedStage,
              goalCode: currRubGoal,
              competencyCode: currRubComp,
              activityTitle: cleanActivityTitle(currRubAct) || currRubAct,
              dimension: dimVal,
              beginner: begVal,
              proficient: proVal,
              advanced: advVal,
              sheetSource: sheetName,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // SECTION C: DEVELOPMENTAL AREA REMARKS TABLE (Sheet 3)
        else if (currentSection === "developmental_remarks") {
          if (c0.startsWith("विकास क्षेत्र:") || c0.startsWith("विकास क्षेत्र :")) {
            currDevArea = c0.replace(/^विकास\s*क्षेत्र\s*:\s*/, "").trim();
            continue;
          }

          if (
            c0 === "क्र." ||
            c0 === "अ.क्र." ||
            c1 === "विकास क्षेत्र" ||
            c2 === "कामगिरी स्तर" ||
            rowStr.includes("शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)")
          ) {
            continue;
          }

          const knownLevels = ["प्रारंभिक", "प्रवीण", "प्रगत", "निर्झर", "पर्वत", "आकाश"];
          let area = c1 || currDevArea;
          let level = c2;
          let remarkText = c3;

          // If table has no Sr. No column: c0 is area, c1 is level, c2 is remark
          if (knownLevels.some((kl) => c1.includes(kl))) {
            area = c0 || currDevArea;
            level = c1;
            remarkText = c2;
          }

          if (area && !area.startsWith("क्र.") && !area.startsWith("विकास क्षेत्र") && !knownLevels.some((kl) => area.includes(kl))) {
            currDevArea = area;
          }

          if (currDevArea && level && remarkText && remarkText !== level) {
            const cleanAreaId = (currDevArea || "area").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `rem_${cleanAreaId}_${cleanLvl}_${rIdx}`,
              stageId: selectedUploadStage || selectedStage,
              subjectOrArea: currDevArea,
              level,
              remarkText,
              type: "developmental_area",
              sheetSource: sheetName,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // SECTION D: FINAL COMPREHENSIVE REMARKS TABLE (Sheet 4)
        else if (currentSection === "final_comprehensive") {
          if (
            c0.includes("शीट 4") ||
            c0 === "क्र." ||
            c0 === "अ.क्र." ||
            c1 === "कामगिरी स्तर" ||
            c2 === "शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय"
          ) {
            continue;
          }

          const level = c1 || c0;
          const remarkText = c2 || c1;

          if (
            level &&
            remarkText &&
            remarkText !== level &&
            level !== "कामगिरी स्तर" &&
            level !== "क्र." &&
            level !== "अ.क्र."
          ) {
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `final_rem_${cleanLvl}_${rIdx}`,
              stageId: selectedUploadStage || selectedStage,
              subjectOrArea: "अंतिम सर्वंकष वार्षिक अभिप्राय",
              level,
              remarkText,
              type: "final_comprehensive",
              sheetSource: sheetName,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // SECTION E: NEXT CLASS RECOMMENDATIONS TABLE (Sheet 5)
        else if (currentSection === "next_class_recommendation") {
          if (
            c0.includes("शीट 5") ||
            c0 === "क्र." ||
            c0 === "अ.क्र." ||
            c1 === "कामगिरी स्तर" ||
            c2.includes("पुढील इयत्तेसाठी")
          ) {
            continue;
          }

          const level = c1 || c0;
          const remarkText = c2 || c1;

          if (
            level &&
            remarkText &&
            remarkText !== level &&
            level !== "कामगिरी स्तर" &&
            level !== "क्र." &&
            level !== "अ.क्र."
          ) {
            const cleanLvl = (level || "lvl").replace(/[^a-zA-Z0-9\u0900-\u097F]+/g, "_");
            allRemarks.push({
              id: `next_rec_${cleanLvl}_${rIdx}`,
              stageId: selectedUploadStage || selectedStage,
              subjectOrArea: "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस",
              level,
              remarkText,
              recommendationText: remarkText,
              type: "next_class_recommendation",
              sheetSource: sheetName,
              createdAt: new Date().toISOString(),
            });
          }
        }
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

    const devRemarksCount = allRemarks.filter((r) => r.type === "developmental_area").length;
    const finalRemarksCount = allRemarks.filter((r) => r.type === "final_comprehensive").length;
    const nextRecCount = allRemarks.filter((r) => r.type === "next_class_recommendation").length;

    toast.success(
      `एक्सेल फाईलमधून सर्व डेटा (${allActivities.length} उपक्रम, ${parsedG.length} ध्येये, ${parsedC.length} क्षमता, ${allRubrics.length} रुब्रिक्स, ${allRemarks.length} शेरे) यशस्वीरीत्या वाचला गेला!`
    );
  };

  // Generate and download standard 5-sheet sample Excel template
  const handleDownloadSampleExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: उपक्रम व ५ प्रश्न (Activities)
      const ws1Data = [
        ["महाराष्ट्र राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद (SCERT) - समग्र प्रगती पुस्तक (HPC) नमुना डेटा"],
        ["इयत्ता: १ ली व २ री (पायाभूत स्तर) - उपक्रम, ५ प्रश्न व अभिप्राय नमुना"],
        [
          "अ.क्र.",
          "विकास क्षेत्र / विषय",
          "ध्येय क्रमांक व वर्णन",
          "क्षमता क्रमांक व क्षमतेचे संपूर्ण वर्णन",
          "अध्ययन निष्पत्ती (Learning Outcomes)",
          "उपक्रम (थोडक्यात कृतीसह)",
          "प्रश्न १",
          "प्रश्न २",
          "प्रश्न ३",
          "प्रश्न ४",
          "प्रश्न ५",
          "शिक्षकांचा अभिप्राय (नमुना)",
          "पालकांचा अभिप्राय (नमुना)",
        ],
        [
          1,
          "शारीरिक विकास",
          "CG-1 मुलांमध्ये चांगल्या आरोग्याच्या आणि सुरक्षिततेच्या सवयी विकसित होतात",
          "C-1.1 शरीराच्या विविध भागांची नावे ओळखणे व स्वच्छता ठेवणे",
          "शरीराच्या विविध भागांची स्वच्छता राखतो/राखते\nहात धुण्याच्या पायऱ्या अचूक करतो/करते",
          "माझे शरीर व स्वच्छता\nकृती: विद्यार्थ्यांना शरीराच्या विविध अवयवांची माहिती देणे व स्वच्छतेचे महत्त्व पटवून देणे.",
          "जेवणापूर्वी हात स्वच्छ का धुवावेत?",
          "आपण दात कधी कधी घासले पाहिजेत?",
          "नखे कापली नाहीत तर काय होईल?",
          "डोळ्यांची काळजी कशी घ्यावी?",
          "स्नान रोज का करावे?",
          "विद्यार्थी वैयक्तिक स्वच्छतेचे नियम समजून घेतो व दररोज पालन करतो.",
          "घरी विद्यार्थी नियमित हात धुतो व दातांची स्वच्छता व्यवस्थित ठेवतो.",
        ],
        [
          2,
          "सामाजिक, भावनिक व नैतिक विकास",
          "CG-4 मुले स्वतःबद्दल आणि इतरांबद्दल सकारात्मक जाणीव विकसित करतात",
          "C-4.1 आपल्या भावना योग्य प्रकारे व्यक्त करणे व इतरांच्या भावनांचा आदर करणे",
          "आनंद, दुःख, राग या भावना ओळखतो व व्यक्त करतो\nमित्रांना सहकार्य करतो",
          "भावनांची ओळख व खेळ\nकृती: विविध भावनांचे चेहरे दाखवून विद्यार्थ्यांशी संवाद साधणे.",
          "तुम्हाला सर्वात जास्त आनंद कधी होतो?",
          "मित्राला मदत करताना तुम्हाला कसे वाटते?",
          "राग आल्यावर तुम्ही काय करता?",
          "दुसऱ्याला वाईट वाटेल असे बोलावे का?",
          "मित्राचे खेळणे मोडले तर काय कराल?",
          "इतरांच्या भावनांचा आदर करतो व मिळून-मिसळून खेळतो.",
          "घरात भावंडांसोबत खेळताना वस्तूंची देवाणघेवाण करतो.",
        ],
        [
          3,
          "भाषा आणि साक्षरता विकास",
          "CG-9 मुले प्रभावी संवादक बनतात आणि अर्थ समजून बोलतात",
          "C-9.1 आपल्या आवडीच्या विषयावर सलग व अर्थपूर्ण बोलणे",
          "चित्र पाहून गोष्ट सांगतो/सांगते\nस्वतःच्या शब्दांत अनुभव कथन करतो",
          "चित्र वर्णन व अनुभव कथन\nकृती: बाजाराचे चित्र दाखवून त्याविषयी विद्यार्थ्यांना बोलण्यास प्रवृत्त करणे.",
          "चित्रात तुम्हाला कोणकोणती दुकाने दिसत आहेत?",
          "बाजारात भाजीपाला कसा विकला जातो?",
          "तुम्ही बाजारात कोणासोबत जाता?",
          "तुमच्या आवडीचे फळ कोणते व का?",
          "बाजारात कोणकोणत्या गोष्टींची काळजी घ्यावी?",
          "आत्मविश्वासाने आणि स्पष्ट आवाजात आपले विचार मांडतो.",
          "घरी दिवसभरात घडलेल्या गोष्टी आवडीने सांगतो.",
        ],
        [
          4,
          "बोधात्मक विकास",
          "CG-7 मुले संख्या, आकार आणि अवकाशाची संकल्पना समजून घेतात",
          "C-7.1 १ ते २० अंकांचे दृढीकरण आणि आकार ओळख",
          "वस्तू मोजून अचूक संख्या सांगतो\nभौमितिक आकार ओळखतो",
          "संख्या मोजणी व आकार खेळ\nकृती: मणी, काड्या व बिया वापरून संख्या मोजणे व आकार तयार करणे.",
          "टेबलावर किती मणी आहेत ते मोजून सांगा?",
          "गोलाकार आणि त्रिकोणी वस्तूंमध्ये काय फरक आहे?",
          "५ मध्ये २ मिळवल्यास किती होतात?",
          "तुमच्या वर्गात चौकोनी आकाराच्या कोणत्या वस्तू आहेत?",
          "१० नंतर येणारी संख्या कोणती?",
          "संख्या संकल्पना स्पष्ट आहेत व आकारांची ओळख अचूक आहे.",
          "घरातील वस्तू मोजून दाखवतो व गणितीय खेळ आवडीने खेळतो.",
        ],
        [
          5,
          "सौंदर्यदृष्टी आणि सांस्कृतिक विकास",
          "CG-12 मुले कला, संगीत आणि हालचालींद्वारे स्वतःची अभिव्यक्ती करतात",
          "C-12.1 कागदकाम, रंगकाम आणि हस्तकला करणे",
          "रंगांची योग्य निवड करतो\nकागदाची घडी घालून विविध वस्तू बनवतो",
          "ओरिगामी व रंगकाम\nकृती: कागदाच्या घड्या घालून होडी, विमान व टोपी तयार करणे आणि रंग भरणे.",
          "कागदाची होडी पाण्यात का तरंगते?",
          "होडी बनवताना कोणत्या घड्या घातल्या?",
          "तुम्हाला आवडणारा रंग कोणता?",
          "चित्रात रंग भरताना रेषेबाहेर का जाऊ नये?",
          "कागदापासून आणखी काय बनवता येईल?",
          "सर्जनशीलता उत्तम आहे, रंगकाम व कागदकामात विशेष रुची दाखवतो.",
          "घरी कागदाच्या विविध कलाकृती तयार करून दाखवतो.",
        ],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      XLSX.utils.book_append_sheet(wb, ws1, "उपक्रम व ५ प्रश्न");

      // Sheet 2: मूल्यांकन रुब्रिक्स (Rubrics)
      const ws2Data = [
        ["समग्र प्रगती पुस्तक (HPC) - ३ स्तर मूल्यांकन निकष (Rubrics)"],
        [
          "अ.क्र.",
          "ध्येय",
          "क्षमता",
          "उपक्रम",
          "परिमाण / पैलू",
          "प्रारंभिक (निर्झर) - स्तर १",
          "प्रवीण (पर्वत) - स्तर २",
          "प्रगत (आकाश) - स्तर ३",
        ],
        [
          1,
          "CG-1",
          "C-1.1",
          "माझे शरीर व स्वच्छता",
          "जाणीवजागृती (Awareness)",
          "स्वच्छतेची गरज शिक्षकांच्या मदतीने समजून घेतो.",
          "वैयक्तिक स्वच्छतेची जाणीव ठेवून स्वतःहून कृती करतो.",
          "इतरांनाही स्वच्छतेचे महत्त्व पटवून देतो व आदर्श वागतो.",
        ],
        [
          2,
          "CG-1",
          "C-1.1",
          "माझे शरीर व स्वच्छता",
          "संवेदनशीलता (Sensitivity)",
          "अस्वच्छता दिसल्यास शिक्षकांना सांगतो.",
          "स्वतःचा परिसर स्वच्छ ठेवण्यास पुढाकार घेतो.",
          "परिसर व वर्गाच्या स्वच्छतेसाठी मित्रांना प्रेरित करतो.",
        ],
        [
          3,
          "CG-1",
          "C-1.1",
          "माझे शरीर व स्वच्छता",
          "सर्जनशीलता (Creativity)",
          "स्वच्छतेच्या चित्रात रंग भरतो.",
          "स्वच्छतेवर साधे घोषवाक्य किंवा नियम तयार करतो.",
          "नाट्यीकरणातून किंवा चित्रातून स्वच्छतेचा संदेश प्रभावीपणे देतो.",
        ],
        [
          4,
          "CG-9",
          "C-9.1",
          "चित्र वर्णन व अनुभव कथन",
          "जाणीवजागृती (Awareness)",
          "चित्रातील मुख्य वस्तू विचारल्यावर दाखवतो.",
          "चित्रातील प्रसंग ओळखून स्वतःहून २-३ वाक्ये बोलतो.",
          "चित्रातील बारकावे ओळखून सलग व अर्थपूर्ण कथा सांगतो.",
        ],
        [
          5,
          "CG-9",
          "C-9.1",
          "चित्र वर्णन व अनुभव कथन",
          "संवेदनशीलता (Sensitivity)",
          "इतरांचे बोलणे शांतपणे ऐकतो.",
          "मित्रांच्या अनुभवांना दाद देतो व संवाद साधतो.",
          "इतरांच्या भावना समजून घेऊन सहानुभूतीपूर्वक बोलतो.",
        ],
        [
          6,
          "CG-9",
          "C-9.1",
          "चित्र वर्णन व अनुभव कथन",
          "सर्जनशीलता (Creativity)",
          "साध्या शब्दांत अनुभव सांगतो.",
          "नवनवीन शब्द व म्हणी वापरून संवाद रंजक करतो.",
          "कथेला स्वतःचा कल्पक शेवट देऊन नाट्यमय सादरीकरण करतो.",
        ],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      XLSX.utils.book_append_sheet(wb, ws2, "मूल्यांकन रुब्रिक्स");

      // Sheet 3: विकासक्षेत्र शेरे (Remarks)
      const ws3Data = [
        ["शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश) - विकास क्षेत्रनिहाय शेरे"],
        ["अ.क्र.", "विकास क्षेत्र", "कामगिरी स्तर", "शिक्षकांचा अभिप्राय (वर्षाच्या शेवटी सारांश)"],
        [1, "शारीरिक विकास", "प्रारंभिक (निर्झर)", "शारीरिक हालचालींमध्ये सहभागासाठी शिक्षकांच्या प्रोत्साहनाची गरज असते."],
        [2, "शारीरिक विकास", "प्रवीण (पर्वत)", "कवायत, खेळ व शारीरिक कौशल्यांमध्ये उत्साहाने व नियमित सहभागी होतो."],
        [3, "शारीरिक विकास", "प्रगत (आकाश)", "उत्कृष्ट शारीरिक समन्वय, चपळाई व क्रीडा कौशल्यांमध्ये नेतृत्व करतो."],
        [4, "सामाजिक, भावनिक व नैतिक विकास", "प्रारंभिक (निर्झर)", "इतरांशी मिसळताना थोडा संकोच करतो, मार्गदर्शनाची गरज आहे."],
        [5, "सामाजिक, भावनिक व नैतिक विकास", "प्रवीण (पर्वत)", "मित्रांशी सहकार्याने वागतो आणि भावना योग्य प्रकारे व्यक्त करतो."],
        [6, "सामाजिक, भावनिक व नैतिक विकास", "प्रगत (आकाश)", "उत्कृष्ट सामाजिक कौशल्ये, सर्वांना समजून घेऊन मदतीसाठी नेहमी तत्पर."],
        [7, "बोधात्मक विकास", "प्रारंभिक (निर्झर)", "संख्या व आकार ओळखण्यासाठी दैनंदिन सरावाची आवश्यकता आहे."],
        [8, "बोधात्मक विकास", "प्रवीण (पर्वत)", "संख्याज्ञान, तुलना व तर्कशुद्ध विचार उत्तम प्रकारे करतो."],
        [9, "बोधात्मक विकास", "प्रगत (आकाश)", "गंभीर विचार व समस्या निराकरणात प्रगत असून स्वतः नवीन प्रश्न सोडवतो."],
        [10, "भाषा आणि साक्षरता विकास", "प्रारंभिक (निर्झर)", "वाचन व बोलताना अधिक सरावाची आणि मार्गदर्शनाची गरज आहे."],
        [11, "भाषा आणि साक्षरता विकास", "प्रवीण (पर्वत)", "स्पष्ट उच्चार, समृद्ध शब्दसंग्रह आणि आत्मविश्वासाने वाचन-लेखन करतो."],
        [12, "भाषा आणि साक्षरता विकास", "प्रगत (आकाश)", "अप्रतिम भाषा प्रभुत्व, स्वतंत्र लेखन व प्रभावी वक्तृत्व कौशल्य."],
        [13, "सौंदर्यदृष्टी आणि सांस्कृतिक विकास", "प्रारंभिक (निर्झर)", "कला व संगीतामध्ये हळूहळू रुची घेत आहे."],
        [14, "सौंदर्यदृष्टी आणि सांस्कृतिक विकास", "प्रवीण (पर्वत)", "चित्रांकन, हस्तकला आणि गायनात आवडीने व उत्तम सहभाग घेतो."],
        [15, "सौंदर्यदृष्टी आणि सांस्कृतिक विकास", "प्रगत (आकाश)", "अतिशय कल्पक व सृजनशील असून नवनवीन कलाकृती निर्माण करतो."],
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
      XLSX.utils.book_append_sheet(wb, ws3, "विकासक्षेत्र शेरे");

      // Sheet 4: अंतिम सर्वंकष वार्षिक अभिप्राय
      const ws4Data = [
        ["शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय (Sheet 4)"],
        ["अ.क्र.", "कामगिरी स्तर", "शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय"],
        [
          1,
          "प्रारंभिक (निर्झर)",
          "विद्यार्थ्यामध्ये शिकण्याची चांगली क्षमता असून नियमित उपस्थिती आणि सरावाने लक्षणीय प्रगती होऊ शकते. पालकांनी घरी अभ्यासासाठी अधिक वेळ द्यावा.",
        ],
        [
          2,
          "प्रवीण (पर्वत)",
          "विद्यार्थ्याने संपूर्ण शैक्षणिक वर्षात सर्व क्षेत्रांत समाधानकारक व चांगली प्रगती दाखवली आहे. अभ्यासू वृत्ती व सहकार्य प्रशंसनीय आहे.",
        ],
        [
          3,
          "प्रगत (आकाश)",
          "विद्यार्थ्याने वर्षभरात सर्व विकास क्षेत्रांत उत्कृष्ट कामगिरी केली आहे. नेतृत्वगुण, कल्पकता आणि शिस्त वाखाणण्याजोगी आहे. अभिनंदन!",
        ],
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
      XLSX.utils.book_append_sheet(wb, ws4, "अंतिम सर्वंकष शेरे");

      // Sheet 5: पुढील इयत्तेसाठी मार्गदर्शन व शिफारस
      const ws5Data = [
        ["पुढील इयत्तेसाठी विद्यार्थ्यास मार्गदर्शन व शिफारस (Sheet 5)"],
        ["अ.क्र.", "कामगिरी स्तर", "पुढील इयत्तेसाठी मार्गदर्शन व शिफारस"],
        [
          1,
          "प्रारंभिक (निर्झर)",
          "पुढील इयत्तेत भाषा वाचन आणि मूलभूत गणितीय क्रियांचा नियमित सराव ठेवावा. पालकांनी दररोज वाचनाची सवय लावावी.",
        ],
        [
          2,
          "प्रवीण (पर्वत)",
          "पुढील इयत्तेत संकल्पनांच्या सखोल आकलनावर भर द्यावा आणि अवांतर वाचन वाढवावे.",
        ],
        [
          3,
          "प्रगत (आकाश)",
          "पुढील इयत्तेत उच्च स्तरीय स्पर्धा परीक्षा, प्रकल्प आणि वैज्ञानिक प्रयोगांमध्ये सहभागासाठी मार्गदर्शन करावे.",
        ],
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
      XLSX.utils.book_append_sheet(wb, ws5, "पुढील शिफारस");

      XLSX.writeFile(wb, "HPC_SCERT_Sample_Template.xlsx");
      toast.success("नमुना एक्सेल फाईल डाऊनलोड झाली!");
    } catch (err: any) {
      toast.error("नमुना फाईल डाऊनलोड करताना त्रुटी: " + err.message);
    }
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
          {/* Main Tabs - EXACTLY 2 OPTIONS ONLY */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === "overview"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <LayoutDashboard className="size-4" />
              <span>१. मुख्य डॅशबोर्ड व सर्व माहिती (Overall Dashboard)</span>
            </button>
            <button
              onClick={() => setActiveTab("excel_sync")}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === "excel_sync"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <FileSpreadsheet className="size-4" />
              <span>२. एक्सेल / CSV फाईल अपलोड व सिंक (File Upload & Sync)</span>
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
        {/* TAB 0: MASTER DASHBOARD & OVERVIEW (सोपा तक्ता व सर्व माहिती) */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Quick Stats Grid (6 Interactive Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* 1. Activities */}
              <button
                type="button"
                onClick={() => setDashboardSection("activities")}
                className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-sm ${
                  dashboardSection === "activities"
                    ? "border-indigo-600 ring-2 ring-indigo-500/15 bg-indigo-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-2 w-full">
                  <span className="text-[11px] font-bold">एकूण उपक्रम</span>
                  <ListOrdered className="size-4 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{activitiesList.length}</div>
                  <span className="text-[10px] text-indigo-600 font-bold">Activities Bank</span>
                </div>
              </button>

              {/* 2. Questions */}
              <button
                type="button"
                onClick={() => setDashboardSection("activities")}
                className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-sm ${
                  dashboardSection === "activities"
                    ? "border-emerald-600 ring-2 ring-emerald-500/15 bg-emerald-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-2 w-full">
                  <span className="text-[11px] font-bold">५ प्रश्न बँक</span>
                  <HelpCircle className="size-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{totalQuestionsCount}</div>
                  <span className="text-[10px] text-emerald-600 font-bold">Evaluation Questions</span>
                </div>
              </button>

              {/* 3. Competencies */}
              <button
                type="button"
                onClick={() => {
                  setDashboardSection("goals_competencies");
                  setGoalsOrCompSubtab("competencies");
                }}
                className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between hover:border-purple-400 hover:shadow-sm ${
                  dashboardSection === "goals_competencies" && goalsOrCompSubtab === "competencies"
                    ? "border-purple-600 ring-2 ring-purple-500/15 bg-purple-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-2 w-full">
                  <span className="text-[11px] font-bold">अध्ययन क्षमता</span>
                  <Award className="size-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{allCompetencies.length}</div>
                  <span className="text-[10px] text-purple-600 font-bold">Competencies (C)</span>
                </div>
              </button>

              {/* 4. Curricular Goals */}
              <button
                type="button"
                onClick={() => {
                  setDashboardSection("goals_competencies");
                  setGoalsOrCompSubtab("goals");
                }}
                className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-sm ${
                  dashboardSection === "goals_competencies" && goalsOrCompSubtab === "goals"
                    ? "border-amber-600 ring-2 ring-amber-500/15 bg-amber-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-2 w-full">
                  <span className="text-[11px] font-bold">अभ्यासक्रम ध्येये</span>
                  <BookOpen className="size-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{allGoals.length}</div>
                  <span className="text-[10px] text-amber-600 font-bold">Curricular Goals (CG)</span>
                </div>
              </button>

              {/* 5. Rubrics */}
              <button
                type="button"
                onClick={() => setDashboardSection("rubrics")}
                className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between hover:border-sky-400 hover:shadow-sm ${
                  dashboardSection === "rubrics"
                    ? "border-sky-600 ring-2 ring-sky-500/15 bg-sky-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-2 w-full">
                  <span className="text-[11px] font-bold">निकषसंच (Rubrics)</span>
                  <Compass className="size-4 text-sky-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{rubricsList.length}</div>
                  <span className="text-[10px] text-sky-600 font-bold">3 Levels Scale</span>
                </div>
              </button>

              {/* 6. Remarks */}
              <button
                type="button"
                onClick={() => setDashboardSection("remarks")}
                className={`p-4 rounded-2xl bg-white border text-left transition-all cursor-pointer shadow-xs flex flex-col justify-between hover:border-rose-400 hover:shadow-sm ${
                  dashboardSection === "remarks"
                    ? "border-rose-600 ring-2 ring-rose-500/15 bg-rose-50/20"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-2 w-full">
                  <span className="text-[11px] font-bold">वार्षिक शेरे</span>
                  <MessageSquare className="size-4 text-rose-600" />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{remarksList.length}</div>
                  <span className="text-[10px] text-rose-600 font-bold">Feedback Remarks</span>
                </div>
              </button>
            </div>

            {/* 3 Stages Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Foundational */}
              <div className="p-5 rounded-3xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    इयत्ता १ ली व २ री
                  </span>
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                </div>
                <h4 className="text-base font-black text-slate-900">पायाभूत स्तर (Foundational Stage)</h4>
                <p className="text-xs text-slate-500 mt-0.5">शारीरिक, सामाजिक-भावनिक, भाषा, गणित व सौंदर्यदृष्टी</p>
                <div className="mt-4 grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-emerald-100 text-center">
                  <div>
                    <div className="text-lg font-black text-emerald-700">{stageBreakdown.foundational.activities}</div>
                    <div className="text-[10px] font-bold text-slate-500">उपक्रम</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-emerald-700">{stageBreakdown.foundational.questions}</div>
                    <div className="text-[10px] font-bold text-slate-500">५ प्रश्न</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-emerald-700">{stageBreakdown.foundational.subjects.size}</div>
                    <div className="text-[10px] font-bold text-slate-500">विषय</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExplorerStageFilter("foundational");
                    setExplorerClassFilter("all");
                  }}
                  className="mt-3.5 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  हा स्तर एक्सप्लोर करा ({stageBreakdown.foundational.activities} उपक्रम)
                </button>
              </div>

              {/* Preparatory */}
              <div className="p-5 rounded-3xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    इयत्ता ३ री ते ५ वी
                  </span>
                  <span className="size-2.5 rounded-full bg-indigo-500" />
                </div>
                <h4 className="text-base font-black text-slate-900">प्राथमिक पूर्वतयारी (Preparatory Stage)</h4>
                <p className="text-xs text-slate-500 mt-0.5">भाषा १, भाषा २, गणित, परिसर अभ्यास व कला शिक्षण</p>
                <div className="mt-4 grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-indigo-100 text-center">
                  <div>
                    <div className="text-lg font-black text-indigo-700">{stageBreakdown.preparatory.activities}</div>
                    <div className="text-[10px] font-bold text-slate-500">उपक्रम</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-indigo-700">{stageBreakdown.preparatory.questions}</div>
                    <div className="text-[10px] font-bold text-slate-500">५ प्रश्न</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-indigo-700">{stageBreakdown.preparatory.subjects.size}</div>
                    <div className="text-[10px] font-bold text-slate-500">विषय</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExplorerStageFilter("preparatory");
                    setExplorerClassFilter("all");
                  }}
                  className="mt-3.5 w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  हा स्तर एक्सप्लोर करा ({stageBreakdown.preparatory.activities} उपक्रम)
                </button>
              </div>

              {/* Middle */}
              <div className="p-5 rounded-3xl border-2 border-purple-200 bg-gradient-to-br from-purple-50/60 to-white shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    इयत्ता ६ वी ते ८ वी
                  </span>
                  <span className="size-2.5 rounded-full bg-purple-500" />
                </div>
                <h4 className="text-base font-black text-slate-900">मध्य स्तर (Middle Stage)</h4>
                <p className="text-xs text-slate-500 mt-0.5">भाषा १, भाषा २, भाषा ३, गणित, विज्ञान व सामाजिक शास्त्रे</p>
                <div className="mt-4 grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-purple-100 text-center">
                  <div>
                    <div className="text-lg font-black text-purple-700">{stageBreakdown.middle.activities}</div>
                    <div className="text-[10px] font-bold text-slate-500">उपक्रम</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-purple-700">{stageBreakdown.middle.questions}</div>
                    <div className="text-[10px] font-bold text-slate-500">५ प्रश्न</div>
                  </div>
                  <div>
                    <div className="text-lg font-black text-purple-700">{stageBreakdown.middle.subjects.size}</div>
                    <div className="text-[10px] font-bold text-slate-500">विषय</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExplorerStageFilter("middle");
                    setExplorerClassFilter("all");
                  }}
                  className="mt-3.5 w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  हा स्तर एक्सप्लोर करा ({stageBreakdown.middle.activities} उपक्रम)
                </button>
              </div>
            </div>

            {/* Class & Subject Matrix Table (Collapsible) */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TableIcon className="size-4 text-indigo-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    इयत्ता व विषयनिहाय अपलोड सारांश मॅट्रिक्स (Class-Wise Upload Status Matrix)
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMatrix(!showMatrix)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {showMatrix ? "मॅट्रिक्स लपवा ▲" : "मॅट्रिक्स दाखवा ▼"}
                </button>
              </div>

              {showMatrix && (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-28">इयत्ता</th>
                        <th className="p-3 w-32">स्तर</th>
                        <th className="p-3">उपलब्ध विषय व उपक्रम संख्या</th>
                        <th className="p-3 w-24 text-center">एकूण</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { id: "1st", label: "इयत्ता १ ली", stage: "foundational", stageLabel: "पायाभूत (१ली-२री)" },
                        { id: "2nd", label: "इयत्ता २ री", stage: "foundational", stageLabel: "पायाभूत (१ली-२री)" },
                        { id: "3rd", label: "इयत्ता ३ री", stage: "preparatory", stageLabel: "पूर्वतयारी (३री-५वी)" },
                        { id: "4th", label: "इयत्ता ४ थी", stage: "preparatory", stageLabel: "पूर्वतयारी (३री-५वी)" },
                        { id: "5th", label: "इयत्ता ५ वी", stage: "preparatory", stageLabel: "पूर्वतयारी (३री-५वी)" },
                        { id: "6th", label: "इयत्ता ६ वी", stage: "middle", stageLabel: "मध्य स्तर (६वी-८वी)" },
                        { id: "7th", label: "इयत्ता ७ वी", stage: "middle", stageLabel: "मध्य स्तर (६वी-८वी)" },
                        { id: "8th", label: "इयत्ता ८ वी", stage: "middle", stageLabel: "मध्य स्तर (६वी-८वी)" },
                      ].map((cls) => {
                        const subObj = classSubjectMatrix[cls.id] || {};
                        const subEntries = Object.entries(subObj);
                        const totalInClass = subEntries.reduce((s, [, c]) => s + c, 0);

                        return (
                          <tr key={cls.id} className="hover:bg-slate-50">
                            <td className="p-3 font-black text-slate-800">{cls.label}</td>
                            <td className="p-3">
                              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {cls.stageLabel}
                              </span>
                            </td>
                            <td className="p-3">
                              {subEntries.length > 0 ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {subEntries.map(([sub, count]) => (
                                    <span
                                      key={sub}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-bold"
                                    >
                                      <span>{sub}:</span>
                                      <b className="text-indigo-700">{count}</b>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">कोणतेही उपक्रम अपलोड नाहीत</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                  totalInClass > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {totalInClass}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Master Data Sections Navigator (4 Sub-Sections inside Overall Dashboard) */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Layers className="size-4 text-indigo-600" />
                    <span>डॅशबोर्ड डेटा विभाग (HPC Master Data Sections)</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    खालील ४ विभागांपैकी हवा असलेला विभाग निवडून सर्व माहिती एका क्लिकवर सहज पहा, शोधा व व्यवस्थापित करा
                  </p>
                </div>
              </div>

              {/* 4 Section Navigator Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* 1. Activities & Questions */}
                <button
                  type="button"
                  onClick={() => setDashboardSection("activities")}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    dashboardSection === "activities"
                      ? "border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/10"
                      : "border-slate-200 hover:border-indigo-300 bg-white"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      dashboardSection === "activities"
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 text-indigo-600"
                    }`}
                  >
                    <ListOrdered className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">१. उपक्रम व ५ प्रश्न बँक</div>
                    <div className="text-[11px] font-bold text-indigo-700 truncate">
                      {activitiesList.length} उपक्रम • {totalQuestionsCount} प्रश्न
                    </div>
                  </div>
                </button>

                {/* 2. Curricular Goals & Competencies */}
                <button
                  type="button"
                  onClick={() => setDashboardSection("goals_competencies")}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    dashboardSection === "goals_competencies"
                      ? "border-purple-600 bg-purple-50/80 shadow-xs ring-2 ring-purple-500/10"
                      : "border-slate-200 hover:border-purple-300 bg-white"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      dashboardSection === "goals_competencies"
                        ? "bg-purple-600 text-white"
                        : "bg-purple-50 text-purple-600"
                    }`}
                  >
                    <Award className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">२. ध्येये व क्षमता (CG & C)</div>
                    <div className="text-[11px] font-bold text-purple-700 truncate">
                      {allGoals.length} ध्येये • {allCompetencies.length} क्षमता
                    </div>
                  </div>
                </button>

                {/* 3. Performance Rubrics */}
                <button
                  type="button"
                  onClick={() => setDashboardSection("rubrics")}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    dashboardSection === "rubrics"
                      ? "border-sky-600 bg-sky-50/80 shadow-xs ring-2 ring-sky-500/10"
                      : "border-slate-200 hover:border-sky-300 bg-white"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      dashboardSection === "rubrics"
                        ? "bg-sky-600 text-white"
                        : "bg-sky-50 text-sky-600"
                    }`}
                  >
                    <Compass className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">३. निकषसंच (Rubrics)</div>
                    <div className="text-[11px] font-bold text-sky-700 truncate">
                      {rubricsList.length} निकष (३ स्तर निकष)
                    </div>
                  </div>
                </button>

                {/* 4. Year-End Remarks */}
                <button
                  type="button"
                  onClick={() => setDashboardSection("remarks")}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                    dashboardSection === "remarks"
                      ? "border-rose-600 bg-rose-50/80 shadow-xs ring-2 ring-rose-500/10"
                      : "border-slate-200 hover:border-rose-300 bg-white"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${
                      dashboardSection === "remarks"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    <MessageSquare className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 truncate">४. वार्षिक शेरे बँक</div>
                    <div className="text-[11px] font-bold text-rose-700 truncate">
                      {remarksList.length} सर्वंकष शेरे
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SUBSECTION 1: ACTIVITIES & 5 QUESTIONS BANK */}
            {/* ========================================================================= */}
            {dashboardSection === "activities" && (
              <div className="space-y-6">
                {/* 3 Dedicated Spaces for the 3 Stages (separated as per classes) */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
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
                            setExplorerStageFilter(stg.id);
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
                                  <CheckCircle2 className="size-3 text-indigo-600" /> सक्रिय कक्ष
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
                                setExplorerStageFilter(stg.id);
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
                                title={`फक्त ${stg.titleMarathi} मधील सर्व उपक्रम डेटाबेसमधून हटवा`}
                              >
                                <Trash2 className="size-3" />
                                <span>संपूर्ण स्तर साफ करा</span>
                              </button>
                            )}
                          </div>

                          {/* Class-wise granular clear options inside this stage card */}
                          <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500">इयत्तानिहाय हटवा:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {STAGE_CLASSES_MAP[stg.id]
                                .filter((c) => c.id !== "all")
                                .map((cls) => {
                                  const cCount = countByClass[cls.id] || 0;
                                  return (
                                    <button
                                      key={cls.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTargetClassToClear(cls.id);
                                        setShowClearClassModal(true);
                                      }}
                                      className="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 border border-slate-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title={`फक्त ${cls.label} चा डेटा हटवा`}
                                    >
                                      <Trash2 className="size-2.5 text-rose-500" />
                                      <span>{cls.label}</span>
                                      <span className="text-[9px] px-1 rounded-full bg-slate-100 text-slate-600 font-mono">
                                        {cCount}
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Master Content Explorer Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>सर्व अपलोड सामग्रीचा सोपा तक्ता (Master Content Explorer)</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                      {masterExplorerActivities.length} नोंदी
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    कोणतीही इयत्ता किंवा विषय निवडून अपलोड केलेले सर्व उपक्रम, ५ प्रश्न व क्षमता कोड सहज तपासा व शोधा
                  </p>
                </div>

                {/* View Mode Toggle & Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExplorerViewMode("table")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        explorerViewMode === "table"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <TableIcon className="size-3.5" />
                      <span>सोपा तक्ता (Table)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplorerViewMode("cards")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        explorerViewMode === "cards"
                          ? "bg-white text-slate-900 shadow-xs font-black"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutGrid className="size-3.5" />
                      <span>सविस्तर कार्डे (Cards)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (explorerClassFilter !== "all") {
                        setTargetClassToClear(explorerClassFilter);
                      }
                      setShowClearClassModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title={
                      explorerClassFilter !== "all"
                        ? `फक्त ${CLASS_LABELS_MAP[explorerClassFilter] || explorerClassFilter} चा डेटा हटवा`
                        : "विशिष्ट इयत्तेचा डेटा निवडून हटवा"
                    }
                  >
                    <Trash2 className="size-3.5 text-rose-600" />
                    <span>
                      {explorerClassFilter !== "all"
                        ? `फक्त ${CLASS_LABELS_MAP[explorerClassFilter] || explorerClassFilter} चा डेटा हटवा (${countByClass[explorerClassFilter] || 0})`
                        : "विशिष्ट इयत्तेचा डेटा हटवा"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("excel_sync")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="size-3.5" />
                    <span>नवीन एक्सेल फाईल अपलोड करा</span>
                  </button>
                </div>
              </div>

              {/* Multi-Filters Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Universal Search */}
                <div className="relative">
                  <Search className="size-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="उपक्रम, ५ प्रश्न, क्षमता किंवा LO शोधा..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Stage Filter */}
                <div>
                  <select
                    value={explorerStageFilter}
                    onChange={(e) => setExplorerStageFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="all">सर्व स्तर (All 3 Stages)</option>
                    <option value="foundational">पायाभूत स्तर (इ. १ली व २री)</option>
                    <option value="preparatory">प्राथमिक पूर्वतयारी (इ. ३री ते ५वी)</option>
                    <option value="middle">मध्य स्तर (इ. ६वी ते ८वी)</option>
                  </select>
                </div>

                {/* Class Filter */}
                <div>
                  <select
                    value={explorerClassFilter}
                    onChange={(e) => setExplorerClassFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="all">सर्व इयत्ता (All Classes)</option>
                    <option value="1st">इयत्ता १ ली</option>
                    <option value="2nd">इयत्ता २ री</option>
                    <option value="3rd">इयत्ता ३ री</option>
                    <option value="4th">इयत्ता ४ थी</option>
                    <option value="5th">इयत्ता ५ वी</option>
                    <option value="6th">इयत्ता ६ वी</option>
                    <option value="7th">इयत्ता ७ वी</option>
                    <option value="8th">इयत्ता ८ वी</option>
                  </select>
                </div>

                {/* Subject Filter */}
                <div>
                  <select
                    value={explorerSubjectFilter}
                    onChange={(e) => setExplorerSubjectFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500 shadow-2xs"
                  >
                    <option value="all">सर्व विषय (All Subjects)</option>
                    {uniqueSubjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table View / Cards View */}
              {activitiesLoading ? (
                <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-2">
                  <Loader2 className="size-7 animate-spin text-indigo-600" />
                  <span className="text-xs font-bold">माहिती लोड होत आहे...</span>
                </div>
              ) : masterExplorerActivities.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 space-y-3">
                  <AlertCircle className="size-8 text-amber-500 mx-auto" />
                  <p className="text-sm font-black text-slate-800">निवडलेल्या फिल्टरनुसार कोणतीही सामग्री सापडली नाही.</p>
                  <p className="text-xs text-slate-500">कृपया फिल्टर बदला किंवा नवीन एक्सेल फाईल अपलोड करा.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setExplorerStageFilter("all");
                      setExplorerClassFilter("all");
                      setExplorerSubjectFilter("all");
                    }}
                    className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
                  >
                    सर्व फिल्टर साफ करा (Clear Filters)
                  </button>
                </div>
              ) : explorerViewMode === "table" ? (
                /* ============ COMPACT TABLE VIEW ============ */
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white font-black sticky top-0 z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-24">इयत्ता</th>
                          <th className="p-3 w-28">स्तर</th>
                          <th className="p-3 w-36">विषय / क्षेत्र</th>
                          <th className="p-3 w-28">क्षमता कोड</th>
                          <th className="p-3 min-w-[260px]">उपक्रम शीर्षक</th>
                          <th className="p-3 w-36 text-center">५ प्रश्न बँक</th>
                          <th className="p-3 min-w-[200px]">अध्ययन निष्पत्ती (LO)</th>
                          <th className="p-3 w-28 text-center">क्रिया</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {masterExplorerActivities.map((act, idx) => {
                          const qCount = act.questions?.filter((q) => q && q.trim())?.length || 0;
                          const stageBadge =
                            act.stageId === "foundational"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : act.stageId === "preparatory"
                              ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                              : "bg-purple-100 text-purple-800 border-purple-200";

                          return (
                            <tr
                              key={act.id}
                              className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                              onClick={() => setViewingActivityModal(act)}
                            >
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200 text-[11px]">
                                  {act.classId ? `इ. ${act.classId}` : "सर्व"}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${stageBadge}`}>
                                  {act.stageId === "foundational"
                                    ? "पायाभूत"
                                    : act.stageId === "preparatory"
                                    ? "पूर्वतयारी"
                                    : "मध्य स्तर"}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-800">{act.subjectOrArea}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono font-bold text-[11px]">
                                  {act.competencyCode}
                                </span>
                              </td>
                              <td className="p-3 font-black text-slate-900 leading-snug">
                                {act.activityTitle}
                              </td>
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setViewingActivityModal(act)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 mx-auto ${
                                    qCount > 0
                                      ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                  title="सर्व ५ प्रश्न पहा"
                                >
                                  <HelpCircle className="size-3 text-emerald-600" />
                                  <span>{qCount} प्रश्न पहा 👁️</span>
                                </button>
                              </td>
                              <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">
                                {act.learningOutcomes?.[0] || act.learningOutcomeText || "-"}
                              </td>
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditActivity(act)}
                                    className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                                    title="संपादित करा"
                                  >
                                    <Edit2 className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteActivity(act.id, act.activityTitle)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                    title="हटवा"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* ============ CARDS VIEW ============ */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {masterExplorerActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-mono">
                              {act.competencyCode}
                            </span>
                            <span className="text-xs font-bold text-slate-600">
                              विषय: <b>{act.subjectOrArea}</b>
                            </span>
                            {act.classId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                इ. {act.classId}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-900 pt-1">{act.activityTitle}</h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingActivityModal(act)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="तपशील पहा"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditActivity(act)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                            title="संपादित करा"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act.id, act.activityTitle)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                            title="हटवा"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Questions Preview in Card */}
                      {act.questions && act.questions.length > 0 && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                          <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <HelpCircle className="size-3 text-emerald-600" /> ५ प्रश्न नमुना:
                          </span>
                          <ul className="text-xs text-slate-800 space-y-0.5 pl-2">
                            {act.questions.slice(0, 3).map((q, qi) => (
                              <li key={qi} className="truncate">
                                <b>{qi + 1}.</b> {q}
                              </li>
                            ))}
                          </ul>
                          {act.questions.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setViewingActivityModal(act)}
                              className="text-[10px] text-indigo-600 font-bold hover:underline"
                            >
                              + आणखी {act.questions.length - 3} प्रश्न पहा...
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
              </div>
            )}
            {/* ========================================================================= */}
            {/* SUBSECTION 2: CURRICULAR GOALS & COMPETENCIES (CG & C) */}
            {/* ========================================================================= */}
            {dashboardSection === "goals_competencies" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                {/* Internal Subtabs Switcher */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                  <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGoalsOrCompSubtab("competencies")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        goalsOrCompSubtab === "competencies"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Award className="size-3.5" />
                      <span>१. मूल्यमापन क्षमता यादी (Competencies) ({allCompetencies.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoalsOrCompSubtab("goals")}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        goalsOrCompSubtab === "goals"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <BookOpen className="size-3.5" />
                      <span>२. अभ्यासक्रम ध्येये (Curricular Goals) ({allGoals.length})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchGoalsAndCompetencies}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                      title="रिफ्रेश करा"
                    >
                      <RefreshCw className="size-4" />
                    </button>
                    {goalsOrCompSubtab === "competencies" ? (
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
                    ) : (
                      <button
                        onClick={() => {
                          setNewGoalArea(areas[0]?.id || "");
                          setShowAddGoal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="size-3.5" />
                        <span>नवीन ध्येय जोडा (Add CG)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtab 1: Competencies */}
                {goalsOrCompSubtab === "competencies" && (
                  <div className="space-y-4">
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
                        <p className="text-sm font-bold text-slate-700">अद्याप कोणतीही क्षमता (C) जोडलेली नाही.</p>
                      </div>
                    ) : filteredCompetencies.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                        <AlertCircle className="size-8 text-amber-500 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">निवडलेल्या ध्येयासाठी कोणतीही क्षमता आढळली नाही.</p>
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
                              {c.learningOutcomes && c.learningOutcomes.length > 0 && (
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-slate-500">अध्ययन निष्पत्ती ({c.learningOutcomes.length}):</span>
                                  {c.learningOutcomes.slice(0, 3).map((lo, loi) => (
                                    <span key={loi} className="text-[10px] font-medium bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 max-w-xs truncate" title={lo}>
                                      {lo}
                                    </span>
                                  ))}
                                  {c.learningOutcomes.length > 3 && (
                                    <span className="text-[10px] font-bold text-purple-700">
                                      +{c.learningOutcomes.length - 3} आणखी
                                    </span>
                                  )}
                                </div>
                              )}
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

                {/* Subtab 2: Curricular Goals */}
                {goalsOrCompSubtab === "goals" && (
                  <div className="space-y-4">
                    {allGoals.length === 0 ? (
                      <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-2">
                        <AlertCircle className="size-8 text-amber-500 mx-auto" />
                        <p className="text-sm font-bold text-slate-700">अद्याप कोणतेही ध्येय (CG) जोडलेले नाही.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allGoals.map((g) => {
                          const area = areas.find((a) => a.id === g.areaOrSubjectId);
                          return (
                            <div
                              key={g.id}
                              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-all shadow-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono">
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
              </div>
            )}
            {/* ========================================================================= */}
            {/* SUBSECTION 3: PERFORMANCE INDICATORS & RUBRICS */}
            {/* ========================================================================= */}
            {dashboardSection === "rubrics" && (
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
            {/* ========================================================================= */}
            {/* SUBSECTION 4: YEAR-END SUMMARY REMARKS BANK */}
            {/* ========================================================================= */}
            {dashboardSection === "remarks" && (
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

            {/* Remark Category Quick Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
              {[
                { id: "all", label: "सर्व शेरे (All)", count: remarksList.length },
                {
                  id: "developmental_area",
                  label: "१. विकासात्मक शेरे (Developmental Area)",
                  count: remarksList.filter(
                    (r) =>
                      (r as any).type === "developmental_area" ||
                      (!r.subjectOrArea?.includes("अंतिम") && !r.subjectOrArea?.includes("पुढील") && !r.subjectOrArea?.includes("शिफारस"))
                  ).length,
                },
                {
                  id: "final_comprehensive",
                  label: "२. अंतिम सर्वंकष शेरे (Sheet 4)",
                  count: remarksList.filter(
                    (r) =>
                      (r as any).type === "final_comprehensive" ||
                      r.subjectOrArea?.includes("अंतिम") ||
                      r.subjectOrArea?.includes("सर्वंकष")
                  ).length,
                },
                {
                  id: "next_class_recommendation",
                  label: "३. पुढील इयत्ता शिफारस (Sheet 5)",
                  count: remarksList.filter(
                    (r) =>
                      (r as any).type === "next_class_recommendation" ||
                      r.subjectOrArea?.includes("शिफारस") ||
                      r.subjectOrArea?.includes("मार्गदर्शन")
                  ).length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRemarkTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    remarkTypeFilter === tab.id
                      ? "bg-purple-600 text-white font-black shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-purple-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      remarkTypeFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowClearClassModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="विशिष्ट एका इयत्तेचा डेटा निवडून हटवा"
                >
                  <Trash2 className="size-3.5 text-amber-600" />
                  <span>विशिष्ट इयत्तेचा डेटा हटवा (Clear Single Class)</span>
                </button>

                {(activitiesList.length > 0 || remarksList.length > 0) && (
                  <button
                    onClick={handleResetEntireDatabase}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    title="सर्व HPC डेटाबेस स्वच्छ करा"
                  >
                    <Trash2 className="size-3.5" />
                    <span>संपूर्ण डेटाबेस रीसेट करा (Reset Entire Database)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Step 1 & Step 2: Stage & Class Selectors for Upload */}
            <div className="space-y-4">
              {/* Step 1: Select Stage */}
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      १
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      पायरी १: स्तर निवडा (Step 1: Select Stage for Upload):
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    प्रथम तुम्ही ज्या स्तराची सामग्री अपलोड करत आहात तो स्तर निवडा
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {HPC_STAGES_INFO.map((stg) => {
                    const isSelected = selectedUploadStage === stg.id;
                    const theme =
                      stg.id === "foundational"
                        ? {
                            border: isSelected
                              ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20"
                              : "border-slate-200 hover:border-emerald-300 bg-white",
                            dot: "bg-emerald-500",
                            badge: "bg-emerald-100 text-emerald-800",
                          }
                        : stg.id === "preparatory"
                        ? {
                            border: isSelected
                              ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20"
                              : "border-slate-200 hover:border-indigo-300 bg-white",
                            dot: "bg-indigo-500",
                            badge: "bg-indigo-100 text-indigo-800",
                          }
                        : {
                            border: isSelected
                              ? "border-purple-600 bg-purple-50/70 text-purple-950 ring-2 ring-purple-500/20"
                              : "border-slate-200 hover:border-purple-300 bg-white",
                            dot: "bg-purple-500",
                            badge: "bg-purple-100 text-purple-800",
                          };

                    return (
                      <button
                        key={stg.id}
                        type="button"
                        onClick={() => {
                          setSelectedUploadStage(stg.id);
                          setSelectedUploadClass("all");
                          setSelectedStage(stg.id);
                        }}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 shadow-2xs ${theme.border}`}
                      >
                        <div className="flex items-center justify-between gap-1.5 w-full">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${theme.badge}`}>
                            {stg.classesLabelMarathi}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-black text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                              ✓ निवडलेला स्तर
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
                            <span className={`size-2 rounded-full ${theme.dot}`} />
                            <span>{stg.titleMarathi}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {stg.id === "foundational" && "इ. १ली व २री वर्ग"}
                            {stg.id === "preparatory" && "इ. ३री, ४थी व ५वी वर्ग"}
                            {stg.id === "middle" && "इ. ६वी, ७वी व ८वी वर्ग"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Class for the Selected Stage */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-indigo-50/40 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
                      २
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      पायरी २: इयत्ता निवडा (Step 2: Select Class for {HPC_STAGES_INFO.find(s => s.id === selectedUploadStage)?.titleMarathi}):
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-semibold pl-8">
                    निवडलेल्या स्तरातील ज्या इयत्तेची फाईल अपलोड करत आहात ती इयत्ता निवडा
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap pl-8 sm:pl-0">
                  {STAGE_CLASSES_MAP[selectedUploadStage].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedUploadClass(c.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        selectedUploadClass === c.id
                          ? "bg-orange-600 text-white shadow-xs scale-105"
                          : "bg-white text-slate-700 hover:bg-orange-100/60 border border-slate-200"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: Upload Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="size-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">
                  ३
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-900">
                  पायरी ३: एक्सेल / CSV फाईल अपलोड करा (Step 3: Upload Excel / CSV File):
                </span>
              </div>

              <div className="p-6 sm:p-8 border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-3xl text-center space-y-4 shadow-xs">
                {/* Selected Target Summary Pills */}
                <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/90 py-1.5 px-3.5 rounded-xl border border-indigo-200/80 shadow-2xs mx-auto">
                  <span>🎯 निवडलेला स्तर: <b className="text-indigo-700">{HPC_STAGES_INFO.find(s => s.id === selectedUploadStage)?.titleMarathi}</b></span>
                  <span className="text-slate-300">|</span>
                  <span>🏫 निवडलेली इयत्ता: <b className="text-orange-700">{STAGE_CLASSES_MAP[selectedUploadStage].find(c => c.id === selectedUploadClass)?.label || "सर्व"}</b></span>
                </div>

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
                    type="button"
                    onClick={handleDownloadSampleExcel}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Download className="size-4 text-emerald-600" />
                    <span>नमुना एक्सेल फाईल डाऊनलोड करा (Sample Template)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Workbook Sheets Selector & Summary */}
            {sheetNames.length > 0 && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-600">शीट फिल्टर (Sheet Filter):</span>
                    <button
                      type="button"
                      onClick={() => setPreviewSheetFilter("all")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        previewSheetFilter === "all"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      सर्व शीट्स (All Sheets: {parsedActivities.length + parsedRemarks.length + parsedRubrics.length})
                    </button>
                    {sheetNames.map((name) => {
                      const actCount = parsedActivities.filter((a) => a.sheetSource === name).length;
                      const remCount = parsedRemarks.filter((r) => r.sheetSource === name).length;
                      const rubCount = parsedRubrics.filter((ru) => ru.sheetSource === name).length;
                      const totalInSheet = actCount + remCount + rubCount;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedSheetName(name);
                            setPreviewSheetFilter(name);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            previewSheetFilter === name
                              ? "bg-indigo-600 text-white font-black shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>{name}</span>
                          {totalInSheet > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                                previewSheetFilter === name
                                  ? "bg-indigo-800 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {totalInSheet}
                            </span>
                          )}
                        </button>
                      );
                    })}
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

            {/* Preview Controls Bar: Search & Limit selector */}
            {(parsedActivities.length > 0 || parsedRemarks.length > 0 || parsedRubrics.length > 0) && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="वाचलेल्या डेटामध्ये शोधा (Search activities, questions, remarks...)"
                      className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                    {previewSearch && (
                      <button
                        onClick={() => setPreviewSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-bold hidden sm:block">
                    एकूण डेटा: {parsedActivities.length} उपक्रम | {parsedRemarks.length} शेरे | {parsedRubrics.length} रुब्रिक्स
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span className="text-xs font-bold text-slate-600">नोंदी मर्यादा (Limit):</span>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    {[15, 50, 100, "all" as const].map((limitOption) => (
                      <button
                        key={limitOption}
                        type="button"
                        onClick={() => setPreviewLimit(limitOption)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          previewLimit === limitOption
                            ? "bg-indigo-600 text-white font-black shadow-2xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {limitOption === "all" ? "सर्व (All)" : limitOption}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Preview Table: Activities & Questions */}
            {parsedActivities.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>वाचलेले उपक्रम व ५ प्रश्न बँक (Activities & 5 Questions)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    दाखवत आहे: {displayedParsedActivities.length} / {filteredParsedActivities.length} (एकूण: {parsedActivities.length})
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-28">शीट नाव</th>
                          <th className="p-3 w-36">विषय / क्षेत्र</th>
                          <th className="p-3 w-28">क्षमता कोड</th>
                          <th className="p-3 min-w-[180px]">अध्ययन निष्पत्ती (LO)</th>
                          <th className="p-3 min-w-[200px]">उपक्रम नाव व कृती</th>
                          <th className="p-3 min-w-[260px]">५ प्रश्न नमुना (Questions)</th>
                          <th className="p-3 min-w-[160px]">शिक्षकांचा अभिप्राय</th>
                          <th className="p-3 min-w-[160px]">पालकांचा अभिप्राय</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedParsedActivities.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-slate-400 font-bold">
                              निवडलेल्या फिल्टरनुसार कोणताही उपक्रम सापडला नाही.
                            </td>
                          </tr>
                        ) : (
                          displayedParsedActivities.map((act, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] truncate max-w-[100px] block">
                                  {act.sheetSource || "-"}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-800">{act.subjectOrArea}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-mono font-bold text-[11px] block text-center">
                                  {act.competencyCode || "-"}
                                </span>
                                {act.goalCode && (
                                  <span className="text-[10px] text-slate-500 font-mono block text-center mt-0.5">
                                    {act.goalCode}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-indigo-900 font-medium">
                                {act.learningOutcomes && act.learningOutcomes.length > 0 ? (
                                  <ul className="space-y-0.5 list-disc list-inside">
                                    {act.learningOutcomes.map((lo, li) => (
                                      <li key={li} className="text-slate-700">{lo}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{act.activityTitle}</div>
                                {act.activityDescription && (
                                  <div className="text-[11px] text-slate-600 mt-1 font-normal line-clamp-3">
                                    {act.activityDescription}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-slate-700">
                                {act.questions && act.questions.length > 0 ? (
                                  <ol className="list-decimal list-inside space-y-1">
                                    {act.questions.map((q, qi) => (
                                      <li key={qi} className="text-slate-800 font-medium">
                                        {q}
                                      </li>
                                    ))}
                                  </ol>
                                ) : (
                                  <span className="text-slate-400 font-medium">प्रश्न उपलब्ध नाहीत</span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-slate-600 max-w-xs">
                                {act.teacherFeedbackSample ? (
                                  <div className="space-y-1">
                                    {act.teacherFeedbackSample.split(/\s*\|\s*/).map((s, si) => (
                                      <div key={si} className="p-1 rounded bg-amber-50/60 border border-amber-100 text-slate-800">{s}</div>
                                    ))}
                                  </div>
                                ) : <span className="text-slate-400">-</span>}
                              </td>
                              <td className="p-3 text-[11px] text-slate-600 max-w-xs">
                                {act.parentFeedbackSample ? (
                                  <div className="space-y-1">
                                    {act.parentFeedbackSample.split(/\s*\|\s*/).map((s, si) => (
                                      <div key={si} className="p-1 rounded bg-purple-50/60 border border-purple-100 text-slate-800">{s}</div>
                                    ))}
                                  </div>
                                ) : <span className="text-slate-400">-</span>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Remarks Preview */}
            {parsedRemarks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>वाचलेले वार्षिक शेरे (Annual Summary Remarks)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    दाखवत आहे: {displayedParsedRemarks.length} / {filteredParsedRemarks.length} (एकूण: {parsedRemarks.length})
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-28">शीट नाव</th>
                          <th className="p-3 w-36">विषय / क्षेत्र</th>
                          <th className="p-3 w-32">शेरा प्रकार</th>
                          <th className="p-3 w-28">कामगिरी स्तर</th>
                          <th className="p-3">शिक्षकांचा अभिप्राय / शिफारस</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedParsedRemarks.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">
                              निवडलेल्या फिल्टरनुसार कोणताही शेरा सापडला नाही.
                            </td>
                          </tr>
                        ) : (
                          displayedParsedRemarks.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] truncate max-w-[100px] block">
                                  {r.sheetSource || "-"}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-800">{r.subjectOrArea}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                                  {(r as any).type === "final_comprehensive"
                                    ? "अंतिम सर्वंकष"
                                    : (r as any).type === "next_class_recommendation"
                                    ? "पुढील शिफारस"
                                    : "विकासात्मक"}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                                  {r.level}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 font-medium">{r.remarkText}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Rubrics Preview */}
            {parsedRubrics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>वाचलेले ३ स्तर मूल्यांकन रुब्रिक्स (Assessment Rubrics)</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-bold">
                    दाखवत आहे: {displayedParsedRubrics.length} / {filteredParsedRubrics.length} (एकूण: {parsedRubrics.length})
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-28">शीट नाव</th>
                          <th className="p-3 min-w-[180px]">उपक्रम / क्षमता</th>
                          <th className="p-3 w-28">परिमाण</th>
                          <th className="p-3 min-w-[200px]">प्रारंभिक / निर्झर</th>
                          <th className="p-3 min-w-[200px]">प्रवीण / पर्वत</th>
                          <th className="p-3 min-w-[200px]">प्रगत / आकाश</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedParsedRubrics.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 font-bold">
                              निवडलेल्या फिल्टरनुसार कोणताही रुब्रिक सापडला नाही.
                            </td>
                          </tr>
                        ) : (
                          displayedParsedRubrics.map((rub, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 text-center font-bold text-slate-500">{i + 1}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] truncate max-w-[100px] block">
                                  {rub.sheetSource || "-"}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-slate-800">{rub.activityTitle || rub.competencyCode || "-"}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[11px]">
                                  {rub.dimension}
                                </span>
                              </td>
                              <td className="p-3 text-slate-600 text-[11px] font-medium">{rub.beginner}</td>
                              <td className="p-3 text-slate-600 text-[11px] font-medium">{rub.proficient}</td>
                              <td className="p-3 text-slate-600 text-[11px] font-medium">{rub.advanced}</td>
                            </tr>
                          ))
                        )}
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
                    वाचलेली ध्येये व क्षमता (Goals & Competencies: {parsedGoals.length} ध्येये, {parsedCompetencies.length} क्षमता)
                  </span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto max-h-80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-black sticky top-0 border-b border-slate-200 z-10">
                        <tr>
                          <th className="p-3 w-12 text-center">क्र.</th>
                          <th className="p-3 w-28">क्षमता कोड</th>
                          <th className="p-3 w-28">संबंधित ध्येय</th>
                          <th className="p-3">क्षमतेचे वर्णन</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedCompetencies.slice(0, previewLimit === "all" ? undefined : previewLimit).map((comp, i) => (
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

      {/* ========================================================================= */}
      {/* QUICK ACTIVITY & 5-QUESTIONS DETAILS MODAL */}
      {/* ========================================================================= */}
      {viewingActivityModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-900 font-mono">
                    {viewingActivityModal.competencyCode}
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    विषय: <b>{viewingActivityModal.subjectOrArea}</b>
                  </span>
                  {viewingActivityModal.classId && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      इयत्ता: {viewingActivityModal.classId}
                    </span>
                  )}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    {viewingActivityModal.stageId === "foundational"
                      ? "पायाभूत (१ली-२री)"
                      : viewingActivityModal.stageId === "preparatory"
                      ? "पूर्वतयारी (३री-५वी)"
                      : "मध्य स्तर (६वी-८वी)"}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 pt-1">
                  {viewingActivityModal.activityTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingActivityModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {viewingActivityModal.activityDescription && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-600">कृती / उपक्रमाचे स्वरूप:</span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {viewingActivityModal.activityDescription}
                </p>
              </div>
            )}

            {/* 5 Questions */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="size-4 text-emerald-600" />
                <span>५ मूल्यमापनाचे प्रश्न (Evaluation Questions):</span>
              </h4>
              <div className="space-y-1.5">
                {viewingActivityModal.questions && viewingActivityModal.questions.length > 0 ? (
                  viewingActivityModal.questions.map((q, qi) => (
                    <div
                      key={qi}
                      className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-2.5 text-xs font-bold text-slate-800"
                    >
                      <span className="size-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0 text-[11px] font-black">
                        {qi + 1}
                      </span>
                      <span className="pt-0.5">{q || <i className="text-slate-400 font-normal">प्रश्न उपलब्ध नाही</i>}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">कोणतेही प्रश्न उपलब्ध नाहीत.</p>
                )}
              </div>
            </div>

            {/* Learning Outcomes */}
            {viewingActivityModal.learningOutcomes && viewingActivityModal.learningOutcomes.length > 0 && (
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-1">
                <span className="text-xs font-bold text-indigo-900">अध्ययन निष्पत्ती (Learning Outcomes):</span>
                <ul className="text-xs text-slate-700 list-disc list-inside space-y-0.5">
                  {viewingActivityModal.learningOutcomes.map((lo, li) => (
                    <li key={li}>{lo}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Teacher / Parent Feedback Samples */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {viewingActivityModal.teacherFeedbackSample && (
                <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 text-xs space-y-1.5">
                  <span className="font-bold text-amber-900">शिक्षकांचा नमुना अभिप्राय:</span>
                  <div className="space-y-1">
                    {viewingActivityModal.teacherFeedbackSample.split(/\s*\|\s*/).map((s, si) => (
                      <p key={si} className="text-slate-800 p-1.5 bg-white rounded-lg border border-amber-200/50 shadow-2xs">{s}</p>
                    ))}
                  </div>
                </div>
              )}
              {viewingActivityModal.parentFeedbackSample && (
                <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs space-y-1.5">
                  <span className="font-bold text-purple-900">पालकांचा नमुना अभिप्राय:</span>
                  <div className="space-y-1">
                    {viewingActivityModal.parentFeedbackSample.split(/\s*\|\s*/).map((s, si) => (
                      <p key={si} className="text-slate-800 p-1.5 bg-white rounded-lg border border-purple-200/50 shadow-2xs">{s}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const act = viewingActivityModal;
                  setViewingActivityModal(null);
                  handleOpenEditActivity(act);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Edit2 className="size-3.5" />
                <span>संपादित करा</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingActivityModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLEAR SINGLE SPECIFIC CLASS DATA */}
      {/* ========================================================================= */}
      {showClearClassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    विशिष्ट इयत्तेचा डेटा हटवा
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Clear Single Specific Class Data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClearClassModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Select Class Buttons / Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                १. ज्या इयत्तेचा डेटा हटवायचा आहे ती इयत्ता निवडा (Select Class):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"] as const).map((clsId) => {
                  const isSelected = targetClassToClear === clsId;
                  const cCount = countByClass[clsId] || 0;
                  return (
                    <button
                      key={clsId}
                      type="button"
                      onClick={() => setTargetClassToClear(clsId)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        isSelected
                          ? "bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-300"
                          : "bg-slate-50 hover:bg-rose-50/50 border-slate-200 text-slate-800"
                      }`}
                    >
                      <span className="text-xs font-black">
                        {CLASS_LABELS_MAP[clsId]}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected ? "bg-rose-800 text-white" : "bg-white text-slate-500 border border-slate-200"
                        }`}
                      >
                        {cCount} उपक्रम
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection Checkboxes */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">
                २. या इयत्तेतील काय हटवायचे आहे ते निवडा (Select what to clear):
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={clearActivitiesCheck}
                  onChange={(e) => setClearActivitiesCheck(e.target.checked)}
                  className="size-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    उपक्रम व ५ प्रश्न बँक (Activities & 5 Questions Bank)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    या इयत्तेचे सर्व अपलोड केलेले उपक्रम, ५ प्रश्न व शिक्षक/पालक शेरे ({countByClass[targetClassToClear] || 0} नोंदी)
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={clearAssessmentsCheck}
                  onChange={(e) => setClearAssessmentsCheck(e.target.checked)}
                  className="size-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">
                    विद्यार्थ्यांचे मूल्यमापन नोंदी (Student Assessments & Annual Summaries)
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    या इयत्तेतील विद्यार्थ्यांचे भरलेले सत्र १/२ चे मूल्यमापन व वार्षिक सारांश (ऐच्छिक)
                  </span>
                </div>
              </label>
            </div>

            {/* Safety Guarantee Notice */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>सुरक्षितता हमी (Safety Guarantee):</span>
              </div>
              <p className="text-[11px] text-emerald-700 pl-5 leading-relaxed">
                फक्त निवडलेल्या <b>{CLASS_LABELS_MAP[targetClassToClear]}</b> चा डेटा हटवला जाईल. इतर सर्व ७ इयत्तांचा डेटा १००% सुरक्षित राहील व डिलीट होणार नाही.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearClassModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                रद्द करा (Cancel)
              </button>
              <button
                type="button"
                disabled={isClearingClass || (!clearActivitiesCheck && !clearAssessmentsCheck)}
                onClick={() =>
                  handleClearSingleClass(targetClassToClear, {
                    deleteActivities: clearActivitiesCheck,
                    deleteAssessments: clearAssessmentsCheck,
                  })
                }
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-sm transition-all flex items-center gap-2"
              >
                {isClearingClass ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>हटवले जात आहे...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    <span>
                      {CLASS_LABELS_MAP[targetClassToClear]} चा डेटा साफ करा
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}