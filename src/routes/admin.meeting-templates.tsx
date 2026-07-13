import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  Clock,
  Sparkles,
  ShieldAlert,
  ClipboardList,
  AlertCircle,
  HelpCircle,
  FileText,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { showToast as toast } from "@/lib/custom-toast";

export const Route = createFileRoute("/admin/meeting-templates")({
  head: () => ({
    meta: [{ title: "मासिक सभा विषय व ठराव टेम्पलेट्स — SMART LEARNING" }],
  }),
  component: AdminMeetingTemplates,
});

interface CommitteeOption {
  id: string;
  name: string;
}

const COMMITTEES: CommitteeOption[] = [
  { id: "smc", name: "शाळा व्यवस्थापन समिती (SMC)" },
  { id: "safety", name: "विद्यार्थी सुरक्षा व भौतिक सुविधा विकास समिती" },
  { id: "women", name: "महिला तक्रार निवारण समिती" },
  { id: "sakhi", name: "सखी सावित्री समिती" },
  { id: "eco", name: "इको क्लब (Eco Club)" },
  { id: "alumni", name: "माजी विद्यार्थी संघ" },
];

interface MonthOption {
  id: string;
  name: string;
}

const MONTHS: MonthOption[] = [
  { id: "06", name: "जून (June)" },
  { id: "07", name: "जुलै (July)" },
  { id: "08", name: "ऑगस्ट (August)" },
  { id: "09", name: "सप्टेंबर (September)" },
  { id: "10", name: "ऑक्टोबर (October)" },
  { id: "11", name: "नोव्हेंबर (November)" },
  { id: "12", name: "डिसेंबर (December)" },
  { id: "01", name: "जानेवारी (January)" },
  { id: "02", name: "फेब्रुवारी (February)" },
  { id: "03", name: "मार्च (March)" },
  { id: "04", name: "एप्रिल (April)" },
  { id: "05", name: "मे (May)" },
];

const ALUMNI_MEETINGS: MonthOption[] = [
  { id: "sem1", name: "प्रथम सत्र बैठक" },
  { id: "sem2", name: "द्वितीय सत्र बैठक" },
];

interface TemplateSubject {
  subjectNo: number;
  subject: string;
  resolutionNo: number;
  resolution: string;
  discussion: string;
  remark: string;
  statusText: string;
}

