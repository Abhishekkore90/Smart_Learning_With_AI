import React from "react";
import {
  StudentInfoSummary,
} from "../services/hpcService";
import {
  HpcStudentProfile,
  HpcSessionAssessment,
  HpcAnnualSummary,
} from "../types/hpc";
import {
  FOUNDATIONAL_AREAS,
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

export type { FoundationalAreaConfig };

function ProficiencyBadge({ level = "" }: { level?: string }) {
  const norm = String(level || "").toLowerCase().trim();
  const isAkash = norm === "आकाश" || norm === "advanced" || norm === "akash";
  const isParvat = norm === "पर्वत" || norm === "proficient" || norm === "parvat";
  const isNirjhar = norm === "निर्झर" || norm === "beginner" || norm === "nirjhar" || norm === "प्रवाह";

  return (
    <div className="flex items-center gap-2 shrink-0 my-0.5">
      {/* Upward Arrow on Left (Pure CSS shapes) */}
      <div className="flex flex-col items-center justify-center">
        {/* Triangle Arrowhead */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "10px solid #4338ca",
          }}
        />
        {/* Arrow Stem */}
        <div className="w-1.5 h-12 bg-indigo-700" />
        <div className="text-[7.5px] font-black text-indigo-950 text-center leading-none mt-1">
          <div>प्राविण्य</div>
          <div>स्तर</div>
        </div>
      </div>

      {/* 3-Tier Circular Badge (Pure CSS divs, 100% Canvas Safe) */}
      <div
        className="w-24 h-24 rounded-full border-2 border-sky-600 overflow-hidden flex flex-col shadow-xs bg-white text-center justify-between"
        style={{ boxSizing: "border-box" }}
      >
        {/* Top Tier: आकाश (Sky/Top) */}
        <div
          className={`h-7 flex items-center justify-center text-[10px] font-black border-b border-sky-400 ${
            isAkash ? "bg-sky-600 text-white" : "bg-sky-100 text-sky-900"
          }`}
        >
          {isAkash ? "✓ आकाश" : "आकाश"}
        </div>

        {/* Middle Tier: पर्वत (शिखर) */}
        <div
          className={`h-10 flex items-center justify-center text-[10px] font-black border-b border-emerald-500 ${
            isParvat ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {isParvat ? "✓ पर्वत (शिखर)" : "पर्वत (शिखर)"}
        </div>

        {/* Bottom Tier: निर्झर (Stream/Base) */}
        <div
          className={`h-7 flex items-center justify-center text-[9.5px] font-black ${
            isNirjhar ? "bg-cyan-500 text-white" : "bg-cyan-100 text-cyan-900"
          }`}
        >
          {isNirjhar ? "✓ निर्झर" : "निर्झर"}
        </div>
      </div>
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
  return (
    <div className="flex items-center justify-around gap-2 px-1 py-1">
      {/* 1. होय */}
      <div className="flex flex-col items-center">
        <div
          className={`size-8 rounded-full flex items-center justify-center border ${
            selected === "yes"
              ? "bg-amber-100 border-amber-500 shadow-xs ring-2 ring-amber-400"
              : "bg-white border-slate-300"
          }`}
        >
          <span className="text-base leading-none">😊</span>
        </div>
        <span
          className={`text-[10px] mt-0.5 font-bold ${
            selected === "yes" ? "text-amber-800" : "text-slate-600"
          }`}
        >
          होय
        </span>
      </div>

      {/* 2. नाही */}
      <div className="flex flex-col items-center">
        <div
          className={`size-8 rounded-full flex items-center justify-center border ${
            selected === "no"
              ? "bg-slate-200 border-slate-500 shadow-xs ring-2 ring-slate-400"
              : "bg-white border-slate-300"
          }`}
        >
          <span className="text-base leading-none">😐</span>
        </div>
        <span
          className={`text-[10px] mt-0.5 font-bold ${
            selected === "no" ? "text-slate-800" : "text-slate-600"
          }`}
        >
          नाही
        </span>
      </div>

      {/* 3. माहिती नाही */}
      <div className="flex flex-col items-center">
        <div
          className={`size-8 rounded-full flex items-center justify-center border ${
            selected === "dont_know"
              ? "bg-purple-100 border-purple-500 shadow-xs ring-2 ring-purple-400"
              : "bg-white border-slate-300"
          }`}
        >
          <span className="text-base leading-none">🤔</span>
        </div>
        <span
          className={`text-[10px] mt-0.5 font-bold ${
            selected === "dont_know" ? "text-purple-800" : "text-slate-600"
          }`}
        >
          माहिती नाही
        </span>
      </div>
    </div>
  );
}

function HelpOptions({ selected = "" }: { selected?: string }) {
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
        const isSel = selected === opt.id;
        return (
          <div key={opt.id} className="flex flex-col items-center">
            <div
              className={`size-7 rounded-lg flex items-center justify-center border text-sm ${
                isSel
                  ? "bg-rose-100 border-rose-500 ring-2 ring-rose-400 font-bold"
                  : "bg-white border-slate-300 text-slate-700"
              }`}
            >
              {opt.icon}
            </div>
            <span
              className={`text-[9px] mt-0.5 leading-none font-bold text-center ${
                isSel ? "text-rose-900" : "text-slate-600"
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
    schoolSettings?.classTeacher ||
    schoolSettings?.teacherName ||
    student?.teacherName ||
    "वर्ग शिक्षक";

  const hmName = schoolSettings?.headMaster || "मुख्याध्यापक";

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
  const totalWorking = attendance?.annualTotalWorking || 0;
  const totalPresent = attendance?.annualTotalPresent || (t1.totalPresent + t2.totalPresent);
  const attendancePct = attendance?.attendancePercentage || "";

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
      (profile as any)?.workingDays?.[key] !== undefined && (profile as any)?.workingDays?.[key] !== null
        ? (profile as any).workingDays[key]
        : attendance?.workingDays?.[key] !== undefined && attendance?.workingDays?.[key] !== null
        ? attendance.workingDays[key]
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
          .hpc-pdf-document .pdf-page {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
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

        {/* Full-Bleed Classroom Learning Photo Filling Lower Half */}
        <div className="w-full flex-1 relative overflow-hidden bg-amber-100 flex items-center justify-center">
          <img
            src={HPC_BASE64_IMAGES.foundationalCoverKids}
            alt="Foundational Stage Students"
            className="w-full h-full object-cover object-top"
          />
        </div>

        {/* Bottom Orange Base Bar */}
        <div className="w-full h-4 bg-[#e86b24] shrink-0" />
      </div>

      {/* =========================================================================
          PAGE 2: STUDENT INFORMATION & ATTENDANCE (भाग अ (१) - 100% Exact Match)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden px-12 pt-7 pb-5 mx-auto bg-white flex flex-col justify-between relative box-border text-[11px] font-sans leading-normal">
        {/* Title: भाग अ (१) */}
        <div className="text-center mb-1">
          <h2 className="text-xl font-black text-[#e6006e] tracking-wide">
            भाग अ (१)
          </h2>
        </div>

        {/* Top School & Identification Details matching Image 3 */}
        <div className="space-y-1.5 pb-1">
          {/* Row 1: शाळेचे नाव व पत्ता : with full-width underline */}
          <div className="flex items-center w-full gap-2">
            <span className="font-bold text-slate-900 whitespace-nowrap">शाळेचे नाव व पत्ता :</span>
            <span className="border-b border-black flex-1 font-bold px-2 pb-0.5 min-h-[19px] truncate text-slate-900">
              {schoolNameLine}
            </span>
          </div>

          {/* Row 2: Second address line on left + Right-aligned पिन कोड : with 6 boxes */}
          <div className="flex items-center justify-between gap-4">
            <div className="border-b border-black flex-1 min-h-[19px] px-2 pb-0.5 font-bold text-slate-900 truncate">
              {schoolAddressLine}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-slate-900 whitespace-nowrap">पिन कोड :</span>
              <div className="flex items-center">
                {Array.from({ length: 6 }).map((_, i) => {
                  const pinChars = String(schoolSettings?.pincode || "").replace(/\D/g, "").split("");
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

          {/* Row 4: अपार आय.डी. : with 12 boxes */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="font-bold text-slate-900 whitespace-nowrap">अपार आय.डी. :</span>
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
        </div>

        {/* Subheader: सर्वसाधारण माहिती */}
        <div className="text-center my-1.5">
          <h3 className="font-black text-[#e6006e] text-base tracking-wide">
            सर्वसाधारण माहिती
          </h3>
          <p className="text-[10px] font-bold text-slate-800">
            (पालकांशी चर्चा करून शिक्षकांनी भरावे.)
          </p>
        </div>

        {/* Student Form Section matching Photo 3 */}
        <div className="space-y-1.5">
          {/* Top 4 Rows beside Photo Box */}
          <div className="flex items-start justify-between gap-5">
            {/* Left 4 lines */}
            <div className="flex-1 space-y-1.5 text-[11px]">
              {/* Row 1: विद्यार्थ्याचे नाव */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 whitespace-nowrap">विद्यार्थ्याचे नाव :</span>
                <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                  {profile?.fullName || student.fullName || student.name}
                </div>
              </div>

              {/* Row 2: हजेरी क्र. + सरल आय. डी. */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 w-36">
                  <span className="font-bold text-slate-900 whitespace-nowrap">हजेरी क्र. :</span>
                  <div className="border-b border-black flex-1 min-h-[19px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                    {profile?.rollNo || student.rollNo || "१"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="font-bold text-slate-900 whitespace-nowrap">सरल आय. डी. :</span>
                  <div className="border-b border-black flex-1 min-h-[19px] px-2 font-mono font-bold text-slate-900 flex items-end">
                    {profile?.saralId && profile.saralId !== "-" ? profile.saralId : student.saralId || ""}
                  </div>
                </div>
              </div>

              {/* Row 3: इयत्ता Checkboxes */}
              <div className="flex items-center gap-2 flex-wrap text-[10px] pt-0.5">
                <span className="font-bold text-slate-900 whitespace-nowrap">इयत्ता :</span>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <span>बालवाटिका १</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "balvatika_1" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <span>बालवाटिका २</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "balvatika_2" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer">
                  <span>बालवाटिका ३</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "balvatika_3" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer font-bold">
                  <span>इ. पहिली</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "1st" || student.class === "इ. पहिली" ? "✓" : ""}
                  </span>
                </label>
                <label className="inline-flex items-center gap-1 cursor-pointer font-bold">
                  <span>इ. दुसरी</span>
                  <span className="w-4 h-4 border border-black inline-flex items-center justify-center font-bold text-xs bg-white text-slate-900">
                    {student.class === "2nd" || student.class === "इ. दुसरी" ? "✓" : ""}
                  </span>
                </label>
              </div>

              {/* Row 4: तुकडी + जन्म दिनांक */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 w-36">
                  <span className="font-bold text-slate-900 whitespace-nowrap">तुकडी :</span>
                  <div className="border-b border-black flex-1 min-h-[19px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                    {profile?.division || student.division || "अ"}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="font-bold text-slate-900 whitespace-nowrap">जन्म दिनांक :</span>
                  <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
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

            {/* Right Photo Frame matching Image 3 */}
            <div className="w-32 h-38 border border-black flex flex-col items-center justify-center text-slate-800 font-bold text-base shrink-0 overflow-hidden bg-white shadow-2xs">
              <SafePhoto
                src={profile?.photoUrl || student.photoUrl}
                alt="विद्यार्थी फोटो"
                className="w-full h-full object-cover object-top"
                fallback={<span className="text-slate-800 font-bold text-lg">फोटो</span>}
              />
            </div>
          </div>

          {/* Remaining Lines: 100% Full-Width spanning under the photo box matching Image 3 */}
          {/* Row 5: पत्ता */}
          <div className="flex items-center gap-2 w-full">
            <span className="font-bold text-slate-900 whitespace-nowrap">पत्ता :</span>
            <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 truncate flex items-end">
              {profile?.homeAddress && profile.homeAddress !== "-"
                ? profile.homeAddress
                : profile?.addressLine1 && profile.addressLine1 !== "-"
                ? profile.addressLine1
                : student.address && student.address !== "-"
                ? student.address
                : ""}
            </div>
          </div>

          {/* Row 6: वजन + उंची */}
          <div className="flex items-center gap-8 w-full">
            <div className="flex items-center gap-1.5 w-52">
              <span className="font-bold text-slate-900 whitespace-nowrap">वजन :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {profile?.term1Weight ? `${profile.term1Weight} कि.ग्रॅ.` : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-52">
              <span className="font-bold text-slate-900 whitespace-nowrap">उंची :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {profile?.term1Height ? `${profile.term1Height} सें.मी.` : ""}
              </div>
            </div>
          </div>

          {/* Row 7: आईचे/पालकांचे नाव + भ्रमणध्वनी */}
          <div className="flex items-center gap-6 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">आईचे/पालकांचे नाव :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 truncate flex items-end">
                {profile?.motherName && profile.motherName !== "-" ? profile.motherName : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 w-72">
              <span className="font-bold text-slate-900 whitespace-nowrap text-[10.5px]">
                भ्रमणध्वनी (मोबाइल क्र.) :
              </span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.motherPhone && profile.motherPhone !== "-"
                  ? profile.motherPhone
                  : student.parentPhone && student.parentPhone !== "-"
                  ? student.parentPhone
                  : ""}
              </div>
            </div>
          </div>

          {/* Row 8: आईचे शिक्षण + आईचा व्यवसाय */}
          <div className="flex items-center gap-6 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">आईचे/पालकांचे शिक्षण :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.motherEducation && profile.motherEducation !== "-" ? profile.motherEducation : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">आई/पालकांचा व्यवसाय :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.motherOccupation && profile.motherOccupation !== "-" ? profile.motherOccupation : ""}
              </div>
            </div>
          </div>

          {/* Row 9: वडिलांचे/पालकांचे नाव + वडिलांचा व्यवसाय */}
          <div className="flex items-center gap-6 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">वडिलांचे/पालकांचे नाव :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 truncate flex items-end">
                {profile?.fatherName && profile.fatherName !== "-" ? profile.fatherName : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">वडील/पालकांचा व्यवसाय :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.fatherOccupation && profile.fatherOccupation !== "-" ? profile.fatherOccupation : ""}
              </div>
            </div>
          </div>

          {/* Row 10: वडिलांचे शिक्षण */}
          <div className="flex items-center gap-2 w-full">
            <span className="font-bold text-slate-900 whitespace-nowrap">वडिलांचे/पालकांचे शिक्षण :</span>
            <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
              {profile?.fatherEducation && profile.fatherEducation !== "-" ? profile.fatherEducation : ""}
            </div>
          </div>

          {/* Row 11: भावंडांची संख्या + भावंडांचे वय */}
          <div className="flex items-center gap-8 w-full">
            <div className="flex items-center gap-1.5 w-52">
              <span className="font-bold text-slate-900 whitespace-nowrap">भावंडांची संख्या :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-1 font-bold text-slate-900 text-center flex items-end justify-center">
                {profile?.siblingCount && profile.siblingCount !== "-" ? profile.siblingCount : ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">भावंडांचे वय :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.siblingAge && profile.siblingAge !== "-" ? profile.siblingAge : ""}
              </div>
            </div>
          </div>

          {/* Row 12: मातृभाषा + शिक्षणाचे माध्यम */}
          <div className="flex items-center gap-8 w-full">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">मातृभाषा :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.motherTongue || (student as any)?.motherTongue || ""}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap">शिक्षणाचे माध्यम :</span>
              <div className="border-b border-black flex-1 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
                {profile?.mediumOfInstruction || (student as any)?.mediumOfInstruction || ""}
              </div>
            </div>
          </div>

          {/* Row 13: ग्रामीण / शहरी */}
          <div className="flex items-center gap-2 w-full">
            <span className="font-bold text-slate-900 whitespace-nowrap">ग्रामीण/शहरी :</span>
            <div className="border-b border-black w-56 min-h-[19px] px-2 font-bold text-slate-900 flex items-end">
              {profile?.areaType || ""}
            </div>
          </div>
        </div>

        {/* Section: उपस्थिती Table Matching Image 3 & Image 5 100% */}
        <div className="mt-1">
          <h3 className="font-black text-[#e6006e] text-sm mb-1">
            उपस्थिती
          </h3>

          <table className="w-full table-fixed border-collapse border border-[#e6006e] text-center text-[10px]">
            <thead>
              <tr className="border-b border-[#e6006e] bg-[#fef2e6] text-[#e6006e] font-black">
                <th className="border-r border-[#e6006e] p-1 w-[16%] text-left pl-2">महिने</th>
                {["जून", "जुलै", "ऑगस्ट", "सप्टें.", "ऑक्टो.", "नोव्हें.", "डिसें.", "जाने.", "फेब्रु.", "मार्च", "एप्रिल", "मे"].map((m) => (
                  <th key={m} className="border-r border-[#e6006e] last:border-r-0 p-1 w-[7%] font-black whitespace-nowrap">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6006e] text-slate-900 font-bold">
              {/* Row 1: कामाचे दिवस */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] p-1 w-[16%] text-left pl-2 font-black text-slate-900 whitespace-nowrap">
                  कामाचे दिवस
                </td>
                {monthlyAttList.map((mAtt, i) => (
                  <td key={i} className="border-r border-[#e6006e] last:border-r-0 p-1 w-[7%]">
                    {mAtt.working}
                  </td>
                ))}
              </tr>

              {/* Row 2: उपस्थित दिवस */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] p-1 w-[16%] text-left pl-2 font-black text-slate-900 whitespace-nowrap">
                  उपस्थित दिवस
                </td>
                {monthlyAttList.map((mAtt, i) => (
                  <td key={i} className="border-r border-[#e6006e] last:border-r-0 p-1 w-[7%] font-black text-slate-900">
                    {mAtt.present}
                  </td>
                ))}
              </tr>

              {/* Row 3: उपस्थिती (% मध्ये) in PINK font matching Image 5 */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] p-1 w-[16%] text-left pl-2 font-black text-slate-900 whitespace-nowrap">
                  उपस्थिती (% मध्ये)
                </td>
                {monthlyAttList.map((mAtt, i) => (
                  <td key={i} className="border-r border-[#e6006e] last:border-r-0 p-1 w-[7%] font-black text-[#e6006e]">
                    {mAtt.pct}
                  </td>
                ))}
              </tr>

              {/* Row 4: उपस्थिती कमी असल्यास त्याची कारणे */}
              <tr>
                <td className="border-r border-[#e6006e] bg-[#fef2e6] p-1 w-[16%] text-left pl-2 font-black text-slate-900 leading-tight">
                  <div>उपस्थिती कमी असल्यास</div>
                  <div>त्याची कारणे</div>
                </td>
                <td colSpan={12} className="p-1 px-3 align-middle bg-white w-[84%]">
                  <div className="space-y-1.5 py-1">
                    <div className="border-b border-black h-3.5 w-full flex items-end px-1 text-[10px]">
                      {(profile as any)?.attendanceReason1 || ""}
                    </div>
                    <div className="border-b border-black h-3.5 w-full flex items-end px-1 text-[10px]">
                      {(profile as any)?.attendanceReason2 || ""}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer: Cyan Rule with Page Number 1 on the Right matching Image 3 */}
        <div className="mt-auto pt-2">
          <div className="w-full h-0.5 bg-[#00a0dc]" />
          <div className="flex justify-end pr-1 pt-1 text-xs font-bold text-slate-800">
            <span>1</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE 3: ME & MY SURROUNDINGS (भाग - अ (२) : मी व माझा परिसर - 100% Exact Match)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden px-10 pt-7 pb-5 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs">
        {/* Top Header */}
        <div className="text-center">
          <div className="text-sm font-bold text-[#e6006e] tracking-wide mb-1">
            भाग - अ (२)
          </div>
          <div className="inline-flex items-center justify-center gap-2 bg-[#c85a28] text-white px-14 py-1.5 rounded-full font-black text-xl tracking-wider shadow-xs">
            <span className="text-white text-base">★</span>
            <span>मी व माझा परिसर</span>
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
                {[0, 1, 2, 3, 4].map((idx) => {
                  const frName = (profile?.friends || [])[idx] || "";
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8e237b] shrink-0" />
                      <div className="border-b border-dotted border-slate-700 flex-1 h-4 flex items-end px-1 text-xs font-bold text-slate-900">
                        {frName}
                      </div>
                    </div>
                  );
                })}
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
        <div className="pt-1">
          <div className="text-xs font-black text-[#e6006e] mb-1">
            माझी आवड आहे :
          </div>

          <div className="border border-[#e6006e] bg-[#fdeee4] p-2.5 rounded-none space-y-2">
            {/* 12 Hobbies: 2 rows with clean flex spacing - full text, zero truncation */}
            <div className="space-y-1.5 text-xs">
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
            </div>

            {/* Chores Section */}
            <div className="pt-0.5">
              <div className="text-xs font-bold text-slate-900">
                इतर व्यक्तींसोबत (वडील, आई, पालक, भावंड इ.) घरातील खालील कामे नियमित करतो/करते.
              </div>
              <div className="space-y-1 mt-1">
                <div className="border-b border-black h-5 flex items-end px-1 text-xs font-bold text-slate-900">
                  {profile?.regularHomeChores && profile.regularHomeChores !== "-"
                    ? profile.regularHomeChores
                    : ""}
                </div>
                <div className="border-b border-black h-5 flex items-end px-1 text-xs font-bold text-slate-900" />
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-[10px] text-slate-700 font-medium mt-1">
            एकापेक्षा जास्त पर्याय निवडू शकता. पर्यायाच्या चौकटीवर (✓) अशी खूण करावी.
          </div>
        </div>

        {/* Footer: Page 3 with Cyan Accent Line & 2 on the Left matching Image 4 */}
        <div className="mt-auto pt-1">
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
              ? session1?.areaAssessments?.[area.id]
              : session2?.areaAssessments?.[area.id];

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

          return (
            <div
              key={`${area.id}_${sess}`}
              className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs"
            >
              <div className="space-y-2">
                {/* Top Student Header */}
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800 pb-0.5">
                  <div>
                    <span>विद्यार्थ्याचे नाव: </span>
                    <span className="font-bold text-slate-900">{student.name}</span>
                  </div>
                </div>

                {/* Area Title Box with Green Border */}
                <div className="border border-[#059669] bg-white py-1.5 px-4 flex items-center justify-between">
                  <span className="font-black text-sm text-slate-900 tracking-wide">
                    क्षेत्र क्र. {area.codeNum} : {area.nameMarathi}
                  </span>
                  <span className="font-black text-sm text-[#c85a28]">
                    {sessLabel}
                  </span>
                </div>

                {/* Curricular Goals (अभ्यासक्रमाची ध्येये) */}
                <div className="text-[11px] leading-tight text-slate-800">
                  <span className="font-black text-[#c85a28]">
                    अभ्यासक्रमाची ध्येये :{" "}
                  </span>
                  <span className="font-medium">{area.goalText}</span>
                </div>

                {/* Competencies (क्षमता) */}
                <div className="text-[11px] leading-tight text-slate-800">
                  <span className="font-black text-[#c85a28]">क्षमता : </span>
                  <span className="font-medium">{area.competencyText}</span>
                </div>

                {/* अध्ययन निष्पत्ती (Learning Outcomes) - Class Specific */}
                {(() => {
                  const targetClass = student.class || "1st";
                  const assessedLOs = currentAssessment?.selectedLearningOutcomes;
                  let displayLOs: string[] = [];
                  if (assessedLOs && assessedLOs.length > 0) {
                    displayLOs = assessedLOs;
                  } else {
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
                    <div className="text-[10px] leading-tight text-slate-800 bg-[#fffdf0] p-1.5 rounded border border-[#fde68a]">
                      <span className="font-black text-[#c85a28]">
                        अध्ययन निष्पत्ती ({targetClass === "2nd" ? "इयत्ता २ री" : "इयत्ता १ ली"}) :{" "}
                      </span>
                      <span className="font-medium text-slate-800">
                        {displayLOs.join(" | ")}
                      </span>
                    </div>
                  );
                })()}

                {/* Activities & Questions: 2 Columns */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  {/* Left Column: Activities */}
                  <div className="space-y-1">
                    <span className="font-black text-xs text-[#c85a28] block">
                      मूल्यमापनासाठी केलेली कृती/उपक्रम:
                    </span>
                    <div className="text-[11px] text-slate-800 space-y-0.5 pl-1 leading-tight font-medium">
                      {area.activities.map((act, i) => (
                        <div key={i}>{act}</div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Questions */}
                  <div className="space-y-1">
                    <span className="font-black text-xs text-[#c85a28] block">
                      मूल्यमापनाचे प्रश्न:
                    </span>
                    <div className="text-[11px] text-slate-800 space-y-0.5 pl-1 leading-tight font-medium">
                      {area.evalQuestions.map((q, i) => (
                        <div key={i}>{q}</div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rubrics Header */}
                <div className="font-black text-xs text-[#c85a28] pt-1">
                  मूल्यांकन निकषसंच (रुब्रिक)
                </div>

                {/* Rubrics Table */}
                <table className="w-full border-collapse border border-slate-400 text-[10px]">
                  <thead>
                    <tr className="bg-[#eaf4ea] text-slate-900 font-bold">
                      <th className="border border-slate-400 p-1 w-24 text-center">
                        क्षमता
                      </th>
                      <th className="border border-slate-400 p-1 text-center">
                        कामगिरी स्तर: निर्झर
                      </th>
                      <th className="border border-slate-400 p-1 text-center">
                        कामगिरी स्तर: पर्वत
                      </th>
                      <th className="border border-slate-400 p-1 text-center">
                        कामगिरी स्तर: आकाश
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FOUNDATIONAL_RUBRICS.map((rubric) => {
                      const rawLevel =
                        rubric.dimension === "जाणीवजागृती"
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
                          <td className="border border-slate-400 p-1.5 font-bold text-slate-900 text-center bg-slate-50">
                            {rubric.dimension}
                          </td>
                          <td
                            className={`border border-slate-400 p-1.5 leading-snug ${
                              isNirjhar ? "bg-amber-50 font-semibold" : ""
                            }`}
                          >
                            <span className="font-bold mr-1">
                              {isNirjhar ? "▣" : "☐"}
                            </span>
                            {rubric.nirjhar}
                          </td>
                          <td
                            className={`border border-slate-400 p-1.5 leading-snug ${
                              isParvat ? "bg-emerald-50 font-semibold" : ""
                            }`}
                          >
                            <span className="font-bold mr-1">
                              {isParvat ? "▣" : "☐"}
                            </span>
                            {rubric.parvat}
                          </td>
                          <td
                            className={`border border-slate-400 p-1.5 leading-snug ${
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
                    })}
                  </tbody>
                </table>

                {/* Proficiency Badge & Teacher Remark Row */}
                <div className="flex items-center gap-4 py-1">
                  <ProficiencyBadge level={awLvl} />
                  <div className="flex-1 pl-2">
                    <div className="text-xs leading-relaxed">
                      <span className="font-black text-[#c85a28]">
                        शिक्षक अभिप्राय:{" "}
                      </span>
                      <span className="text-slate-900 font-medium">
                        {teacherRemark}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 360-Degree Evaluation Sections */}
                {/* 1. Self Evaluation */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xs text-[#c85a28]">
                      स्वयंमूल्यांकन:
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      तू या कृतीत कसे काम केले हे दाखवणाऱ्या चित्रावर (✓) खूण करा:
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        करायला आवडले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.selfAssessment?.likedActivity || ""} />
                    </div>
                    <div className="col-span-3 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        सोपे वाटले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.selfAssessment?.feltEasy || ""} />
                    </div>
                    <div className="col-span-6 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        करताना मदत लागते.
                      </div>
                      <HelpOptions selected={currentAssessment?.threeSixty?.selfAssessment?.neededHelpFrom?.[0] || ""} />
                    </div>
                  </div>
                </div>

                {/* 2. Peer Evaluation */}
                <div className="pt-0.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xs text-[#c85a28]">
                      सहाध्यायी मूल्यांकन:
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      तुझ्या मित्राने या कृतीत कसे काम केले हे दाखवणाऱ्या चित्रावर (✓) खूण करा:
                    </span>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        करायला आवडले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.peerAssessment?.peerLiked || ""} />
                    </div>
                    <div className="col-span-3 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        सोपे वाटले.
                      </div>
                      <SmileyOptions selected={currentAssessment?.threeSixty?.peerAssessment?.peerFeltEasy || ""} />
                    </div>
                    <div className="col-span-6 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        करताना मदत लागते.
                      </div>
                      <HelpOptions selected={currentAssessment?.threeSixty?.peerAssessment?.peerNeededHelpFrom?.[0] || ""} />
                    </div>
                  </div>
                </div>

                {/* 3. Parent Observation & Remark */}
                <div className="border border-slate-800 p-2 mt-1 bg-white">
                  <div className="text-[11px] font-bold text-slate-800 mb-1">
                    <span className="font-black text-[#c85a28]">
                      पालकांचे निरीक्षण:{" "}
                    </span>
                    <span className="font-normal text-slate-600">
                      घरातील अध्ययन अध्यापन संसाधने
                    </span>
                  </div>
                  <div className="grid grid-cols-8 gap-1 text-center">
                    {HOME_RESOURCES.map((res) => (
                      <div key={res.label} className="flex flex-col items-center">
                        <div className="size-7 rounded-full border border-sky-400 bg-sky-50 flex items-center justify-center text-sm shadow-2xs">
                          {res.icon}
                        </div>
                        <span className="text-[8px] mt-0.5 font-bold text-slate-700 leading-tight">
                          {res.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs pt-1.5 mt-1 border-t border-slate-200">
                    <span className="font-black text-[#c85a28]">
                      पालकांचा अभिप्राय:{" "}
                    </span>
                    <span className="text-slate-900 font-medium">
                      {parentRemark}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>{student.name}</span>
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
            <div className="grid grid-cols-12 items-center">
              {/* Left Column: Proficiency Badge & Checkboxes */}
              <div className="col-span-4 p-3 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-50/50">
                <span className="font-black text-sm text-[#c85a28] mb-1">
                  जाणीवजागृती
                </span>
                <ProficiencyBadge level={annualSummary?.areaSummaries?.["physical_health"]?.finalLevel || ""} />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                  <span className={annualSummary?.areaSummaries?.["physical_health"]?.finalLevel === "advanced" ? "text-sky-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["physical_health"]?.finalLevel === "advanced" ? "✓ " : "☐ "}✨ आकाश
                  </span>
                  <span className={annualSummary?.areaSummaries?.["physical_health"]?.finalLevel === "proficient" ? "text-emerald-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["physical_health"]?.finalLevel === "proficient" ? "✓ " : "☐ "}⛰️ पर्वत
                  </span>
                  <span className={annualSummary?.areaSummaries?.["physical_health"]?.finalLevel === "beginner" ? "text-amber-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["physical_health"]?.finalLevel === "beginner" ? "✓ " : "☐ "}प्रवाह
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
                    {annualSummary?.areaSummaries?.["physical_health"]?.qualitativeRemarks ||
                     annualSummary?.areaSummaries?.["physical_health"]?.awarenessSummary ||
                     ""}
                  </p>
                </div>
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 2 : सामाजिक, भावनिक आणि नैतिक विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                    {annualSummary?.areaSummaries?.["socio_emotional"]?.qualitativeRemarks ||
                     annualSummary?.areaSummaries?.["socio_emotional"]?.awarenessSummary ||
                     ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 2: संवेदनशीलता (Areas 3 & 4) */}
            <div className="grid grid-cols-12 items-center">
              {/* Left Column */}
              <div className="col-span-4 p-3 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-50/50">
                <span className="font-black text-sm text-[#c85a28] mb-1">
                  संवेदनशीलता
                </span>
                <ProficiencyBadge level={annualSummary?.areaSummaries?.["cognitive"]?.finalLevel || ""} />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                  <span className={annualSummary?.areaSummaries?.["cognitive"]?.finalLevel === "advanced" ? "text-sky-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["cognitive"]?.finalLevel === "advanced" ? "✓ " : "☐ "}✨ आकाश
                  </span>
                  <span className={annualSummary?.areaSummaries?.["cognitive"]?.finalLevel === "proficient" ? "text-emerald-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["cognitive"]?.finalLevel === "proficient" ? "✓ " : "☐ "}⛰️ पर्वत
                  </span>
                  <span className={annualSummary?.areaSummaries?.["cognitive"]?.finalLevel === "beginner" ? "text-amber-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["cognitive"]?.finalLevel === "beginner" ? "✓ " : "☐ "}प्रवाह
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
                    {annualSummary?.areaSummaries?.["cognitive"]?.qualitativeRemarks ||
                     annualSummary?.areaSummaries?.["cognitive"]?.sensitivitySummary ||
                     ""}
                  </p>
                </div>
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 4 : भाषा आणि साक्षरता विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                    {annualSummary?.areaSummaries?.["language_literacy"]?.qualitativeRemarks ||
                     annualSummary?.areaSummaries?.["language_literacy"]?.sensitivitySummary ||
                     ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Row 3: सर्जनशीलता (Areas 5 & 5.1) */}
            <div className="grid grid-cols-12 items-center">
              {/* Left Column */}
              <div className="col-span-4 p-3 flex flex-col items-center justify-center border-r border-slate-800 bg-slate-50/50">
                <span className="font-black text-sm text-[#c85a28] mb-1">
                  सर्जनशीलता
                </span>
                <ProficiencyBadge level={annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel || ""} />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                  <span className={annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel === "advanced" ? "text-sky-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel === "advanced" ? "✓ " : "☐ "}✨ आकाश
                  </span>
                  <span className={annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel === "proficient" ? "text-emerald-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel === "proficient" ? "✓ " : "☐ "}⛰️ पर्वत
                  </span>
                  <span className={annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel === "beginner" ? "text-amber-700 font-bold" : "text-slate-600"}>
                    {annualSummary?.areaSummaries?.["aesthetic_cultural"]?.finalLevel === "beginner" ? "✓ " : "☐ "}प्रवाह
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
                    {annualSummary?.areaSummaries?.["aesthetic_cultural"]?.qualitativeRemarks ||
                     annualSummary?.areaSummaries?.["aesthetic_cultural"]?.creativitySummary ||
                     ""}
                  </p>
                </div>
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 5.1 : सकारात्मक अध्ययन सवयी
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium min-h-[20px]">
                    {annualSummary?.areaSummaries?.["positive_habits"]?.qualitativeRemarks ||
                     annualSummary?.areaSummaries?.["positive_habits"]?.creativitySummary ||
                     ""}
                  </p>
                </div>
              </div>
            </div>
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
          <span>{student.name}</span>
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
            <span className="font-bold text-slate-900">{student.name}</span>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-xl font-black text-[#c85a28] tracking-wide">
              वार्षिक सर्वांगीण अभिप्राय
            </h2>
          </div>

          {/* Teacher's Final Annual Remark Box */}
          <div className="border border-[#059669] rounded-lg p-4 bg-white min-h-[300px] flex flex-col">
            <span className="font-black text-xs text-[#c85a28] block mb-2">
              शिक्षकांचा अंतिम सर्वकष वार्षिक अभिप्राय :
            </span>
            {annualSummary?.finalTeacherRemarks ? (
              <p className="text-xs font-medium text-slate-800 leading-relaxed px-1">
                {annualSummary.finalTeacherRemarks}
              </p>
            ) : (
              <div className="space-y-4 px-1 flex-1 flex flex-col justify-around py-2">
                <div className="border-b border-slate-300 h-5" />
                <div className="border-b border-slate-300 h-5" />
                <div className="border-b border-slate-300 h-5" />
                <div className="border-b border-slate-300 h-5" />
                <div className="border-b border-slate-300 h-5" />
                <div className="border-b border-slate-300 h-5" />
              </div>
            )}
          </div>

          {/* NEP 2020 Principles Banner */}
          <div className="border border-dashed border-slate-400 rounded-lg p-2.5 text-center text-[11px] font-bold text-slate-800 bg-slate-50/60">
            <span>NEP 2020 - प्रमुख तत्त्वे: </span>
            <span className="text-emerald-700">✓ सर्वांगीण विकास </span>
            <span>· </span>
            <span className="text-emerald-700">✓ अनुभवात्मक शिक्षण </span>
            <span>· </span>
            <span className="text-emerald-700">✓ खेळावर आधारित </span>
            <span>· </span>
            <span className="text-emerald-700">✓ मातृभाषेत शिक्षण </span>
            <span>· </span>
            <span className="text-emerald-700">✓ सर्जनशीलता </span>
            <span>· </span>
            <span className="text-emerald-700">✓ बहुभाषिकता</span>
          </div>

          {/* Parent's Annual Remark Box */}
          <div className="border border-[#059669] rounded-lg p-4 bg-white min-h-[190px] flex flex-col justify-between">
            <span className="font-black text-xs text-[#c85a28] block mb-2">
              पालकांचा वार्षिक अभिप्राय :
            </span>
            <div className="space-y-4 px-1">
              {annualSummary?.finalParentRemarks ? (
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {annualSummary.finalParentRemarks}
                </p>
              ) : (
                <>
                  <div className="border-b border-slate-300 h-5" />
                  <div className="border-b border-slate-300 h-5" />
                  <div className="border-b border-slate-300 h-5" />
                  <div className="border-b border-slate-300 h-5" />
                </>
              )}
            </div>
          </div>

          {/* 3 Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-6 pb-2 text-center text-xs font-bold text-slate-900">
            <div>
              <div className="border-t-2 border-slate-800 pt-1">
                वर्गशिक्षकाची स्वाक्षरी
              </div>
            </div>
            <div>
              <div className="border-t-2 border-slate-800 pt-1">
                पालकाची स्वाक्षरी
              </div>
            </div>
            <div>
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
          <span>{student.name}</span>
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
          </div>

          {/* Ruled Lines (24 Lines) */}
          <div className="space-y-4 px-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="border-b border-slate-400 h-7" />
            ))}
          </div>

          {/* Quote at bottom of notes */}
          <div className="pt-4 text-center text-xs font-semibold text-slate-600">
            *नवीन नोंदी विद्यार्थ्याने स्वतः कराव्यात. खरे शिक्षण म्हणजे विचार करण्याची कला.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{student.name}</span>
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
          </div>

          {/* Ruled Lines (24 Lines) */}
          <div className="space-y-4 px-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="border-b border-slate-400 h-7" />
            ))}
          </div>

          {/* Quote at bottom of notes */}
          <div className="pt-4 text-center text-xs font-semibold text-slate-600">
            *नवीन नोंदी विद्यार्थ्याने स्वतः कराव्यात. माझे ते खरे म्हणण्यापेक्षा खरे ते माझे म्हणा.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{student.name}</span>
          <span>19 of 19</span>
        </div>
      </div>
    </div>
  );
}
