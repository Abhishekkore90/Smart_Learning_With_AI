import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Save,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronDown,
  ChevronRight,
  User,
  Users,
  Heart,
  BookOpen,
  Send,
  Loader2,
  Smile,
  Layers,
  Monitor,
  Trash2,
  Plus,
  RotateCcw,
  Award,
  Newspaper,
  Globe,
  Gamepad2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { toMarathiDigits } from "../utils/academicYear";
import {
  HpcStageId,
  HpcSessionAssessment,
  HpcAreaAssessment,
  HpcCurricularGoal,
  HpcCompetency,
  HpcDynamicActivity,
  HpcDynamicRubric,
} from "../types/hpc";
import {
  getAreasForStage,
  getGoalsForArea,
  getCompetenciesForGoalAndClass,
  HpcAreaDefinition,
  HPC_STAGES_INFO,
} from "../data/hpcCurricularGoals";
import {
  getActivitiesForCompetency,
  HPC_ACTIVITIES_BANK,
  HpcActivityItem,
  HpcCompetencyActivitiesData,
} from "../data/hpcActivitiesBank";
import { PravinyaStharChart, PravinyaLevel } from "./PravinyaStharChart";
import {
  HPC_CORE_RUBRICS,
  SELF_ASSESSMENT_OPTIONS,
} from "../data/hpcRubrics";
import {
  getHpcSessionAssessment,
  saveHpcSessionAssessment,
  getHpcStudentById,
  StudentInfoSummary,
  getHpcActivityBankForCompetency,
  getHpcCurricularGoals,
  getHpcCompetencies,
  getHpcDynamicActivities,
  getHpcDynamicRubrics,
  getHpcAreasForStage,
} from "../services/hpcService";

const HELP_NEEDED_OPTIONS = [
  { id: "peer", labelMarathi: "वर्गमित्र", icon: Users },
  { id: "teacher", labelMarathi: "शिक्षक", icon: User },
  { id: "book", labelMarathi: "पुस्तक", icon: BookOpen },
  { id: "computer", labelMarathi: "संगणक", icon: Monitor },
  { id: "none", labelMarathi: "यांपैकी नाही", icon: CheckCircle2 },
];

const HOME_LEARNING_RESOURCES = [
  {
    id: "books",
    labelMarathi: "पुस्तके/मासिके",
    icon1: BookOpen,
  },
  {
    id: "newspaper",
    labelMarathi: "वृत्तपत्र",
    icon1: Newspaper,
  },
  {
    id: "toys",
    labelMarathi: "खेळणे/खेळ",
    icon1: Gamepad2,
  },
  {
    id: "phone_computer",
    labelMarathi: "फोन, संगणक",
    icon1: Smartphone,
    icon2: Monitor,
  },
  {
    id: "internet",
    labelMarathi: "इंटरनेट (आंतरजाल)",
    icon1: Globe,
  },
];

interface HpcAssessmentFormProps {
  studentId: string;
  academicYear: string;
  stageId: HpcStageId;
  classId: string;
  session?: "session1" | "session2";
  onBack?: () => void;
  onSaved?: () => void;
  onProceedToPartC?: () => void;
}

