import { createFileRoute } from "@tanstack/react-router";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentSidebar } from "@/components/student/StudentSidebar";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  Clock,
  Calendar as CalendarIcon,
  User,
  Sparkles,
  GraduationCap,
  Download,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { showToast as toast } from "@/lib/custom-toast";
import html2pdf from "html2pdf.js";

export const Route = createFileRoute("/student/timetable")({
  component: StudentTimetablePage,
});

const CLASSES = [
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];

const CLASS_NAME_MAP: Record<string, { mr: string; en: string }> = {
  "1st": { mr: "पहिली", en: "1st Standard" },
  "2nd": { mr: "दुसरी", en: "2nd Standard" },
  "3rd": { mr: "तिसरी", en: "3rd Standard" },
  "4th": { mr: "चौथी", en: "4th Standard" },
  "5th": { mr: "पाचवी", en: "5th Standard" },
  "6th": { mr: "सहावी", en: "6th Standard" },
  "7th": { mr: "सातवी", en: "7th Standard" },
  "8th": { mr: "आठवी", en: "8th Standard" },
  "9th": { mr: "नववी", en: "9th Standard" },
  "10th": { mr: "दहावी", en: "10th Standard" },
};

const CLASS_SUBJECTS_MAP: Record<string, { label: string; key: string }[]> = {
  "1st": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "2nd": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "3rd": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "4th": [
    { label: "भाषा", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "5th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "प.अभ्यास", key: "evs" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "6th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "7th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
  "8th": [
    { label: "मराठी", key: "marathi" },
    { label: "गणित", key: "maths" },
    { label: "इंग्रजी", key: "english" },
    { label: "हिंदी", key: "hindi" },
    { label: "विज्ञान", key: "science" },
    { label: "सा.शास्त्रे", key: "socialScience" },
    { label: "कला", key: "art" },
    { label: "कार्यानुभव", key: "work" },
    { label: "शा.शिक्षण", key: "pe" },
  ],
};

function StudentTimetablePage() {
  const [selectedClass, setSelectedClass] = useState("1st");
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { lang } = useLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
<<<<<<< HEAD
      const parentWidth = containerRef.current.parentElement?.clientWidth || window.innerWidth;
=======
      const parentWidth =
        containerRef.current.parentElement?.clientWidth || window.innerWidth;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
      const targetWidth = 1000;
      if (parentWidth < targetWidth) {
        setScale(parentWidth / targetWidth);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [gridData]);

  useEffect(() => {
    setLoading(true);
    setGridData(null);

    // Subscribe to class_timetables/${selectedClass}
    const docRef = doc(db, "class_timetables", selectedClass);
<<<<<<< HEAD
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setGridData(snapshot.data());
      } else {
        setGridData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      toast.error("Failed to load timetable");
      setLoading(false);
    });
=======
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data) {
            if (data.district === "सोलापूर") {
              data.district = "";
            }
            if (data.teacherName === "वर्गशिक्षक") {
              data.teacherName = "शिक्षकाचे नाव टाईप करा";
            }
            if (data.headmasterName === "ZP Headmaster") {
              data.headmasterName = "मुख्याध्यापकाचे नाव टाईप करा";
            }
          }
          setGridData(data);
        } else {
          setGridData(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Firestore loading error:", error);
        toast.error("Failed to load timetable");
        setLoading(false);
      },
    );
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

    return () => unsubscribe();
  }, [selectedClass]);

  const handleDownloadPDF = async () => {
    const element = document.getElementById("student-timetable-container");
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `${selectedClass}_Timetable.pdf`,
      image: { type: "jpeg", quality: 1.0 },
      html2canvas: {
        scale: 3,
        useCORS: true,
        logging: false,
        letterRendering: true,
        windowWidth: 1050,
        scrollX: 0,
<<<<<<< HEAD
        scrollY: 0
      },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ['css'] }
