import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
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
import { HpcStageId, HpcCurricularGoal, HpcCompetency } from "@/hpc/types/hpc";
import {
  HPC_STAGES_INFO,
  HPC_CURRICULAR_GOALS,
  HPC_COMPETENCIES,
  getAreasForStage,
} from "@/hpc/data/hpcCurricularGoals";
import { HPC_CORE_RUBRICS } from "@/hpc/data/hpcRubrics";

export const Route = createFileRoute("/admin/hpc-management")({
  head: () => ({
    meta: [{ title: "HPC समग्र प्रगतिपत्रक व्यवस्थापन (Admin HPC Management) — SMART LEARNING" }],
  }),
  component: AdminHpcManagementPage,
});

function AdminHpcManagementPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"goals" | "competencies" | "rubrics" | "stages">("goals");
  const [selectedStage, setSelectedStage] = useState<HpcStageId>("foundational");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom goals & competencies from Firestore
  const [customGoals, setCustomGoals] = useState<HpcCurricularGoal[]>([]);
  const [customCompetencies, setCustomCompetencies] = useState<HpcCompetency[]>([]);
  const [loading, setLoading] = useState(false);

  // New Goal Modal/Form
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoalCode, setNewGoalCode] = useState("");
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalArea, setNewGoalArea] = useState("");

  // New Competency Modal/Form
  const [showAddComp, setShowAddComp] = useState(false);
  const [newCompCode, setNewCompCode] = useState("");
  const [newCompTitle, setNewCompTitle] = useState("");
  const [newCompGoalId, setNewCompGoalId] = useState("");

  const areas = getAreasForStage(selectedStage);

  // Load any custom items from Firestore
  useEffect(() => {
    async function loadCustom() {
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
    }
    loadCustom();
  }, []);

  // Combined goals
  const allGoals = [...HPC_CURRICULAR_GOALS, ...customGoals].filter(
    (g) => g.stageId === selectedStage
  );

  // Combined competencies
  const allCompetencies = [...HPC_COMPETENCIES, ...customCompetencies].filter(
    (c) => c.stageId === selectedStage
  );

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Top Breadcrumb & Return */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft className="size-4" /> मुख्य ॲडमिन डॅशबोर्ड (Back to Admin)
          </Link>

          <Link
            to="/teacher/hpc"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Sparkles className="size-4" /> शिक्षक HPC पोर्टल पहा
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black shadow-lg">
              <ShieldCheck className="size-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                Super Admin Configuration
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
                समग्र प्रगतिपत्रक (HPC) व्यवस्थापन केंद्र
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                अभ्यासक्रमाची ध्येये (Curricular Goals), क्षमता (Competencies), निकषसंच (Rubrics) आणि ३ स्तरांचे टेम्पलेट नियंत्रण
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls & Stage Selector */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Tabs */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab("goals")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "goals"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              १. अभ्यासक्रम ध्येये (Goals - CG)
            </button>
            <button
              onClick={() => setActiveTab("competencies")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "competencies"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              २. क्षमता यादी (Competencies - C)
            </button>
            <button
              onClick={() => setActiveTab("rubrics")}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "rubrics"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ३. निकषसंच (Rubrics)
            </button>
          </div>

          {/* Stage Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">स्तर:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              {HPC_STAGES_INFO.map((stg) => (
                <button
                  key={stg.id}
                  onClick={() => setSelectedStage(stg.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedStage === stg.id
                      ? "bg-slate-900 text-white shadow-xs font-black"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {stg.titleMarathi}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 1: Curricular Goals */}
        {activeTab === "goals" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  अभ्यासक्रमाची ध्येये (Curricular Goals) — {HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  एकूण ध्येये: {allGoals.length} (अधिकृत SCERT + कस्टमाईज्ड)
                </p>
              </div>

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

            <div className="space-y-3">
              {allGoals.map((g) => {
                const area = areas.find((a) => a.id === g.areaOrSubjectId);
                return (
                  <div
                    key={g.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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

                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                      सक्रिय (Active)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Competencies */}
        {activeTab === "competencies" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  क्षमता यादी (Competencies) — {HPC_STAGES_INFO.find((s) => s.id === selectedStage)?.titleMarathi}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  एकूण क्षमता: {allCompetencies.length} (ध्येयानुसार वर्गवारी)
                </p>
              </div>

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

            <div className="space-y-3">
              {allCompetencies.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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

                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                    सक्रिय (Active)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Rubrics */}
        {activeTab === "rubrics" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                कामगिरी स्तर निकषसंच (Performance Indicators & Rubrics)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                NEP 2020 व SCERT TOT २०२६ मार्गदर्शक तत्त्वांनुसार ३ परिमाणे व त्यांचे स्तर
              </p>
            </div>

            {Object.values(HPC_CORE_RUBRICS).map((dim) => (
              <div
                key={dim.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black px-3 py-1 rounded-xl bg-slate-900 text-white">
                    {dim.titleMarathi} ({dim.titleEnglish})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(["beginner", "proficient", "advanced"] as const).map((lvl) => {
                    const lInfo = dim.levels[lvl];
                    return (
                      <div
                        key={lvl}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-black text-xs text-indigo-900">
                            {lInfo.labelStandard}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {lInfo.labelFoundational}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-600">{lInfo.shortDesc}</p>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          {lInfo.detailedDesc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

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
                    {g.code}: {g.titleMarathi.slice(0, 40)}...
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

      <Footer />
    </div>
  );
}
