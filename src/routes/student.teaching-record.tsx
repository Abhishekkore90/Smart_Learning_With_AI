import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  BookOpen,
  Calendar,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronRight,
  GraduationCap,
  ArrowLeft
} from "lucide-react";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { StudentHeader } from "@/components/student/StudentHeader";
import { TeacherTodayDiary } from "@/components/teacher/TeacherTodayDiary";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, onSnapshot } from "firebase/firestore";
import { format } from "date-fns";
import { useAuthenticatedPdf } from "@/lib/bunny-auth-pdf";
import { DocumentLivePreview } from "@/components/DocumentLivePreview";
import { PinGate } from "@/components/teacher/PinGate";
import { motion } from "framer-motion";

export const Route = createFileRoute("/student/teaching-record")({
  component: StudentTeachingRecordPage,
});

const classMapping: Record<string, string> = {
  "1st": "Class 1",
  "2nd": "Class 2",
  "3rd": "Class 3",
  "4th": "Class 4",
  "5th": "Class 5",
  "6th": "Class 6",
  "7th": "Class 7",
  "8th": "Class 8",
};

const MEDIUMS = [
  { id: "Marathi", badge: "म", title: "MARATHI", mr: "मराठी माध्यम" },
  { id: "Semi English", badge: "E", title: "SEMI ENGLISH", mr: "सेमी इंग्रजी" },
];

const months = [
  { id: "06", name: "June", mr: "जून", badge: "JUN" },
  { id: "07", name: "July", mr: "जुलै", badge: "JUL" },
  { id: "08", name: "August", mr: "ऑगस्ट", badge: "AUG" },
  { id: "09", name: "September", mr: "सप्टेंबर", badge: "SEP" },
  { id: "10", name: "October", mr: "ऑक्टोबर", badge: "OCT" },
  { id: "11", name: "November", mr: "नोव्हेंबर", badge: "NOV" },
  { id: "12", name: "December", mr: "डिसेंबर", badge: "DEC" },
  { id: "01", name: "January", mr: "जानेवारी", badge: "JAN" },
  { id: "02", name: "February", mr: "फेब्रुवारी", badge: "FEB" },
  { id: "03", name: "March", mr: "मार्च", badge: "MAR" },
  { id: "04", name: "April", mr: "एप्रिल", badge: "APR" },
  { id: "05", name: "May", mr: "मे", badge: "MAY" },
];

const weeks = [
  { id: "Week 1", label: "Week 1", mr: "पहिला आठवडा" },
  { id: "Week 2", label: "Week 2", mr: "दुसरा आठवडा" },
  { id: "Week 3", label: "Week 3", mr: "तिसरा आठवडा" },
  { id: "Week 4", label: "Week 4", mr: "चौथा आठवडा" },
  { id: "Week 5", label: "Week 5", mr: "पाचवा आठवडा" },
];

function StudentTeachingRecordPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");
  const [selectedMedium, setSelectedMedium] = useState<string>("Marathi");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "MM"));
  const [diaryRecords, setDiaryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [selectedRecordForPreview, setSelectedRecordForPreview] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { pdfBlobUrl: authenticatedPreviewUrl, loading: loadingPreview } = useAuthenticatedPdf(selectedRecordForPreview?.pageUrl || null);

  const studentClass = profile?.class ? classMapping[profile.class] || "Class 1" : "Class 1";

  useEffect(() => {
    if (!authLoading) {
      if (sessionStorage.getItem("is_super_admin")) {
        // Super Admin is allowed
      } else if (!user || profile?.role !== "student") {
        navigate({
          to: "/login",
          search: { redirect: "/student/teaching-record", role: "student" } as any,
        });
        return;
      }
    }
    setMounted(true);
  }, [authLoading, user, profile, navigate]);

  useEffect(() => {
    if (mounted && studentClass && selectedMedium) {
      fetchDiaryRecords(studentClass, selectedMedium);
    }
  }, [mounted, studentClass, selectedMedium]);

  const fetchDiaryRecords = async (cls: string, med: string) => {
    setLoading(true);
    try {
      const collectionRef = collection(db, "teacher_diaries", cls, med);
      const querySnapshot = await getDocs(collectionRef);

      if (!querySnapshot.empty) {
        const allDocs: any[] = querySnapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const rawUrl = data.pageUrl || data.masterPdfUrl || data.pageURL || "";
            const sanitizedUrl = rawUrl.replace(/vz-7a00d099-4a8\.b-cdn\.net/g, "sgkbrainova.b-cdn.net");
            return {
              id: docSnap.id,
              diaryDate: data.diaryDate || docSnap.id,
              pageUrl: sanitizedUrl,
              fileName: data.fileName || "Teaching_Diary.pdf",
              uploadedAt: data.uploadedAt || 0,
              ...data,
            };
          })
          .filter((rec: any) => {
            if (rec.diaryDate) {
              const parts = rec.diaryDate.split("-");
              if (parts.length === 3) {
                const dObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                if (!isNaN(dObj.getTime()) && dObj.getDay() === 0) return false;
              }
            }
            if (rec.day === "रविवार" || rec.day?.toLowerCase() === "sunday") return false;
            return true;
          });
        allDocs.sort((a, b) => b.diaryDate.localeCompare(a.diaryDate)); // sort descending
        setDiaryRecords(allDocs);
      } else {
        setDiaryRecords([]);
      }
    } catch (err) {
      console.error("Error loading teaching diary records:", err);
      setDiaryRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getWeekForDate = (diaryDate: string): string => {
    if (diaryDate === "master_diary") return "all";
    const parts = diaryDate.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      if (day <= 7) return "Week 1";
      if (day <= 14) return "Week 2";
      if (day <= 21) return "Week 3";
      if (day <= 28) return "Week 4";
      return "Week 5";
    }
    return "Week 1";
  };

  const getRecordWeek = (rec: any): string => {
    if (rec.week) return rec.week;
    return getWeekForDate(rec.diaryDate);
  };

  const isWordDoc = (filename?: string | null) => {
    if (!filename) return false;
    const lower = filename.toLowerCase();
    return lower.endsWith(".doc") || lower.endsWith(".docx") || lower.includes(".doc?") || lower.includes(".docx?");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <StudentHeader />
      <StudentSidebar />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
          {/* Top Navigation Bar with Back Button */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 px-5 rounded-2xl border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate({ to: "/student" });
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span>मागे जा (Back)</span>
            </button>
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">
              विद्यार्थी टाचणवही अहवाल (Student Teaching Record)
            </span>
          </div>

          {/* Header */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-8 md:p-10 pb-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter italic">
                  Teaching Diary (टाचणवही अहवाल)
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                    Class: {profile?.class || "N/A"}
                  </span>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                    | Medium:
                  </span>
                  <select
                    value={selectedMedium}
                    onChange={(e) => setSelectedMedium(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 outline-none cursor-pointer"
                  >
                    {MEDIUMS.map((med) => (
                      <option key={med.id} value={med.id}>
                        {med.title}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                    | Month:
                  </span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 outline-none cursor-pointer"
                  >
                    {months.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.mr})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* View Mode Tabs */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab("daily")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === "daily" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                >
                  📅 दैनिक तारीख निहाय (Daily Date View)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("weekly")}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === "weekly" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                >
                  🗓️ आठवडा निहाय (Weekly View)
                </button>
              </div>
            </div>

            <div className="p-6 md:p-10">
              {activeTab === "daily" ? (
                <TeacherTodayDiary
                  selectedClass={studentClass}
                  selectedMedium={selectedMedium}
                  selectedMonth={selectedMonth}
                  isStudent={true}
                />
              ) : loading ? (
                <div className="flex items-center justify-center py-20 text-indigo-600">
                  <Loader2 className="size-10 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {weeks.map((wk) => {
                    const record = diaryRecords.find(rec => rec.diaryDate === "master_diary" || (rec.diaryDate.split("-")[1] === selectedMonth && getRecordWeek(rec) === wk.id));
                    const isWord = isWordDoc(record?.fileName || record?.pageUrl);
                    
                    return (
                      <motion.div
                        key={wk.id}
                        whileHover={{ scale: 1.02 }}
                        className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-500 overflow-hidden flex flex-col gap-4 shadow-sm ${record ? 'bg-white border-green-200 hover:border-green-400' : 'bg-slate-50/40 border-slate-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`size-12 rounded-xl flex items-center justify-center border ${record ? 'bg-green-100 border-green-200 text-green-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                              <Calendar className="size-6" />
                            </div>
                            <div>
                              <h3 className={`text-lg font-black leading-tight tracking-tight ${record ? 'text-slate-900' : 'text-slate-400'}`}>{wk.mr}</h3>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${record ? 'text-green-600' : 'text-slate-400'}`}>{wk.label}</p>
                            </div>
                          </div>
                          {record && (
                            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">
                              Available
                            </div>
                          )}
                        </div>
                        
                        {record ? (
                          <div className="mt-2 space-y-4">
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                                {isWord ? <FileText className="size-6 text-blue-600 shrink-0" /> : <BookOpen className="size-6 text-orange-600 shrink-0" />}
                                <div className="min-w-0">
                                  <p className="text-xs font-extrabold truncate text-slate-800">{record.fileName || "Teaching Diary Document"}</p>
                                  <p className="text-[10px] text-slate-500 font-semibold">{record.uploadedAt ? format(new Date(record.uploadedAt), "dd/MM/yyyy") : record.diaryDate}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRecordForPreview(record);
                                    setIsPreviewOpen(true);
                                  }}
                                  className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <Eye className="size-4" /> View
                                </button>
                                <a
                                  href={record.pageUrl}
                                  download={record.fileName || "document"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  <Download className="size-4" /> Download
                                </a>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 space-y-4 flex-1 flex flex-col justify-end">
                            <div className="flex items-center gap-2">
                              <button
                                disabled
                                className="flex-1 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-100"
                              >
                                <Eye className="size-4" /> View
                              </button>
                              <button
                                disabled
                                className="flex-1 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-100"
                              >
                                <Download className="size-4" /> Download
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Document Live Preview Modal */}
      {isPreviewOpen && selectedRecordForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-955/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-5xl border border-slate-100 flex flex-col h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setSelectedRecordForPreview(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-sm shrink-0"
                  title="मागे जा (Back)"
                >
                  <ArrowLeft className="size-4 text-indigo-400" />
                  <span>मागे जा (Back)</span>
                </button>
                <div className="size-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="size-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{selectedRecordForPreview.fileName || "Teaching Diary Document"}</p>
                  <p className="text-[10px] text-slate-400">{studentClass} ({selectedMedium})</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  setSelectedRecordForPreview(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="size-3.5 text-indigo-400" />
                <span>मागे जा</span>
                <span className="text-slate-400 text-xs">×</span>
              </button>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {loadingPreview ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 gap-3">
                  <Loader2 className="size-8 animate-spin text-indigo-600" />
                  <p className="text-xs font-bold text-slate-600">Loading secure preview...</p>
                </div>
              ) : null}
              {isWordDoc(selectedRecordForPreview.fileName || selectedRecordForPreview.pageUrl) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10 p-6 text-center gap-4">
                  <div className="size-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
                    <FileText className="size-10" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900">Word Document Preview Unavailable</h3>
                    <p className="text-xs font-bold text-slate-500 max-w-md mx-auto">
                      Direct preview of Word documents (.doc, .docx) is not supported in the browser. Please download the file to view its contents.
                    </p>
                  </div>
                  <a
                    href={selectedRecordForPreview.pageUrl}
                    download={selectedRecordForPreview.fileName || "document"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md"
                  >
                    <Download className="size-4" /> Download Document
                  </a>
                </div>
              ) : (
                <iframe
                  src={authenticatedPreviewUrl || selectedRecordForPreview.pageUrl}
                  className="w-full h-full border-none"
                  title="Document Preview"
                  style={{ display: loadingPreview ? 'none' : 'block' }}
                  onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.src) {
                      setTimeout(() => {
                        const loader = iframe.parentElement?.querySelector('.animate-spin');
                        if (loader) loader.parentElement!.style.display = 'none';
                      }, 1000);
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