=======
        scrollY: 0,
      },
      jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ["css"] },
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
    };

    toast.success(lang === "mr" ? "PDF तयार होत आहे..." : "Generating PDF...");

    const prevZoom = element.style.zoom;
    const prevWebkitZoom = (element.style as any).WebkitZoom;

    try {
<<<<<<< HEAD
      element.style.zoom = '1';
      (element.style as any).WebkitZoom = '1';
      element.style.transform = 'scale(0.90)';
      element.style.transformOrigin = 'top center';
=======
      element.style.zoom = "1";
      (element.style as any).WebkitZoom = "1";
      element.style.transform = "scale(0.90)";
      element.style.transformOrigin = "top center";
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      element.style.zoom = prevZoom;
      (element.style as any).WebkitZoom = prevWebkitZoom;
<<<<<<< HEAD
      element.style.transform = '';
      element.style.transformOrigin = '';
    }
  };

  const selectedClassNameMr = CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
  const selectedClassNameEn = CLASS_NAME_MAP[selectedClass]?.en || selectedClass;
=======
      element.style.transform = "";
      element.style.transformOrigin = "";
    }
  };

  const selectedClassNameMr =
    CLASS_NAME_MAP[selectedClass]?.mr || selectedClass;
  const selectedClassNameEn =
    CLASS_NAME_MAP[selectedClass]?.en || selectedClass;
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col">
      <StudentHeader />
      <div className="flex flex-1 mt-16">
        <StudentSidebar />
        <main className="flex-1 lg:pl-64 p-4 md:p-6 space-y-6">
          <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-slate-900 tracking-tight italic">
                {lang === "mr" ? "वेळापत्रक" : "Class Timetable"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>Academic Year 2025-26</span>
            </div>
          </header>

          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-sm space-y-6 w-full max-w-full overflow-hidden">
            {/* Class Selector tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">
                {lang === "mr" ? "इयत्ता निवडा:" : "Select Grade:"}
              </span>
              {CLASSES.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    selectedClass === cls
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105"
                      : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
<<<<<<< HEAD
                  {lang === "mr" ? `इयत्ता ${CLASS_NAME_MAP[cls]?.mr || cls}` : `Class ${cls}`}
=======
                  {lang === "mr"
                    ? `इयत्ता ${CLASS_NAME_MAP[cls]?.mr || cls}`
                    : `Class ${cls}`}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                </button>
              ))}
            </div>

            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-400 gap-4">
                <div className="size-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-wider animate-pulse">
<<<<<<< HEAD
                  {lang === "mr" ? "वेळापत्रक लोड होत आहे..." : "Loading timetable..."}
=======
                  {lang === "mr"
                    ? "वेळापत्रक लोड होत आहे..."
                    : "Loading timetable..."}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                </p>
              </div>
            ) : gridData ? (
              <div className="space-y-6">
                {/* Download action button */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-sm">
                  <span className="text-xs font-bold text-slate-500 text-center sm:text-left">
<<<<<<< HEAD
                    {lang === "mr" ? "वेळापत्रक खालील तक्त्यामध्ये उपलब्ध आहे." : "The official timetable is listed below."}
=======
                    {lang === "mr"
                      ? "वेळापत्रक खालील तक्त्यामध्ये उपलब्ध आहे."
                      : "The official timetable is listed below."}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </span>
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    <Download className="size-4" />
<<<<<<< HEAD
                    <span>{lang === "mr" ? "PDF डाउनलोड" : "Download PDF"}</span>
=======
                    <span>
                      {lang === "mr" ? "PDF डाउनलोड" : "Download PDF"}
                    </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </button>
                </div>

                <div className="block lg:hidden text-center text-[11px] font-bold text-indigo-500 animate-pulse pb-1">
<<<<<<< HEAD
                  {lang === "mr" ? "← पूर्ण वेळापत्रक पाहण्यासाठी डावीकडे/उजवीकडे स्क्रोल करा →" : "← Scroll horizontally to view full timetable →"}
=======
                  {lang === "mr"
                    ? "← पूर्ण वेळापत्रक पाहण्यासाठी डावीकडे/उजवीकडे स्क्रोल करा →"
                    : "← Scroll horizontally to view full timetable →"}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                </div>

                {/* Unified beautiful read-only ZP timetable grid */}
                <div className="w-full overflow-x-auto pb-4" ref={containerRef}>
<<<<<<< HEAD
                  <div 
                    id="student-timetable-container" 
=======
                  <div
                    id="student-timetable-container"
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                    className="p-4 bg-white text-slate-900 border border-black shadow-sm font-sans space-y-2 w-[1000px] mx-auto overflow-hidden origin-top"
                    style={{
                      ["zoom" as any]: scale,
                      ["WebkitZoom" as any]: scale,
                      transformOrigin: "top center",
                    }}
                  >
                    {/* Header bar */}
<<<<<<< HEAD
                    <div 
                      className="flex items-center justify-between p-2 border border-black rounded-lg"
                      style={{
                        background: "linear-gradient(to right, #00d2ff, #0072ff)"
                      }}
                    >

                      <div className="flex-1 flex justify-center whitespace-nowrap overflow-visible mx-4">
                        <div className="px-6 py-1.5 text-center rounded-lg shadow-sm whitespace-nowrap flex items-center justify-center gap-1" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
                          <span className="text-sm md:text-base font-black text-slate-800 tracking-wider whitespace-nowrap">
                            वेळापत्रक ( इयत्ता :- {gridData.classNameMr || selectedClassNameMr} )
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-1.5 text-center rounded-lg whitespace-nowrap flex-shrink-0" style={{ background: 'linear-gradient(to bottom, #ffffff, #e6f7ff)', border: '1px solid black' }}>
=======
                    <div
                      className="flex items-center justify-between p-2 border border-black rounded-lg"
                      style={{
                        background:
                          "linear-gradient(to right, #00d2ff, #0072ff)",
                      }}
                    >
                      <div className="flex-1 flex justify-center whitespace-nowrap overflow-visible mx-4">
                        <div
                          className="px-6 py-1.5 text-center rounded-lg shadow-sm whitespace-nowrap flex items-center justify-center gap-1"
                          style={{
                            background:
                              "linear-gradient(to bottom, #ffffff, #e6f7ff)",
                            border: "1px solid black",
                          }}
                        >
                          <span className="text-sm md:text-base font-black text-slate-800 tracking-wider whitespace-nowrap">
                            वेळापत्रक ( इयत्ता :-{" "}
                            {gridData.classNameMr || selectedClassNameMr} )
                          </span>
                        </div>
                      </div>
                      <div
                        className="px-4 py-1.5 text-center rounded-lg whitespace-nowrap flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(to bottom, #ffffff, #e6f7ff)",
                          border: "1px solid black",
                        }}
                      >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                          सन {gridData.academicYear}
                        </span>
                      </div>
                    </div>

                    {/* ZP Info bar */}
                    <div className="border border-black text-[10px] font-bold grid grid-cols-12 bg-white">
