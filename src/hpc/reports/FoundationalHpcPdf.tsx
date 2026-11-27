import React from "react";
import {
  StudentInfoSummary,
} from "../services/hpcService";
import {
  HpcStudentProfile,
  HpcSessionAssessment,
  HpcAnnualSummary,
  HpcDynamicRubric,
  HpcDynamicActivity,
} from "../types/hpc";
import {
  FOUNDATIONAL_AREAS,
  HPC_CURRICULAR_GOALS,
  HPC_COMPETENCIES,
  getGoalsForArea,
  getCompetenciesForGoalAndClass,
} from "../data/hpcCurricularGoals";
import { HPC_CORE_RUBRICS } from "../data/hpcRubrics";
import { HPC_BASE64_IMAGES } from "./hpcBase64Images";
import { SafePhoto } from "./SafePhoto";
import {
  FOUNDATIONAL_AREA_DETAILS,
  FOUNDATIONAL_RUBRICS,
  HOME_RESOURCES,
  FoundationalAreaConfig,
} from "../data/foundationalHpcData";
import { CLASSWISE_LEARNING_OUTCOMES } from "../data/hpcClasswiseCurricularData";
import { HPC_ACTIVITIES_BANK } from "../data/hpcActivitiesBank";
import { PravinyaEmblem } from "../components/PravinyaEmblem";

export type { FoundationalAreaConfig };

function ProficiencyBadge({
  level = "",
  size = 125,
  showSlider = true,
}: {
  level?: string;
  size?: number;
  showSlider?: boolean;
}) {
  return (
    <div className="flex items-center justify-center shrink-0 my-0.5">
      <PravinyaEmblem level={level} size={size} showSlider={showSlider} />
    </div>
  );
}

function ArrowInputBox({ value }: { value: string }) {
  return (
    <div className="relative flex-1 h-7 flex items-center">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 160 28"
        preserveAspectRatio="none"
      >
        <path
          d="M 12 1.5 L 2 14 L 12 26.5 L 147 26.5 A 12.5 12.5 0 0 0 147 1.5 Z"
          fill="#ffffff"
          stroke="#000000"
          strokeWidth="1.2"
        />
      </svg>
      <div className="relative z-10 pl-5 pr-4 text-xs font-bold text-slate-900 truncate">
        {value}
      </div>
    </div>
  );
}

