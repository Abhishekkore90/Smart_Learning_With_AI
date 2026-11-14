import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Download,
  Eye,
  Users,
  Search,
  Filter,
  Layers,
  Sparkles,
  BookOpen,
  Compass,
  GraduationCap,
  Loader2,
  Check,
  X,
  Printer,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { HpcStageId } from "@/hpc/types/hpc";
import { HPC_STAGES_INFO } from "@/hpc/data/hpcCurricularGoals";
import {
  getHpcStudents,
  StudentInfoSummary,
  getHpcStudentById,
  getHpcStudentProfile,
  getHpcSessionAssessment,
  getHpcAnnualSummary,
  getHpcStudentAttendance,
  getHpcSchoolSettings,
} from "@/hpc/services/hpcService";
import { generateHpcPdf, downloadBlob } from "@/hpc/reports/HpcPdfGenerator";
import { FoundationalHpcPdf } from "@/hpc/reports/FoundationalHpcPdf";
import { PreparatoryHpcPdf } from "@/hpc/reports/PreparatoryHpcPdf";
import { MiddleHpcPdf } from "@/hpc/reports/MiddleHpcPdf";
import {
  getCurrentAcademicYear,
  getAcademicYearOptions,
  getInitialAcademicYear,
} from "@/hpc/utils/academicYear";

export const Route = createFileRoute("/teacher/hpc/reports")({
  head: () => ({
    meta: [{ title: "HPC अहवाल व PDF डाऊनलोड — SMART LEARNING" }],
  }),
  component: TeacherHpcReportsPage,
});

const CLASSES_LIST = [
  { id: "1st", label: "इयत्ता १ ली (1st)", stageId: "foundational" },
  { id: "2nd", label: "इयत्ता २ री (2nd)", stageId: "foundational" },
  { id: "3rd", label: "इयत्ता ३ री (3rd)", stageId: "preparatory" },
  { id: "4th", label: "इयत्ता ४ थी (4th)", stageId: "preparatory" },
  { id: "5th", label: "इयत्ता ५ वी (5th)", stageId: "preparatory" },
  { id: "6th", label: "इयत्ता ६ वी (6th)", stageId: "middle" },
  { id: "7th", label: "इयत्ता ७ वी (7th)", stageId: "middle" },
  { id: "8th", label: "इयत्ता ८ वी (8th)", stageId: "middle" },
];