<<<<<<< HEAD
                      <div className="col-span-5 flex items-center gap-1 p-1.5 bg-white" style={{ borderRight: '1px solid black' }}>
                        <span>जिल्हा परिषद प्राथमिक शाळा :</span>
                        <span className="font-bold text-slate-800 px-1">{gridData.schoolName}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span>केंद्र :-</span>
                        <span className="font-bold text-slate-800 px-1">{gridData.center}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1 p-1.5" style={{ backgroundColor: '#C6E0B4', borderRight: '1px solid black' }}>
                        <span>तालुका :-</span>
                        <span className="font-bold text-slate-800 px-1">{gridData.taluka}</span>
                      </div>
                      <div className="col-span-3 flex items-center gap-1 p-1.5" style={{ backgroundColor: '#F2DCDB' }}>
                        <span>जिल्हा :-</span>
                        <span className="font-bold text-slate-800 px-1">{gridData.district}</span>
=======
                      <div
                        className="col-span-5 flex items-center gap-1 p-1.5 bg-white"
                        style={{ borderRight: "1px solid black" }}
                      >
                        <span>जिल्हा परिषद प्राथमिक शाळा :</span>
                        <span className="font-bold text-slate-800 px-1">
                          {gridData.schoolName}
                        </span>
                      </div>
                      <div
                        className="col-span-2 flex items-center gap-1 p-1.5"
                        style={{
                          backgroundColor: "#C6E0B4",
                          borderRight: "1px solid black",
                        }}
                      >
                        <span className="shrink-0">केंद्र :-</span>
                        <span className="flex-1 min-w-0 font-bold text-slate-800 px-1 truncate">
                          {gridData.center}
                        </span>
                      </div>
                      <div
                        className="col-span-2 flex items-center gap-1 p-1.5"
                        style={{
                          backgroundColor: "#C6E0B4",
                          borderRight: "1px solid black",
                        }}
                      >
                        <span className="shrink-0">तालुका :-</span>
                        <span className="flex-1 min-w-0 font-bold text-slate-800 px-1 truncate">
                          {gridData.taluka}
                        </span>
                      </div>
                      <div
                        className="col-span-3 flex items-center gap-1 p-1.5"
                        style={{ backgroundColor: "#F2DCDB" }}
                      >
                        <span className="shrink-0">जिल्हा :-</span>
                        <span className="flex-1 min-w-0 font-bold text-slate-800 px-1 truncate">
                          {gridData.district}
                        </span>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                      </div>
                    </div>

                    {/* Unified 12-column table grid */}
                    <div className="w-full">
