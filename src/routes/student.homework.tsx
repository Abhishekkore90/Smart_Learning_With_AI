import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Search,
  CheckCircle2,
  Book,
  Languages,
  Beaker,
  Calculator,
  Globe,
  ScrollText,
  Users,
  Eye,
  Download,
  Printer,
  ChevronRight,
  Loader2,
  FileText,
  Check,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";
import { useAuth } from "@/hooks/use-auth";
import { subscribeToHomework } from "@/services/homeworkService";
import type { HomeworkItem } from "@/types/documentEditor";
import { DocumentEditorViewer } from "@/components/documentViewer/DocumentEditorViewer";
import { DailyHomeworkTemplate } from "@/components/homework/DailyHomeworkTemplate";
import { DailyHomeworkCalendar, formatISODate } from "@/components/homework/DailyHomeworkCalendar";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { MCQHomeworkSection } from "@/components/homework/MCQHomeworkSection";

export const Route = createFileRoute("/student/homework")({
  component: StudentHomeworkPage,
});

const CLASSES = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

function StudentHomeworkPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // Homework Co-Tabs: "homework" vs "mcq"
  const [mainTab, setMainTab] = useState<"homework" | "mcq">("homework");

  const [selectedMedium, setSelectedMedium] = useState("marathi");
  const [selectedClass, setSelectedClass] = useState("1st");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [calendarDate, setCalendarDate] = useState<string>(() => formatISODate(new Date()));

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Active viewing/editing homework
  const [activeHomework, setActiveHomework] = useState<HomeworkItem | null>(null);
  const [previewTab, setPreviewTab] = useState<"doc" | "template">("doc");

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin is allowed
      } else if (!user || profile?.role !== "student") {
        navigate({
          to: "/login",
          search: { redirect: "/student/homework", role: "student" } as any,
        });
        return;
      }
    }
    setMounted(true);

    // Canonical real-time listener from admin_homework (with fallback)
    const unsub = subscribeToHomework(
      (items) => {
        setHomeworkList(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching homework:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, profile, authLoading, navigate]);

  // Compute available subjects for selected class & medium
  const availableSubjects = useMemo(() => {
    return getDefaultSubjectsForClass(selectedClass, selectedMedium);
  }, [selectedClass, selectedMedium]);

  // Filter homework by medium, class, subject, date, and search
  const filteredData = useMemo(() => {
    return homeworkList.filter((hw) => {
      const matchClass = hw.class === selectedClass;
      const matchMedium = !hw.medium || hw.medium === selectedMedium;
      const matchSubject =
        !selectedSubject ||
        hw.subject?.trim().toLowerCase() === selectedSubject.trim().toLowerCase();
      const matchDate = !filterDate || hw.homeworkDate === filterDate;
      const matchSearch =
        !searchTerm ||
        hw.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.subject?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchClass && matchMedium && matchSubject && matchDate && matchSearch;
    });
  }, [homeworkList, selectedClass, selectedMedium, selectedSubject, filterDate, searchTerm]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="no-print">
        <StudentHeader />
        <StudentSidebar />
      </div>

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Top Co-Tabs: Regular Homework vs MCQ Homework */}
          <div className="no-print flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl w-fit shadow-xs">
            <button
              type="button"
              onClick={() => setMainTab("homework")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                mainTab === "homework"
                  ? "bg-white text-indigo-700 shadow-md font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="size-4 text-indigo-600" />
              <span>दैनिक गृहपाठ (Daily Homework)</span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab("mcq")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                mainTab === "mcq"
                  ? "bg-indigo-600 text-white shadow-md font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="size-4 text-amber-300" />
              <span>MCQ स्वाध्याय (MCQ Quiz)</span>
              <span className="bg-amber-400 text-amber-950 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                नवीन
              </span>
            </button>
          </div>

          {mainTab === "mcq" ? (
            <MCQHomeworkSection
              defaultRole="student"
              userName={profile?.fullName || (profile as any)?.name || user?.displayName || "विद्यार्थी"}
              initialClass={selectedClass || "all"}
              initialSubject={selectedSubject || "all"}
            />
          ) : (
            <>
              {/* Active Homework Document Viewer */}
              {activeHomework ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                <button
                  onClick={() => setActiveHomework(null)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>सर्व गृहपाठांची यादी (Back to Homework List)</span>
                </button>

                {/* View Switcher: Document View vs Worksheet Template */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  {activeHomework.fileUrl && (
                    <button
                      onClick={() => setPreviewTab("doc")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        previewTab === "doc"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      मूळ दस्तऐवज (Document View)
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewTab("template")}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      previewTab === "template"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    दैनिक कार्यपुस्तिका (Worksheet Template)
                  </button>
                </div>
              </div>

              {previewTab === "doc" && activeHomework.fileUrl ? (
                <DocumentEditorViewer
                  documentId={activeHomework.id}
                  fileUrl={activeHomework.fileUrl}
                  fileName={activeHomework.fileName}
                  documentType="homework"
                  title={`${activeHomework.title} — ${activeHomework.class} (${activeHomework.homeworkDate})`}
                  userId={user?.uid || "student_user"}
                  userRole={profile?.role || "student"}
                  userName={profile?.fullName || "विद्यार्थी"}
                  canEdit={true}
                  onBack={() => setActiveHomework(null)}
                  metadataBadge={
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <span>दिनांक: {activeHomework.homeworkDate}</span>
                      <span>•</span>
                      <span>इयत्ता: {activeHomework.class}</span>
                      <span>•</span>
                      <span>विषय: {activeHomework.subject}</span>
                    </div>
                  }
                />
              ) : (
                <DailyHomeworkTemplate
                  homework={activeHomework}
                  userId={user?.uid || "student_user"}
                  userRole={profile?.role || "student"}
                  userName={profile?.fullName || "विद्यार्थी"}
                  canEdit={true}
                  onBack={() => setActiveHomework(null)}
                />
              )}
            </div>
          ) : (
            /* Homework Table & Controls */
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
              {/* Header Banner */}
              <div className="p-8 sm:p-10 pb-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
                    <BookOpen className="size-3.5" /> दैनंदिन गृहपाठ प्रणाली
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    माझा गृहपाठ (My Class Homework)
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    शिक्षकांनी व ॲडमिनने अपलोड केलेला दैनंदिन स्वाध्याय येथे तपासा व सोडवा.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap self-start">
                  {/* View Mode Switcher */}
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode("calendar")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "calendar"
                          ? "bg-white text-indigo-700 shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Calendar className="size-3.5" />
                      <span>कॅलेंडर दृश्य (Calendar)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        viewMode === "list"
                          ? "bg-white text-indigo-700 shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Book className="size-3.5" />
                      <span>यादी दृश्य (Table)</span>
                    </button>
                  </div>

                  {/* Medium Switcher */}
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                      onClick={() => setSelectedMedium("marathi")}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedMedium === "marathi"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      मराठी माध्यम
                    </button>
                    <button
                      onClick={() => setSelectedMedium("semi")}
                      className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedMedium === "semi"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      सेमी माध्यम
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="p-6 sm:p-10 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Class Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      इयत्ता (Class)
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {CLASSES.map((c) => (
                        <option key={c} value={c}>
                          इयत्ता {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      विषय (Subject)
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">सर्व विषय (All Subjects)</option>
                      {availableSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      दिनांक (Date)
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
                      />
                      {filterDate && (
                        <button
                          onClick={() => setFilterDate("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 text-xs font-bold"
                          title="तारीख काढा"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Search Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      शोध (Search)
                    </label>
                    <div className="relative">
                      <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="गृहपाठ शोधा..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* CALENDAR VIEW */}
                {viewMode === "calendar" && (
                  <DailyHomeworkCalendar
                    homeworkList={filteredData}
                    selectedDate={calendarDate}
                    onSelectDate={(d) => {
                      setCalendarDate(d);
                      setFilterDate(d);
                    }}
                    onPreviewHomework={(hw) => {
                      setActiveHomework(hw);
                      setPreviewTab(hw.fileUrl ? "doc" : "template");
                    }}
                    userRole="student"
                    accentColor="indigo"
                  />
                )}

                {/* Table of Assignments (List View) */}
                {viewMode === "list" && (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-xs">
                    <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-white text-[11px] font-black uppercase tracking-wider">
                        <th className="px-6 py-4 text-center w-16">क्र.</th>
                        <th className="px-6 py-4">गृहपाठ दिनांक</th>
                        <th className="px-6 py-4">विषय</th>
                        <th className="px-6 py-4">गृहपाठ शीर्षक / स्वाध्याय</th>
                        <th className="px-6 py-4 text-center">अंतिम मुदत</th>
                        <th className="px-6 py-4 text-center">प्रकार</th>
                        <th className="px-6 py-4 text-right">कृती</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                            <Loader2 className="size-8 animate-spin mx-auto mb-2 text-indigo-600" />
                            गृहपाठ लोड होत आहे...
                          </td>
                        </tr>
                      ) : filteredData.length > 0 ? (
                        filteredData.map((hw, idx) => (
                          <tr
                            key={hw.id}
                            className={`hover:bg-indigo-50/30 transition-colors ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            }`}
                          >
                            <td className="px-6 py-5 text-center font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-6 py-5">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-indigo-600" />
                                {hw.homeworkDate}
                              </span>
                            </td>
                            <td className="px-6 py-5 font-bold text-indigo-700">
                              {hw.subject}
                            </td>
                            <td className="px-6 py-5">
                              <div className="font-bold text-slate-900 max-w-md line-clamp-1">
                                {hw.title}
                              </div>
                              {hw.description && (
                                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                                  {hw.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 text-center text-slate-600 font-semibold">
                              {hw.dueDate || "दैनिक"}
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {hw.documentType === "pdf" ? "PDF स्वाध्याय" : hw.variables ? "कार्यपुस्तिका" : "मजकूर"}
                              </span>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <button
                                onClick={() => {
                                  setActiveHomework(hw);
                                  setPreviewTab(hw.fileUrl ? "doc" : "template");
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 cursor-pointer text-xs"
                              >
                                स्वाध्याय सोडवा (View Task)
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-20 text-center text-slate-400 font-semibold"
                          >
                            इयत्ता {selectedClass} साठी कोणताही गृहपाठ सापडला नाही.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </div>
  );
}