function SmileyOptions({
  selected = "",
}: {
  selected?: "yes" | "no" | "dont_know" | "" | string;
}) {
  const items = [
    { key: "yes", label: "होय", emoji: "😊", activeBox: "bg-amber-100 border-amber-500 shadow-xs ring-2 ring-amber-400", activeText: "text-amber-800" },
    { key: "no", label: "नाही", emoji: "😐", activeBox: "bg-slate-200 border-slate-500 shadow-xs ring-2 ring-slate-400", activeText: "text-slate-800" },
    { key: "dont_know", label: "माहिती नाही", emoji: "🤔", activeBox: "bg-purple-100 border-purple-500 shadow-xs ring-2 ring-purple-400", activeText: "text-purple-800" },
  ];
  return (
    <div className="flex items-center justify-around gap-1 px-1 py-1">
      {items.map((it) => {
        const isSel = selected === it.key;
        return (
          <div key={it.key} className="flex flex-col items-center">
            <div
              className={`relative size-7 rounded-full flex items-center justify-center border transition-all ${
                isSel ? it.activeBox : "bg-white border-slate-300"
              }`}
            >
              <span className="text-sm leading-none">{it.emoji}</span>
              {isSel && (
                <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-[#e6006e] text-white text-[9px] font-black flex items-center justify-center shadow-xs border border-white">
                  ✓
                </span>
              )}
            </div>
            <span
              className={`text-[9px] mt-0.5 font-bold leading-none ${
                isSel ? it.activeText : "text-slate-600"
              }`}
            >
              {it.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HelpOptions({ selected = "" }: { selected?: string | string[] }) {
  const options = [
    { id: "peer", label: "वर्गमित्र", icon: "👥" },
    { id: "teacher", label: "शिक्षक", icon: "🧑‍🏫" },
    { id: "book", label: "पुस्तक", icon: "📖" },
    { id: "computer", label: "संगणक", icon: "💻" },
    { id: "none", label: "यांपैकी नाही", icon: "⊘" },
  ];

  return (
    <div className="flex items-center justify-between gap-1 px-1 py-1">
      {options.map((opt) => {
        const isSel = Array.isArray(selected)
          ? selected.includes(opt.id) || (opt.id === "peer" && selected.includes("friend"))
          : selected === opt.id || (opt.id === "peer" && selected === "friend");
        return (
          <div key={opt.id} className="flex flex-col items-center">
            <div
              className={`relative size-7 rounded-lg flex items-center justify-center border text-xs transition-all ${
                isSel
                  ? "bg-rose-100 border-rose-500 ring-2 ring-rose-400 font-bold"
                  : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              {opt.icon}
              {isSel && (
                <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-[#e6006e] text-white text-[9px] font-black flex items-center justify-center shadow-xs border border-white">
                  ✓
                </span>
              )}
            </div>
            <span
              className={`text-[8.5px] mt-0.5 leading-none font-bold text-center ${
                isSel ? "text-rose-900 font-black" : "text-slate-600 font-bold"
              }`}
            >
              {opt.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface FoundationalHpcPdfProps {
  student: StudentInfoSummary;
  schoolSettings?: any;
  profile?: HpcStudentProfile | null;
  session1?: HpcSessionAssessment | null;
  session2?: HpcSessionAssessment | null;
  annualSummary?: HpcAnnualSummary | null;
  attendance?: any;
  academicYear?: string;
  stageRubrics?: HpcDynamicRubric[];
  stageActivities?: HpcDynamicActivity[];
}

export function FoundationalHpcPdf({
  student: rawStudent,
  schoolSettings = {},
  profile,
  session1,
  session2,
  annualSummary,
  attendance,
  academicYear = "२०२५ - २०२६",
  stageRubrics = [],
  stageActivities = [],
}: FoundationalHpcPdfProps) {
  const student: StudentInfoSummary = rawStudent || {
    id: "default",
    name: "विद्यार्थी",
    fullName: "विद्यार्थी",
    rollNo: "1",
    gender: "male",
    class: "1st",
    division: "अ",
  };
  const schoolName =
    schoolSettings?.schoolName ||
    schoolSettings?.name ||
    student?.schoolName ||
    "जिल्हा परिषद शाळा";

  // Split long school name / address gracefully across the two official lines
  let schoolNameLine = schoolName;
  let schoolAddressLine = schoolSettings?.address || "";
  if (!schoolAddressLine && schoolName.includes(",")) {
    const parts = schoolName.split(",");
    schoolNameLine = parts[0].trim();
    schoolAddressLine = parts.slice(1).join(",").trim();
  } else if (!schoolAddressLine && schoolName.length > 35) {
    const words = schoolName.split(" ");
    const mid = Math.ceil(words.length / 2);
    schoolNameLine = words.slice(0, mid).join(" ");
    schoolAddressLine = words.slice(mid).join(" ");
  }

  const rawTeacherId = String(
    (profile as any)?.teacherIdNumber ||
    (schoolSettings as any)?.teacherIdNumber ||
    (schoolSettings as any)?.shalarthId ||
    ""
  );
  const teacherIdDisplay =
    rawTeacherId &&
    !rawTeacherId.includes("वर्ग") &&
    !rawTeacherId.includes("शिक्षक") &&
    !rawTeacherId.includes("teacher") &&
    rawTeacherId.length <= 15
      ? rawTeacherId
      : "";

  const teacherName =
    profile?.teacherName ||
    schoolSettings?.classTeacher ||
    schoolSettings?.teacherName ||
    student?.teacherName ||
    "वर्ग शिक्षक";

  const hmName = profile?.headmasterName || schoolSettings?.headMaster || "मुख्याध्यापक";

  const studentGender = String(profile?.gender || student.gender || "").toLowerCase();
  const studentAadhaar = String(profile?.aadhaar || student.aadhaar || (student as any)?.aadhaarNo || "").replace(/\D/g, "");
  const studentPen = profile?.penNo || (student as any)?.penNo || "-";
  const studentGrNo = profile?.grNo || student.grNo || (student as any)?.generalRegisterNo || "-";
  const studentBloodGroup = profile?.bloodGroup || student.bloodGroup || (student as any)?.bloodGroup || "-";
  const studentCategory = profile?.category || (profile as any)?.casteCategory || student.category || (student as any)?.category || "-";
  const studentCaste = profile?.caste || student.caste || "";
  const studentBirthPlace = profile?.birthPlace || (student as any)?.birthPlace || "";
  const schoolCluster = profile?.cluster || (schoolSettings as any)?.cluster || (schoolSettings as any)?.kendra || "";
  const schoolTaluka = profile?.taluka || (schoolSettings as any)?.taluka || "";
  const schoolDistrict = profile?.district || (schoolSettings as any)?.district || (schoolSettings as any)?.jilha || "";

  const getDisplayClassMarathi = (cls?: string) => {
    if (!cls) return "पहिली";
    const s = String(cls).toLowerCase().trim();
    if (s === "1st" || s === "1" || s.includes("१") || s.includes("पहिल")) return "पहिली";
    if (s === "2nd" || s === "2" || s.includes("२") || s.includes("दुसर")) return "दुसरी";
    if (s === "balvatika_1" || s.includes("बालवाटिका १") || s.includes("बालवाटिका 1")) return "बालवाटिका १";
    if (s === "balvatika_2" || s.includes("बालवाटिका २") || s.includes("बालवाटिका 2")) return "बालवाटिका २";
    if (s === "balvatika_3" || s.includes("बालवाटिका ३") || s.includes("बालवाटिका 3")) return "बालवाटिका ३";
    return cls;
  };

  const studentDisplayName = profile?.fullName || student.fullName || student.name || "";
  const studentRollNo = profile?.rollNo || student.rollNo || "१";
  const studentDivision = profile?.division || student.division || "अ";
  const studentGrNoDisplay = profile?.grNo || student.grNo || (student as any)?.generalRegisterNo || "-";
  const studentSchoolName = schoolName || "जिल्हा परिषद शाळा";

  // Attendance helpers
  const t1 = attendance?.term1 || {
    june: 0,
    july: 0,
    august: 0,
    september: 0,
    october: 0,
    totalWorking: 110,
    totalPresent: 0,
  };
  const t2 = attendance?.term2 || {
    november: 0,
    december: 0,
    january: 0,
    february: 0,
    march: 0,
    april: 0,
    totalWorking: 115,
    totalPresent: 0,
  };
  // Attendance calculations: takes real numbers from CCE or HPC profile if entered, otherwise leaves blank
  const monthKeys = [
    "june", "july", "august", "september", "october",
    "november", "december", "january", "february", "march", "april", "may"
  ];
  const monthlyAttList = monthKeys.map((key) => {
    const p =
      profile?.monthlyAttendance?.[key] !== undefined && profile?.monthlyAttendance?.[key] !== null
        ? profile.monthlyAttendance[key]
        : attendance?.term1?.[key] !== undefined && attendance?.term1?.[key] !== null
        ? attendance.term1[key]
        : attendance?.term2?.[key] !== undefined && attendance?.term2?.[key] !== null
        ? attendance.term2[key]
        : null;

    const w =
      attendance?.workingDays?.[key] !== undefined && attendance?.workingDays?.[key] !== null
        ? attendance.workingDays[key]
        : profile?.monthlyWorkingDays?.[key] !== undefined && profile?.monthlyWorkingDays?.[key] !== null
        ? profile.monthlyWorkingDays[key]
        : (profile as any)?.workingDays?.[key] !== undefined && (profile as any)?.workingDays?.[key] !== null
        ? (profile as any).workingDays[key]
        : null;

    const presentNum = p !== null && p !== "" && Number(p) >= 0 ? Number(p) : null;
    const workingNum = w !== null && w !== "" && Number(w) > 0 ? Number(w) : null;
    const pct =
      workingNum && presentNum !== null && workingNum > 0
        ? `${Math.round((presentNum / workingNum) * 100)}%`
        : "";

    return {
      working: workingNum !== null ? String(workingNum) : "",
      present: presentNum !== null ? String(presentNum) : "",
      pct,
    };
  });

  let calcTotalWorking = 0;
  let calcTotalPresent = 0;
  let calcT1Working = 0;
  let calcT1Present = 0;
  let calcT2Working = 0;
  let calcT2Present = 0;
  monthlyAttList.forEach((item, idx) => {
    const w = Number(item.working) || 0;
    const p = Number(item.present) || 0;
    calcTotalWorking += w;
    calcTotalPresent += p;
    if (idx <= 4) {
      calcT1Working += w;
      calcT1Present += p;
    } else {
      calcT2Working += w;
      calcT2Present += p;
    }
  });

  const totalWorking = calcTotalWorking > 0 ? calcTotalWorking : attendance?.annualTotalWorking || 0;
  const totalPresent = calcTotalPresent > 0 ? calcTotalPresent : attendance?.annualTotalPresent || (t1.totalPresent + t2.totalPresent);
  const attendancePct =
    totalWorking > 0
      ? `${((totalPresent / totalWorking) * 100).toFixed(1)}%`
      : attendance?.attendancePercentage || "";

  const t1WorkingTotal = calcT1Working > 0 ? calcT1Working : t1.totalWorking || 0;
  const t1PresentTotal = calcT1Present > 0 ? calcT1Present : t1.totalPresent || 0;
  const t1Pct = t1WorkingTotal > 0 ? `${((t1PresentTotal / t1WorkingTotal) * 100).toFixed(1)}%` : "";

  const t2WorkingTotal = calcT2Working > 0 ? calcT2Working : t2.totalWorking || 0;
  const t2PresentTotal = calcT2Present > 0 ? calcT2Present : t2.totalPresent || 0;
  const t2Pct = t2WorkingTotal > 0 ? `${((t2PresentTotal / t2WorkingTotal) * 100).toFixed(1)}%` : "";

  // Helper to reliably find Area Summary for Page 16
  const findAreaSummary = (areaKey: string) => {
    if (!annualSummary?.areaSummaries) return null;
    const summaries = annualSummary.areaSummaries;
    if (summaries[areaKey]) return summaries[areaKey];
    for (const [k, v] of Object.entries(summaries)) {
      if (!v) continue;
      const kLow = k.toLowerCase();
      const name = (v.areaOrSubjectNameMarathi || "").toLowerCase();
      if (areaKey === "physical_health" && (kLow.includes("physical") || name.includes("शारीरिक"))) return v;
      if (areaKey === "socio_emotional" && (kLow.includes("socio") || name.includes("सामाजिक") || name.includes("भावनिक"))) return v;
      if (areaKey === "cognitive" && (kLow.includes("cognitive") || name.includes("बोध"))) return v;
      if (areaKey === "language_literacy" && (kLow.includes("language") || name.includes("भाषा") || name.includes("साक्षरता"))) return v;
      if (areaKey === "aesthetic_cultural" && (kLow.includes("aesthetic") || name.includes("सौंदर्य") || name.includes("सांस्कृतिक") || name.includes("कला"))) return v;
      if (areaKey === "positive_habits" && (kLow.includes("habit") || name.includes("सवयी"))) return v;
    }
    return null;
  };

  // Helper to reliably find Session Assessment for Pages 4 to 15
  const findSessionAssessment = (sessData: HpcSessionAssessment | null | undefined, areaId: string) => {
    if (!sessData?.areaAssessments) return null;
    const map = sessData.areaAssessments;
    if (map[areaId]) return map[areaId];
    for (const [k, v] of Object.entries(map)) {
      if (!v) continue;
      const kLow = k.toLowerCase();
      const name = (v.areaOrSubjectNameMarathi || "").toLowerCase();
      if (areaId === "physical_health" && (kLow.includes("physical") || name.includes("शारीरिक"))) return v;
      if (areaId === "socio_emotional" && (kLow.includes("socio") || name.includes("सामाजिक") || name.includes("भावनिक"))) return v;
      if (areaId === "cognitive" && (kLow.includes("cognitive") || name.includes("बोध"))) return v;
      if (areaId === "language_literacy" && (kLow.includes("language") || name.includes("भाषा") || name.includes("साक्षरता"))) return v;
      if (areaId === "aesthetic_cultural" && (kLow.includes("aesthetic") || name.includes("सौंदर्य") || name.includes("सांस्कृतिक") || name.includes("कला"))) return v;
      if (areaId === "positive_habits" && (kLow.includes("habit") || name.includes("सवयी"))) return v;
    }
    return null;
  };

  return (
    <div className="hpc-pdf-document font-sans text-slate-900 bg-transparent flex flex-col items-center">
      <style>{`
        @media screen {
          .hpc-pdf-document .pdf-page {
            margin-bottom: 32px !important;
            box-shadow: 0 12px 36px -6px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.1) !important;
            border-radius: 4px !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .hpc-pdf-document {
            width: 794px !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .hpc-pdf-document .pdf-page {
            width: 794px !important;
            height: 1123px !important;
            max-height: 1123px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      {/* =========================================================================
          PAGE 1: COVER PAGE (मुद्रित मुखपृष्ठ - SCERT Official 100% Replica)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden mx-auto bg-[#ffb988] flex flex-col justify-between relative box-border shadow-md">
        {/* Top Peach Portion */}
        <div className="px-10 pt-7 pb-4 flex flex-col items-center justify-between flex-shrink-0">
          {/* Top Header: Right aligned 'पथदर्शी प्रकल्प' */}
          <div className="w-full flex justify-end pr-2">
            <span className="text-base font-black text-slate-900 tracking-wider">
              पथदर्शी प्रकल्प
            </span>
          </div>

          {/* Project Tag: 'STARS' प्रकल्पांतर्गत */}
          <div className="my-2">
            <span className="inline-block text-xs font-black border border-slate-900 px-5 py-0.5 rounded-full tracking-wider bg-transparent text-slate-900">
              'STARS' प्रकल्पांतर्गत
            </span>
          </div>

          {/* Emblems Row: 3 Official Logos */}
          <div className="w-full flex items-center justify-around px-2 my-2">
            {/* NCERT / PARAKH */}
            <div className="text-center w-36 flex flex-col items-center">
              <img
                src={HPC_BASE64_IMAGES.ncertParakhLogo}
                alt="NCERT PARAKH"
                className="h-20 w-auto object-contain"
              />
            </div>

            {/* Maharashtra Shasan Seal */}
            <div className="text-center w-36 flex flex-col items-center">
              <img
                src={HPC_BASE64_IMAGES.maharashtraSealLogo}
                alt="महाराष्ट्र शासन"
                className="h-20 w-auto object-contain"
              />
            </div>

            {/* SCERT Pune */}
            <div className="text-center w-44 flex flex-col items-center">
              <img
                src={HPC_BASE64_IMAGES.scertPuneLogo}
                alt="SCERT Pune"
                className="h-20 w-auto object-contain"
              />
            </div>
          </div>

          {/* Main Titles */}
          <div className="text-center my-3">
            <h1 className="text-[44px] font-black text-[#e6006e] tracking-tight leading-none drop-shadow-2xs">
              समग्र प्रगतिपत्रक (HPC)
            </h1>
            <h2 className="text-[32px] font-black text-slate-900 tracking-wider mt-2.5">
              पायाभूत स्तर
            </h2>
          </div>
        </div>

        {/* Orange Horizontal Stripe Divider */}
        <div className="w-full h-3 bg-[#e86b24] shrink-0" />

        {/* Student Information Section on Cover Page */}
        <div className="w-full flex-1 relative overflow-hidden bg-[#ffb988] flex flex-col items-center justify-center px-10 py-6">
          <div className="w-full max-w-[620px] bg-[#f0f6ff] rounded-[24px] border border-[#ea580c] shadow-[0_4px_20px_-4px_rgba(234,88,12,0.15)] p-8 relative overflow-hidden">
            <div className="space-y-4 text-base font-bold text-slate-900 relative z-10">
              {/* Row 1: नाव */}
              <div className="flex items-center">
                <span className="w-32 text-[#d97706] font-black tracking-wide text-lg shrink-0">नाव</span>
                <span className="mr-3 text-[#d97706] font-black text-lg">:</span>
                <span className="flex-1 text-slate-900 text-lg font-black tracking-wide truncate">{studentDisplayName}</span>
              </div>

              {/* Row 2: हजेरी क्र. & तुकडी */}
              <div className="flex items-center">
                <span className="w-32 text-[#d97706] font-black tracking-wide text-lg shrink-0">हजेरी क्र.</span>
                <span className="mr-3 text-[#d97706] font-black text-lg">:</span>
                <div className="flex items-center gap-3 text-lg font-black text-slate-900">
                  <span>{studentRollNo}</span>
                  <span className="text-slate-400 font-light mx-2">|</span>
                  <span className="text-[#d97706] font-black">तुकडी</span>
                  <span className="text-[#d97706] font-black">:</span>
                  <span>{studentDivision}</span>
                </div>
              </div>

              {/* Row 3: जन. रजि. नं. */}
              <div className="flex items-center">
                <span className="w-32 text-[#d97706] font-black tracking-wide text-lg shrink-0">जन. रजि. नं.</span>
                <span className="mr-3 text-[#d97706] font-black text-lg">:</span>
                <span className="flex-1 text-slate-900 text-lg font-black font-mono">{studentGrNoDisplay}</span>
              </div>

              {/* Row 4: शाळा */}
              <div className="flex items-center">
                <span className="w-32 text-[#d97706] font-black tracking-wide text-lg shrink-0">शाळा</span>
                <span className="mr-3 text-[#d97706] font-black text-lg">:</span>
                <span className="flex-1 text-slate-900 text-lg font-black leading-snug">{studentSchoolName}</span>
              </div>

              {/* Row 5: इयत्ता */}
              <div className="flex items-center">
                <span className="w-32 text-[#d97706] font-black tracking-wide text-lg shrink-0">इयत्ता</span>
                <span className="mr-3 text-[#d97706] font-black text-lg">:</span>
                <span className="flex-1 text-slate-900 text-lg font-black">{getDisplayClassMarathi(student.class)}</span>
              </div>
            </div>
          </div>

          {/* Academic Year Badge */}
          <div className="mt-5 flex items-center justify-center">
            <span className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full bg-white/95 border border-[#e86b24]/40 text-xs font-black text-[#d9651a] shadow-xs tracking-wider">
              <span>शैक्षणिक वर्ष :</span>
              <span className="font-mono text-sm text-slate-900">{academicYear}</span>
            </span>
          </div>
        </div>

        {/* Bottom Orange Base Bar */}
        <div className="w-full h-4 bg-[#e86b24] shrink-0" />
      </div>

      {/* =========================================================================
          PAGE 2: STUDENT INFORMATION & ATTENDANCE (भाग अ (१) - 100% Exact Match)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden px-9 pt-5 pb-4 mx-auto bg-gradient-to-b from-[#fffafd] via-white to-[#fffaf5] flex flex-col justify-between relative box-border text-xs font-sans leading-normal border border-pink-200">
        {/* Title: भाग अ (१) */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#e6006e] to-[#c85a28] text-white px-8 py-1.5 rounded-full shadow-xs">
            <span className="text-amber-200 text-xs">★</span>
            <h2 className="text-base font-black tracking-wide">भाग अ (१) — विद्यार्थी सर्वसाधारण माहिती</h2>
            <span className="text-amber-200 text-xs">★</span>
          </div>
        </div>

        {/* Top School & Administrative Details */}
        <div className="space-y-2.5 bg-white/95 border border-pink-200/80 rounded-2xl p-3.5 shadow-2xs">
          {/* Row 1: शाळेचे नाव व पत्ता : with full-width underline */}
          <div className="flex items-center w-full gap-2">
            <span className="font-bold text-slate-900 whitespace-nowrap">शाळेचे नाव व पत्ता :</span>
            <span className="border-b border-black flex-1 font-bold px-2 pb-0.5 min-h-[22px] truncate text-slate-900">
              {schoolNameLine}
            </span>
          </div>

          {/* Row 2: केंद्र / तालुका / जिल्हा + Right-aligned पिन कोड : with 6 boxes */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">पत्ता / तालुका व जिल्हा :</span>
              <div className="border-b border-black flex-1 min-h-[22px] px-2 pb-0.5 font-bold text-slate-900 truncate">
                {[schoolAddressLine, schoolTaluka ? `तालुका: ${schoolTaluka}` : "", schoolDistrict ? `जिल्हा: ${schoolDistrict}` : ""].filter(Boolean).join(", ") || schoolAddressLine || "-"}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-slate-900 whitespace-nowrap">पिन कोड :</span>
              <div className="flex items-center">
                {Array.from({ length: 6 }).map((_, i) => {
                  const pinChars = String(profile?.pincode || schoolSettings?.pincode || "").replace(/\D/g, "").split("");
                  return (
                    <span
                      key={i}
                      className="w-5.5 h-5.5 border border-black font-mono font-bold text-xs flex items-center justify-center text-slate-900 bg-white -ml-px first:ml-0"
                    >
                      {pinChars[i] || ""}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: युडायस नंबर : with 11 boxes & अंगणवाडी सेविका/शिक्षक आय.डी. with wide box */}
          <div className="flex items-center justify-between gap-4 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 whitespace-nowrap">युडायस नंबर :</span>
              <div className="flex items-center">
                {Array.from({ length: 11 }).map((_, i) => {
                  const udiseChars = String(profile?.udiseNumber || schoolSettings?.udiseNumber || schoolSettings?.udise || "")
                    .replace(/\D/g, "")
                    .split("");
                  return (
                    <span
                      key={i}
                      className="w-5.5 h-5.5 border border-black font-mono font-bold text-xs flex items-center justify-center text-slate-900 bg-white -ml-px first:ml-0"
                    >
                      {udiseChars[i] || ""}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <span className="font-bold text-slate-900 text-[10px] block">अंगणवाडी सेविका / शिक्षक</span>
                <span className="font-bold text-slate-900 text-[10px] block">आय.डी. :</span>
              </div>
              <div className="w-44 h-6 border border-black flex items-center justify-center font-mono font-bold text-slate-900 text-xs px-2 truncate bg-white">
                {teacherIdDisplay}
              </div>
            </div>
          </div>

          {/* Row 4: अपार आय.डी. : with 12 boxes + जन. रजि. नं. */}
          <div className="flex items-center justify-between gap-4 pt-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 whitespace-nowrap">अपार आय.डी. (APAAR) :</span>
              <div className="flex items-center">
                {Array.from({ length: 12 }).map((_, i) => {
                  const aparChars = String(profile?.aparId || (student as any)?.aparId || "")
                    .replace(/\D/g, "")
                    .split("");
                  return (
                    <span
                      key={i}
                      className="w-5.5 h-5.5 border border-black font-mono font-bold text-xs flex items-center justify-center text-slate-900 bg-white -ml-px first:ml-0"
                    >
                      {aparChars[i] || ""}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 whitespace-nowrap">जन. रजि. नं. (G.R. No.) :</span>
              <div className="border-b border-black w-28 min-h-[22px] px-2 font-bold font-mono text-slate-900 text-center flex items-end justify-center">
                {studentGrNo}
              </div>
            </div>
          </div>
        </div>

        {/* Subheader: सर्वसाधारण माहिती */}
        <div className="text-center my-0.5 bg-gradient-to-r from-[#fef2f6] via-[#fff5f7] to-[#fef2f6] py-1.5 px-4 rounded-xl border border-[#f472b6]/50 shadow-2xs">
          <h3 className="font-black text-[#e6006e] text-sm tracking-wide">
            सर्वसाधारण माहिती
          </h3>
          <p className="text-[10px] font-bold text-slate-600">
            (पालकांशी चर्चा करून शिक्षकांनी भरावे.)
          </p>
        </div>

        {/* Student Form Section */}
        <div className="space-y-2.5 text-xs bg-white/95 border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs">
          {/* Top Rows beside Photo Box */}
          <div className="flex items-start justify-between gap-4">
            {/* Left lines */}
            <div className="flex-1 space-y-1.5">
              {/* Row 1: विद्यार्थ्याचे नाव (मराठी) */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 whitespace-nowrap">विद्यार्थ्याचे नाव :</span>
                <div className="border-b border-black flex-1 min-h-[22px] px-2 font-bold text-slate-900 flex items-end">
                  {profile?.fullName || student.fullName || student.name}
                </div>
              </div>

              {/* Row 2: विद्यार्थ्याचे नाव (इंग्रजीत) */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">नाव (इंग्रजी):</span>
                <div className="border-b border-black flex-1 min-h-[22px] px-2 font-bold font-mono uppercase text-slate-900 text-xs flex items-end">
                  {profile?.englishName || (student as any)?.englishName || (student.fullName || student.name || "").toUpperCase()}
                </div>
              </div>

              {/* Row 3: हजेरी क्र. + सरल आय. डी. + PEN No. */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-28">
                  <span className="font-bold text-slate-900 whitespace-nowrap">हजेरी क्र. :</span>
                  <div className="border-b border-black flex-1 min-h-[22px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                    {profile?.rollNo || student.rollNo || "१"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="font-bold text-slate-900 whitespace-nowrap">सरल आय. डी. :</span>
                  <div className="border-b border-black flex-1 min-h-[22px] px-2 font-mono font-bold text-slate-900 flex items-end">
                    {profile?.saralId && profile.saralId !== "-" ? profile.saralId : student.saralId || ""}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 w-36">
                  <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">PEN No. :</span>
                  <div className="border-b border-black flex-1 min-h-[22px] px-1 font-mono font-bold text-slate-900 text-center flex items-end justify-center">
                    {studentPen}
                  </div>
                </div>
              </div>

              {/* Row 4: इयत्ता Checkboxes */}
              <div className="flex items-center gap-2 flex-wrap text-[11px] pt-0.5">
                <span className="font-bold text-slate-900 whitespace-nowrap">इयत्ता :</span>
                <label className="inline-flex items-center gap-1">
                  <span>बालवाटिका १</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "balvatika_1" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <span>बालवाटिका २</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "balvatika_2" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1">
                  <span>बालवाटिका ३</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "balvatika_3" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1 font-bold">
                  <span>इ. पहिली</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "1st" || student.class === "इ. पहिली" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1 font-bold">
                  <span>इ. दुसरी</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "2nd" || student.class === "इ. दुसरी" ? "✓" : ""}
                  </span>
                </label>
              </div>

              {/* Row 5: तुकडी + लिंग + जन्म दिनांक */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-24">
                  <span className="font-bold text-slate-900 whitespace-nowrap">तुकडी :</span>
                  <div className="border-b border-black flex-1 min-h-[22px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                    {profile?.division || student.division || "अ"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 whitespace-nowrap">लिंग :</span>
                  <div className="flex items-center gap-2 text-[11px]">
                    <label className="inline-flex items-center gap-0.5">
                      <span>मुलगा</span>
                      <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center font-bold text-[10px] bg-white">
                        {studentGender === "male" || studentGender === "मुलगा" ? "✓" : ""}
                      </span>
                    </label>
                    <label className="inline-flex items-center gap-0.5">
                      <span>मुलगी</span>
                      <span className="w-3.5 h-3.5 border border-black inline-flex items-center justify-center font-bold text-[10px] bg-white">
                        {studentGender === "female" || studentGender === "मुलगी" ? "✓" : ""}
                      </span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="font-bold text-slate-900 whitespace-nowrap">जन्म दिनांक :</span>
                  <div className="border-b border-black flex-1 min-h-[22px] px-2 font-bold text-slate-900 flex items-end">
                    {profile?.dob && profile.dob !== "-" ? (
                      profile.dob
                    ) : student.dob && student.dob !== "-" ? (
                      student.dob
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">DD / MM / YYYY</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Photo Frame */}
            <div className="w-30 h-38 border-2 border-black flex flex-col items-center justify-center text-slate-800 font-bold text-sm shrink-0 overflow-hidden bg-white shadow-xs">
              <SafePhoto
                src={profile?.photoUrl || student.photoUrl}
                alt="विद्यार्थी फोटो"
                className="w-full h-full object-cover object-top"
                fallback={
                  <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-[10px] font-bold text-slate-600">विद्यार्थी फोटो</span>
                  </div>
                }
              />
            </div>
          </div>

          {/* Full-Width Rows under Photo */}
          {/* Row 6: आधार क्रमांक + रक्तगट + जन्म ठिकाण */}
          <div className="flex items-center gap-4 w-full pt-0.5">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">आधार क्रमांक :</span>
              <div className="flex items-center">
                {Array.from({ length: 12 }).map((_, i) => {
                  const aadhaarChars = studentAadhaar.split("");
                  return (
                    <span
                      key={i}
                      className={`w-4.5 h-5 border border-black font-mono font-bold text-[11px] flex items-center justify-center text-slate-900 bg-white -ml-px first:ml-0 ${
                        i === 4 || i === 8 ? "ml-1" : ""
                      }`}
                    >
                      {aadhaarChars[i] || ""}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-32">
              <span className="font-bold text-slate-900 whitespace-nowrap">रक्तगट :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {studentBloodGroup}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">जन्म ठिकाण :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold text-slate-900 truncate flex items-end">
                {studentBirthPlace || "-"}
              </div>
            </div>
          </div>

          {/* Row 7: धर्म, जात व प्रवर्ग + दिव्यांग (CWSN) व BPL */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">धर्म, जात व प्रवर्ग :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold text-slate-900 flex items-end">
                {[
                  profile?.religion && !profile.religion.includes("इतर") ? profile.religion.split(" ")[0] : "",
                  studentCaste,
                  studentCategory !== "-" ? `(${studentCategory})` : ""
                ].filter(Boolean).join(" - ") || "-"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">दिव्यांग (CWSN) / BPL :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold text-slate-900 flex items-end">
                {[
                  profile?.cwsn && profile.cwsn !== "नाही"
                    ? `${profile.cwsn} ${profile?.udidNo ? `(UDID: ${profile.udidNo})` : ""}`
                    : "दिव्यांग: नाही",
                  profile?.bpl && profile.bpl !== "नाही" ? `BPL: होय` : ""
                ].filter(Boolean).join(" | ")}
              </div>
            </div>
          </div>

          {/* Row 8: पत्ता */}
          <div className="flex items-center gap-2 w-full">
            <span className="font-bold text-slate-900 whitespace-nowrap">संपूर्ण पत्ता :</span>
            <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold text-slate-900 truncate flex items-end">
              {profile?.homeAddress && profile.homeAddress !== "-"
                ? profile.homeAddress
                : profile?.addressLine1 && profile.addressLine1 !== "-"
                ? profile.addressLine1
                : student.address && student.address !== "-"
                ? student.address
                : "-"}
            </div>
          </div>

          {/* Row 9: शारीरिक मोजमापे (उंची व वजन - प्रथम व द्वितीय सत्र) */}
          <div className="flex items-center gap-3 w-full bg-slate-50/80 px-2 py-0.5 rounded border border-slate-200">
            <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">शारीरिक मोजमापे :</span>
            <div className="flex items-center gap-4 flex-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">सत्र १ —</span>
                <span className="font-bold text-slate-900">वजन:</span>
                <span className="border-b border-black min-w-[50px] text-center font-bold px-1">
                  {profile?.term1Weight ? `${profile.term1Weight} कि.ग्रॅ.` : "-"}
                </span>
                <span className="font-bold text-slate-900 ml-1">उंची:</span>
                <span className="border-b border-black min-w-[50px] text-center font-bold px-1">
                  {profile?.term1Height ? `${profile.term1Height} सें.मी.` : "-"}
                </span>
              </div>
              <div className="w-px h-3.5 bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">सत्र २ —</span>
                <span className="font-bold text-slate-900">वजन:</span>
                <span className="border-b border-black min-w-[50px] text-center font-bold px-1">
                  {profile?.term2Weight ? `${profile.term2Weight} कि.ग्रॅ.` : "-"}
                </span>
                <span className="font-bold text-slate-900 ml-1">उंची:</span>
                <span className="border-b border-black min-w-[50px] text-center font-bold px-1">
                  {profile?.term2Height ? `${profile.term2Height} सें.मी.` : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Row 10: आईचे नाव + आईचे शिक्षण + व्यवसाय + मोबाईल */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">आईचे नाव :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold text-slate-900 truncate flex items-end">
                {profile?.motherName && profile.motherName !== "-" ? profile.motherName : "-"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-44">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">शिक्षण व व्यवसाय :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center truncate flex items-end justify-center">
                {[profile?.motherEducation, profile?.motherOccupation].filter(Boolean).filter(v => v !== "-").join(", ") || "-"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-48">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">मोबाईल क्र. :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold font-mono text-slate-900 flex items-end">
                {profile?.motherPhone && profile.motherPhone !== "-"
                  ? profile.motherPhone
                  : student.parentPhone && student.parentPhone !== "-"
                  ? student.parentPhone
                  : "-"}
              </div>
            </div>
          </div>

          {/* Row 11: वडिलांचे नाव + वडिलांचे शिक्षण + व्यवसाय + मोबाईल */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">वडिलांचे नाव :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold text-slate-900 truncate flex items-end">
                {profile?.fatherName && profile.fatherName !== "-" ? profile.fatherName : "-"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-44">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">शिक्षण व व्यवसाय :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center truncate flex items-end justify-center">
                {[profile?.fatherEducation, profile?.fatherOccupation].filter(Boolean).filter(v => v !== "-").join(", ") || "-"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-48">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">मोबाईल क्र. :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-2 font-bold font-mono text-slate-900 flex items-end">
                {profile?.fatherPhone && profile.fatherPhone !== "-"
                  ? profile.fatherPhone
                  : student.parentPhone && student.parentPhone !== "-"
                  ? student.parentPhone
                  : "-"}
              </div>
            </div>
          </div>

          {/* Row 12: भावंडे + मातृभाषा + माध्यम + ग्रामीण/शहरी */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-1.5 w-36">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">भावंडे (संख्या/वय) :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center flex items-end justify-center text-[11px]">
                {profile?.siblingCount ? `${profile.siblingCount} (${profile.siblingAge || "-"})` : "-"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">मातृभाषा :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {profile?.motherTongue || (student as any)?.motherTongue || "मराठी"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">शिक्षणाचे माध्यम :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {profile?.mediumOfInstruction || (student as any)?.mediumOfInstruction || "मराठी"}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-32">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[11px]">परिसर :</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {profile?.areaType || "ग्रामीण"}
              </div>
            </div>
          </div>
        </div>

        {/* Section: उपस्थिती Table */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#e6006e] text-sm tracking-wide">
              उपस्थिती नोंद
            </h3>
            <span className="text-[11px] font-bold text-slate-600">
              वार्षिक एकूण उपस्थिती: <b className="text-slate-900">{totalPresent} / {totalWorking || "२२०"} दिवस ({attendancePct || "—"})</b>
            </span>
          </div>

          <table className="w-full table-fixed border-collapse border border-[#e6006e] text-center text-xs">
            <thead>
              <tr className="border-b border-[#e6006e] bg-[#fef2e6] text-[#e6006e] font-black">
                <th className="border-r border-[#e6006e] py-1.5 px-2.5 w-[22%] text-left font-black text-xs">महिने</th>
                {["जून", "जुलै", "ऑगस्ट", "सप्टें.", "ऑक्टो.", "नोव्हें.", "डिसें.", "जाने.", "फेब्रु.", "मार्च", "एप्रिल", "मे"].map((m) => (
                  <th key={m} className="border-r border-[#e6006e] last:border-r-0 py-1.5 px-0.5 w-[6.5%] font-black whitespace-nowrap text-[11px]">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6006e] text-slate-900 font-bold">
              {/* Row 1: कामाचे दिवस */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] py-1.5 px-2.5 w-[22%] text-left font-bold text-slate-900 text-xs">
                  कामाचे दिवस
                </td>
                {monthlyAttList.map((mAtt, i) => (
                  <td key={i} className="border-r border-[#e6006e] last:border-r-0 py-1.5 px-0.5 w-[6.5%] text-xs font-semibold text-slate-800">
                    {mAtt.working}
                  </td>
                ))}
              </tr>

              {/* Row 2: उपस्थित दिवस */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] py-1.5 px-2.5 w-[22%] text-left font-bold text-slate-900 text-xs">
                  उपस्थित दिवस
                </td>
                {monthlyAttList.map((mAtt, i) => (
                  <td key={i} className="border-r border-[#e6006e] last:border-r-0 py-1.5 px-0.5 w-[6.5%] font-black text-slate-900 text-xs">
                    {mAtt.present}
                  </td>
                ))}
              </tr>

              {/* Row 3: उपस्थिती (% मध्ये) in PINK font */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] py-1.5 px-2.5 w-[22%] text-left font-bold text-slate-900 text-xs">
                  उपस्थिती (% मध्ये)
                </td>
                {monthlyAttList.map((mAtt, i) => (
                  <td key={i} className="border-r border-[#e6006e] last:border-r-0 py-1.5 px-0.5 w-[6.5%] font-black text-[#e6006e] text-xs">
                    {mAtt.pct}
                  </td>
                ))}
              </tr>

              {/* Row 4: उपस्थिती कमी असल्यास त्याची कारणे */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] py-2 px-2.5 w-[22%] text-left font-bold text-slate-900 text-[11px] leading-tight">
                  <div>उपस्थिती कमी असल्यास</div>
                  <div>त्याची कारणे :</div>
                </td>
                <td colSpan={12} className="py-1.5 px-3 align-middle bg-white w-[78%] text-left">
                  <div className="space-y-1.5 py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">१.</span>
                      <div className="border-b border-black flex-1 min-h-[18px] px-1 text-[11px] font-medium text-slate-800">
                        {(profile as any)?.attendanceReason1 || ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold shrink-0">२.</span>
                      <div className="border-b border-black flex-1 min-h-[18px] px-1 text-[11px] font-medium text-slate-800">
                        {(profile as any)?.attendanceReason2 || ""}
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer: Cyan Rule with State Department Note and Page Number */}
        <div className="pt-1">
          <div className="w-full h-0.5 bg-[#00a0dc]" />
          <div className="flex items-center justify-between pt-1 text-[10px] font-bold text-slate-600">
            <span>महाराष्ट्र राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद (SCERT), पुणे — समग्र प्रगतिपत्रक</span>
            <span className="text-slate-900 text-xs font-black">पृष्ठ १</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE 3: ME & MY SURROUNDINGS (भाग - अ (२) : मी व माझा परिसर - 100% Exact Match)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden px-10 pt-6 pb-4 mx-auto bg-gradient-to-b from-[#fffaf6] via-white to-[#fff7fb] flex flex-col justify-between border border-pink-200 relative box-border text-slate-900 text-xs">
        {/* Top Header */}
        <div className="text-center">
          <div className="text-sm font-black text-[#e6006e] tracking-wide mb-1">
            भाग - अ (२)
          </div>
          <div className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-[#c85a28] via-[#e6006e] to-[#c85a28] text-white px-14 py-1.5 rounded-full font-black text-xl tracking-wider shadow-sm">
            <span className="text-amber-200 text-base">★</span>
            <span>मी व माझा परिसर</span>
            <span className="text-amber-200 text-base">★</span>
          </div>
        </div>

        {/* Section 1: Photo & Age & Birthday & Address matching Image 4 */}
        <div className="grid grid-cols-12 gap-5 items-start pt-1">
          {/* Tilted Cartoon Photo Frame (col-span-5) */}
          <div className="col-span-5 relative pt-4 pl-1">
            <div className="relative -rotate-3 border-2 border-black rounded-3xl w-50 h-42 bg-white p-2 flex flex-col items-center justify-center shadow-xs">
              {/* Tilted label on top border */}
              <div className="absolute -top-3.5 left-2 flex items-center gap-1 bg-white px-1 text-sm font-black text-slate-900 whitespace-nowrap">
                <span className="text-amber-400 text-base">★</span>
                <span className="tracking-wide">माझा फोटो</span>
                <span className="text-rose-600 text-base">★</span>
                <span className="text-lime-500 text-base">★</span>
              </div>
              <SafePhoto
                src={profile?.photoUrl || student.photoUrl}
                alt="Student"
                className="w-full h-full object-cover object-top rounded-2xl"
                fallback={
                  <div className="w-full h-full border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-[11px] font-bold text-slate-500">फोटो येथे लावावा</span>
                  </div>
                }
              />
            </div>
          </div>

          {/* Age, Birthday Balloon, Address (col-span-7) */}
          <div className="col-span-7 flex flex-col justify-between h-42 pl-1">
            <div className="flex items-center justify-between gap-3">
              {/* Age Info */}
              <div className="flex items-center gap-2">
                <div className="text-sm font-black text-slate-900 leading-tight">
                  <div>माझे</div>
                  <div>वय</div>
                </div>
                <div className="w-16 h-9 rounded-full border-2 border-[#c85a28] bg-white flex items-center justify-center text-sm font-black text-slate-900 shadow-2xs">
                  {profile?.age || (student?.age ? String(student.age) : "")}
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  <div>वर्षे</div>
                  <div className="flex items-center gap-1">
                    <span>आहे.</span>
                    <span className="text-amber-500 text-xs">★</span>
                  </div>
                </div>
              </div>

              {/* Birthday Balloon matching Image 4 */}
              <div className="relative flex flex-col items-center shrink-0 pr-3">
                <div className="w-24 h-24 rounded-full bg-[#350e5e] text-white flex flex-col items-center justify-center text-center p-2 shadow-sm relative">
                  <div className="w-2 h-2 rounded-full bg-white mb-0.5 opacity-90" />
                  <div className="text-[10px] font-bold leading-none">माझा</div>
                  <div className="text-xs font-black leading-tight mt-0.5">वाढदिवस</div>
                  <div className="text-[11px] font-black text-amber-300 my-0.5">
                    {profile?.birthday && profile.birthday !== "-" ? profile.birthday : (student?.dob && student.dob !== "-" ? student.dob : "")}
                  </div>
                  <div className="text-[9px] font-bold leading-none opacity-95">या दिवशी असतो.</div>
                </div>
                {/* Curved balloon thread looping down to house */}
                <svg
                  className="w-10 h-10 absolute -bottom-8 right-2 text-slate-800 pointer-events-none"
                  viewBox="0 0 40 40"
                  fill="none"
                >
                  <path
                    d="M 16 0 C 22 14, 6 22, 28 36"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>
            </div>

            {/* Address with House Icon */}
            <div className="mt-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-black text-slate-900">माझ्या घराचा पत्ता</span>
                {/* Cyan house outline icon matching Image 4 */}
                <svg
                  className="size-8 text-[#00a0dc]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="border-b border-black h-5 flex items-end px-1 text-xs font-bold text-slate-900">
                  {profile?.homeAddress && profile.homeAddress !== "-" ? profile.homeAddress : student.address || ""}
                </div>
                <div className="border-b border-black h-5 flex items-end px-1 text-xs font-bold text-slate-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Family & Ambition vs Friends Notepad matching Image 4 */}
        <div className="grid grid-cols-12 gap-5 items-stretch pt-1">
          {/* Family & Ambition Column (col-span-7) */}
          <div className="col-span-7 flex flex-col justify-between">
            {/* Family Frame */}
            <div className="relative">
              {/* Smileys & Star on Frame Header */}
              <div className="absolute -top-3.5 left-2 flex items-center gap-1 z-10">
                {/* Yellow smiley face */}
                <div className="w-8 h-8 rounded-full bg-[#fdd835] border border-amber-500 flex items-center justify-center text-base shadow-xs">
                  😊
                </div>
                {/* Red smiley face */}
                <div className="w-7 h-7 rounded-full bg-[#e53935] border border-red-600 flex items-center justify-center text-sm shadow-xs">
                  😄
                </div>
              </div>
              <span className="absolute -top-2.5 right-4 text-indigo-700 text-xl z-10">★</span>

              {/* Nested Green Double Border Frame */}
              <div
                className="rounded-2xl p-3 pt-4 bg-white min-h-[90px] flex flex-col justify-center"
                style={{ border: "4px double #009b4d" }}
              >
                <p className="text-xs font-bold text-slate-800 leading-relaxed text-center px-2">
                  {profile?.familyDescription && profile.familyDescription !== "-"
                    ? profile.familyDescription
                    : ""}
                </p>
              </div>
              <div className="text-center mt-1">
                <span className="text-sm font-black text-slate-900">माझे कुटुंब</span>
              </div>
            </div>

            {/* Ambition Box */}
            <div className="relative mt-1">
              <span className="absolute -top-3.5 right-4 text-sky-500 text-2xl z-10">★</span>
              <div className="border-4 border-[#8e237b] rounded-2xl p-2.5 bg-white">
                <div className="text-sm font-black text-slate-900">मोठे होऊन मला</div>
                <div className="border-b border-dotted border-slate-700 my-1 h-5 flex items-end px-2 text-xs font-black text-indigo-950">
                  {profile?.ambition && profile.ambition !== "-" ? profile.ambition : ""}
                </div>
                <div className="text-right text-sm font-black text-slate-900">व्हायचे आहे.</div>
              </div>
            </div>
          </div>

          {/* Friends Notepad Card (col-span-5) matching Image 4 */}
          <div className="col-span-5 flex flex-col justify-between relative pt-1">
            <span className="absolute -top-2 left-4 text-rose-600 text-2xl z-10">★</span>
            <span className="absolute top-12 -right-1 text-sky-500 text-xl z-10">★</span>

            {/* Cyan Border Card */}
            <div className="border-[5px] border-[#009fd9] bg-white p-3 rounded-none flex-1 flex flex-col justify-between min-h-[190px] relative">
              <div className="space-y-2.5">
                {(() => {
                  const friendsList = (profile?.friends && Array.isArray(profile.friends) && profile.friends.length > 0)
                    ? profile.friends
                    : [profile?.bestFriend1, profile?.bestFriend2, profile?.bestFriend3].filter(Boolean) as string[];
                  return [0, 1, 2, 3, 4].map((idx) => {
                    const frName = friendsList[idx] || "";
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8e237b] shrink-0" />
                        <div className="border-b border-dotted border-slate-700 flex-1 h-4 flex items-end px-1 text-xs font-bold text-slate-900">
                          {frName}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Starburst Banner attached at bottom */}
              <div className="relative mt-2 -mb-5 -mx-4 z-20">
                <div className="bg-[#e65c00] text-white px-3 py-1.5 rounded-sm text-xs font-black tracking-wide text-center shadow-md flex items-center justify-center gap-1 border-t border-b border-amber-300">
                  <span>हे माझे मित्र/मैत्रिणी आहेत.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: My Favorites (माझा आवडता) matching Image 4 */}
        <div className="pt-2">
          <div className="text-center font-black text-base text-slate-900 mb-1 flex items-center justify-center gap-2">
            <span className="text-lime-600 text-lg">★</span>
            <span>माझा आवडता</span>
            <span className="text-amber-400 text-lg">★</span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            {/* Left Column: रंग, अन्नपदार्थ, प्राणी */}
            <div className="space-y-1.5">
              {/* Color */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🎨</span>
                <span className="w-20 text-xs font-black text-slate-900">रंग</span>
                <ArrowInputBox
                  value={profile?.favoriteColor && profile.favoriteColor !== "-" ? profile.favoriteColor : ""}
                />
              </div>

              {/* Food */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🍲</span>
                <span className="w-20 text-xs font-black text-slate-900">अन्नपदार्थ</span>
                <ArrowInputBox
                  value={
                    profile?.favoriteFood && profile.favoriteFood !== "-"
                      ? profile.favoriteFood
                      : (profile as any)?.favoriteDish && (profile as any).favoriteDish !== "-"
                      ? (profile as any).favoriteDish
                      : ""
                  }
                />
              </div>

              {/* Animal */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🦒</span>
                <span className="w-20 text-xs font-black text-slate-900">प्राणी</span>
                <ArrowInputBox
                  value={profile?.favoriteAnimal && profile.favoriteAnimal !== "-" ? profile.favoriteAnimal : ""}
                />
              </div>
            </div>

            {/* Right Column: फूल, खेळ, विषय */}
            <div className="space-y-1.5">
              {/* Flower */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🌸</span>
                <span className="w-16 text-xs font-black text-slate-900">फूल</span>
                <ArrowInputBox
                  value={profile?.favoriteFlower && profile.favoriteFlower !== "-" ? profile.favoriteFlower : ""}
                />
              </div>

              {/* Game */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🎾</span>
                <span className="w-16 text-xs font-black text-slate-900">खेळ</span>
                <ArrowInputBox
                  value={profile?.favoriteGame && profile.favoriteGame !== "-" ? profile.favoriteGame : ""}
                />
              </div>

              {/* Subject */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">📚</span>
                <span className="w-16 text-xs font-black text-slate-900">विषय</span>
                <ArrowInputBox
                  value={profile?.favoriteSubject && profile.favoriteSubject !== "-" ? profile.favoriteSubject : ""}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Hobbies & Home Chores matching Image 4 (NO TRUNCATION!) */}
        <div className="pt-2">
          <div className="text-xs font-black text-[#e6006e] mb-1.5">
            माझी आवड आहे :
          </div>

          <div className="border-2 border-[#e6006e]/80 bg-gradient-to-br from-[#fdeee4] via-[#fff5f2] to-[#fdf2f8] p-4 rounded-2xl shadow-2xs space-y-3">
            {/* 12 Hobbies: 2 rows with clean flex spacing - full text, zero truncation */}
            <div className="space-y-2.5 text-xs">
              {/* Row 1 */}
              <div className="flex items-center justify-between gap-1">
                {[
                  { name: "वाचन" },
                  { name: "नृत्य" },
                  { name: "गायन" },
                  { name: "वादन" },
                  { name: "क्रीडा किंवा खेळ" },
                  { name: "सर्जनशील लेखन" },
                ].map(({ name }) => {
                  const checked = Boolean(
                    profile?.hobbies && profile.hobbies.some((h) => h.includes(name) || name.includes(h))
                  );
                  return (
                    <div key={name} className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-slate-900 text-[11px] whitespace-nowrap">{name}</span>
                      <span className="w-4.5 h-4.5 border border-black bg-white inline-flex items-center justify-center font-black text-rose-600 text-xs shrink-0">
                        {checked ? "✓" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Row 2 */}
              <div className="flex items-center justify-between gap-1">
                {[
                  { name: "बागकाम" },
                  { name: "योगाभ्यास" },
                  { name: "कला" },
                  { name: "हस्तकला" },
                  { name: "पाककला" },
                  { name: "इतर" },
                ].map(({ name }) => {
                  const checked = Boolean(
                    profile?.hobbies && profile.hobbies.some((h) => h.includes(name) || name.includes(h))
                  );
                  const isOther = name === "इतर";
                  const otherLabel = isOther && profile?.otherHobby ? `इतर (${profile.otherHobby})` : name;
                  return (
                    <div key={name} className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-slate-900 text-[11px] whitespace-nowrap">{otherLabel}</span>
                      <span className="w-4.5 h-4.5 border border-black bg-white inline-flex items-center justify-center font-black text-rose-600 text-xs shrink-0">
                        {checked ? "✓" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chores Section */}
            <div className="pt-0.5">
              <div className="text-xs font-bold text-slate-900">
                इतर व्यक्तींसोबत (वडील, आई, पालक, भावंड इ.) घरातील खालील कामे नियमित करतो/करते.
              </div>
              <div className="space-y-2 mt-2">
                {(() => {
                  const choresText = profile?.regularHomeChores && profile.regularHomeChores !== "-"
                    ? profile.regularHomeChores
                    : "";
                  let line1 = choresText;
                  let line2 = "";
                  if (choresText.length > 50) {
                    const mid = choresText.lastIndexOf(" ", 50);
                    const splitIdx = mid > 20 ? mid : 50;
                    line1 = choresText.substring(0, splitIdx);
                    line2 = choresText.substring(splitIdx).trim();
                  }
                  return (
                    <>
                      <div className="border-b border-black h-7 flex items-end px-1 text-xs font-bold text-slate-900 truncate">
                        {line1}
                      </div>
                      <div className="border-b border-black h-7 flex items-end px-1 text-xs font-bold text-slate-900 truncate">
                        {line2}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-[10px] text-slate-700 font-medium mt-2">
            एकापेक्षा जास्त पर्याय निवडू शकता. पर्यायाच्या चौकटीवर (✓) अशी खूण करावी.
          </div>
        </div>

        {/* Footer: Page 3 with Cyan Accent Line & 2 on the Left matching Image 4 */}
        <div className="pt-2">
          <div className="w-full h-0.5 bg-[#00a0dc]" />
          <div className="flex justify-start pl-1 pt-1 text-xs font-bold text-slate-800">
            <span>2</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGES 4 TO 15: THE 6 DEVELOPMENTAL AREAS (प्रथम सत्र व द्वितीय सत्र)
      ========================================================================= */}
      {FOUNDATIONAL_AREA_DETAILS.map((area, areaIndex) => {
        // Two pages per area: Session 1 (Page A) and Session 2 (Page B)
        return (["session1", "session2"] as const).map((sess) => {
          const currentAssessment =
            sess === "session1"
              ? findSessionAssessment(session1, area.id)
              : findSessionAssessment(session2, area.id);

          const sessLabel = sess === "session1" ? "सत्र - १" : "सत्र - २";
          const pageNum = 4 + areaIndex * 2 + (sess === "session1" ? 0 : 1);

          // Core Rubric Levels selected (empty if not filled)
          const awLvl = currentAssessment?.awarenessLevel || "";
          const seLvl = currentAssessment?.sensitivityLevel || "";
          const crLvl = currentAssessment?.creativityLevel || "";

          // Teacher & Parent Remarks: only display if manually entered by teacher/parent
          const teacherRemark =
            currentAssessment?.threeSixty?.teacherRemarks?.observation || "";

          const parentRemark =
            currentAssessment?.threeSixty?.parentFeedback?.parentObservations || "";

          const isSessionAssessed = Boolean(
            currentAssessment &&
              (currentAssessment.selectedGoalIds?.length ||
                currentAssessment.selectedCompetencyIds?.length ||
                currentAssessment.activity1Title ||
                currentAssessment.awarenessLevel ||
                currentAssessment.sensitivityLevel ||
                currentAssessment.creativityLevel ||
                (currentAssessment.rubricLevels && Object.keys(currentAssessment.rubricLevels).length > 0) ||
                teacherRemark ||
                parentRemark)
          );

          return (
            <div
              key={`${area.id}_${sess}`}
              className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden px-8 py-5 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs"
            >
              <div className="flex-1 flex flex-col justify-between">
                {/* Top Student Header */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-0.5">
                  <div>
                    <span>विद्यार्थ्याचे नाव: </span>
                    <span className="font-bold text-slate-900">{studentDisplayName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-600 text-[11px]">
                    <span>इयत्ता: <b className="text-slate-900">{student.class ? (student.class === "1st" ? "१ ली" : student.class === "2nd" ? "२ री" : student.class) : "-"}</b></span>
                    {student.rollNo && <span>हजेरी क्र.: <b className="text-slate-900">{student.rollNo}</b></span>}
                  </div>
                </div>

                {/* Area Title Box with Green Border */}
                <div className="border-2 border-[#059669] bg-emerald-50/40 py-1.5 px-4 rounded-lg flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 tracking-wide">
                    क्षेत्र क्र. {area.codeNum} : {area.nameMarathi}
                  </span>
                  <span className="font-black text-sm text-[#c85a28] px-2 py-0.5 rounded bg-white border border-[#c85a28]/30">
                    {sessLabel}
                  </span>
                </div>

                {/* Curricular Goals & Competencies Box */}
                <div className="p-2.5 bg-slate-50/70 rounded-lg border border-slate-200 space-y-1 text-[10px] leading-relaxed text-slate-800">
                  <div>
                    <span className="font-black text-[#c85a28]">
                      अभ्यासक्रमाची ध्येये :{" "}
                    </span>
                    <span className="font-medium text-slate-900">
                      {(() => {
                        const savedGoals = (currentAssessment as any)?.selectedGoalTexts;
                        if (Array.isArray(savedGoals) && savedGoals.length > 0) {
                          return savedGoals.join(" | ");
                        }
                        const selGoalIds = currentAssessment?.selectedGoalIds;
                        if (Array.isArray(selGoalIds) && selGoalIds.length > 0) {
                          const goalParts = String(area.goalText || "").split("|").map((p) => p.trim()).filter(Boolean);
                          const resolvedGoals = selGoalIds
                            .map((id) => {
                              const codeMatch = String(id).match(/CG-\d+/i)?.[0] || String(id).trim();
                              const inArea = goalParts.find((p) => p.toLowerCase().includes(codeMatch.toLowerCase()));
                              if (inArea) return inArea;
                              const inStatic = HPC_CURRICULAR_GOALS.find(
                                (g) => g.id === id || g.code.toLowerCase() === codeMatch.toLowerCase()
                              );
                              if (inStatic) return `${inStatic.code}: ${inStatic.titleMarathi}`;
                              return codeMatch;
                            })
                            .filter(Boolean);
                          if (resolvedGoals.length > 0) return resolvedGoals.join(" | ");
                        }
                        return isSessionAssessed ? area.goalText : "— (या सत्राचे ध्येय अद्याप निवडलेले नाही)";
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="font-black text-[#c85a28]">क्षमता : </span>
                    <span className="font-medium text-slate-900">
                      {(() => {
                        const savedTexts = (currentAssessment as any)?.selectedCompetencyTexts;
                        if (Array.isArray(savedTexts) && savedTexts.length > 0) {
                          return savedTexts.join(" | ");
                        }
                        const selIds = currentAssessment?.selectedCompetencyIds;
                        if (Array.isArray(selIds) && selIds.length > 0) {
                          const areaParts = String(area.competencyText || "").split("|").map((p) => p.trim()).filter(Boolean);
                          const resolved = selIds
                            .map((id) => {
                              const codeMatch = String(id).match(/C-\d+\.\d+/i)?.[0] || String(id).trim();
                              const inArea = areaParts.find((p) => p.toLowerCase().includes(codeMatch.toLowerCase()));
                              if (inArea) return inArea;
                              const inStatic = HPC_COMPETENCIES.find(
                                (c) => c.id === id || c.code.toLowerCase() === codeMatch.toLowerCase()
                              );
                              if (inStatic) return `${inStatic.code}: ${inStatic.titleMarathi}`;
                              return codeMatch;
                            })
                            .filter(Boolean);
                          if (resolved.length > 0) return resolved.join(" | ");
                        }
                        return isSessionAssessed ? area.competencyText : "— (या सत्राची क्षमता अद्याप निवडलेली नाही)";
                      })()}
                    </span>
                  </div>
                </div>

                {/* अध्ययन निष्पत्ती (Learning Outcomes) - Class Specific */}
                {(() => {
                  const targetClass = student.class || "1st";
                  const assessedLOs = currentAssessment?.selectedLearningOutcomes;
                  let displayLOs: string[] = [];
                  if (assessedLOs && assessedLOs.length > 0) {
                    displayLOs = assessedLOs;
                  } else if (isSessionAssessed) {
                    const compCodes =
                      area.id === "physical_health"
                        ? ["C-1.1", "C-1.2", "C-1.3"]
                        : area.id === "socio_emotional"
                        ? ["C-4.1", "C-4.2", "C-4.3"]
                        : area.id === "cognitive"
                        ? ["C-7.1", "C-7.2", "C-7.3"]
                        : area.id === "language_literacy"
                        ? ["C-9.1", "C-9.2", "C-9.3"]
                        : area.id === "aesthetic_cultural"
                        ? ["C-12.1", "C-12.2", "C-12.3"]
                        : ["C-13.1", "C-13.2", "C-13.3"];
                    compCodes.forEach((c) => {
                      const los = CLASSWISE_LEARNING_OUTCOMES[targetClass]?.[c] || [];
                      if (los.length > 0) displayLOs.push(los[0]);
                    });
                  }

                  if (displayLOs.length === 0) return null;

                  return (
                    <div className="text-[10px] leading-relaxed text-slate-800 bg-[#fffdf0] py-1 px-2.5 rounded-lg border border-[#fde68a]">
                      <span className="font-black text-[#c85a28]">
                        अध्ययन निष्पत्ती ({targetClass === "2nd" ? "इयत्ता २ री" : "इयत्ता १ ली"}) :{" "}
                      </span>
                      <span className="font-medium text-slate-800">
                        {displayLOs.join(" | ")}
                      </span>
                    </div>
                  );
                })()}

                {/* Activities & Questions: 2 Columns Card */}
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50/70 rounded-lg border border-slate-200">
                  {/* Left Column: Activities */}
                  <div className="space-y-1">
                    <span className="font-black text-[11px] text-[#c85a28] block border-b border-slate-200 pb-0.5">
                      मूल्यमापनासाठी केलेली कृती/उपक्रम:
                    </span>
                    <div className="text-[10px] text-slate-800 space-y-1 pl-1 leading-snug font-medium">
                      {(() => {
                        const customActs = [
                          currentAssessment?.activity1Title
                            ? {
                                title: currentAssessment.activity1Title,
                                desc: currentAssessment.activity1Description || "",
                              }
                            : null,
                          currentAssessment?.activity2Title
                            ? {
                                title: currentAssessment.activity2Title,
                                desc: currentAssessment.activity2Description || "",
                              }
                            : null,
                        ].filter(Boolean) as { title: string; desc: string }[];

                        if (customActs.length === 0 && isSessionAssessed) {
                          const rubKeys = Object.keys(currentAssessment?.rubricLevels || {});
                          const rubMatch = rubKeys.length > 0
                            ? (stageRubrics || []).find((r) => r.id && rubKeys.includes(r.id) && r.activityTitle)
                            : undefined;
                          const targetActTitle = String(rubMatch?.activityTitle || "").trim().toLowerCase();
                          const selCompCodes = (currentAssessment?.selectedCompetencyIds || [])
                            .map((id) => String(id).match(/C-\d+\.\d+/i)?.[0] || String(id).trim())
                            .filter(Boolean);
                          const matchedDynAct = (stageActivities || []).find((a) => {
                            if (targetActTitle && a.activityTitle) {
                              const aLow = a.activityTitle.trim().toLowerCase();
                              if (aLow === targetActTitle || aLow.includes(targetActTitle) || targetActTitle.includes(aLow)) {
                                return true;
                              }
                            }
                            return false;
                          }) || (selCompCodes.length > 0
                            ? (stageActivities || []).find((a) =>
                                a.competencyCode && selCompCodes.some((c) => c.toLowerCase() === a.competencyCode!.trim().toLowerCase())
                              )
                            : undefined);
                          if (matchedDynAct) {
                            customActs.push({
                              title: matchedDynAct.activityTitle,
                              desc: matchedDynAct.activityDescription || "",
                            });
                          } else {
                            const bankActs = selCompCodes.flatMap((c) => HPC_ACTIVITIES_BANK[c]?.activities || []);
                            const matchedBank =
                              (targetActTitle &&
                                bankActs.find((a) => {
                                  const t = a.title.trim().toLowerCase();
                                  return t === targetActTitle || t.includes(targetActTitle) || targetActTitle.includes(t);
                                })) ||
                              bankActs[0];
                            if (matchedBank) {
                              customActs.push({
                                title: matchedBank.title,
                                desc: matchedBank.description || "",
                              });
                            }
                          }
                        }

                        if (customActs.length > 0) {
                          return customActs.map((act, i) => (
                            <div key={i} className="leading-snug">
                              <div>
                                <span className="font-bold text-[#c85a28] mr-1">•</span>
                                <span className="font-bold text-slate-900">{act.title}</span>
                              </div>
                              {act.desc && (
                                <div className="text-[9.5px] text-slate-700 pl-3 mt-0.5">
                                  {act.desc}
                                </div>
                              )}
                            </div>
                          ));
                        }

                        if (!isSessionAssessed) {
                          return (
                            <div className="text-slate-400 italic">
                              — या सत्राचा उपक्रम अद्याप भरलेला नाही.
                            </div>
                          );
                        }

                        return area.activities.slice(0, 2).map((act, i) => (
                          <div key={i}>
                            <span className="font-bold text-[#c85a28] mr-1">•</span>
                            {act}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Questions */}
                  <div className="space-y-1">
                    <span className="font-black text-[11px] text-[#c85a28] block border-b border-slate-200 pb-0.5">
                      मूल्यमापनाचे प्रश्न:
                    </span>
                    <div className="text-[10px] text-slate-800 space-y-0.5 pl-1 leading-snug font-medium">
                      {(() => {
                        let customQs = (currentAssessment?.assessmentQuestions || []).filter(Boolean);
                        if (customQs.length === 0 && isSessionAssessed) {
                          const rubKeys = Object.keys(currentAssessment?.rubricLevels || {});
                          const rubMatch = rubKeys.length > 0
                            ? (stageRubrics || []).find((r) => r.id && rubKeys.includes(r.id) && r.activityTitle)
                            : undefined;
                          const targetActTitle = String(currentAssessment?.activity1Title || rubMatch?.activityTitle || "").trim().toLowerCase();
                          const selCompCodes = (currentAssessment?.selectedCompetencyIds || [])
                            .map((id) => String(id).match(/C-\d+\.\d+/i)?.[0] || String(id).trim())
                            .filter(Boolean);
                          const matchedDynAct = (stageActivities || []).find((a) => {
                            if (targetActTitle && a.activityTitle) {
                              const aLow = a.activityTitle.trim().toLowerCase();
                              if (aLow === targetActTitle || aLow.includes(targetActTitle) || targetActTitle.includes(aLow)) {
                                return true;
                              }
                            }
                            return false;
                          }) || (selCompCodes.length > 0
                            ? (stageActivities || []).find((a) =>
                                a.competencyCode && selCompCodes.some((c) => c.toLowerCase() === a.competencyCode!.trim().toLowerCase())
                              )
                            : undefined);
                          if (matchedDynAct && Array.isArray(matchedDynAct.questions)) {
                            customQs = matchedDynAct.questions.filter(Boolean);
                          } else {
                            const bankActs = selCompCodes.flatMap((c) => HPC_ACTIVITIES_BANK[c]?.activities || []);
                            const matchedBank =
                              (targetActTitle &&
                                bankActs.find((a) => {
                                  const t = a.title.trim().toLowerCase();
                                  return t === targetActTitle || t.includes(targetActTitle) || targetActTitle.includes(t);
                                })) ||
                              bankActs[0];
                            if (matchedBank && Array.isArray(matchedBank.questions)) {
                              customQs = matchedBank.questions.filter(Boolean);
                            }
                          }
                        }
                        if (customQs.length > 0) {
                          return customQs.slice(0, 5).map((q, i) => (
                            <div key={i}>
                              <span className="font-bold text-slate-600 mr-1">{i + 1}.</span>
                              {q.replace(/^[0-9]+[.)\s]+/, "")}
                            </div>
                          ));
                        }
                        if (!isSessionAssessed) {
                          return (
                            <div className="text-slate-400 italic">
                              — या सत्राचे प्रश्न अद्याप भरलेले नाहीत.
                            </div>
                          );
                        }
                        return area.evalQuestions.slice(0, 5).map((q, i) => (
                          <div key={i} className="line-clamp-1">
                            <span className="font-bold text-slate-600 mr-1">{i + 1}.</span>
                            {q.replace(/^[0-9]+[.)\s]+/, "")}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                {/* Rubrics Header & Table */}
                <div className="space-y-1">
                  <div className="font-black text-[11px] text-[#c85a28]">
                    मूल्यांकन निकषसंच (रुब्रिक)
                  </div>

                  <table className="w-full border-collapse border border-slate-400 text-[9px]">
                    <thead>
                      <tr className="bg-[#eaf4ea] text-slate-900 font-bold">
                        <th className="border border-slate-400 py-1 px-1.5 w-24 text-center">
                          क्षमता
                        </th>
                        <th className="border border-slate-400 py-1 px-1.5 text-center">
                          कामगिरी स्तर: निर्झर
                        </th>
                        <th className="border border-slate-400 py-1 px-1.5 text-center">
                          कामगिरी स्तर: पर्वत
                        </th>
                        <th className="border border-slate-400 py-1 px-1.5 text-center">
                          कामगिरी स्तर: आकाश
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const targetClass = String(student.class || "1st").trim().toLowerCase();
                        const normClassKey = (c?: string) => {
                          const s = String(c || "").trim().toLowerCase();
                          if (s === "1" || s === "1st" || s.includes("पहिल") || s.includes("१")) return "1st";
                          if (s === "2" || s === "2nd" || s.includes("दुसर") || s.includes("२")) return "2nd";
                          return s;
                        };
                        const targetClassNorm = normClassKey(targetClass);
                        const cleanActStr = (s?: string) =>
                          String(s || "")
                            .trim()
                            .toLowerCase()
                            .replace(/^([०-९0-9]+[.:)\-\s]+)+/, "")
                            .replace(/\s+/g, " ")
                            .trim();
                        const actTitle = cleanActStr(currentAssessment?.activity1Title);
                        const areaCompCodes =
                          area.id === "physical_health"
                            ? ["C-1.1", "C-1.2", "C-1.3", "C-2.1", "C-3.1"]
                            : area.id === "socio_emotional"
                            ? ["C-4.1", "C-4.2", "C-4.3", "C-5.1", "C-6.1"]
                            : area.id === "cognitive"
                            ? ["C-7.1", "C-7.2", "C-7.3", "C-8.1", "C-8.2"]
                            : area.id === "language_literacy"
                            ? ["C-9.1", "C-9.2", "C-9.3", "C-10.1", "C-11.1"]
                            : area.id === "aesthetic_cultural"
                            ? ["C-12.1", "C-12.2", "C-12.3"]
                            : ["C-13.1", "C-13.2", "C-13.3"];
                        const compCode = String((currentAssessment as any)?.competencyCode || "").trim().toLowerCase();
                        const allStageRubrics = stageRubrics || [];
                        const classFiltered = allStageRubrics.filter((r) => !r.classId || normClassKey(r.classId) === targetClassNorm);
                        const classRubrics = classFiltered.length > 0 ? classFiltered : allStageRubrics;
                        const cleanRubricTxt = (s?: string) =>
                          String(s || "")
                            .replace(/^\[(निर्झर|प्रवाह|पर्वत|आकाश|beginner|proficient|advanced)\]\s*[-:—]?\s*/i, "")
                            .replace(/^(निर्झर|प्रवाह|पर्वत|आकाश)\s*[-:—]\s*/i, "")
                            .trim();

                        let matchedRubrics: HpcDynamicRubric[] = [];
                        const savedRubrics = (currentAssessment as any)?.savedRubrics;
                        if (Array.isArray(savedRubrics) && savedRubrics.length > 0) {
                          matchedRubrics = savedRubrics;
                        }
                        // Match directly by saved rubricLevels document IDs (works for already-saved assessments!)
                        if (matchedRubrics.length === 0 && currentAssessment?.rubricLevels) {
                          const rubKeys = Object.keys(currentAssessment.rubricLevels);
                          if (rubKeys.length > 0) {
                            matchedRubrics = allStageRubrics.filter((r) => r.id && rubKeys.includes(r.id));
                          }
                        }
                        if (matchedRubrics.length === 0 && actTitle) {
                          matchedRubrics = classRubrics.filter((r) => {
                            const rAct = cleanActStr(r.activityTitle);
                            return (
                              rAct &&
                              (rAct === actTitle ||
                                (actTitle.length > 5 && rAct.includes(actTitle)) ||
                                (rAct.length > 5 && actTitle.includes(rAct)))
                            );
                          });
                        }
                        if (matchedRubrics.length === 0 && compCode) {
                          matchedRubrics = classRubrics.filter((r) => String(r.competencyCode || "").trim().toLowerCase() === compCode);
                        }
                        if (matchedRubrics.length === 0) {
                          matchedRubrics = classRubrics.filter((r) =>
                            r.competencyCode && areaCompCodes.some((c) => c.toLowerCase() === String(r.competencyCode).trim().toLowerCase())
                          );
                        }
                        if (matchedRubrics.length === 0 && allStageRubrics !== classRubrics) {
                          matchedRubrics = allStageRubrics.filter((r) =>
                            r.competencyCode && areaCompCodes.some((c) => c.toLowerCase() === String(r.competencyCode).trim().toLowerCase())
                          );
                        }
                        // Fallback: match by goalCode prefix (CG-1..CG-13) or competency prefix
                        if (matchedRubrics.length === 0) {
                          const areaGoalPrefixes =
                            area.id === "physical_health"
                              ? ["cg-1", "cg-2", "cg-3", "c-1", "c-2", "c-3"]
                              : area.id === "socio_emotional"
                              ? ["cg-4", "cg-5", "cg-6", "c-4", "c-5", "c-6"]
                              : area.id === "cognitive"
                              ? ["cg-7", "cg-8", "c-7", "c-8"]
                              : area.id === "language_literacy"
                              ? ["cg-9", "cg-10", "cg-11", "c-9", "c-10", "c-11"]
                              : area.id === "aesthetic_cultural"
                              ? ["cg-12", "c-12"]
                              : ["cg-13", "c-13"];
                          matchedRubrics = classRubrics.filter((r) => {
                            const g = String(r.goalCode || "").trim().toLowerCase();
                            const c = String(r.competencyCode || "").trim().toLowerCase();
                            return areaGoalPrefixes.some((p) => g.startsWith(p) || c.startsWith(p));
                          });
                        }

                        const resolveRubricRow = (staticRow: typeof FOUNDATIONAL_RUBRICS[number]) => {
                          const dimKey =
                            staticRow.dimension === "जाणीवजागृती"
                              ? ["जाणीव", "awareness"]
                              : staticRow.dimension === "संवेदनशीलता"
                              ? ["संवेदन", "sensitivity"]
                              : ["सर्जन", "creativity"];
                          const dyn = matchedRubrics.find((r) => {
                            const d = String(r.dimension || "").toLowerCase();
                            return dimKey.some((k) => d.includes(k));
                          });
                          if (dyn) {
                            return {
                              id: dyn.id,
                              dimension: staticRow.dimension,
                              nirjhar: cleanRubricTxt(dyn.beginner) || staticRow.nirjhar,
                              parvat: cleanRubricTxt(dyn.proficient) || staticRow.parvat,
                              akash: cleanRubricTxt(dyn.advanced) || staticRow.akash,
                            };
                          }
                          return { ...staticRow, id: undefined as string | undefined };
                        };

                        return FOUNDATIONAL_RUBRICS.map((baseRubric) => {
                          const rubric = resolveRubricRow(baseRubric);
                          const directRubricLevel =
                            rubric.id && currentAssessment?.rubricLevels
                              ? currentAssessment.rubricLevels[rubric.id]
                              : undefined;
                          const rawLevel =
                            directRubricLevel !== undefined
                              ? directRubricLevel
                              : rubric.dimension === "जाणीवजागृती"
                              ? awLvl
                              : rubric.dimension === "संवेदनशीलता"
                              ? seLvl
                              : crLvl;
                          const lvlStr = String(rawLevel || "").toLowerCase();
                          const isNirjhar =
                            lvlStr === "beginner" || lvlStr === "nirjhar" || lvlStr === "निर्झर";
                          const isAkash =
                            lvlStr === "advanced" || lvlStr === "akash" || lvlStr === "आकाश";
                          const isParvat =
                            lvlStr === "proficient" ||
                            lvlStr === "parvat" ||
                            lvlStr === "पर्वत";

                          return (
                            <tr key={rubric.dimension}>
                              <td className="border border-slate-400 py-1.5 px-2 font-bold text-slate-900 text-center bg-slate-50">
                                {rubric.dimension}
                              </td>
                              <td
                                className={`border border-slate-400 py-1.5 px-2 leading-snug ${
                                  isNirjhar ? "bg-amber-50 font-semibold" : ""
                                }`}
                              >
                                <span className="font-bold mr-1">
                                  {isNirjhar ? "▣" : "☐"}
                                </span>
                                {rubric.nirjhar}
                              </td>
                              <td
                                className={`border border-slate-400 py-1.5 px-2 leading-snug ${
                                  isParvat ? "bg-emerald-50 font-semibold" : ""
                                }`}
                              >
                                <span className="font-bold mr-1">
                                  {isParvat ? "▣" : "☐"}
                                </span>
                                {rubric.parvat}
                              </td>
                              <td
                                className={`border border-slate-400 py-1.5 px-2 leading-snug ${
                                  isAkash ? "bg-blue-50 font-semibold" : ""
                                }`}
                              >
                                <span className="font-bold mr-1">
                                  {isAkash ? "▣" : "☐"}
                                </span>
                                {rubric.akash}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Proficiency Badge & Teacher Remark Card */}
                <div className="border border-amber-200 rounded-lg p-2 bg-amber-50/40 flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <ProficiencyBadge level={awLvl} />
                  </div>
                  <div className="flex-1 border-l border-amber-200 pl-3">
                    <div className="text-[10.5px] leading-snug">
                      <span className="font-black text-[#c85a28]">
                        शिक्षक अभिप्राय:{" "}
                      </span>
                      <span className="text-slate-900 font-medium">
                        {teacherRemark || "नियमित सराव व सहभागाने प्रगती समाधानकारक आहे."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 360-Degree Evaluation Sections */}
                {/* 1. Self Evaluation */}
                <div className="border border-slate-300 rounded-lg p-2 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-[11px] text-[#c85a28]">
                      स्वयंमूल्यांकन:
                    </span>
                    <span className="text-[9.5px] text-slate-600 font-medium">
                      तू या कृतीत कसे काम केले हे दाखवणाऱ्या चित्रावर (✓) खूण करा:
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3 border border-slate-400 p-1 text-center bg-slate-50/50 rounded-md">
                      <div className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                        करायला आवडले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.selfAssessment?.likedActivity || ""} />
                    </div>
                    <div className="col-span-3 border border-slate-400 p-1 text-center bg-slate-50/50 rounded-md">
                      <div className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                        सोपे वाटले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.selfAssessment?.feltEasy || ""} />
                    </div>
                    <div className="col-span-6 border border-slate-400 p-1 text-center bg-slate-50/50 rounded-md">
                      <div className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                        करताना मदत लागते.
                      </div>
                      <HelpOptions selected={currentAssessment?.threeSixty?.selfAssessment?.neededHelpFrom?.[0] || ""} />
                    </div>
                  </div>
                </div>

                {/* 2. Peer Evaluation */}
                <div className="border border-slate-300 rounded-lg p-2 bg-white">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-[11px] text-[#c85a28]">
                      सहाध्यायी मूल्यांकन:
                    </span>
                    <span className="text-[9.5px] text-slate-600 font-medium">
                      तुझ्या मित्राने या कृतीत कसे काम केले हे दाखवणाऱ्या चित्रावर (✓) खूण करा:
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3 border border-slate-400 p-1 text-center bg-slate-50/50 rounded-md">
                      <div className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                        करायला आवडले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.peerAssessment?.peerLiked || ""} />
                    </div>
                    <div className="col-span-3 border border-slate-400 p-1 text-center bg-slate-50/50 rounded-md">
                      <div className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                        सोपे वाटले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.peerAssessment?.peerFeltEasy || ""} />
                    </div>
                    <div className="col-span-6 border border-slate-400 p-1 text-center bg-slate-50/50 rounded-md">
                      <div className="text-[9.5px] font-bold text-slate-800 mb-0.5">
                        करताना मदत लागते.
                      </div>
                      <HelpOptions selected={currentAssessment?.threeSixty?.peerAssessment?.peerNeededHelpFrom?.[0] || ""} />
                    </div>
                  </div>
                </div>

                {/* 3. Parent Observation & Remark */}
                <div className="border border-purple-300 rounded-lg p-2.5 bg-purple-50/20">
                  <div className="text-[10.5px] font-bold text-slate-800 mb-1">
                    <span className="font-black text-[#c85a28]">
                      पालकांचे निरीक्षण:{" "}
                    </span>
                    <span className="font-normal text-slate-600">
                      घरातील अध्ययन अध्यापन संसाधने
                    </span>
                  </div>
                  <div className="grid grid-cols-8 gap-1 text-center">
                    {(() => {
                      const selectedResources = (currentAssessment?.threeSixty?.parentFeedback?.learningResourcesAtHome || []) as string[];
                      return HOME_RESOURCES.map((res) => {
                        const isSelected = selectedResources.some((r) => {
                          if (!r) return false;
                          const rLow = r.toLowerCase();
                          const lblLow = res.label.toLowerCase();
                          return (
                            lblLow.includes(rLow) ||
                            rLow.includes(lblLow) ||
                            (lblLow.includes("पुस्तके") && (rLow.includes("book") || rLow.includes("पुस्तके"))) ||
                            (lblLow.includes("वृत्तपत्र") && (rLow.includes("newspaper") || rLow.includes("वृत्तपत्र"))) ||
                            (lblLow.includes("खेळ") && (rLow.includes("toys") || rLow.includes("खेळ"))) ||
                            (lblLow.includes("फोन") && (rLow.includes("phone") || rLow.includes("संगणक") || rLow.includes("computer"))) ||
                            (lblLow.includes("इंटरनेट") && (rLow.includes("internet") || rLow.includes("आंतरजाल") || rLow.includes("इंटरनेट")))
                          );
                        });
                        return (
                          <div key={res.label} className="flex flex-col items-center">
                            <div
                              className={`size-7 rounded-full flex items-center justify-center text-xs shadow-2xs relative transition-all ${
                                isSelected
                                  ? "border-2 border-rose-600 bg-rose-50 ring-2 ring-rose-400"
                                  : "border border-sky-400 bg-sky-50"
                              }`}
                            >
                              {res.icon}
                              {isSelected && (
                                <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[7.5px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <span className={`text-[8px] mt-0.5 leading-tight ${isSelected ? "font-black text-rose-700" : "font-bold text-slate-700"}`}>
                              {res.label}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="text-[10.5px] pt-1.5 mt-1.5 border-t border-purple-200 leading-snug">
                    <span className="font-black text-[#c85a28]">
                      पालकांचा अभिप्राय:{" "}
                    </span>
                    <span className="text-slate-900 font-medium">
                      {parentRemark || "पालकांचा अभिप्राय उपलब्ध नाही."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t-2 border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>{studentDisplayName}</span>
                <span>{pageNum} of 19</span>
              </div>
            </div>
          );
        });
      })}

      {/* =========================================================================
          PAGE 16: ANNUAL QUALITATIVE SUMMARY (शैक्षणिक वर्षाचा सारांश)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs">
        <div className="space-y-3">
          {/* Header */}
          <div className="text-center pb-1">
            <h2 className="text-xl font-black text-[#c85a28] tracking-wide">
              शैक्षणिक वर्षाचा सारांश
            </h2>
            <div className="font-black text-xs text-slate-900 mt-0.5">
              प्रमुख कामगिरी वर्णन विधाने
            </div>
            <div className="text-[11px] text-slate-600">
              (बालकांच्या क्षमतेनुसार शिक्षकांचे गुणात्मक अभिप्राय (Qualitative))
            </div>
          </div>

          {/* Qualitative Summary Table with 3 Rows */}
          <div className="border border-slate-800 divide-y divide-slate-800">
            {/* Row 1: जाणीवजागृती (Areas 1 & 2) */}
            {(() => {
              const phySum = findAreaSummary("physical_health");
              const socSum = findAreaSummary("socio_emotional");
              const lvl = phySum?.finalLevel || socSum?.finalLevel || "";
              return (
                <div className="grid grid-cols-12 items-center">
                  {/* Left Column: Proficiency Badge & Checkboxes */}
                  <div className="col-span-4 p-3 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-50/50">
                    <span className="font-black text-sm text-[#c85a28] mb-1">
                      जाणीवजागृती
                    </span>
                    <ProficiencyBadge level={lvl} />
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                      <span className={lvl === "advanced" ? "text-sky-700 font-bold" : "text-slate-600"}>
                        {lvl === "advanced" ? "✓ " : "☐ "}✨ आकाश
                      </span>
                      <span className={lvl === "proficient" ? "text-emerald-700 font-bold" : "text-slate-600"}>
                        {lvl === "proficient" ? "✓ " : "☐ "}⛰️ पर्वत
                      </span>
                      <span className={lvl === "beginner" ? "text-amber-700 font-bold" : "text-slate-600"}>
                        {lvl === "beginner" ? "✓ " : "☐ "}प्रवाह
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Qualitative Area Statements */}
                  <div className="col-span-8 p-3 space-y-3 text-xs">
                    <div>
                      <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                        क्षेत्र 1 : शारीरिक विकास
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                        {phySum?.qualitativeRemarks || phySum?.awarenessSummary || ""}
                      </p>
                    </div>
                    <div>
                      <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                        क्षेत्र 2 : सामाजिक, भावनिक आणि नैतिक विकास
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                        {socSum?.qualitativeRemarks || socSum?.awarenessSummary || ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Row 2: संवेदनशीलता (Areas 3 & 4) */}
            {(() => {
              const cogSum = findAreaSummary("cognitive");
              const lanSum = findAreaSummary("language_literacy");
              const lvl = cogSum?.finalLevel || lanSum?.finalLevel || "";
              return (
                <div className="grid grid-cols-12 items-center">
                  {/* Left Column */}
                  <div className="col-span-4 p-3 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-50/50">
                    <span className="font-black text-sm text-[#c85a28] mb-1">
                      संवेदनशीलता
                    </span>
                    <ProficiencyBadge level={lvl} />
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                      <span className={lvl === "advanced" ? "text-sky-700 font-bold" : "text-slate-600"}>
                        {lvl === "advanced" ? "✓ " : "☐ "}✨ आकाश
                      </span>
                      <span className={lvl === "proficient" ? "text-emerald-700 font-bold" : "text-slate-600"}>
                        {lvl === "proficient" ? "✓ " : "☐ "}⛰️ पर्वत
                      </span>
                      <span className={lvl === "beginner" ? "text-amber-700 font-bold" : "text-slate-600"}>
                        {lvl === "beginner" ? "✓ " : "☐ "}प्रवाह
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="col-span-8 p-3 space-y-3 text-xs">
                    <div>
                      <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                        क्षेत्र 3 : बोधात्मक विकास
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                        {cogSum?.qualitativeRemarks || cogSum?.sensitivitySummary || ""}
                      </p>
                    </div>
                    <div>
                      <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                        क्षेत्र 4 : भाषा आणि साक्षरता विकास
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                        {lanSum?.qualitativeRemarks || lanSum?.sensitivitySummary || ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Row 3: सर्जनशीलता (Areas 5 & 5.1) */}
            {(() => {
              const aesSum = findAreaSummary("aesthetic_cultural");
              const habSum = findAreaSummary("positive_habits");
              const lvl = aesSum?.finalLevel || habSum?.finalLevel || "";
              return (
                <div className="grid grid-cols-12 items-center">
                  {/* Left Column */}
                  <div className="col-span-4 p-3 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-50/50">
                    <span className="font-black text-sm text-[#c85a28] mb-1">
                      सर्जनशीलता
                    </span>
                    <ProficiencyBadge level={lvl} />
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                      <span className={lvl === "advanced" ? "text-sky-700 font-bold" : "text-slate-600"}>
                        {lvl === "advanced" ? "✓ " : "☐ "}✨ आकाश
                      </span>
                      <span className={lvl === "proficient" ? "text-emerald-700 font-bold" : "text-slate-600"}>
                        {lvl === "proficient" ? "✓ " : "☐ "}⛰️ पर्वत
                      </span>
                      <span className={lvl === "beginner" ? "text-amber-700 font-bold" : "text-slate-600"}>
                        {lvl === "beginner" ? "✓ " : "☐ "}प्रवाह
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="col-span-8 p-3 space-y-3 text-xs">
                    <div>
                      <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                        क्षेत्र 5 : सौंदर्यदृष्टी आणि सांस्कृतिक विकास
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                        {aesSum?.qualitativeRemarks || aesSum?.creativitySummary || ""}
                      </p>
                    </div>
                    <div>
                      <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                        क्षेत्र 5.1 : सकारात्मक अध्ययन सवयी
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                        {habSum?.qualitativeRemarks || habSum?.creativitySummary || ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footnote Box */}
          <div className="border border-dashed border-slate-400 p-2 text-[10px] text-slate-700 space-y-0.5 rounded-sm">
            <p className="leading-relaxed">
              <b>टीप:</b> बालकांचा समग्र विकासाचा सारांश शैक्षणिक वर्षाच्या शेवटी प्रत्येक विकासक्षेत्रामध्ये वर्णनात्मक पद्धतीने देणे आवश्यक आहे. प्रामुख्याने प्रत्येक सारांशांमध्ये बलस्थाने तसेच सुधारणात्मक बाबींवर भर दिला पाहिजे. कामगिरीचा सारांश तीन क्षमतांतर्गत वर्णन केला पाहिजे. (जाणीवजागृती, संवेदनशीलता, सर्जनशीलता).
            </p>
            <p className="text-slate-500 italic">
              * विद्यार्थी योग्य पर्यायावर टिकमार्क करा, जसे निर्झर, पर्वत किंवा आकाश यांपैकी एक.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{studentDisplayName}</span>
          <span>16 of 19</span>
        </div>
      </div>

      {/* =========================================================================
          PAGE 17: ANNUAL HOLISTIC FEEDBACK & SIGNATURES (वार्षिक सर्वांगीण अभिप्राय)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs">
        <div className="space-y-4">
          {/* Top Student Header */}
          <div className="text-xs font-semibold text-slate-800">
            <span>विद्यार्थ्याचे नाव: </span>
            <span className="font-bold text-slate-900">{studentDisplayName}</span>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl font-black text-[#c85a28] tracking-wide">
              वार्षिक सर्वांगीण अभिप्राय
            </h2>
          </div>

          {/* Teacher's Final Annual Remark Box (Sheet 4 - शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय) */}
          <div className="border border-[#059669] rounded-lg p-3 bg-white min-h-[160px] flex flex-col">
            <span className="font-black text-xs text-[#c85a28] block mb-1">
              शिक्षकांचा अंतिम सर्वकष वार्षिक अभिप्राय :
            </span>
            {(() => {
              const trRemark =
                annualSummary?.finalTeacherRemarks ||
                (annualSummary as any)?.teacherRemarks ||
                (annualSummary as any)?.overallRemark ||
                "";
              return trRemark ? (
                <p className="text-xs font-medium text-slate-800 leading-relaxed px-1 whitespace-pre-wrap">
                  {trRemark}
                </p>
              ) : (
                <div className="space-y-3 px-1 flex-1 flex flex-col justify-around py-1">
                  <div className="border-b border-slate-300 h-4" />
                  <div className="border-b border-slate-300 h-4" />
                  <div className="border-b border-slate-300 h-4" />
                </div>
              );
            })()}
          </div>

          {/* Next Class Guidance & Recommendations Box (Sheet 5 - पुढील इयत्तेसाठी मार्गदर्शन व शिफारस) */}
          <div className="border border-[#059669] rounded-lg p-3 bg-white min-h-[140px] flex flex-col">
            <span className="font-black text-xs text-[#c85a28] block mb-1">
              पुढील इयत्तेसाठी विद्यार्थ्यास मार्गदर्शन व शिफारस (सुधारावयाच्या बाबी) :
            </span>
            {(() => {
              const recRemark =
                annualSummary?.recommendationsForNextClass ||
                (annualSummary as any)?.nextClassRecommendation ||
                (annualSummary as any)?.recommendation ||
                "";
              return recRemark ? (
                <p className="text-xs font-medium text-slate-800 leading-relaxed px-1 whitespace-pre-wrap">
                  {recRemark}
                </p>
              ) : (
                <div className="space-y-3 px-1 flex-1 flex flex-col justify-around py-1">
                  <div className="border-b border-slate-300 h-4" />
                  <div className="border-b border-slate-300 h-4" />
                  <div className="border-b border-slate-300 h-4" />
                </div>
              );
            })()}
          </div>

          {/* 3 Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-6 pb-2 text-center text-xs font-bold text-slate-900">
            <div>
              <div className="text-[11px] font-bold text-slate-800 mb-0.5 truncate max-w-[180px] mx-auto">
                {teacherName}
              </div>
              <div className="border-t-2 border-slate-800 pt-1">
                वर्गशिक्षकाची स्वाक्षरी
              </div>
            </div>
            <div>
              <div className="h-4" />
              <div className="border-t-2 border-slate-800 pt-1">
                पालकाची स्वाक्षरी
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-800 mb-0.5 truncate max-w-[180px] mx-auto">
                {hmName}
              </div>
              <div className="border-t-2 border-slate-800 pt-1">
                मुख्याध्यापकाची स्वाक्षरी व शिक्का
              </div>
            </div>
          </div>

          {/* Childline & School Footer Info */}
          <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[10px] font-semibold text-slate-600">
            <span>
              चाइल्ड लाईन: १०९८ | POCSO e-box: www.ncpcr.gov.in (बाल संरक्षण हक्क)
            </span>
            <span>{schoolName}</span>
          </div>
        </div>

        {/* Page Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{studentDisplayName}</span>
          <span>17 of 19</span>
        </div>
      </div>

      {/* =========================================================================
          PAGE 18: STUDENT NOTES - TERM 1 (माझ्या नोंदी : प्रथम सत्र)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs">
        <div>
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-[#c85a28] tracking-wide">
              माझ्या नोंदी : प्रथम सत्र
            </h2>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              विद्यार्थ्याचे नाव: <span className="font-extrabold text-slate-900">{studentDisplayName}</span>
            </p>
          </div>

          {/* Ruled Lines (24 Lines) with User-filled Student Reflection / Notes */}
          {(() => {
            const s1Notes =
              profile?.studentSelfReflection ||
              (session1 as any)?.studentNotes ||
              session1?.teacherGeneralRemarks ||
              "";
            const noteParagraphs = s1Notes ? s1Notes.split("\n").filter(Boolean) : [];
            return (
              <div className="space-y-0 px-2 relative min-h-[672px]">
                {Array.from({ length: 24 }).map((_, i) => {
                  const lineText = noteParagraphs[i] || "";
                  return (
                    <div
                      key={i}
                      className="border-b border-slate-400 h-7 flex items-end px-2 text-xs font-medium text-slate-900 leading-none pb-0.5"
                    >
                      {lineText}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Quote at bottom of notes */}
          <div className="pt-4 text-center text-xs font-semibold text-slate-600">
            *नवीन नोंदी विद्यार्थ्याने स्वतः कराव्यात. खरे शिक्षण म्हणजे विचार करण्याची कला.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{studentDisplayName}</span>
          <span>18 of 19</span>
        </div>
      </div>

      {/* =========================================================================
          PAGE 19: STUDENT NOTES - TERM 2 (माझ्या नोंदी : द्वितीय सत्र)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs">
        <div>
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-[#c85a28] tracking-wide">
              माझ्या नोंदी : द्वितीय सत्र
            </h2>
            <p className="text-xs font-bold text-slate-600 mt-0.5">
              विद्यार्थ्याचे नाव: <span className="font-extrabold text-slate-900">{studentDisplayName}</span>
            </p>
          </div>

          {/* Ruled Lines (24 Lines) with User-filled Student Notes / Collaboration Notes */}
          {(() => {
            const s2Notes =
              (session2 as any)?.studentNotes ||
              profile?.parentCollaborationNotes ||
              session2?.teacherGeneralRemarks ||
              "";
            const noteParagraphs = s2Notes ? s2Notes.split("\n").filter(Boolean) : [];
            return (
              <div className="space-y-0 px-2 relative min-h-[672px]">
                {Array.from({ length: 24 }).map((_, i) => {
                  const lineText = noteParagraphs[i] || "";
                  return (
                    <div
                      key={i}
                      className="border-b border-slate-400 h-7 flex items-end px-2 text-xs font-medium text-slate-900 leading-none pb-0.5"
                    >
                      {lineText}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Quote at bottom of notes */}
          <div className="pt-4 text-center text-xs font-semibold text-slate-600">
            *नवीन नोंदी विद्यार्थ्याने स्वतः कराव्यात. माझे ते खरे म्हणण्यापेक्षा खरे ते माझे म्हणा.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{studentDisplayName}</span>
          <span>19 of 19</span>
        </div>
      </div>
    </div>
  );
}