<<<<<<< HEAD
                      <table className="w-full text-center" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                        <thead>
                          <tr className="text-slate-800 font-bold text-[9px] h-8">
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%' }}>तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%' }}>वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>सोमवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>मंगळवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>बुधवार</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '9%' }}>गुरुवार</th>
                            
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%' }}>तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%' }}>वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%' }}>शुक्रवार</th>
                            
                            <th style={{ backgroundColor: '#C6E0B4', border: '1px solid black', width: '4%' }}>तासिका</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '8%' }}>वेळ</th>
                            <th style={{ backgroundColor: '#FFF2CC', border: '1px solid black', width: '10%' }}>शनिवार</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gridData.rows && gridData.rows.map((row: any, idx: number) => {
                            const isRecessValue = (val: string) => {
                              if (!val) return false;
                              const clean = val.trim();
                              return clean === "लहान सुट्टी" || clean === "मोठी सुट्टी" || clean === "सफाई" || clean === "परिपाठ";
                            };
                            
                            const getRecessStyle = (val: string) => {
                              if (val.includes("परिपाठ")) return { backgroundColor: '#F2DCDB' };
                              return { backgroundColor: '#C6E0B4' };
                            };

                            const hasMonThu = row.monThuPeriod && row.monThuPeriod.trim() !== "";
                            const monThuPeriodBg = hasMonThu ? "#C6E0B4" : "white";
                            const monThuTimeBg = row.monThuTime && row.monThuTime.trim() !== "" ? "#F2DCDB" : "white";
                            
                            const getMonThuRecessValue = (r: any) => {
                              if (isRecessValue(r.monday)) return r.monday;
                              if (isRecessValue(r.tuesday)) return r.tuesday;
                              if (isRecessValue(r.wednesday)) return r.wednesday;
                              if (isRecessValue(r.thursday)) return r.thursday;
                              return null;
                            };
                            const monThuRecessVal = getMonThuRecessValue(row);
                            const isMonThuRecess = monThuRecessVal !== null;

                            const hasFri = row.friPeriod && row.friPeriod.trim() !== "";
                            const friPeriodBg = hasFri ? "#C6E0B4" : "white";
                            const friTimeBg = row.friTime && row.friTime.trim() !== "" ? "#F2DCDB" : "white";
                            const isFriRecess = isRecessValue(row.friday);

                            const hasSat = row.satPeriod && row.satPeriod.trim() !== "";
                            const satPeriodBg = hasSat ? "#C6E0B4" : "white";
                            const satTimeBg = row.satTime && row.satTime.trim() !== "" ? "#F2DCDB" : "white";
                            const isSatRecess = isRecessValue(row.saturday);

                            return (
                              <tr key={idx} className="text-[9px] h-7">
                                <td className="font-black py-0.5" style={{ backgroundColor: monThuPeriodBg, border: '1px solid black', width: '4%' }}>{row.monThuPeriod}</td>
                                <td className="py-0.5" style={{ backgroundColor: monThuTimeBg, border: '1px solid black', width: '8%', color: '#C00000', fontWeight: '600' }}>{row.monThuTime}</td>
                                {isMonThuRecess ? (
                                  <td className="font-bold text-center py-0.5" style={{ ...getRecessStyle(monThuRecessVal || ""), border: '1px solid black' }} colSpan={4}>{monThuRecessVal}</td>
                                ) : (
                                  <>
                                    <td className="py-0.5 bg-white font-bold" style={{ border: '1px solid black', width: '9%' }}>{row.monday}</td>
                                    <td className="py-0.5 bg-white font-bold" style={{ border: '1px solid black', width: '9%' }}>{row.tuesday}</td>
                                    <td className="py-0.5 bg-white font-bold" style={{ border: '1px solid black', width: '9%' }}>{row.wednesday}</td>
                                    <td className="py-0.5 bg-white font-bold" style={{ border: '1px solid black', width: '9%' }}>{row.thursday}</td>
                                  </>
                                )}
                                <td className="font-black py-0.5" style={{ backgroundColor: friPeriodBg, border: '1px solid black', width: '4%' }}>{row.friPeriod}</td>
                                <td className="py-0.5" style={{ backgroundColor: friTimeBg, border: '1px solid black', width: '8%', color: '#C00000', fontWeight: '600' }}>{row.friTime}</td>
                                <td className="py-0.5 font-bold" style={{ ...(isFriRecess ? getRecessStyle(row.friday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%' }}>{row.friday}</td>
                                <td className="font-black py-0.5" style={{ backgroundColor: satPeriodBg, border: '1px solid black', width: '4%' }}>{row.satPeriod}</td>
                                <td className="py-0.5" style={{ backgroundColor: satTimeBg, border: '1px solid black', width: '8%', color: '#C00000', fontWeight: '600' }}>{row.satTime}</td>
                                {idx === 14 ? (
                                  <td className="py-0.5" style={{ backgroundColor: '#FF0000', border: '1px solid black', width: '10%' }}></td>
                                ) : (
                                  <td className="py-0.5 font-bold" style={{ ...(isSatRecess ? getRecessStyle(row.saturday) : { backgroundColor: 'white' }), border: '1px solid black', width: '10%' }}>{row.saturday}</td>
                                )}
                              </tr>
                            );
                          })}
=======
                      <table
                        className="w-full text-center"
                        style={{
                          borderCollapse: "collapse",
                          border: "1px solid black",
                        }}
                      >
                        <thead>
                          <tr className="text-slate-800 font-bold text-[9px] h-8">
                            <th
                              style={{
                                backgroundColor: "#C6E0B4",
                                border: "1px solid black",
                                width: "4%",
                              }}
                            >
                              तासिका
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "8%",
                              }}
                            >
                              वेळ
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "9%",
                              }}
                            >
                              सोमवार
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "9%",
                              }}
                            >
                              मंगळवार
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "9%",
                              }}
                            >
                              बुधवार
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "9%",
                              }}
                            >
                              गुरुवार
                            </th>

                            <th
                              style={{
                                backgroundColor: "#C6E0B4",
                                border: "1px solid black",
                                width: "4%",
                              }}
                            >
                              तासिका
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "8%",
                              }}
                            >
                              वेळ
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "10%",
                              }}
                            >
                              शुक्रवार
                            </th>

                            <th
                              style={{
                                backgroundColor: "#C6E0B4",
                                border: "1px solid black",
                                width: "4%",
                              }}
                            >
                              तासिका
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "8%",
                              }}
                            >
                              वेळ
                            </th>
                            <th
                              style={{
                                backgroundColor: "#FFF2CC",
                                border: "1px solid black",
                                width: "10%",
                              }}
                            >
                              शनिवार
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {gridData.rows &&
                            gridData.rows.map((row: any, idx: number) => {
                              const isRecessValue = (val: string) => {
                                if (!val) return false;
                                const clean = val.trim();
                                return (
                                  clean === "लहान सुट्टी" ||
                                  clean === "मोठी सुट्टी" ||
                                  clean === "सफाई" ||
                                  clean === "परिपाठ"
                                );
                              };

                              const getRecessStyle = (val: string) => {
                                if (val.includes("परिपाठ"))
                                  return { backgroundColor: "#F2DCDB" };
                                return { backgroundColor: "#C6E0B4" };
                              };

                              const hasMonThu =
                                row.monThuPeriod &&
                                row.monThuPeriod.trim() !== "";
                              const monThuPeriodBg = hasMonThu
                                ? "#C6E0B4"
                                : "white";
                              const monThuTimeBg =
                                row.monThuTime && row.monThuTime.trim() !== ""
                                  ? "#F2DCDB"
                                  : "white";

                              const getMonThuRecessValue = (r: any) => {
                                if (isRecessValue(r.monday)) return r.monday;
                                if (isRecessValue(r.tuesday)) return r.tuesday;
                                if (isRecessValue(r.wednesday))
                                  return r.wednesday;
                                if (isRecessValue(r.thursday))
                                  return r.thursday;
                                return null;
                              };
                              const monThuRecessVal = getMonThuRecessValue(row);
                              const isMonThuRecess = monThuRecessVal !== null;

                              const hasFri =
                                row.friPeriod && row.friPeriod.trim() !== "";
                              const friPeriodBg = hasFri ? "#C6E0B4" : "white";
                              const friTimeBg =
                                row.friTime && row.friTime.trim() !== ""
                                  ? "#F2DCDB"
                                  : "white";
                              const isFriRecess = isRecessValue(row.friday);

                              const hasSat =
                                row.satPeriod && row.satPeriod.trim() !== "";
                              const satPeriodBg = hasSat ? "#C6E0B4" : "white";
                              const satTimeBg =
                                row.satTime && row.satTime.trim() !== ""
                                  ? "#F2DCDB"
                                  : "white";
                              const isSatRecess = isRecessValue(row.saturday);

                              return (
                                <tr key={idx} className="text-[9px] h-7">
                                  <td
                                    className="font-black py-0.5"
                                    style={{
                                      backgroundColor: monThuPeriodBg,
                                      border: "1px solid black",
                                      width: "4%",
                                    }}
                                  >
                                    {row.monThuPeriod}
                                  </td>
                                  <td
                                    className="py-0.5"
                                    style={{
                                      backgroundColor: monThuTimeBg,
                                      border: "1px solid black",
                                      width: "8%",
                                      color: "#C00000",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {row.monThuTime}
                                  </td>
                                  {isMonThuRecess ? (
                                    <td
                                      className="font-bold text-center py-0.5"
                                      style={{
                                        ...getRecessStyle(
                                          monThuRecessVal || "",
                                        ),
                                        border: "1px solid black",
                                      }}
                                      colSpan={4}
                                    >
                                      {monThuRecessVal}
                                    </td>
                                  ) : (
                                    <>
                                      <td
                                        className="py-0.5 bg-white font-bold"
                                        style={{
                                          border: "1px solid black",
                                          width: "9%",
                                        }}
                                      >
                                        {row.monday}
                                      </td>
                                      <td
                                        className="py-0.5 bg-white font-bold"
                                        style={{
                                          border: "1px solid black",
                                          width: "9%",
                                        }}
                                      >
                                        {row.tuesday}
                                      </td>
                                      <td
                                        className="py-0.5 bg-white font-bold"
                                        style={{
                                          border: "1px solid black",
                                          width: "9%",
                                        }}
                                      >
                                        {row.wednesday}
                                      </td>
                                      <td
                                        className="py-0.5 bg-white font-bold"
                                        style={{
                                          border: "1px solid black",
                                          width: "9%",
                                        }}
                                      >
                                        {row.thursday}
                                      </td>
                                    </>
                                  )}
                                  <td
                                    className="font-black py-0.5"
                                    style={{
                                      backgroundColor: friPeriodBg,
                                      border: "1px solid black",
                                      width: "4%",
                                    }}
                                  >
                                    {row.friPeriod}
                                  </td>
                                  <td
                                    className="py-0.5"
                                    style={{
                                      backgroundColor: friTimeBg,
                                      border: "1px solid black",
                                      width: "8%",
                                      color: "#C00000",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {row.friTime}
                                  </td>
                                  <td
                                    className="py-0.5 font-bold"
                                    style={{
                                      ...(isFriRecess
                                        ? getRecessStyle(row.friday)
                                        : { backgroundColor: "white" }),
                                      border: "1px solid black",
                                      width: "10%",
                                    }}
                                  >
                                    {row.friday}
                                  </td>
                                  <td
                                    className="font-black py-0.5"
                                    style={{
                                      backgroundColor: satPeriodBg,
                                      border: "1px solid black",
                                      width: "4%",
                                    }}
                                  >
                                    {row.satPeriod}
                                  </td>
                                  <td
                                    className="py-0.5"
                                    style={{
                                      backgroundColor: satTimeBg,
                                      border: "1px solid black",
                                      width: "8%",
                                      color: "#C00000",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {row.satTime}
                                  </td>
                                  {idx === 14 ? (
                                    <td
                                      className="py-0.5"
                                      style={{
                                        backgroundColor: "#FF0000",
                                        border: "1px solid black",
                                        width: "10%",
                                      }}
                                    ></td>
                                  ) : (
                                    <td
                                      className="py-0.5 font-bold"
                                      style={{
                                        ...(isSatRecess
                                          ? getRecessStyle(row.saturday)
                                          : { backgroundColor: "white" }),
                                        border: "1px solid black",
                                        width: "10%",
                                      }}
                                    >
                                      {row.saturday}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom section subject distribution counts & signatures */}
                    <div className="grid grid-cols-12 gap-4 items-end pt-2 border-t border-black">
                      <div className="col-span-7 space-y-1.5 text-left">
                        <div className="flex items-center gap-2">
<<<<<<< HEAD
                          <span className="text-[10px] font-black text-slate-800 tracking-widest">तासिका विभागणी :</span>
                          <svg viewBox="0 0 100 40" className="w-12 h-5 select-none inline-block align-middle">
                            <path d="M 5,12 L 60,12 L 60,4 L 95,20 L 60,36 L 60,28 L 5,28 Z" fill="#2E75B6" stroke="black" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <table className="text-[9px] text-center w-full" style={{ borderCollapse: 'collapse', border: '1px solid black' }}>
                          <thead>
                            <tr className="font-bold">
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <th key={subj.key} style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px' }}>{subj.label}</th>
                              ))}
                              <th style={{ backgroundColor: 'white', border: '1px solid black', padding: '2px 6px' }} className="font-black">एकूण</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ backgroundColor: '#FFFF00' }}>
                              {(CLASS_SUBJECTS_MAP[selectedClass] || CLASS_SUBJECTS_MAP["8th"]).map((subj) => (
                                <td key={subj.key} style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px', fontWeight: 'bold' }}>
                                  {gridData.subjectDistribution?.[subj.key] || "0"}
                                </td>
                              ))}
                              <td style={{ backgroundColor: '#FFFF00', border: '1px solid black', padding: '2px' }} className="font-black">
=======
                          <span className="text-[10px] font-black text-slate-800 tracking-widest">
                            तासिका विभागणी :
                          </span>
                          <svg
                            viewBox="0 0 100 40"
                            className="w-12 h-5 select-none inline-block align-middle"
                          >
                            <path
                              d="M 5,12 L 60,12 L 60,4 L 95,20 L 60,36 L 60,28 L 5,28 Z"
                              fill="#2E75B6"
                              stroke="black"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>
                        <table
                          className="text-[9px] text-center w-full"
                          style={{
                            borderCollapse: "collapse",
                            border: "1px solid black",
                          }}
                        >
                          <thead>
                            <tr className="font-bold">
                              {(
                                CLASS_SUBJECTS_MAP[selectedClass] ||
                                CLASS_SUBJECTS_MAP["8th"]
                              ).map((subj) => (
                                <th
                                  key={subj.key}
                                  style={{
                                    backgroundColor: "white",
                                    border: "1px solid black",
                                    padding: "2px 6px",
                                  }}
                                >
                                  {subj.label}
                                </th>
                              ))}
                              <th
                                style={{
                                  backgroundColor: "white",
                                  border: "1px solid black",
                                  padding: "2px 6px",
                                }}
                                className="font-black"
                              >
                                एकूण
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ backgroundColor: "#FFFF00" }}>
                              {(
                                CLASS_SUBJECTS_MAP[selectedClass] ||
                                CLASS_SUBJECTS_MAP["8th"]
                              ).map((subj) => (
                                <td
                                  key={subj.key}
                                  style={{
                                    backgroundColor: "#FFFF00",
                                    border: "1px solid black",
                                    padding: "2px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {gridData.subjectDistribution?.[subj.key] ||
                                    "0"}
                                </td>
                              ))}
                              <td
                                style={{
                                  backgroundColor: "#FFFF00",
                                  border: "1px solid black",
                                  padding: "2px",
                                }}
                                className="font-black"
                              >
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                                {gridData.subjectDistribution?.total || "48"}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
<<<<<<< HEAD
                      <div className="col-span-5 p-3 flex justify-between items-center h-16 rounded-lg" style={{ backgroundColor: '#FCE4D6', border: '1px solid black' }}>
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <span className="font-black text-slate-800 text-[10px]">{gridData.teacherName}</span>
                          <div className="border-t border-dashed border-black mt-1 pt-1 text-[8px] font-black text-slate-700 text-center uppercase tracking-wider">वर्गशिक्षक</div>
                        </div>
                        <div className="h-full w-px bg-black/20 mx-4" />
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <span className="font-black text-slate-800 text-[10px]">{gridData.headmasterName}</span>
                          <div className="border-t border-dashed border-black mt-1 pt-1 text-[8px] font-black text-slate-700 text-center uppercase tracking-wider">मुख्याध्यापक</div>
=======
                      <div
                        className="col-span-5 p-3 flex justify-between items-center h-16 rounded-lg"
                        style={{
                          backgroundColor: "#FCE4D6",
                          border: "1px solid black",
                        }}
                      >
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <span className="font-black text-slate-800 text-[8px]">
                            {gridData.teacherName}
                          </span>
                          <div className="border-t border-dashed border-black mt-1 pt-1 text-[8px] font-black text-slate-700 text-center uppercase tracking-wider">
                            वर्गशिक्षक
                          </div>
                        </div>
                        <div className="h-full w-px bg-black/20 mx-4" />
                        <div className="text-center flex-1 flex flex-col justify-between h-full">
                          <span className="font-black text-slate-800 text-[8px]">
                            {gridData.headmasterName}
                          </span>
                          <div className="border-t border-dashed border-black mt-1 pt-1 text-[8px] font-black text-slate-700 text-center uppercase tracking-wider">
                            मुख्याध्यापक
                          </div>
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2rem] space-y-4 max-w-xl mx-auto my-6 bg-slate-50/50">
                <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <AlertCircle className="size-8" />
                </div>
                <div className="space-y-2 px-4">
                  <h4 className="text-slate-800 font-extrabold text-lg">
<<<<<<< HEAD
                    {lang === "mr" ? "वेळापत्रक अद्याप उपलब्ध नाही" : "Timetable has not been updated yet."}
                  </h4>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">
                    {lang === "mr" ? "कृपया वर्गशिक्षक किंवा प्रशासकाद्वारे जतन होण्याची वाट पहा." : "Please wait for the class teacher or administrator to save the timetable details."}
=======
                    {lang === "mr"
                      ? "वेळापत्रक अद्याप उपलब्ध नाही"
                      : "Timetable has not been updated yet."}
                  </h4>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">
                    {lang === "mr"
                      ? "कृपया वर्गशिक्षक किंवा प्रशासकाद्वारे जतन होण्याची वाट पहा."
                      : "Please wait for the class teacher or administrator to save the timetable details."}
>>>>>>> dbeff7e14a4166b051f7c9a6dda16ad16f4ca557
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