function AdminMeetingTemplates() {
  const navigate = useNavigate();
  const [selectedCommittee, setSelectedCommittee] = useState<string>("smc");
  const [selectedMonth, setSelectedMonth] = useState<string>("06");
  const [subjects, setSubjects] = useState<TemplateSubject[]>([]);
  const [allTemplates, setAllTemplates] = useState<Record<string, TemplateSubject[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [outroText, setOutroText] = useState<string>("ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले.");

  const ACADEMIC_MONTHS = ["06", "07", "08", "09", "10", "11", "12", "01", "02", "03", "04", "05"];
  const ALUMNI_MONTHS = ["sem1", "sem2"];

  const getStartResolutionNo = (month: string, templates: Record<string, TemplateSubject[]>) => {
    let start = 1;
    const currentList = selectedCommittee === "alumni" ? ALUMNI_MONTHS : ACADEMIC_MONTHS;
    const selectedMonthIdx = currentList.indexOf(month);
    if (selectedMonthIdx === -1) return 1;
    for (let i = 0; i < selectedMonthIdx; i++) {
      const m = currentList[i];
      const priorSubjects = templates[m] || [];
      start += priorSubjects.length;
    }
    return start;
  };

  useEffect(() => {
    if (selectedCommittee === "alumni" && !ALUMNI_MONTHS.includes(selectedMonth)) {
      setSelectedMonth("sem1");
    } else if (selectedCommittee !== "alumni" && !ACADEMIC_MONTHS.includes(selectedMonth)) {
      setSelectedMonth("06");
    }
  }, [selectedCommittee]);

  // Authenticate as Super Admin
  useEffect(() => {
    if (!sessionStorage.getItem("is_super_admin")) {
      navigate({
        to: "/login",
        search: { redirect: "/admin/meeting-templates", role: "admin" } as any,
      });
    }
  }, [navigate]);

  // Fetch templates when committee or month changes
  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "meeting_templates"),
          where("committeeId", "==", selectedCommittee)
        );
        const snapshot = await getDocs(q);
        const templatesMap: Record<string, TemplateSubject[]> = {};
        snapshot.docs.forEach((doc) => {
          const d = doc.data();
          templatesMap[d.month] = d.subjects || [];
        });

        setAllTemplates(templatesMap);

        let start = 1;
        const currentList = selectedCommittee === "alumni" ? ALUMNI_MONTHS : ACADEMIC_MONTHS;
        const selectedMonthIdx = currentList.indexOf(selectedMonth);
        if (selectedMonthIdx !== -1) {
          for (let i = 0; i < selectedMonthIdx; i++) {
            const m = currentList[i];
            const priorSubjects = templatesMap[m] || [];
            start += priorSubjects.length;
          }
        }

        const currentMonthSubjects = templatesMap[selectedMonth] || [];
        const adjustedSubjects = currentMonthSubjects.map((s, idx) => ({
          ...s,
          subjectNo: idx + 1,
          resolutionNo: start + idx,
        }));

        setSubjects(adjustedSubjects);

        const matchedDoc = snapshot.docs.find(d => d.id === `${selectedCommittee}_${selectedMonth}`);
        if (matchedDoc && matchedDoc.data().outroText) {
          setOutroText(matchedDoc.data().outroText);
        } else {
          setOutroText("ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून समितीचे सचिव यांनी सभेत उपस्थित सर्व सदस्यांचे आभार व्यक्त केले व अध्यक्ष यांच्या संमतीने सभा संपन्न झाली असे घोषीत केले.");
        }
      } catch (err: any) {
        console.error("Error fetching templates: ", err);
        toast.error("टेम्पलेट लोड करताना त्रुटी आली!");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [selectedCommittee, selectedMonth]);

  const startResolutionNo = getStartResolutionNo(selectedMonth, allTemplates);

  const handleAddRow = () => {
    const nextSubjectNo = subjects.length + 1;
    const nextResolutionNo = startResolutionNo + subjects.length;

    setSubjects([
      ...subjects,
      {
        subjectNo: nextSubjectNo,
        subject: "",
        resolutionNo: nextResolutionNo,
        resolution: "",
        discussion: "",
        remark: "",
        statusText: "ठराव सर्वानुमते मंजूर करण्यात आला.",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = subjects
      .filter((_, i) => i !== index)
      .map((item, i) => ({
        ...item,
        subjectNo: i + 1,
        resolutionNo: startResolutionNo + i,
      }));
    setSubjects(updated);
  };

  const handleUpdateField = (index: number, field: keyof TemplateSubject, value: any) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    setSubjects(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "meeting_templates", `${selectedCommittee}_${selectedMonth}`);
      await setDoc(docRef, {
        committeeId: selectedCommittee,
        month: selectedMonth,
        subjects: subjects,
        outroText: outroText,
        updatedAt: new Date().toISOString(),
      });

      const updatedAllTemplates = {
        ...allTemplates,
        [selectedMonth]: subjects,
      };
      setAllTemplates(updatedAllTemplates);

      toast.success("टेम्पलेट यशस्वीरित्या जतन केले गेले!");
    } catch (err: any) {
      console.error("Error saving template: ", err);
      toast.error("टेम्पलेट जतन करताना त्रुटी आली!");
    } finally {
      setSaving(false);
    }
  };

  const selectedCommitteeName = COMMITTEES.find(c => c.id === selectedCommittee)?.name || "";
  const currentOptions = selectedCommittee === "alumni" ? ALUMNI_MEETINGS : MONTHS;
  const selectedMonthName = currentOptions.find(m => m.id === selectedMonth)?.name || "";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 selection:bg-violet-500/10 font-sans antialiased">
      <Header />

      <main className="max-w-[1400px] mx-auto px-8 pt-24 pb-24">
        <div className="mb-12 space-y-6">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-[10px] font-black text-violet-600 hover:gap-3 transition-all uppercase tracking-[0.2em]"
          >
            <ChevronLeft className="size-4" /> Back to System Hub
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5 text-violet-600" />
                  <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                    System Configuration
                  </span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-stone-900 leading-[0.9]">
                मासिक विषय व{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                  ठराव टेम्पलेट्स.
                </span>
              </h1>
              <p className="text-[#6B7280] max-w-2xl text-base font-medium leading-relaxed">
                शिक्षकांना मासिक सभा इतिवृत्त तयार करताना प्रत्येक महिन्यासाठी पूर्व-निर्धारित (Fixed) विषय आणि ठराव लोड होण्यासाठी इथून सेटिंग करा.
              </p>
            </div>

            <div className="px-6 py-3 bg-white border border-black/5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="size-3 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Template Editor Mode
              </span>
            </div>
          </div>
        </div>

        {/* Control selectors panel */}
        <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 md:p-10 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 uppercase tracking-wider block">
                १. समिती निवडा (Select Committee)
              </label>
              <select
                value={selectedCommittee}
                onChange={(e) => setSelectedCommittee(e.target.value)}
                className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600 font-extrabold text-stone-900 bg-white text-base shadow-sm transition-all"
              >
                {COMMITTEES.map((comm) => (
                  <option key={comm.id} value={comm.id}>
                    {comm.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-black text-slate-700 uppercase tracking-wider block">
                २. महिना निवडा (Select Month)
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-600 font-extrabold text-stone-900 bg-white text-base shadow-sm transition-all"
              >
                {currentOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Templates list Form */}
        <div className="bg-white border border-black/5 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-8">
            <div>
              <h3 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <ClipboardList className="size-6 text-violet-600" />
                विषय आणि ठराव यादी
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {selectedCommitteeName} — {selectedMonthName}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <Plus className="size-4" /> विषय व ठराव जोडा
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="size-12 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                माहिती लोड होत आहे...
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {subjects.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
                  <div className="size-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                    <FileText size={30} />
                  </div>
                  <h4 className="text-slate-500 font-black text-sm">या महिन्यासाठी कोणतेही विषय व ठराव सेट केलेले नाहीत</h4>
                  <p className="text-slate-400 text-xs mt-1 font-semibold">
                    नवीन विषय जोडण्यासाठी वरील '+ विषय व ठराव जोडा' बटणावर क्लिक करा.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {subjects.map((res, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 border border-slate-100 p-8 rounded-3xl relative space-y-6 shadow-inner group"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="absolute top-6 right-6 p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                        title="Delete this template item"
                      >
                        <Trash2 className="size-5" />
                      </button>

                      <div className="grid grid-cols-2 gap-6 w-3/4 md:w-1/3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            विषय क्रमांक
                          </label>
                          <input
                            type="number"
                            value={res.subjectNo}
                            readOnly
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none font-extrabold text-sm text-stone-500 bg-slate-100/70 cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                            ठराव क्रमांक
                          </label>
                          <input
                            type="number"
                            value={res.resolutionNo}
                            readOnly
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none font-extrabold text-sm text-stone-500 bg-slate-100/70 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-700 tracking-wide block">
                          विषय (Subject Title)
                        </label>
                        <input
                          type="text"
                          value={res.subject}
                          onChange={(e) =>
                            handleUpdateField(index, "subject", e.target.value)
                          }
                          placeholder="उदा. मागील सभेचे इतिवृत्त वाचून मंजूर करणेबाबत."
                          className="w-full px-5 py-3 border border-slate-300 rounded-xl outline-none focus:border-violet-600 font-bold text-stone-900 bg-white text-base placeholder-slate-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-black text-slate-700 tracking-wide block">
                          ठराव (Resolution Details)
                        </label>
                        <textarea
                          value={res.resolution || ""}
                          onChange={(e) =>
                            handleUpdateField(index, "resolution", e.target.value)
                          }
                          placeholder="उदा. सविस्तर विचारविनिमय करून मागील सभेचे इतिवृत्त सर्वानुमते मंजूर करण्यात आले..."
                          className="w-full h-32 px-5 py-3 border border-slate-300 rounded-xl outline-none focus:border-violet-600 font-bold text-stone-900 bg-white text-base placeholder-slate-400 resize-y leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Outro text template editor */}
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl space-y-4 mt-8">
                <h4 className="text-base font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="size-5 text-violet-600" />
                  आभार प्रदर्शन व सभा सांगता परिच्छेद टेम्पलेट
                </h4>
                <div className="space-y-2">
                  <label className="text-sm font-black text-slate-750 tracking-wide block">
                    परिच्छेद मजकूर (Paragraph Details)
                  </label>
                  <textarea
                    value={outroText}
                    onChange={(e) => setOutroText(e.target.value)}
                    placeholder="उदा. ऐन वेळेस उपस्थित होणाऱ्या विषयांवर चर्चा करून..."
                    className="w-full h-24 px-5 py-3 border border-slate-355 rounded-xl outline-none focus:border-violet-600 font-bold text-stone-900 bg-white text-base placeholder-slate-400 resize-y leading-relaxed"
                  />
                </div>
              </div>

              {/* Action buttons */}
              {subjects.length > 0 && (
                <div className="flex justify-end pt-6 border-t border-slate-100 gap-4">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="flex items-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="size-5" /> विषय व ठराव जोडा
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-full text-sm font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
                  >
                    <Save className="size-5" /> {saving ? "टेम्पलेट जतन होत आहे..." : "टेम्पलेट जतन करा"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