function TeacherHpcReportsPage() {
  const academicYearOptions = useMemo(() => getAcademicYearOptions(), []);
  const [selectedClass, setSelectedClass] = useState<string>("1st");
  const [academicYear, setAcademicYear] = useState<string>(() => getInitialAcademicYear());
  const [selectedMedium, setSelectedMedium] = useState<string>(() => {
    return localStorage.getItem("cce_selected_medium") || "marathi";
  });

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentInfoSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Preview & Single Download
  const [activePreviewStudent, setActivePreviewStudent] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0, message: "" });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Bulk Generation State
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, studentName: "" });
  const bulkContainerRef = useRef<HTMLDivElement>(null);
  const [bulkRenderData, setBulkRenderData] = useState<any[]>([]);

  const stageId: HpcStageId = useMemo(() => {
    const match = CLASSES_LIST.find((c) => c.id === selectedClass);
    return (match?.stageId as HpcStageId) || "foundational";
  }, [selectedClass]);

  const stageInfo = HPC_STAGES_INFO.find((s) => s.id === stageId) || HPC_STAGES_INFO[0];

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const list = await getHpcStudents(selectedClass, selectedMedium);
        if (isMounted) setStudents(list);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [selectedClass, selectedMedium]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.rollNo && s.rollNo.includes(q))
    );
  }, [students, searchQuery]);

  // Load preview data
  const handleOpenPreview = async (studentId: string) => {
    setPreviewLoading(true);
    try {
      const st = await getHpcStudentById(studentId);
      const prof = await getHpcStudentProfile(studentId, academicYear);
      const s1 = await getHpcSessionAssessment(studentId, academicYear, "session1");
      const s2 = await getHpcSessionAssessment(studentId, academicYear, "session2");
      const ann = await getHpcAnnualSummary(studentId, academicYear);
      const att = await getHpcStudentAttendance(selectedClass, academicYear, studentId);
      const school = await getHpcSchoolSettings();

      setActivePreviewStudent({
        student: st,
        profile: prof,
        session1: s1,
        session2: s2,
        annualSummary: ann,
        attendance: att,
        schoolSettings: school,
      });
    } catch (err: any) {
      toast.error("डेटा लोड करताना त्रुटी: " + err.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Download Single PDF
  const handleDownloadSinglePdf = async () => {
    if (!previewContainerRef.current) return;
    setPdfGenerating(true);
    try {
      const filename = `HPC_${activePreviewStudent.student?.name}_Class_${selectedClass}.pdf`;
      const blob = await generateHpcPdf(
        previewContainerRef.current,
        filename,
        (cur, tot, msg) => {
          setPdfProgress({ current: cur, total: tot, message: msg || "" });
        }
      );
      downloadBlob(blob, filename);
      toast.success("HPC PDF यशस्वीरीत्या डाऊनलोड झाली!");
    } catch (err: any) {
      toast.error("PDF तयार करताना त्रुटी: " + err.message);
    } finally {
      setPdfGenerating(false);
    }
  };

  // Class-wise Bulk PDF Generation
  const handleBulkDownload = async () => {
    if (students.length === 0) {
      toast.error("या वर्गात कोणतेही विद्यार्थी नाहीत.");
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: students.length, studentName: "तयारी सुरू आहे..." });

    try {
      const school = await getHpcSchoolSettings();
      const allData: any[] = [];

      for (let i = 0; i < students.length; i++) {
        const st = students[i];
        setBulkProgress({
          current: i + 1,
          total: students.length,
          studentName: `${st.name} चा डेटा गोळा होत आहे...`,
        });

        const prof = await getHpcStudentProfile(st.id, academicYear);
        const s1 = await getHpcSessionAssessment(st.id, academicYear, "session1");
        const s2 = await getHpcSessionAssessment(st.id, academicYear, "session2");
        const ann = await getHpcAnnualSummary(st.id, academicYear);
        const att = await getHpcStudentAttendance(selectedClass, academicYear, st.id);

        allData.push({
          student: st,
          profile: prof,
          session1: s1,
          session2: s2,
          annualSummary: ann,
          attendance: att,
          schoolSettings: school,
        });
      }

      setBulkRenderData(allData);

      // Wait for rendering
      await new Promise((r) => setTimeout(r, 600));

      if (!bulkContainerRef.current) {
        throw new Error("Bulk container element not ready");
      }

      const bulkFilename = `HPC_All_Students_Class_${selectedClass}_${academicYear}.pdf`;
      const blob = await generateHpcPdf(
        bulkContainerRef.current,
        bulkFilename,
        (cur, tot, msg) => {
          setBulkProgress({
            current: cur,
            total: tot,
            studentName: msg || "PDF पृष्ठे एकत्रित होत आहेत...",
          });
        }
      );

      downloadBlob(blob, bulkFilename);
      toast.success(`इयत्ता ${selectedClass} सर्व विद्यार्थ्यांची एकत्रित PDF तयार झाली!`);
    } catch (err: any) {
      toast.error("एकत्रित PDF तयार करताना त्रुटी: " + err.message);
    } finally {
      setBulkGenerating(false);
      setBulkRenderData([]);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Back Action Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link
          to="/teacher/hpc"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 hover:border-slate-900 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
          <span>मुख्य HPC डॅशबोर्डवर परत जा (Back to HPC Dashboard)</span>
        </Link>
        <Link
          to="/teacher"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <ArrowLeft className="size-3.5" />
          <span>मुख्य शिक्षक पॅनल</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {stageInfo.titleMarathi}
            </span>
            <span className="text-xs font-bold text-slate-500">
              अधिकृत SCERT आराखड्यानुसार प्रगती अहवाल
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            HPC समग्र प्रगतिपत्रक अहवाल व PDF
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            प्रत्येक विद्यार्थ्याचे वैयक्तिक कार्ड किंवा संपूर्ण वर्गाची एकत्रित A4 PDF डाऊनलोड करा
          </p>
        </div>

        {/* Bulk Download & Class Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">वर्ष:</span>
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                localStorage.setItem("cce_academic_year", e.target.value);
              }}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              {academicYearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-500">इयत्ता:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
            >
              {CLASSES_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleBulkDownload}
            disabled={bulkGenerating || students.length === 0}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {bulkGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span>
              {bulkGenerating
                ? `एकत्रित PDF तयार होत आहे (${bulkProgress.current}/${bulkProgress.total})`
                : "वर्गनिहाय एकत्रित PDF (Bulk Download)"}
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="size-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="विद्यार्थ्याचे नाव किंवा हजेरी क्रमांकाने शोधा..."
          className="w-full pl-11 pr-4 py-3 text-xs font-bold rounded-2xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white shadow-xs"
        />
      </div>

      {/* Students List for Reports */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">विद्यार्थी यादी लोड होत आहे...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <FileText className="size-12 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">कोणतेही विद्यार्थी सापडले नाहीत.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="p-4 w-16 text-center">हजेरी क्र.</th>
                <th className="p-4">विद्यार्थ्याचे नाव</th>
                <th className="p-4 text-center">इयत्ता व तुकडी</th>
                <th className="p-4 text-center">सरल आयडी</th>
                <th className="p-4 text-right">HPC अहवाल कृती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 text-center font-black text-slate-800">{s.rollNo}</td>
                  <td className="p-4 font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-indigo-50 font-black text-indigo-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          s.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <span className="font-black text-slate-900 text-sm">{s.fullName || s.name}</span>
                        <span className="block text-[10px] text-slate-400">
                          पालक: {s.parentName || "-"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700">
                    {s.class || selectedClass} / {s.division || "अ"}
                  </td>
                  <td className="p-4 text-center font-mono text-slate-600">
                    {s.saralId || "-"}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenPreview(s.id)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                        <span>प्रिव्ह्यू पहा</span>
                      </button>

                      <button
                        onClick={() => handleOpenPreview(s.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="size-3.5" />
                        <span>PDF डाऊनलोड</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- Single Student Preview Modal ---------------- */}
      {activePreviewStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-black">
                  समग्र प्रगतिपत्रक प्रिव्ह्यू: {activePreviewStudent.student?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {stageInfo.titleMarathi} | इयत्ता {selectedClass} | {academicYear}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSinglePdf}
                  disabled={pdfGenerating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {pdfGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  <span>
                    {pdfGenerating ? pdfProgress.message || "PDF तयार होत आहे..." : "PDF डाऊनलोड"}
                  </span>
                </button>
                <button
                  onClick={() => setActivePreviewStudent(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
              <div
                ref={previewContainerRef}
                className="bg-white shadow-xl rounded-2xl overflow-hidden scale-[0.9] sm:scale-100 origin-top"
              >
                {stageId === "foundational" ? (
                  <FoundationalHpcPdf
                    student={activePreviewStudent.student}
                    profile={activePreviewStudent.profile}
                    session1={activePreviewStudent.session1}
                    session2={activePreviewStudent.session2}
                    annualSummary={activePreviewStudent.annualSummary}
                    attendance={activePreviewStudent.attendance}
                    schoolSettings={activePreviewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                ) : stageId === "preparatory" ? (
                  <PreparatoryHpcPdf
                    student={activePreviewStudent.student}
                    profile={activePreviewStudent.profile}
                    session1={activePreviewStudent.session1}
                    session2={activePreviewStudent.session2}
                    annualSummary={activePreviewStudent.annualSummary}
                    attendance={activePreviewStudent.attendance}
                    schoolSettings={activePreviewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                ) : (
                  <MiddleHpcPdf
                    student={activePreviewStudent.student}
                    profile={activePreviewStudent.profile}
                    session1={activePreviewStudent.session1}
                    session2={activePreviewStudent.session2}
                    annualSummary={activePreviewStudent.annualSummary}
                    attendance={activePreviewStudent.attendance}
                    schoolSettings={activePreviewStudent.schoolSettings}
                    academicYear={academicYear}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Bulk Container for Bulk PDF Generation */}
      {bulkGenerating && bulkRenderData.length > 0 && (
        <div
          ref={bulkContainerRef}
          style={{ position: "fixed", left: "-99999px", top: 0, opacity: 0 }}
        >
          {bulkRenderData.map((data, index) => {
            if (stageId === "foundational") {
              return (
                <FoundationalHpcPdf
                  key={data.student.id || index}
                  student={data.student}
                  profile={data.profile}
                  session1={data.session1}
                  session2={data.session2}
                  annualSummary={data.annualSummary}
                  attendance={data.attendance}
                  schoolSettings={data.schoolSettings}
                  academicYear={academicYear}
                />
              );
            } else if (stageId === "preparatory") {
              return (
                <PreparatoryHpcPdf
                  key={data.student.id || index}
                  student={data.student}
                  profile={data.profile}
                  session1={data.session1}
                  session2={data.session2}
                  annualSummary={data.annualSummary}
                  attendance={data.attendance}
                  schoolSettings={data.schoolSettings}
                  academicYear={academicYear}
                />
              );
            } else {
              return (
                <MiddleHpcPdf
                  key={data.student.id || index}
                  student={data.student}
                  profile={data.profile}
                  session1={data.session1}
                  session2={data.session2}
                  annualSummary={data.annualSummary}
                  attendance={data.attendance}
                  schoolSettings={data.schoolSettings}
                  academicYear={academicYear}
                />
              );
            }
          })}
        </div>
      )}
    </div>
  );
}