export function HpcAssessmentForm({
  studentId,
  academicYear,
  stageId,
  classId,
  session: initialSession = "session1",
  onBack,
  onSaved,
  onProceedToPartC,
}: HpcAssessmentFormProps) {
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentInfoSummary | null>(null);
  const [session, setSession] = useState<"session1" | "session2">(initialSession);

  // Sync session whenever initialSession prop changes
  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
    }
  }, [initialSession]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dynamic HPC Master Data from Firestore (Excel Uploads)
  const [customGoals, setCustomGoals] = useState<HpcCurricularGoal[]>([]);
  const [customCompetencies, setCustomCompetencies] = useState<HpcCompetency[]>([]);
  const [stageActivities, setStageActivities] = useState<HpcDynamicActivity[]>([]);
  const [stageRubrics, setStageRubrics] = useState<HpcDynamicRubric[]>([]);

  // Applicable areas for current stage (dynamically derived from custom goals & activities)
  const areas = useMemo(
    () => getHpcAreasForStage(stageId, customGoals, stageActivities),
    [stageId, customGoals, stageActivities]
  );
  const [activeAreaId, setActiveAreaId] = useState<string>(() => areas[0]?.id || "");

  // Keep activeAreaId valid when dynamic areas load
  useEffect(() => {
    if (areas.length > 0 && (!activeAreaId || !areas.some((a) => a.id === activeAreaId))) {
      setActiveAreaId(areas[0].id);
    }
  }, [areas, activeAreaId]);

  // Load Dynamic Master Data
  useEffect(() => {
    let isMounted = true;
    async function loadMasterData() {
      try {
        const [gList, cList, aList, rList] = await Promise.all([
          getHpcCurricularGoals(stageId),
          getHpcCompetencies(stageId, undefined, classId, session),
          getHpcDynamicActivities(undefined, stageId),
          getHpcDynamicRubrics(undefined, undefined, stageId),
        ]);
        if (isMounted) {
          setCustomGoals(gList);
          setCustomCompetencies(cList);
          setStageActivities(aList);
          setStageRubrics(rList);
        }
      } catch (err) {
        console.error("Error loading HPC master data:", err);
      }
    }
    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, [stageId, classId, session]);

  // Area assessments state
  const [areaAssessments, setAreaAssessments] = useState<Record<string, HpcAreaAssessment>>({});
  const [teacherGeneralRemarks, setTeacherGeneralRemarks] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState<"draft" | "completed">("draft");

  const isFoundational = stageId === "foundational";

  // Level labels based on stage
  const levelLabels = useMemo(() => {
    if (isFoundational) {
      return {
        beginner: "प्रवाह / निर्झर (Stream / Emerging)",
        proficient: "पर्वत (Mountain / Developing)",
        advanced: "आकाश (Sky / Advanced)",
      };
    }
    return {
      beginner: "प्रारंभिक (Beginner)",
      proficient: "प्रवीण (Proficient)",
      advanced: "प्रगत (Advanced)",
    };
  }, [isFoundational]);

  // Load student & existing assessment for selected session
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const st = await getHpcStudentById(studentId);
      if (!isMounted) return;
      setStudent(st);

      const existing = await getHpcSessionAssessment(studentId, academicYear, session);
      if (!isMounted) return;

      if (existing) {
        setAreaAssessments(existing.areaAssessments || {});
        setTeacherGeneralRemarks(existing.teacherGeneralRemarks || "");
        setAssessmentStatus(existing.status || "draft");
      } else {
        // Initialize blank state for all areas
        const initialMap: Record<string, HpcAreaAssessment> = {};
        areas.forEach((area) => {
          initialMap[area.id] = {
            areaOrSubjectId: area.id,
            areaOrSubjectNameMarathi: area.nameMarathi,
            selectedGoalIds: [],
            selectedCompetencyIds: [],
            activity1Title: "",
            activity1Description: "",
            activity1Outcome: "",
            activity2Title: "",
            activity2Description: "",
            activity2Outcome: "",
            assessmentQuestions: [],
            assessmentEvidence: "",
            awarenessLevel: "",
            sensitivityLevel: "",
            creativityLevel: "",
            threeSixty: {
              selfAssessment: {
                likedActivity: "yes",
                feltEasy: "yes",
                neededHelpFrom: ["none"],
                customRemark: "",
              },
              peerAssessment: {
                peerLiked: "yes",
                peerFeltEasy: "yes",
                peerNeededHelpFrom: [],
                peerRemarks: "",
              },
              parentFeedback: {
                learningResourcesAtHome: ["books"],
                parentObservations: "",
                parentExpectations: "",
              },
              teacherRemarks: {
                observation: "",
                guidanceSuggestion: "",
              },
            },
          };
        });
        setAreaAssessments(initialMap);
        setTeacherGeneralRemarks("");
        setAssessmentStatus("draft");
      }
      setLoading(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [studentId, academicYear, session, stageId, areas]);

  // Active Area Data Helper
  const currentArea = useMemo(() => {
    return areas.find((a) => a.id === activeAreaId) || areas[0];
  }, [areas, activeAreaId]);

  const currentAssessment = useMemo((): HpcAreaAssessment => {
    if (!currentArea) return {} as any;
    return (
      areaAssessments[currentArea.id] || {
        areaOrSubjectId: currentArea.id,
        areaOrSubjectNameMarathi: currentArea.nameMarathi,
        selectedGoalIds: [],
        selectedCompetencyIds: [],
        activity1Title: "",
        activity1Description: "",
        activity1Outcome: "",
        activity2Title: "",
        activity2Description: "",
        activity2Outcome: "",
        assessmentQuestions: ["", "", ""],
        assessmentEvidence: "",
        awarenessLevel: "",
        sensitivityLevel: "",
        creativityLevel: "",
        threeSixty: {
          selfAssessment: {},
          peerAssessment: {},
          parentFeedback: {},
          teacherRemarks: { observation: "" },
        },
      }
    );
  }, [areaAssessments, currentArea]);

  // Available goals and competencies for current area (Dynamic Excel > Default)
  const availableGoals = useMemo(() => {
    if (!currentArea) return [];
    if (customGoals && customGoals.length > 0) {
      const areaGoals = customGoals.filter((g) => {
        if (!g.areaOrSubjectId || g.areaOrSubjectId === "general") return true;
        const cleanSub = g.areaOrSubjectId.trim().toLowerCase();
        const cleanAreaId = (currentArea.id || "").trim().toLowerCase();
        const cleanAreaMarathi = (currentArea.nameMarathi || "").trim().toLowerCase();
        return (
          cleanSub === cleanAreaId ||
          cleanAreaMarathi.includes(cleanSub) ||
          cleanSub.includes(cleanAreaMarathi)
        );
      });
      if (areaGoals.length > 0) return areaGoals;
      return customGoals;
    }
    return getGoalsForArea(currentArea.id, stageId);
  }, [currentArea, stageId, customGoals]);

  const availableCompetencies = useMemo(() => {
    const selectedGoals = currentAssessment.selectedGoalIds || [];
    // If NO goal is selected, return EMPTY array! Never show all competencies!
    if (selectedGoals.length === 0) {
      return [];
    }

    if (customCompetencies && customCompetencies.length > 0) {
      const filtered = customCompetencies.filter((c) => {
        if (!c.goalId) return false;
        const cleanCompGoal = c.goalId.replace(/^CUSTOM[-_]/i, "").trim().toLowerCase();
        const alphaCompGoal = cleanCompGoal.replace(/[^a-zA-Z0-9]/g, "");

        return selectedGoals.some((gId) => {
          const matchGoalObj = availableGoals.find((g) => g.id === gId);
          const cleanGId = gId.replace(/^CUSTOM[-_]/i, "").trim().toLowerCase();
          const alphaGId = cleanGId.replace(/[^a-zA-Z0-9]/g, "");
          const cleanGCode = (matchGoalObj?.code || "").replace(/^CUSTOM[-_]/i, "").trim().toLowerCase();
          const alphaGCode = cleanGCode.replace(/[^a-zA-Z0-9]/g, "");

          return (
            cleanCompGoal === cleanGId ||
            alphaCompGoal === alphaGId ||
            (cleanGCode !== "" && (cleanCompGoal === cleanGCode || alphaCompGoal === alphaGCode))
          );
        });
      });
      return filtered;
    }

    // Fallback only if no custom competencies exist in DB
    const list: any[] = [];
    selectedGoals.forEach((goalId) => {
      const comps = getCompetenciesForGoalAndClass(goalId, classId, session);
      comps.forEach((c) => {
        if (!list.some((existing) => existing.id === c.id)) {
          list.push(c);
        }
      });
    });
    return list;
  }, [currentAssessment.selectedGoalIds, classId, session, customCompetencies, availableGoals]);

  // Update field in current area assessment
  const updateCurrentAssessment = (updates: Partial<HpcAreaAssessment>) => {
    if (!currentArea) return;
    setAreaAssessments((prev) => ({
      ...prev,
      [currentArea.id]: {
        ...(prev[currentArea.id] || currentAssessment),
        ...updates,
      },
    }));
  };

  // Toggle goal selection
  const toggleGoal = (goalId: string) => {
    const current = currentAssessment.selectedGoalIds || [];
    const isChecked = current.includes(goalId);
    const updated = isChecked
      ? current.filter((id) => id !== goalId)
      : [...current, goalId];

    // If all goals are deselected, clear competencies, activities, and questions
    if (updated.length === 0) {
      updateCurrentAssessment({
        selectedGoalIds: [],
        selectedCompetencyIds: [],
        activity1Title: "",
        activity1Description: "",
        activity1Outcome: "",
        assessmentQuestions: [],
      });
      setSelectedBankCompCode("");
      setBankData(undefined);
      return;
    }

    updateCurrentAssessment({ selectedGoalIds: updated });
  };

  // Toggle competency selection
  const toggleCompetency = (compId: string) => {
    const current = currentAssessment.selectedCompetencyIds || [];
    const isChecked = current.includes(compId);
    const updated = isChecked
      ? current.filter((id) => id !== compId)
      : [...current, compId];

    updateCurrentAssessment({ selectedCompetencyIds: updated });

    if (!isChecked) {
      const match = availableCompetencies.find((c) => c.id === compId);
      if (match?.code) {
        setSelectedBankCompCode(match.code);
      }
    } else {
      const remaining = availableCompetencies.find((c) => updated.includes(c.id));
      setSelectedBankCompCode(remaining?.code || "");
      if (updated.length === 0) {
        setBankData(undefined);
        updateCurrentAssessment({
          activity1Title: "",
          activity1Description: "",
          activity1Outcome: "",
          assessmentQuestions: [],
        });
      }
    }
  };

  // Competency selector for Upakram & Remark Bank
  const [selectedBankCompCode, setSelectedBankCompCode] = useState<string>("");

  const activeBankCompCode = useMemo(() => {
    const selected = currentAssessment.selectedCompetencyIds || [];
    // If NO competency is selected, return EMPTY string! Do NOT auto-pick!
    if (selected.length === 0) {
      return "";
    }
    if (
      selectedBankCompCode &&
      availableCompetencies.some((c) => selected.includes(c.id) && c.code === selectedBankCompCode)
    ) {
      return selectedBankCompCode;
    }
    const match = availableCompetencies.find((c) => selected.includes(c.id));
    return match?.code || "";
  }, [selectedBankCompCode, currentAssessment.selectedCompetencyIds, availableCompetencies]);

  const [bankData, setBankData] = useState<HpcCompetencyActivitiesData | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;
    if (!activeBankCompCode) {
      setBankData(undefined);
      return;
    }

    // Fetch dynamic activities from Firestore if available
    getHpcActivityBankForCompetency(activeBankCompCode, stageId)
      .then((data) => {
        if (isMounted) {
          setBankData(data || getActivitiesForCompetency(activeBankCompCode));
        }
      })
      .catch((err) => {
        console.warn("Could not load dynamic activities for bank:", err);
        if (isMounted) {
          setBankData(getActivitiesForCompetency(activeBankCompCode));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeBankCompCode, stageId]);

  // Always available Parent Remarks list (Bank + Static Fallback)
  const effectiveParentRemarks = useMemo(() => {
    if (bankData?.parentRemarks && bankData.parentRemarks.length > 0) {
      return bankData.parentRemarks;
    }
    if (activeBankCompCode && HPC_ACTIVITIES_BANK[activeBankCompCode]?.parentRemarks?.length > 0) {
      return HPC_ACTIVITIES_BANK[activeBankCompCode].parentRemarks;
    }
    return [
      "माझा पाल्य घरी या उपक्रमातील कृती आवडीने करून दाखवतो. त्याच्या प्रगतीचे आम्हाला समाधान वाटते.",
      "मला असे दिसून आले की माझा पाल्य नवीन गोष्टी शिकताना खूप आनंद घेतो व उत्साहाने सांगतो.",
      "दैनंदिन व्यवहारात माझा पाल्य चांगल्या सवयी नियमित पाळतो. आम्ही त्याला सतत प्रोत्साहन देतो.",
      "माझा पाल्य सध्या अभ्यासात व उपक्रमात स्वतःहून रुची दाखवतो. शाळेच्या मार्गदर्शनाचा चांगला उपयोग होत आहे.",
      "आमच्या निरीक्षणानुसार पाल्याचा आत्मविश्वास दिवसेंदिवस वाढत आहे. आम्ही घरून पूर्ण पाठबळ देत आहोत.",
      "घरी विचारलेल्या प्रश्नांची माझा पाल्य समजून विचारपूर्वक उत्तरे देतो. हा बदल आम्हाला खूप आवडला.",
      "माझा पाल्य आपल्या वस्तू व्यवस्थित ठेवतो व घरातील कामात आनंदाने सहकार्य करतो.",
      "शाळेतील अनुभव माझा पाल्य घरी आमच्याशी मोकळेपणाने शेअर करतो. त्याचा संवाद सुधारत आहे.",
      "माझा पाल्य न घाबरता व न संकोचता स्वतःचे विचार मांडतो. त्याच्यातील ही प्रगती कौतुकास्पद आहे.",
      "पाल्याच्या सर्वांगीण प्रगतीसाठी शाळेचे व शिक्षकांचे मार्गदर्शन अत्यंत मोलाचे ठरत आहे."
    ];
  }, [bankData, activeBankCompCode]);

  // Always available Teacher Remarks list (Bank + Static Fallback)
  const effectiveTeacherRemarks = useMemo(() => {
    if (bankData?.teacherRemarks && bankData.teacherRemarks.length > 0) {
      return bankData.teacherRemarks;
    }
    if (activeBankCompCode && HPC_ACTIVITIES_BANK[activeBankCompCode]?.teacherRemarks?.length > 0) {
      return HPC_ACTIVITIES_BANK[activeBankCompCode].teacherRemarks;
    }
    return [
      "विद्यार्थी उपक्रमात अत्यंत आनंदाने व उत्स्फूर्तपणे सहभाग घेतो.",
      "संकल्पनांची समज चांगली असून विचारलेल्या प्रश्नांची अचूक उत्तरे देतो.",
      "मित्रांसोबत सहकार्याने काम करतो व गटात पुढाकार घेण्याची वृत्ती दिसून येते.",
      "दिलेल्या सूचनांचे तंतोतंत पालन करून कृती वेळेत पूर्ण करतो.",
      "नवीन गोष्टी शिकण्याबाबत विद्यार्थ्यामध्ये तीव्र कुतूहल व जिज्ञासा दिसून येते."
    ];
  }, [bankData, activeBankCompCode]);

  // Selected Teacher Level Filter ("nirjhar" | "parvat" | "aakash") - Default to nirjhar or saved level
  const [teacherLevelFilter, setTeacherLevelFilter] = useState<"nirjhar" | "parvat" | "aakash">(
    (currentAssessment.threeSixty?.teacherRemarks?.level as any) || "nirjhar"
  );

  useEffect(() => {
    const savedLevel = currentAssessment.threeSixty?.teacherRemarks?.level as "nirjhar" | "parvat" | "aakash" | undefined;
    if (savedLevel && (savedLevel === "nirjhar" || savedLevel === "parvat" || savedLevel === "aakash")) {
      setTeacherLevelFilter(savedLevel);
    }
  }, [currentAssessment.threeSixty?.teacherRemarks?.level]);

  // Available Teacher Remarks filtered strictly by selected level, with level names stripped from display
  const availableTeacherRemarks = useMemo(() => {
    const rawList = effectiveTeacherRemarks;

    const cleanRemark = (s: string) =>
      s
        .replace(/^\[(निर्झर|प्रवाह|पर्वत|आकाश|beginner|proficient|advanced)\]\s*[-:—]?\s*/i, "")
        .replace(/^(निर्झर|प्रवाह|पर्वत|आकाश)\s*[-:—]\s*/i, "")
        .replace(/^स्तर\s*[-:—]\s*/i, "")
        .trim();

    // Check if there are explicit tags
    const explicitMatches: string[] = [];
    rawList.forEach((r) => {
      const lower = r.toLowerCase();
      if (
        teacherLevelFilter === "nirjhar" &&
        (lower.includes("[निर्झर]") || lower.includes("निर्झर:") || lower.includes("[प्रवाह]") || lower.includes("beginner"))
      ) {
        explicitMatches.push(cleanRemark(r));
      } else if (
        teacherLevelFilter === "parvat" &&
        (lower.includes("[पर्वत]") || lower.includes("पर्वत:") || lower.includes("proficient"))
      ) {
        explicitMatches.push(cleanRemark(r));
      } else if (
        teacherLevelFilter === "aakash" &&
        (lower.includes("[आकाश]") || lower.includes("आकाश:") || lower.includes("advanced"))
      ) {
        explicitMatches.push(cleanRemark(r));
      }
    });

    if (explicitMatches.length > 0) {
      return explicitMatches;
    }

    // Curated high quality remarks for each level
    const fallbackByLevel: Record<"nirjhar" | "parvat" | "aakash", string[]> = {
      nirjhar: [
        "शिक्षकांच्या मार्गदर्शनाखाली दिलेल्या कृती समजून घेऊन पूर्ण करण्याचा प्रयत्न करतो.",
        "मूलभूत संकल्पनांची ओळख होत असून सोप्या प्रश्नांची उत्तरे शिक्षकांच्या मदतीने देतो.",
        "वर्ग उपक्रमात नियमित सहभाग घेतो; सातत्यपूर्ण सराव व प्रोत्साहनाने आत्मविश्वास नक्की वाढेल.",
        "खेळ, चित्रे व प्रत्यक्ष वस्तूंच्या साहाय्याने शिकताना अधिक रस व उत्सुकता दाखवतो.",
        "मित्रांचे निरीक्षण करून कृती करण्याचा प्रयत्न करतो; आणखी सरावाची गरज आहे.",
        "नियम समजून घेण्यास सुरुवात केली असून शिक्षकांच्या आस्थेवाईक मार्गदर्शनाने प्रगती होत आहे.",
        "अडचण आल्यास न घाबरता शिक्षकांकडे मदत मागतो व सूचनांनुसार सुधारणा करतो.",
      ],
      parvat: [
        "संकल्पनांची समज चांगली असून विचारलेल्या प्रश्नांची समर्पक उत्तरे स्वतःहून देतो.",
        "दिलेल्या सूचनांचे वेळेत पालन करून गटकार्यात व उपक्रमांत सक्रिय सहभाग नोंदवतो.",
        "समवयस्कांशी सहकार्याची भावना राखून आपल्या जबाबदाऱ्या व्यवस्थित पार पाडतो.",
        "शिकलेल्या गोष्टींचा दैनंदिन संभाषणात व वर्ग व्यवहारात चांगला व प्रभावी वापर करतो.",
        "अभ्यासात व उपक्रमांत उत्तम आत्मविश्वास दिसून येतो; त्याची प्रगती समाधानकारक आहे.",
        "स्वतःहून कृती पूर्ण करण्याचा उत्साह दाखवतो व अडचणी आल्यास विचारपूर्वक मार्ग काढतो.",
        "वर्ग नियमांचे नियमित पालन करतो व इतरांशी आदराने व प्रेमाने वागतो.",
      ],
      aakash: [
        "संकल्पनांचे सखोल व स्पष्ट आकलन असून कल्पकतेने नवीन विचार व अचूक उत्तरे मांडतो.",
        "सर्व उपक्रमांत उत्साहाने पुढाकार घेतो आणि इतर वर्गमित्रांना प्रेमाने व सहकार्याने मार्गदर्शन करतो.",
        "अत्यंत आत्मविश्वासू, जिज्ञासू व शिस्तबद्ध असून त्याची एकंदर कामगिरी उल्लेखनीय व उत्कृष्ट आहे.",
        "विविध समस्यांवर स्वतःचे नवनवीन मार्ग शोधून स्वतंत्रपणे काम करण्याची उच्च क्षमता दाखवतो.",
        "भाषा, विचार आणि कृती या तिन्हींमध्ये परिपक्वता व उच्च प्राविण्य दिसून येते.",
        "सर्जनशील उपक्रमांमध्ये स्वतःच्या नाविन्यपूर्ण कल्पनांचा व कौशल्यांचा प्रभावी वापर करतो.",
        "सकारात्मक वृत्ती, नेतृत्व गुण आणि उत्कृष्ट कार्यशैलीमुळे वर्गातील आदर्श विद्यार्थी ठरतो.",
      ],
    };

    // Include competency-specific remarks partitioned cleanly across levels
    const competencyLevelSpecific: string[] = [];
    rawList.forEach((rem, idx) => {
      const cleaned = cleanRemark(rem);
      if (!cleaned) return;
      const lower = rem.toLowerCase();
      if (teacherLevelFilter === "nirjhar") {
        if (
          lower.includes("मदत") ||
          lower.includes("मार्गदर्शन") ||
          lower.includes("सराव") ||
          lower.includes("प्रोत्साहन") ||
          lower.includes("टिकवावी") ||
          idx % 3 === 0
        ) {
          competencyLevelSpecific.push(cleaned);
        }
      } else if (teacherLevelFilter === "parvat") {
        if (
          lower.includes("समाधानकारक") ||
          lower.includes("आत्मविश्वास") ||
          lower.includes("क्षमता") ||
          lower.includes("सुरुवात") ||
          lower.includes("नियम") ||
          idx % 3 === 1
        ) {
          competencyLevelSpecific.push(cleaned);
        }
      } else if (teacherLevelFilter === "aakash") {
        if (
          lower.includes("अभिनंदन") ||
          lower.includes("वाखाणण्याजोगा") ||
          lower.includes("कौतुकास्पद") ||
          lower.includes("आवड") ||
          lower.includes("उत्कृष्ट") ||
          idx % 3 === 2
        ) {
          competencyLevelSpecific.push(cleaned);
        }
      }
    });

    return Array.from(new Set([...competencyLevelSpecific, ...fallbackByLevel[teacherLevelFilter]]));
  }, [effectiveTeacherRemarks, teacherLevelFilter]);

  // Guidance Suggestions for selected level
  const availableGuidanceSuggestions = useMemo(() => {
    const guidanceByLevel: Record<"nirjhar" | "parvat" | "aakash", string[]> = {
      nirjhar: [
        "रोज नियमित उपस्थित राहून मूलभूत संकल्पनांचा शिक्षकांच्या मार्गदर्शनाखाली सराव करावा.",
        "घरी रोज १०-१५ मिनिटे पालकांनी चित्रांच्या व गोष्टींच्या माध्यमातून सराव घ्यावा.",
        "अक्षरे व संख्या प्रत्यक्ष वस्तूंच्या साहाय्याने समजून घेण्याचा सराव नियमित करावा.",
        "शिक्षकांनी दिलेल्या छोट्या-छोट्या सूचना लक्षपूर्वक ऐकून कृती करण्याची सवय लावावी.",
      ],
      parvat: [
        "स्वतःहून पुढाकार घेऊन नवीन प्रश्न विचारण्याचा व गटकार्यात नेतृत्व करण्याचा सराव करावा.",
        "शिकलेल्या संकल्पनांचा दैनंदिन जीवनातील व्यवहारात अधिक वापर करावा.",
        "सोप्या समस्यांवरून आता थोडे अधिक आव्हानात्मक प्रश्न सोडवण्याचा प्रयत्न करावा.",
        "वाचन व लेखनात अधिक गती आणि शुद्धतेसाठी नियमित सराव सुरू ठेवावा.",
      ],
      aakash: [
        "वर्गमित्रांना समजवून सांगणे व सहकार्यात्मक गटकार्यात नेतृत्व करणे या गुणांची जोपासना करावी.",
        "स्वतःच्या कल्पकतेने नवीन उपक्रम, प्रकल्प व हस्तकला कृती तयार करण्याचे स्वातंत्र्य द्यावे.",
        "शालेय व आंतरशालेय स्पर्धा, वक्तृत्व व सादरीकरणात सहभाग घेऊन प्रतिभा अधिक विकसित करावी.",
        "वाचनाची आवड वाढवून विविध पुस्तके व मासिके वाचण्यास प्रोत्साहन द्यावे.",
      ],
    };
    return guidanceByLevel[teacherLevelFilter];
  }, [teacherLevelFilter]);

  // Load dynamic rubrics specifically for the active competency if needed
  useEffect(() => {
    let isMounted = true;
    if (!activeBankCompCode) return;
    getHpcDynamicRubrics(activeBankCompCode, undefined, stageId).then((rubs) => {
      if (isMounted && rubs && rubs.length > 0) {
        setStageRubrics((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          rubs.forEach((r) => map.set(r.id, r));
          return Array.from(map.values());
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeBankCompCode, stageId]);

  // Dynamic Rubrics matching selected activity, competency, or stage
  const dynamicRubricsForAssessment = useMemo(() => {
    if (!stageRubrics || stageRubrics.length === 0 || !activeBankCompCode) return [];

    const cleanTitle = (s?: string) =>
      (s || "")
        .trim()
        .toLowerCase()
        .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
        .replace(/\s+/g, " ")
        .trim();

    const compClean = activeBankCompCode.trim().toLowerCase();

    // 1. Try matching by competencyCode AND clean activity title
    if (currentAssessment.activity1Title) {
      const actClean = cleanTitle(currentAssessment.activity1Title);
      const actMatches = stageRubrics.filter((r) => {
        if (!r.activityTitle) return false;
        const matchesComp = !r.competencyCode || r.competencyCode.trim().toLowerCase() === compClean;
        const rClean = cleanTitle(r.activityTitle);
        const titleMatch =
          rClean === actClean ||
          (actClean.length > 5 && rClean.includes(actClean)) ||
          (rClean.length > 5 && actClean.includes(rClean));
        return matchesComp && titleMatch;
      });
      if (actMatches.length > 0) return actMatches;

      // Also try matching by title across all rubrics in case competencyCode differs
      const titleOnlyMatches = stageRubrics.filter((r) => {
        if (!r.activityTitle) return false;
        const rClean = cleanTitle(r.activityTitle);
        return (
          rClean === actClean ||
          (actClean.length > 5 && rClean.includes(actClean)) ||
          (rClean.length > 5 && actClean.includes(rClean))
        );
      });
      if (titleOnlyMatches.length > 0) return titleOnlyMatches;
    }

    // 2. Try matching by active competency code
    const compMatches = stageRubrics.filter(
      (r) => r.competencyCode && r.competencyCode.trim().toLowerCase() === compClean
    );
    if (compMatches.length > 0) {
      const uniqueDims = new Map<string, HpcDynamicRubric>();
      compMatches.forEach((r) => {
        const key = (r.dimension || "").trim().toLowerCase();
        if (!uniqueDims.has(key)) uniqueDims.set(key, r);
      });
      return Array.from(uniqueDims.values());
    }

    return [];
  }, [stageRubrics, currentAssessment.activity1Title, activeBankCompCode]);

  const handleSelectBankActivity = (act: HpcActivityItem) => {
    updateCurrentAssessment({
      activity1Title: act.title,
      activity1Description: act.description,
      assessmentQuestions: [...act.questions],
    });
    toast.success(`उपक्रम ${act.activityNumber}: "${act.title.slice(0, 30)}..." निवडला व ५ प्रश्न आपोआप भरले गेले!`);
  };

  const handleAddQuestion = () => {
    const list = [
      ...(currentAssessment.assessmentQuestions && currentAssessment.assessmentQuestions.length > 0
        ? currentAssessment.assessmentQuestions
        : bankData?.activities?.[0]?.questions || ["", "", "", "", ""]),
    ];
    list.push("");
    updateCurrentAssessment({ assessmentQuestions: list });
    toast.success("नवीन प्रश्न जोडला! कृपया खाली टाईप करा.");
  };

  const handleDeleteQuestion = (indexToDelete: number) => {
    const list = [
      ...(currentAssessment.assessmentQuestions && currentAssessment.assessmentQuestions.length > 0
        ? currentAssessment.assessmentQuestions
        : bankData?.activities?.[0]?.questions || ["", "", "", "", ""]),
    ];
    if (list.length <= 1) {
      toast.error("किमान एक प्रश्न असणे आवश्यक आहे.");
      return;
    }
    const updated = list.filter((_, idx) => idx !== indexToDelete);
    updateCurrentAssessment({ assessmentQuestions: updated });
    toast.success(`प्रश्न क्र. ${indexToDelete + 1} हटवला.`);
  };

  const handleResetQuestions = () => {
    if (bankData?.activities) {
      const selectedAct =
        bankData.activities.find(
          (act) => (currentAssessment.activity1Title || bankData.activities[0]?.title) === act.title
        ) || bankData.activities[0];
      if (selectedAct?.questions) {
        updateCurrentAssessment({ assessmentQuestions: [...selectedAct.questions] });
        toast.success("उपक्रमाचे मूळ प्रश्न पुन्हा लोड झाले!");
      }
    }
  };

  // 360-degree update helpers
  const update360 = (
    section: "selfAssessment" | "peerAssessment" | "parentFeedback" | "teacherRemarks",
    field: string,
    value: any
  ) => {
    const current360 = currentAssessment.threeSixty || {
      selfAssessment: {},
      peerAssessment: {},
      parentFeedback: {},
      teacherRemarks: { observation: "" },
    };

    updateCurrentAssessment({
      threeSixty: {
        ...current360,
        [section]: {
          ...(current360[section] || {}),
          [field]: value,
        },
      },
    });
  };

  const toggleSelfHelp = (id: string) => {
    const current = (currentAssessment.threeSixty?.selfAssessment?.neededHelpFrom || []) as string[];
    let updated: string[];
    if (id === "none") {
      updated = current.includes("none") ? [] : ["none"];
    } else {
      const withoutNone = current.filter((x) => x !== "none");
      if (withoutNone.includes(id)) {
        updated = withoutNone.filter((x) => x !== id);
      } else {
        updated = [...withoutNone, id];
      }
    }
    update360("selfAssessment", "neededHelpFrom", updated);
  };

  const togglePeerHelp = (id: string) => {
    const current = (currentAssessment.threeSixty?.peerAssessment?.peerNeededHelpFrom || []) as string[];
    let updated: string[];
    if (id === "none") {
      updated = current.includes("none") ? [] : ["none"];
    } else {
      const withoutNone = current.filter((x) => x !== "none");
      if (withoutNone.includes(id)) {
        updated = withoutNone.filter((x) => x !== id);
      } else {
        updated = [...withoutNone, id];
      }
    }
    update360("peerAssessment", "peerNeededHelpFrom", updated);
  };

  const toggleHomeResource = (resId: string) => {
    const current = (currentAssessment.threeSixty?.parentFeedback?.learningResourcesAtHome || []) as string[];
    const matchObj = HOME_LEARNING_RESOURCES.find((r) => r.id === resId);
    const label = matchObj?.labelMarathi || resId;

    const isSelected = current.includes(resId) || current.includes(label);
    let updated: string[];
    if (isSelected) {
      updated = current.filter((x) => x !== resId && x !== label);
    } else {
      updated = [...current, label];
    }
    update360("parentFeedback", "learningResourcesAtHome", updated);
  };

  const handleSave = async (markComplete: boolean = false) => {
    setSaving(true);
    try {
      const assessmentData: HpcSessionAssessment = {
        studentId,
        academicYear,
        stageId,
        classId,
        session,
        status: markComplete ? "completed" : "draft",
        areaAssessments,
        teacherGeneralRemarks,
        completedAt: markComplete ? new Date().toISOString() : undefined,
      };

      await saveHpcSessionAssessment(assessmentData);
      setAssessmentStatus(markComplete ? "completed" : "draft");
      toast.success(
        markComplete
          ? `${session === "session1" ? "प्रथम सत्र (सत्र १)" : "द्वितीय सत्र (सत्र २)"} मूल्यांकन पूर्ण झाले! आता भाग क: वार्षिक सर्वंकष गोषवारा उघडत आहे...`
          : "मूल्यांकन मसुदा (Draft) यशस्वीरित्या सेव्ह झाला!"
      );

      if (markComplete) {
        if (onProceedToPartC) {
          onProceedToPartC();
        } else if (onSaved) {
          onSaved();
        } else {
          navigate({
            to: "/teacher/hpc/assessment/$studentId",
            params: { studentId },
            search: { tab: "annual" } as any,
          });
        }
      } else {
        if (onSaved) onSaved();
      }
    } catch (err: any) {
      toast.error("मूल्यांकन सेव्ह करताना त्रुटी: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const currentAreaIndex = useMemo(() => {
    return areas.findIndex((a) => a.id === currentArea?.id);
  }, [areas, currentArea]);

  const isFirstArea = currentAreaIndex <= 0;
  const isLastArea = currentAreaIndex === areas.length - 1;
  const nextArea = !isLastArea && currentAreaIndex >= 0 ? areas[currentAreaIndex + 1] : null;
  const prevArea = !isFirstArea && currentAreaIndex >= 0 ? areas[currentAreaIndex - 1] : null;

  const handlePrevArea = () => {
    if (prevArea) {
      setActiveAreaId(prevArea.id);
      window.scrollTo({ top: 180, behavior: "smooth" });
    }
  };

  const handleSaveAndNext = async () => {
    if (!nextArea) return;
    setSaving(true);
    try {
      const assessmentData: HpcSessionAssessment = {
        studentId,
        academicYear,
        stageId,
        classId,
        session,
        status: "draft",
        areaAssessments,
        teacherGeneralRemarks,
      };

      await saveHpcSessionAssessment(assessmentData);
      toast.success(
        `${currentArea?.nameMarathi || "क्षेत्र"} मसुदा जतन झाला! आता पुढील क्षेत्र: ${nextArea.nameMarathi} उघडले आहे.`
      );
      setActiveAreaId(nextArea.id);
      window.scrollTo({ top: 180, behavior: "smooth" });
      if (onSaved) onSaved();
    } catch (err: any) {
      toast.error("मूल्यांकन सेव्ह करताना त्रुटी: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-600">मूल्यांकन फॉर्म लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* ---------------- Top Banner ---------------- */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="size-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="size-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white flex items-center justify-center font-black text-xl shadow-md overflow-hidden">
            {student?.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              student?.name?.charAt(0) || "वि"
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                भाग ब: विकासात्मक / विषयनिहाय मूल्यांकन
              </span>
              <span className="text-xs font-bold text-slate-500">
                हजेरी क्र: <b className="text-slate-800">{student?.rollNo}</b>
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  assessmentStatus === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {assessmentStatus === "completed" ? "✓ पूर्ण (Completed)" : "मसुदा (Draft)"}
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              {student?.fullName || student?.name}
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              {HPC_STAGES_INFO.find((s) => s.id === stageId)?.titleMarathi} | {classId} वर्ग | {academicYear}
            </p>
          </div>
        </div>

        {/* Session Switcher & Save Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
          {/* Session Switcher Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setSession("session1")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                session === "session1"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              प्रथम सत्र (Session 1)
            </button>
            <button
              onClick={() => setSession("session2")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                session === "session2"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              द्वितीय सत्र (Session 2)
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="size-3.5" />
            <span>मसुदा सेव्ह (Draft)</span>
          </button>

          {!isLastArea ? (
            <button
              type="button"
              onClick={handleSaveAndNext}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span>जतन व पुढील क्षेत्र →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="size-3.5" />
              <span>जतन करा आणि भाग क वर जा →</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- Area / Subject Tabs ---------------- */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-xs">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-3 pt-1 pb-2">
          {isFoundational ? "६ विकास क्षेत्रे (6 Developmental Areas):" : "मूल्यांकन विषय सूची (Subjects):"}
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {areas.map((area, idx) => {
            const isSelected = activeAreaId === area.id;
            const areaRecord = areaAssessments[area.id];
            const hasLevels =
              areaRecord &&
              areaRecord.awarenessLevel &&
              areaRecord.sensitivityLevel &&
              areaRecord.creativityLevel;

            return (
              <button
                key={area.id}
                onClick={() => setActiveAreaId(area.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-[1.01]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                <span className="opacity-70">{area.code}</span>
                <span>{area.nameMarathi}</span>
                {hasLevels && (
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- Active Area Card Container ---------------- */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
        {/* Area Header */}
        <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                {currentArea?.code}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {session === "session1" ? "प्रथम सत्र (Term 1)" : "द्वितीय सत्र (Term 2)"}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              {currentArea?.nameMarathi}
            </h3>
            <p className="text-xs text-slate-500 font-semibold">{currentArea?.nameEnglish}</p>
          </div>
        </div>

        {/* ---------------- 1. Curricular Goals (CG) Checkboxes ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="size-4 text-indigo-600" />
              <span>अभ्यासक्रमाची ध्येये (Curricular Goals - CG)</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-bold">
              लागू ध्येयांवर खूण करा (Select Applicable)
            </span>
          </div>

          <div className="space-y-2.5 mt-4">
            {availableGoals.map((goal) => {
              const isSelected = (currentAssessment.selectedGoalIds || []).includes(goal.id);
              return (
                <div
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-400 text-indigo-950 shadow-xs"
                      : "bg-slate-50/40 hover:bg-slate-100/70 border-slate-200 text-slate-700"
                  }`}
                >
                  <div
                    className={`size-5 rounded-lg border mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-700 mr-2">{goal.code}*:</span>
                    <span className="text-xs sm:text-sm font-bold leading-relaxed">
                      {goal.titleMarathi}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- 2. Competencies (क्षमता) ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="size-4 text-purple-600" />
              <span>क्षमता (Competencies - C)**</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-bold">
              निवडलेल्या ध्येयांनुसार लागू क्षमता (Auto-filtered)
            </span>
          </div>

          {(!currentAssessment.selectedGoalIds || currentAssessment.selectedGoalIds.length === 0) ? (
            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl mt-4 text-center space-y-1.5">
              <AlertCircle className="size-5 text-amber-600 mx-auto" />
              <p className="text-xs font-black text-amber-900">
                कृपया प्रथम वरील अभ्यासक्रमाच्या ध्येयांपैकी (CG) किमान एक ध्येय निवडा.
              </p>
              <p className="text-[11px] text-amber-700 font-medium">
                तुम्ही ध्येय निवडल्यानंतर, केवळ त्या ध्येयाशी संबंधित क्षमता (Competencies) येथे दिसतील.
              </p>
            </div>
          ) : availableCompetencies.length === 0 ? (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl mt-4 text-center space-y-1.5">
              <AlertCircle className="size-5 text-slate-400 mx-auto" />
              <p className="text-xs font-black text-slate-700">
                निवडलेल्या ध्येयासाठी कोणतीही क्षमता उपलब्ध नाही.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 mt-4">
              {availableCompetencies.map((comp) => {
                const isChecked = (currentAssessment.selectedCompetencyIds || []).includes(comp.id);
                return (
                  <div
                    key={comp.id}
                    onClick={() => toggleCompetency(comp.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isChecked
                        ? "bg-purple-50/70 border-purple-400 text-purple-950 shadow-xs ring-2 ring-purple-100"
                        : "bg-slate-50/40 hover:bg-slate-100/70 border-slate-200 text-slate-700"
                    }`}
                  >
                    <div
                      className={`size-5 rounded-lg border mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                        isChecked
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-black text-purple-700 mr-2">📌 {comp.code}:</span>
                      <span className="text-xs sm:text-sm font-bold leading-relaxed">
                        {comp.titleMarathi}
                      </span>
                    </div>
                    {isChecked && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white shrink-0">
                        सक्रिय क्षमता ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------- 3. Activities & Outcomes (उपक्रम व कृती) ---------------- */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Layers className="size-4 text-emerald-600" />
                <span>
                  {bankData && bankData.activities?.length > 0
                    ? `उपक्रम बँक (${bankData.activities.length} पैकी १ उपक्रम निवडा)`
                    : "सविस्तर उपक्रम व कृती (Activities & Learning Outcomes)"}
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                {bankData && bankData.activities?.length > 0
                  ? "खालील उपक्रमांपैकी एका उपक्रमाची निवड करा, त्याचे ५ प्रश्न खाली आपोआप जोडले जातील."
                  : "उपक्रमाचे नाव, वर्णन व निष्पत्ती नोंदवा."}
              </p>
            </div>

            {availableCompetencies.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500">क्षमता निवडा:</span>
                <select
                  value={activeBankCompCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedBankCompCode(val);
                    if (val) {
                      const match = availableCompetencies.find((c) => c.code === val);
                      if (match && !(currentAssessment.selectedCompetencyIds || []).includes(match.id)) {
                        updateCurrentAssessment({
                          selectedCompetencyIds: [...(currentAssessment.selectedCompetencyIds || []), match.id],
                        });
                      }
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-black rounded-full border border-indigo-200 bg-indigo-50/70 text-indigo-900 cursor-pointer max-w-[260px] shadow-2xs"
                >
                  <option value="">-- कृपया क्षमता निवडा --</option>
                  {availableCompetencies.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code}: {c.titleMarathi.slice(0, 30)}...
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!activeBankCompCode ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl mt-4 text-center space-y-2">
              <Sparkles className="size-6 text-purple-600 mx-auto" />
              <p className="text-xs font-black text-slate-800">
                कृपया वरीलपैकी मूल्यमापनासाठी एक क्षमता (C) निवडा.
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                तुम्ही क्षमता निवडल्यानंतर, केवळ त्या क्षमतेसाठी असलेले उपक्रम व त्यांचे ५ प्रश्न खाली दिसतील.
              </p>
            </div>
          ) : bankData && bankData.activities?.length > 0 ? (
            <div className="space-y-2.5 mt-3">
              {/* Clean 5-Row Activity List with Full Text (No Truncation) */}
              <div className="space-y-2">
                {bankData.activities.map((act) => {
                  const isSelected =
                    (currentAssessment.activity1Title || bankData.activities[0]?.title) === act.title;

                  const badgeColors = [
                    "text-emerald-800 bg-emerald-100 border-emerald-300",
                    "text-teal-800 bg-teal-100 border-teal-300",
                    "text-blue-800 bg-blue-100 border-blue-300",
                    "text-purple-800 bg-purple-100 border-purple-300",
                    "text-amber-800 bg-amber-100 border-amber-300",
                  ];
                  const badgeClass = badgeColors[(act.activityNumber - 1) % badgeColors.length];

                  return (
                    <div
                      key={act.activityNumber}
                      onClick={() => handleSelectBankActivity(act)}
                      className={`p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-100 shadow-xs"
                          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs"
                      }`}
                    >
                      {/* Left: Badge + Full Title + Full Description */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black uppercase border flex-shrink-0 mt-0.5 ${badgeClass}`}
                        >
                          उपक्रम {act.activityNumber}
                        </span>

                        <div className="space-y-1 min-w-0 flex-1">
                          <h5 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                            {act.title}
                          </h5>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">
                            {act.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: 5 Questions Pill + Select Action Button */}
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end justify-between flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 sm:text-right whitespace-nowrap">
                          ५ प्रश्न समाविष्ट
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectBankActivity(act);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            isSelected
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700"
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <Check className="size-3.5 stroke-[3]" />
                              <span>निवडला आहे ✓</span>
                            </>
                          ) : (
                            <span>हा उपक्रम निवडा</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Activity Details & Outcome (Compact, Editable) */}
              {(() => {
                const selectedAct =
                  bankData.activities.find(
                    (act) => (currentAssessment.activity1Title || bankData.activities[0]?.title) === act.title
                  ) || bankData.activities[0];

                if (!selectedAct) return null;

                return (
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/20 space-y-2.5 shadow-2xs mt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-md bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                          ✓
                        </span>
                        <span className="text-xs sm:text-sm font-black text-emerald-950">
                          सध्या निवडलेला उपक्रम {selectedAct.activityNumber} — नाव व सविस्तर वर्णन (संपादनक्षम):
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                        खाली ५ प्रश्न आपोआप जोडले गेले आहेत ↓
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 mb-1">
                          उपक्रमाचे नाव / कृती:
                        </label>
                        <input
                          type="text"
                          value={currentAssessment.activity1Title || selectedAct.title}
                          onChange={(e) => updateCurrentAssessment({ activity1Title: e.target.value })}
                          className="w-full px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-slate-700 mb-1">
                          उपक्रमाचे सविस्तर वर्णन:
                        </label>
                        <textarea
                          rows={2}
                          value={currentAssessment.activity1Description || selectedAct.description}
                          onChange={(e) => updateCurrentAssessment({ activity1Description: e.target.value })}
                          className="w-full px-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs resize-none focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            /* Standard Activity 1 & 2 for Preparatory / Middle stages */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {/* Activity 1 */}
              <div className="p-5 sm:p-6 rounded-[28px] border border-slate-200/90 bg-white space-y-4 shadow-xs">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase text-emerald-800 bg-emerald-100">
                  उपक्रम १ (ACTIVITY 1)
                </span>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5">
                    उपक्रमाचे नाव / कृती
                  </label>
                  <input
                    type="text"
                    value={currentAssessment.activity1Title || ""}
                    onChange={(e) => updateCurrentAssessment({ activity1Title: e.target.value })}
                    placeholder="उदा. दैनंदिन व्यायाम / चित्र निरीक्षण / शब्दसंपत्ती वाढवणे"
                    className="w-full px-5 py-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5">
                    उपक्रमाचे सविस्तर वर्णन
                  </label>
                  <textarea
                    rows={3}
                    value={currentAssessment.activity1Description || ""}
                    onChange={(e) => updateCurrentAssessment({ activity1Description: e.target.value })}
                    placeholder="कृतीचे स्वरूप व पद्धत..."
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5">
                    निष्पत्ती (Learning Outcome)
                  </label>
                  <input
                    type="text"
                    value={currentAssessment.activity1Outcome || ""}
                    onChange={(e) => updateCurrentAssessment({ activity1Outcome: e.target.value })}
                    placeholder="उदा. विद्यार्थ्यांमध्ये संघभावना व शारीरिक तंदुरुस्ती वाढते."
                    className="w-full px-5 py-3 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Activity 2 */}
              <div className="p-5 sm:p-6 rounded-[28px] border border-slate-200/90 bg-white space-y-4 shadow-xs">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase text-teal-800 bg-teal-100">
                  उपक्रम २ (ACTIVITY 2)
                </span>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5">
                    उपक्रमाचे नाव / कृती
                  </label>
                  <input
                    type="text"
                    value={currentAssessment.activity2Title || ""}
                    onChange={(e) => updateCurrentAssessment({ activity2Title: e.target.value })}
                    placeholder="उदा. खेळ आणि स्पर्धा / कोडी सोडवणे / भूमिका अभिनय"
                    className="w-full px-5 py-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5">
                    उपक्रमाचे सविस्तर वर्णन
                  </label>
                  <textarea
                    rows={3}
                    value={currentAssessment.activity2Description || ""}
                    onChange={(e) => updateCurrentAssessment({ activity2Description: e.target.value })}
                    placeholder="कृतीचे स्वरूप व पद्धत..."
                    className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5">
                    निष्पत्ती (Learning Outcome)
                  </label>
                  <input
                    type="text"
                    value={currentAssessment.activity2Outcome || ""}
                    onChange={(e) => updateCurrentAssessment({ activity2Outcome: e.target.value })}
                    placeholder="उदा. समस्या सोडवण्याचे कौशल्य व बौद्धिक क्षमता वाढते."
                    className="w-full px-5 py-3 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- 4. Assessment Questions (मूल्यमापनासाठी प्रश्न) ---------------- */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <HelpCircle className="size-4 text-sky-600" />
                <span>मूल्यमापनासाठी विचारलेले प्रश्न (Assessment Questions)</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                निवडलेल्या उपक्रमावर आधारित प्रश्न (शिक्षकांनी विचारून विद्यार्थ्यांचे मूल्यमापन करावे):
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-100 text-sky-800">
                {(
                  currentAssessment.assessmentQuestions && currentAssessment.assessmentQuestions.length > 0
                    ? currentAssessment.assessmentQuestions
                    : bankData?.activities?.[0]?.questions
                    ? bankData.activities[0].questions
                    : ["", "", "", "", ""]
                ).length} प्रश्न उपलब्ध
              </span>

              {bankData?.activities && (
                <button
                  type="button"
                  onClick={handleResetQuestions}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                  title="उपक्रमाचे मूळ प्रश्न पुन्हा लोड करा"
                >
                  <RotateCcw className="size-3 text-slate-500" />
                  <span className="hidden sm:inline">मूळ प्रश्न रिसेट करा</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-1.5 text-xs font-black text-white bg-sky-600 hover:bg-sky-700 rounded-full transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="size-3.5 stroke-[3]" />
                <span>+ नवीन प्रश्न जोडा</span>
              </button>
            </div>
          </div>

          {!activeBankCompCode ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl mt-4 text-center space-y-1.5">
              <HelpCircle className="size-5 text-slate-400 mx-auto" />
              <p className="text-xs font-black text-slate-700">
                कृपया वरील क्षमता व उपक्रम निवडा.
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                उपक्रम निवडल्यानंतर त्या उपक्रमाचे ५ प्रश्न येथे दिसतील व संपादन करता येतील.
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-[28px] border border-slate-200/90 bg-slate-50/50 space-y-2.5 mt-4">
              {(() => {
                const activeQuestions =
                  currentAssessment.assessmentQuestions && currentAssessment.assessmentQuestions.length > 0
                    ? currentAssessment.assessmentQuestions
                    : bankData?.activities?.[0]?.questions
                    ? bankData.activities[0].questions
                    : ["", "", "", "", ""];

                return (
                  <>
                    {activeQuestions.map((qText, qIndex) => {
                      const marathiNums = ["१", "२", "३", "४", "५", "६", "७", "८", "९", "१०"];
                      const qNumberStr = marathiNums[qIndex] || toMarathiDigits(qIndex + 1);

                      return (
                        <div
                          key={qIndex}
                          className="flex items-center gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-sky-300 transition-all group"
                        >
                          {/* Number Badge */}
                          <div className="size-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                            {qNumberStr}
                          </div>

                          {/* Input Question Text */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={qText}
                              onChange={(e) => {
                                const updated = [...activeQuestions];
                                updated[qIndex] = e.target.value;
                                updateCurrentAssessment({ assessmentQuestions: updated });
                              }}
                              placeholder={`उदा. प्रश्न क्र. ${qIndex + 1}... (इथे स्वतःचा प्रश्न टाईप करा)`}
                              className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none"
                            />
                          </div>

                          {/* Label Badge */}
                          <span className="text-[11px] font-black text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100 hidden sm:inline-block flex-shrink-0">
                            प्रश्न {qNumberStr}
                          </span>

                          {/* Delete Question Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIndex)}
                            className="size-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
                            title={`प्रश्न क्र. ${qIndex + 1} हटवा (Delete Question)`}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add Own Question Card Button */}
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full py-2.5 px-4 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-white hover:bg-sky-50/60 text-sky-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-2"
                    >
                      <Plus className="size-4 stroke-[3]" />
                      <span>+ स्वतःचा नवीन प्रश्न जोडा (Add Your Own Question)</span>
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* ---------------- 5. Performance Dimensions Matrix (कामगिरी स्तर मूल्यमापन - Rubrics Chart) ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="size-4 text-amber-500" />
                <span>कामगिरी स्तर मूल्यमापन (Performance Dimensions & Rubric Levels)</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                प्रत्येक पैलूसाठी विद्यार्थ्याचा योग्य स्तर निवडा: {levelLabels.beginner} | {levelLabels.proficient} | {levelLabels.advanced}
              </p>
            </div>
          </div>

          {!activeBankCompCode ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl mt-4 text-center space-y-1.5">
              <Sparkles className="size-5 text-slate-400 mx-auto" />
              <p className="text-xs font-black text-slate-700">
                कृपया वरील अभ्यासक्रम ध्येय, क्षमता आणि उपक्रम निवडा.
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                उपक्रम निवडल्यानंतर त्या उपक्रमाचे मूल्यांकन निकष (Rubrics) येथे स्तर निवडीसाठी उपलब्ध होतील.
              </p>
            </div>
          ) : (
            <div className="space-y-5 mt-5">
            {currentAssessment.activity1Title && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 font-bold">
                <CheckCircle2 className="size-4 text-blue-600 shrink-0" />
                <span>निवडलेला उपक्रम: <b className="text-slate-900">"{currentAssessment.activity1Title}"</b> चे सविस्तर मूल्यांकन रुब्रिक्स</span>
              </div>
            )}
            {dynamicRubricsForAssessment.length > 0 ? (
              dynamicRubricsForAssessment.map((rub, rIdx) => {
                const dimLower = (rub.dimension || "").toLowerCase();
                let levelKey: "awarenessLevel" | "sensitivityLevel" | "creativityLevel" = "awarenessLevel";
                let textKey: "awarenessText" | "sensitivityText" | "creativityText" = "awarenessText";
                let dimEnglish = "Awareness";

                if (dimLower.includes("संवेदन") || dimLower.includes("sensitivity")) {
                  levelKey = "sensitivityLevel";
                  textKey = "sensitivityText";
                  dimEnglish = "Sensitivity";
                } else if (dimLower.includes("सर्जन") || dimLower.includes("creativity")) {
                  levelKey = "creativityLevel";
                  textKey = "creativityText";
                  dimEnglish = "Creativity";
                } else if (dimLower.includes("जाणीव") || dimLower.includes("awareness")) {
                  levelKey = "awarenessLevel";
                  textKey = "awarenessText";
                  dimEnglish = "Awareness";
                } else if (rIdx === 1) {
                  levelKey = "sensitivityLevel";
                  textKey = "sensitivityText";
                  dimEnglish = "Sensitivity";
                } else if (rIdx === 2) {
                  levelKey = "creativityLevel";
                  textKey = "creativityText";
                  dimEnglish = "Creativity";
                }

                const currentLevel = currentAssessment[levelKey];
                const colorThemes = [
                  {
                    border: "border-blue-200",
                    bg: "bg-blue-50/30",
                    badge: "bg-blue-600 text-white",
                    titleText: "text-blue-950",
                    subText: "text-blue-700",
                    ring: "ring-blue-100",
                    activeBorder: "border-blue-600",
                    checkBg: "bg-blue-600 border-blue-600 text-white",
                  },
                  {
                    border: "border-rose-200",
                    bg: "bg-rose-50/30",
                    badge: "bg-rose-600 text-white",
                    titleText: "text-rose-950",
                    subText: "text-rose-700",
                    ring: "ring-rose-100",
                    activeBorder: "border-rose-600",
                    checkBg: "bg-rose-600 border-rose-600 text-white",
                  },
                  {
                    border: "border-purple-200",
                    bg: "bg-purple-50/30",
                    badge: "bg-purple-600 text-white",
                    titleText: "text-purple-950",
                    subText: "text-purple-700",
                    ring: "ring-purple-100",
                    activeBorder: "border-purple-600",
                    checkBg: "bg-purple-600 border-purple-600 text-white",
                  },
                  {
                    border: "border-amber-200",
                    bg: "bg-amber-50/30",
                    badge: "bg-amber-600 text-white",
                    titleText: "text-amber-950",
                    subText: "text-amber-700",
                    ring: "ring-amber-100",
                    activeBorder: "border-amber-600",
                    checkBg: "bg-amber-600 border-amber-600 text-white",
                  },
                ];
                const theme = colorThemes[rIdx % colorThemes.length];

                return (
                  <div
                    key={rub.id || rIdx}
                    className={`p-4 sm:p-5 rounded-2xl border ${theme.border} ${theme.bg} space-y-3`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${theme.badge}`}>
                          पैलू {toMarathiDigits(rIdx + 1)}
                        </span>
                        <span className={`text-sm font-black ${theme.titleText}`}>
                          {rub.dimension} ({dimEnglish})
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${theme.subText}`}>
                        निवडलेला स्तर:{" "}
                        <b>{currentLevel ? levelLabels[currentLevel] : "निवडला नाही"}</b>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                        const isLvl = currentLevel === lvl;
                        const label = levelLabels[lvl];
                        const desc = rub[lvl] || "";

                        return (
                          <div
                            key={lvl}
                            onClick={() =>
                              updateCurrentAssessment({
                                [levelKey]: lvl,
                                [textKey]: desc,
                              } as any)
                            }
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                              isLvl
                                ? `bg-white ${theme.activeBorder} shadow-md ring-2 ${theme.ring}`
                                : "bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-900">{label}</span>
                                <div
                                  className={`size-4 rounded-full border flex items-center justify-center ${
                                    isLvl ? theme.checkBg : "border-slate-300"
                                  }`}
                                >
                                  {isLvl && <Check className="size-3" />}
                                </div>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                {desc || "माहिती उपलब्ध नाही"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {/* Dimension 1: Awareness */}
                <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white">
                        पैलू १
                      </span>
                      <span className="text-sm font-black text-blue-950">
                        {HPC_CORE_RUBRICS.awareness.titleMarathi} ({HPC_CORE_RUBRICS.awareness.titleEnglish})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-blue-700">
                      निवडलेला स्तर: <b>{currentAssessment.awarenessLevel ? levelLabels[currentAssessment.awarenessLevel] : "निवडला नाही"}</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                      const isLvl = currentAssessment.awarenessLevel === lvl;
                      const rubricInfo = HPC_CORE_RUBRICS.awareness.levels[lvl];
                      const label = isFoundational ? rubricInfo.labelFoundational : rubricInfo.labelStandard;

                      return (
                        <div
                          key={lvl}
                          onClick={() => updateCurrentAssessment({ awarenessLevel: lvl })}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isLvl
                              ? "bg-white border-blue-600 shadow-md ring-2 ring-blue-100"
                              : "bg-white/80 hover:bg-white border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-slate-900">{label}</span>
                              <div
                                className={`size-4 rounded-full border flex items-center justify-center ${
                                  isLvl ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300"
                                }`}
                              >
                                {isLvl && <Check className="size-3" />}
                              </div>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">{rubricInfo.shortDesc}</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                              {rubricInfo.detailedDesc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dimension 2: Sensitivity */}
                <div className="p-4 sm:p-5 rounded-2xl border border-rose-200 bg-rose-50/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-rose-600 text-white">
                        पैलू २
                      </span>
                      <span className="text-sm font-black text-rose-950">
                        {HPC_CORE_RUBRICS.sensitivity.titleMarathi} ({HPC_CORE_RUBRICS.sensitivity.titleEnglish})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-700">
                      निवडलेला स्तर: <b>{currentAssessment.sensitivityLevel ? levelLabels[currentAssessment.sensitivityLevel] : "निवडला नाही"}</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                      const isLvl = currentAssessment.sensitivityLevel === lvl;
                      const rubricInfo = HPC_CORE_RUBRICS.sensitivity.levels[lvl];
                      const label = isFoundational ? rubricInfo.labelFoundational : rubricInfo.labelStandard;

                      return (
                        <div
                          key={lvl}
                          onClick={() => updateCurrentAssessment({ sensitivityLevel: lvl })}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isLvl
                              ? "bg-white border-rose-600 shadow-md ring-2 ring-rose-100"
                              : "bg-white/80 hover:bg-white border-slate-200 hover:border-rose-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-slate-900">{label}</span>
                              <div
                                className={`size-4 rounded-full border flex items-center justify-center ${
                                  isLvl ? "bg-rose-600 border-rose-600 text-white" : "border-slate-300"
                                }`}
                              >
                                {isLvl && <Check className="size-3" />}
                              </div>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">{rubricInfo.shortDesc}</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                              {rubricInfo.detailedDesc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Dimension 3: Creativity */}
                <div className="p-4 sm:p-5 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-purple-600 text-white">
                        पैलू ३
                      </span>
                      <span className="text-sm font-black text-purple-950">
                        {HPC_CORE_RUBRICS.creativity.titleMarathi} ({HPC_CORE_RUBRICS.creativity.titleEnglish})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-purple-700">
                      निवडलेला स्तर: <b>{currentAssessment.creativityLevel ? levelLabels[currentAssessment.creativityLevel] : "निवडला नाही"}</b>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                      const isLvl = currentAssessment.creativityLevel === lvl;
                      const rubricInfo = HPC_CORE_RUBRICS.creativity.levels[lvl];
                      const label = isFoundational ? rubricInfo.labelFoundational : rubricInfo.labelStandard;

                      return (
                        <div
                          key={lvl}
                          onClick={() => updateCurrentAssessment({ creativityLevel: lvl })}
                          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isLvl
                              ? "bg-white border-purple-600 shadow-md ring-2 ring-purple-100"
                              : "bg-white/80 hover:bg-white border-slate-200 hover:border-purple-300"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-black text-slate-900">{label}</span>
                              <div
                                className={`size-4 rounded-full border flex items-center justify-center ${
                                  isLvl ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300"
                                }`}
                              >
                                {isLvl && <Check className="size-3" />}
                              </div>
                            </div>
                            <p className="text-[11px] font-bold text-slate-500 mb-1.5">{rubricInfo.shortDesc}</p>
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium line-clamp-4">
                              {rubricInfo.detailedDesc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          )}
        </div>

        {/* ---------------- 6. Teacher Observation & Guidance (शिक्षक मूल्यमापन व मार्गदर्शन) ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="size-4 text-orange-600" />
                <span>शिक्षक मूल्यमापन व मार्गदर्शन (Teacher Observation & Guidance)</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                शिक्षकांचे प्रत्यक्ष निरीक्षण, शेरा व पुढील सुधारणेसाठी वैयक्तिक मार्गदर्शन नोंदी:
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-[28px] border border-orange-200/90 bg-white space-y-4 shadow-xs mt-4">
            {/* Header: Title & स्तर निवडा (प्रवाह (निर्झर), पर्वत, आकाश - No 'All' option) */}
            <div className="flex items-center justify-between gap-3 flex-wrap pb-1 border-b border-orange-100">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  <Award className="size-3.5" />
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  शिक्षक मूल्यमापन व मार्गदर्शन (Teacher Observation)
                </span>
              </div>

              {/* स्तर निवडा: (प्रवाह (निर्झर) / पर्वत / आकाश) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 mr-1">स्तर निवडा:</span>
                {[
                  { key: "nirjhar", label: "प्रवाह (निर्झर)", color: "bg-emerald-600 ring-emerald-200" },
                  { key: "parvat", label: "पर्वत", color: "bg-indigo-600 ring-indigo-200" },
                  { key: "aakash", label: "आकाश", color: "bg-sky-600 ring-sky-200" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setTeacherLevelFilter(tab.key as any);
                      update360("teacherRemarks", "level", tab.key);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      teacherLevelFilter === tab.key
                        ? `${tab.color} text-white shadow-2xs ring-2`
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content: Left Column Chart Graphic + Right Column Controls & Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start pt-1">
              {/* Left Column: Recreated प्राविण्य स्तर Circular Chart */}
              <div className="md:col-span-4 lg:col-span-3 flex justify-center md:justify-start">
                <PravinyaStharChart
                  selectedLevel={teacherLevelFilter}
                  onSelectLevel={(lvl) => {
                    setTeacherLevelFilter(lvl);
                    update360("teacherRemarks", "level", lvl);
                  }}
                  size={155}
                />
              </div>

              {/* Right Column: Level Info, Filtered Remarks Dropdown, Guidance Suggestions & Inputs */}
              <div className="md:col-span-8 lg:col-span-9 space-y-3.5">
                {/* Level indicator banner */}
                <div
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center justify-between gap-2 ${
                    teacherLevelFilter === "nirjhar"
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : teacherLevelFilter === "parvat"
                      ? "bg-indigo-50/70 border-indigo-200 text-indigo-900"
                      : "bg-sky-50/70 border-sky-200 text-sky-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black">
                      {teacherLevelFilter === "nirjhar"
                        ? "प्रवाह (निर्झर) स्तर:"
                        : teacherLevelFilter === "parvat"
                        ? "पर्वत स्तर:"
                        : "आकाश स्तर:"}
                    </span>
                    <span className="text-[11px] text-slate-600 font-semibold">
                      {teacherLevelFilter === "nirjhar"
                        ? "प्रारंभिक टप्पा — शिक्षकांच्या मदतीने व मार्गदर्शनाने कृती समजून घेणे."
                        : teacherLevelFilter === "parvat"
                        ? "प्रवीण टप्पा — संकल्पनांची चांगली समज व स्वतःहून कृती पूर्ण करणे."
                        : "प्रगत टप्पा — उच्च पातळीवरील प्राविण्य, कल्पकता व नेतृत्व गुण."}
                    </span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white shadow-2xs border border-slate-200 whitespace-nowrap">
                    {availableTeacherRemarks.length} पर्याय उपलब्ध
                  </span>
                </div>

                {/* Ready Teacher Remarks Dropdown from Bank (Filtered strictly by selected स्तर, without level name in text) */}
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-orange-900 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-orange-600" />
                      <span>
                        तयार शिक्षकांचा शेरा निवडा ({availableTeacherRemarks.length} पर्याय उपलब्ध):
                      </span>
                    </span>
                    <span className="text-[10px] text-orange-700 font-bold">
                      {teacherLevelFilter === "nirjhar"
                        ? "प्रवाह (निर्झर)"
                        : teacherLevelFilter === "parvat"
                        ? "पर्वत"
                        : "आकाश"}
                    </span>
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-orange-300 text-xs font-semibold bg-white text-slate-800 cursor-pointer shadow-xs focus:ring-2 focus:ring-orange-400"
                    onChange={(e) => {
                      if (e.target.value) {
                        update360("teacherRemarks", "observation", e.target.value);
                      }
                    }}
                    value=""
                  >
                    <option value="">
                      -- तयार शिक्षकांचा शेरा निवडा ({availableTeacherRemarks.length} पर्याय उपलब्ध) --
                    </option>
                    {availableTeacherRemarks.map((remark, idx) => (
                      <option key={idx} value={remark}>
                        {idx + 1}. {remark}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ready Guidance Suggestions Dropdown */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <label className="block text-[11px] font-black text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-indigo-600" />
                      <span>
                        तयार वैयक्तिक मार्गदर्शन सूचना निवडा ({availableGuidanceSuggestions.length} पर्याय उपलब्ध):
                      </span>
                    </span>
                  </label>
                  <select
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-800 cursor-pointer shadow-xs focus:ring-2 focus:ring-indigo-400"
                    onChange={(e) => {
                      if (e.target.value) {
                        update360("teacherRemarks", "guidanceSuggestion", e.target.value);
                      }
                    }}
                    value=""
                  >
                    <option value="">-- तयार वैयक्तिक मार्गदर्शन सूचना निवडा --</option>
                    {availableGuidanceSuggestions.map((sug, idx) => (
                      <option key={idx} value={sug}>
                        {idx + 1}. {sug}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Editable Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      शिक्षकांचे प्रत्यक्ष निरीक्षण व शेरा *:
                    </label>
                    <input
                      type="text"
                      value={currentAssessment.threeSixty?.teacherRemarks?.observation || ""}
                      onChange={(e) => update360("teacherRemarks", "observation", e.target.value)}
                      placeholder="उदा. खेळांच्या माध्यमातून तू छान शिकतोस / रोज उपस्थित राहण्याची सवय कर."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      पुढील सुधारणेसाठी वैयक्तिक सूचना:
                    </label>
                    <input
                      type="text"
                      value={currentAssessment.threeSixty?.teacherRemarks?.guidanceSuggestion || ""}
                      onChange={(e) => update360("teacherRemarks", "guidanceSuggestion", e.target.value)}
                      placeholder="उदा. अक्षरे गिरवण्याचा सराव नियमित करावा."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 7. 360-Degree Assessment: Student & Peer (Image 3) ---------------- */}
        <div>
          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Heart className="size-4 text-pink-600" />
            <span>३६० अंश बहुआयामी मूल्यमापन (360-Degree Feedback Sources)</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            {/* 1. Student Self-Assessment (स्वयं मूल्यमापन) */}
            <div className="p-4 sm:p-5 rounded-[28px] border border-orange-200/90 bg-white space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  १
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  स्वयं मूल्यमापन (Student Self-Assessment)
                </span>
              </div>

              {/* 1st Question: आवडले */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  मला हे काम करायला आवडले:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("selfAssessment", "likedActivity", opt.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.selfAssessment?.likedActivity === opt.value
                          ? "bg-orange-500 text-white border-orange-500 shadow-xs font-black scale-102"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50 hover:border-orange-200"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2nd Question: सोपे वाटले */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  मला हे काम सोपे वाटले:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("selfAssessment", "feltEasy", opt.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.selfAssessment?.feltEasy === opt.value
                          ? "bg-orange-500 text-white border-orange-500 shadow-xs font-black scale-102"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50 hover:border-orange-200"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3rd Question: करताना मदत लागते */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>करताना मदत लागते:</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(कोणाची मदत लागते)</span>
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {HELP_NEEDED_OPTIONS.map((opt) => {
                    const isSelected = (currentAssessment.threeSixty?.selfAssessment?.neededHelpFrom || []).includes(opt.id);
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleSelfHelp(opt.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-orange-500 text-white border-orange-500 shadow-xs scale-102 font-black"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-orange-50 hover:border-orange-200"
                        }`}
                      >
                        <IconComp className={`size-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        <span>{opt.labelMarathi}</span>
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Remark Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  विद्यार्थ्याचा स्वतःचा शेरा / मत:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.selfAssessment?.customRemark || ""}
                  onChange={(e) => update360("selfAssessment", "customRemark", e.target.value)}
                  placeholder="उदा. मला चित्र काढायला खूप आवडते / वाचनाचा सराव करतो."
                  className="w-full px-5 py-2.5 rounded-full border border-slate-200 text-xs font-medium bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* 2. Peer Assessment (सहकारी मूल्यमापन) */}
            <div className="p-4 sm:p-5 rounded-[28px] border border-teal-200/90 bg-white space-y-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center shadow-xs">
                  २
                </span>
                <span className="text-xs sm:text-sm font-black text-slate-800">
                  सहकारी मूल्यमापन (Peer Assessment)
                </span>
              </div>

              {/* 1st Question: आवडले */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  माझ्या मित्राला हे काम करायला आवडले:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("peerAssessment", "peerLiked", opt.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.peerAssessment?.peerLiked === opt.value
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs font-black scale-102"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-200"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2nd Question: सोपे वाटले */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  माझ्या मित्राला/मैत्रिणीला हे काम सोपे वाटले:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {SELF_ASSESSMENT_OPTIONS.likedQuestions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update360("peerAssessment", "peerFeltEasy", opt.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        currentAssessment.threeSixty?.peerAssessment?.peerFeltEasy === opt.value
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs font-black scale-102"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-200"
                      }`}
                    >
                      {opt.labelMarathi}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3rd Question: करताना मदत लागते */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>करताना मदत लागते:</span>
                  <span className="text-[10px] text-slate-400 font-semibold">(मित्राला कोणाची मदत लागते)</span>
                </label>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {HELP_NEEDED_OPTIONS.map((opt) => {
                    const isSelected = (currentAssessment.threeSixty?.peerAssessment?.peerNeededHelpFrom || []).includes(opt.id);
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => togglePeerHelp(opt.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs scale-102 font-black"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-200"
                        }`}
                      >
                        <IconComp className={`size-3.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                        <span>{opt.labelMarathi}</span>
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Peer Remark Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  मित्राचा अभिप्राय / शेरा (Peer Remark):
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.peerAssessment?.peerRemarks || ""}
                  onChange={(e) => update360("peerAssessment", "peerRemarks", e.target.value)}
                  placeholder="उदा. याचे चित्र चांगले असते / आम्ही याला सोबत खेळात घेतो."
                  className="w-full px-5 py-2.5 rounded-full border border-slate-200 text-xs font-medium bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 8. Parent Feedback (पालक मूल्यमापन) ---------------- */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="size-4 text-amber-600" />
                <span>पालक मूल्यमापन (Parent Feedback)</span>
              </h4>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                विद्यार्थ्याबद्दल पालकांचे प्रत्यक्ष निरीक्षण, अभिप्राय व अपेक्षा:
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-[28px] border border-amber-200/90 bg-white space-y-4 shadow-xs mt-4">
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center shadow-xs">
                <Users className="size-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800">
                पालक मूल्यमापन (Parent Feedback)
              </span>
            </div>

            {/* घरातील अध्ययन अध्यापन संसाधने (Home Learning & Teaching Resources - Image 1 & 2) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-sky-50/70 border-2 border-sky-200/90 space-y-3 shadow-2xs">
              <div className="text-center space-y-1 pb-1">
                <p className="text-xs sm:text-sm font-black text-slate-800">
                  संबंधित पर्यायाला गोल करा.
                </p>
                <div className="inline-block">
                  <span className="inline-block px-5 py-1.5 rounded-full bg-[#0b63b6] text-white text-xs sm:text-sm font-black shadow-xs tracking-wide">
                    घरातील अध्ययन अध्यापन संसाधने
                  </span>
                </div>
              </div>

              {/* 5 Selectable Resource Cards - Matching Booklet Graphic */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-0 bg-[#e2f1fc] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border-2 border-[#1e78c8]/40 shadow-inner">
                {HOME_LEARNING_RESOURCES.map((res, rIdx) => {
                  const currentList = (currentAssessment.threeSixty?.parentFeedback?.learningResourcesAtHome || []) as string[];
                  const isSelected = currentList.includes(res.id) || currentList.includes(res.labelMarathi);
                  const Icon1 = res.icon1;
                  const Icon2 = (res as any).icon2;

                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => toggleHomeResource(res.id)}
                      className={`relative flex flex-col items-center justify-between p-3 rounded-2xl transition-all cursor-pointer group text-center ${
                        rIdx < 4 ? "sm:border-r sm:border-dashed sm:border-[#1e78c8]/40" : ""
                      } ${
                        isSelected
                          ? "bg-white/95 shadow-md scale-102 ring-2 ring-blue-600"
                          : "hover:bg-white/50"
                      }`}
                      title={`${res.labelMarathi} निवडण्यासाठी क्लिक करा`}
                    >
                      {/* Selection check indicator badge */}
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 size-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                          <Check className="size-3 stroke-[3]" />
                        </span>
                      )}

                      {/* Icon Container with Circled Ring Effect when Selected ("संबंधित पर्यायाला गोल करा") */}
                      <div className="h-14 flex items-center justify-center my-1">
                        <div
                          className={`size-12 sm:size-14 rounded-full flex items-center justify-center transition-all ${
                            isSelected
                              ? "ring-4 ring-rose-500 bg-rose-50/70 shadow-xs scale-105"
                              : "border border-amber-900/20 bg-amber-50/40 group-hover:bg-white group-hover:border-amber-900/40"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <Icon1 className={`size-6 sm:size-7 ${isSelected ? "text-rose-600" : "text-[#96722d]"}`} />
                            {Icon2 && (
                              <Icon2 className={`size-5 sm:size-6 ${isSelected ? "text-rose-600" : "text-[#96722d]"}`} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Marathi Label */}
                      <span
                        className={`text-[11px] sm:text-xs font-black tracking-tight mt-1 transition-colors ${
                          isSelected ? "text-blue-950 font-black" : "text-slate-800"
                        }`}
                      >
                        {res.labelMarathi}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-semibold pt-1">
                <span>विद्यार्थ्याच्या घरी अभ्यासासाठी उपलब्ध असलेल्या साधनांवर क्लिक करा.</span>
                <span className="font-bold text-blue-700">
                  {((currentAssessment.threeSixty?.parentFeedback?.learningResourcesAtHome || []) as string[]).length} साधने निवडली
                </span>
              </div>
            </div>

            {/* Ready Parent Remarks Dropdown from Bank */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-2xs">
              <label className="block text-[11px] font-black text-amber-900 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-600" />
                <span>
                  तयार पालकांचा अभिप्राय निवडा ({bankData?.code ? `${bankData.code} - ` : ""}{effectiveParentRemarks.length} पर्याय उपलब्ध):
                </span>
              </label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs font-semibold bg-white text-slate-800 cursor-pointer shadow-xs focus:ring-2 focus:ring-amber-400"
                onChange={(e) => {
                  if (e.target.value) {
                    update360("parentFeedback", "parentObservations", e.target.value);
                  }
                }}
                defaultValue=""
              >
                <option value="">-- तयार पालकांचा अभिप्राय निवडा ({effectiveParentRemarks.length} पर्याय उपलब्ध) --</option>
                {effectiveParentRemarks.map((remark, idx) => (
                  <option key={idx} value={remark}>
                    {idx + 1}. {remark}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  पालकांचे निरीक्षण व अभिप्राय:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.parentFeedback?.parentObservations || ""}
                  onChange={(e) => update360("parentFeedback", "parentObservations", e.target.value)}
                  placeholder="उदा. वागण्यात पूर्वीपेक्षा शांतपणा आलाय / प्रगतीची अपेक्षा आहे."
                  className="w-full px-5 py-2.5 rounded-full border border-slate-200 text-xs font-medium bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  पालकांच्या अपेक्षा / सूचना:
                </label>
                <input
                  type="text"
                  value={currentAssessment.threeSixty?.parentFeedback?.parentExpectations || ""}
                  onChange={(e) => update360("parentFeedback", "parentExpectations", e.target.value)}
                  placeholder="उदा. गणितात अधिक सराव करावा अशी अपेक्षा आहे."
                  className="w-full px-5 py-2.5 rounded-full border border-slate-200 text-xs font-medium bg-white text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 7. Save Actions ---------------- */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              क्षेत्र {currentAreaIndex + 1} / {areas.length}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              सक्रिय क्षेत्र: <b className="text-slate-800">{currentArea?.nameMarathi}</b>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
            {!isFirstArea && (
              <button
                type="button"
                onClick={handlePrevArea}
                disabled={saving}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="size-4" />
                <span>मागील क्षेत्र</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-black transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="size-4" />
              <span>मसुदा जतन करा (Save Draft)</span>
            </button>

            {!isLastArea ? (
              <button
                type="button"
                onClick={handleSaveAndNext}
                disabled={saving}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-black shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="size-4" />
                <span>जतन करा आणि पुढील क्षेत्र उघडा ({nextArea?.nameMarathi ? nextArea.nameMarathi.slice(0, 18) + '...' : 'पुढील क्षेत्र'})</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="size-4" />
                <span>सत्र मूल्यांकन जतन करा आणि भाग क (वार्षिक गोषवारा) वर जा →</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
