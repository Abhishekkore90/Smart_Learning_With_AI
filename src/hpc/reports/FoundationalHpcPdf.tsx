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

function ProficiencyBadge({ level = "पर्वत" }: { level?: string }) {
  const isAkash = level === "आकाश" || level === "advanced";
  const isParvat =
    level === "पर्वत" ||
    level === "proficient" ||
    (!isAkash && level !== "निर्झर" && level !== "beginner");
  const isNirjhar = level === "निर्झर" || level === "beginner";

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

function SmileyOptions({
  selected = "yes",
}: {
  selected?: "yes" | "no" | "dont_know";
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

function HelpOptions({ selected = "peer" }: { selected?: string }) {
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
  const totalWorking = attendance?.annualTotalWorking || 225;
  const totalPresent = attendance?.annualTotalPresent || (t1.totalPresent + t2.totalPresent);
  const attendancePct = attendance?.attendancePercentage || "0.0";

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
          PAGE 1: COVER PAGE (मुद्रित मुखपृष्ठ - SCERT Official Replica)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden mx-auto bg-[#ffb988] flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Top Peach Half with Official Government Headers & Logos */}
        <div className="px-8 pt-5 pb-3 flex flex-col justify-between flex-shrink-0">
          {/* Top Header: Right aligned 'पथदर्शी प्रकल्प' */}
          <div className="flex justify-end pr-1">
            <span className="text-sm font-black text-slate-900 tracking-wider">
              पथदर्शी प्रकल्प
            </span>
          </div>

          {/* Project Tag: 'STARS' प्रकल्पांतर्गत */}
          <div className="text-center mt-0.5 mb-1.5">
            <span className="inline-block text-xs font-black border-2 border-slate-900 px-6 py-0.5 rounded-full tracking-wider bg-transparent text-slate-900">
              'STARS' प्रकल्पांतर्गत
            </span>
          </div>

          {/* Emblems Row: 3 Official Logos */}
          <div className="flex items-center justify-between px-6 my-2">
            {/* NCERT / PARAKH */}
            <div className="text-center w-36 flex flex-col items-center">
              <img
                src={HPC_BASE64_IMAGES.ncertParakhLogo}
                alt="NCERT PARAKH"
                className="h-18 w-auto object-contain drop-shadow-xs"
              />
            </div>

            {/* Maharashtra Shasan Seal */}
            <div className="text-center w-32 flex flex-col items-center">
              <img
                src={HPC_BASE64_IMAGES.maharashtraSealLogo}
                alt="महाराष्ट्र शासन"
                className="h-18 w-auto object-contain drop-shadow-xs"
              />
            </div>

            {/* SCERT Pune */}
            <div className="text-center w-36 flex flex-col items-center">
              <img
                src={HPC_BASE64_IMAGES.scertPuneLogo}
                alt="SCERT Pune"
                className="h-18 w-auto object-contain drop-shadow-xs"
              />
            </div>
          </div>

          {/* Main Titles */}
          <div className="text-center my-1.5">
            <h1 className="text-[36px] font-black text-[#d61a7f] tracking-tight leading-tight drop-shadow-xs">
              समग्र प्रगतिपत्रक (HPC)
            </h1>
            <h2 className="text-[26px] font-black text-slate-900 tracking-wide mt-0.5">
              पायाभूत स्तर
            </h2>
          </div>
        </div>

        {/* Orange Dividing Accent Line */}
        <div className="w-full h-1.5 bg-[#e87738] shrink-0" />

        {/* Full-Bleed Classroom Learning Photo at Bottom Half */}
        <div className="w-full flex-1 relative overflow-hidden bg-amber-100 flex items-center justify-center">
          <img
            src={HPC_BASE64_IMAGES.foundationalCoverKids}
            alt="Foundational Stage Students"
            className="w-full h-full object-cover object-center"
          />

          {/* Elegant Official Report Metadata Card Overlaid at Bottom */}
          <div className="absolute bottom-4 inset-x-6 z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-5 py-3 border-2 border-[#e87738] shadow-lg flex items-center justify-between text-slate-900 text-xs">
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-[10px] font-bold text-[#e87738] uppercase tracking-wider block">शाळेचे नाव</span>
                <span className="font-black text-sm text-slate-900 truncate block">
                  {schoolName}
                </span>
              </div>
              <div className="px-4 border-x border-slate-300 text-center shrink-0">
                <span className="text-[10px] font-bold text-[#e87738] uppercase tracking-wider block">शैक्षणिक वर्ष</span>
                <span className="font-black text-sm text-slate-900 block">{academicYear}</span>
              </div>
              <div className="flex-1 min-w-0 pl-4 text-right">
                <span className="text-[10px] font-bold text-[#e87738] uppercase tracking-wider block">विद्यार्थी</span>
                <span className="font-black text-sm text-slate-900 truncate block">
                  {student.fullName || student.name}
                </span>
                <span className="text-[11px] font-bold text-slate-700 block">
                  इ. {student.class === "2nd" ? "२ री" : "१ ली"} | तुकडी: {student.division || "अ"} | हजेरी क्र.: {student.rollNo || "१"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE 2: STUDENT INFORMATION & ATTENDANCE (भाग अ (१) सर्वसाधारण माहिती व उपस्थिती)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-[11px] font-sans leading-normal">
        {/* Title: भाग अ (१) */}
        <div className="text-center pt-0.5">
          <h2 className="text-xl font-black text-[#d61a7f] tracking-wide">
            भाग अ (१)
          </h2>
        </div>

        {/* School & Identification Details with Crisp Box Alignments */}
        <div className="space-y-1.5 border-b border-slate-800 pb-2">
          {/* Row 1: शाळेचे नाव व पत्ता + पिन कोड */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="font-black text-slate-900 whitespace-nowrap">शाळेचे नाव व पत्ता :</span>
              <span className="font-bold text-slate-900 truncate border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                {schoolName} {schoolSettings?.address ? `, ${schoolSettings.address}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-black text-slate-900 whitespace-nowrap">पिन कोड :</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 6 }).map((_, i) => {
                  const pinChars = (schoolSettings?.pincode || "412210").replace(/\D/g, "").split("");
                  return (
                    <span
                      key={i}
                      className="size-5 border border-slate-900 font-mono font-bold text-xs flex items-center justify-center text-slate-900 bg-white"
                    >
                      {pinChars[i] || ""}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 2: युडायस नंबर + अंगणवाडी सेविका / शिक्षक आय.डी. */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-black text-slate-900 whitespace-nowrap">युडायस नंबर :</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 11 }).map((_, i) => {
                  const udiseChars = (profile?.udiseNumber || schoolSettings?.udiseNumber || "27210200123")
                    .replace(/\D/g, "")
                    .split("");
                  return (
                    <span
                      key={i}
                      className="size-5 border border-slate-900 font-mono font-bold text-xs flex items-center justify-center text-slate-900 bg-white"
                    >
                      {udiseChars[i] || ""}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-1 max-w-[280px]">
              <span className="font-black text-slate-900 whitespace-nowrap text-[10px]">
                अंगणवाडी सेविका / शिक्षक आय.डी. :
              </span>
              <span className="border border-slate-900 px-2 py-0.5 font-bold text-slate-900 flex-1 text-center bg-white min-h-[20px] text-[10.5px]">
                {profile?.teacherName && profile.teacherName !== "-" ? profile.teacherName : teacherName}
              </span>
            </div>
          </div>

          {/* Row 3: अपार आय.डी. */}
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 whitespace-nowrap">अपार आय.डी. :</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 12 }).map((_, i) => {
                const aparChars = (profile?.aparId || student.aparId || "202401020304")
                  .replace(/\D/g, "")
                  .split("");
                return (
                  <span
                    key={i}
                    className="size-5 border border-slate-900 font-mono font-bold text-xs flex items-center justify-center text-slate-900 bg-white"
                  >
                    {aparChars[i] || ""}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Subheader: सर्वसाधारण माहिती */}
        <div className="text-center my-0.5">
          <h3 className="font-black text-[#d61a7f] text-sm tracking-wide">
            सर्वसाधारण माहिती
          </h3>
          <p className="text-[10px] text-slate-600 font-bold">
            (पालकांशी चर्चा करून शिक्षकांनी भरावे.)
          </p>
        </div>

        {/* Student Form Section: Left Details, Right Photo */}
        <div className="flex items-start justify-between gap-4">
          {/* Left Form Lines */}
          <div className="flex-1 space-y-1.5 text-[11px]">
            {/* विद्यार्थ्याचे नाव */}
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 whitespace-nowrap">विद्यार्थ्याचे नाव :</span>
              <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                {profile?.fullName || student.fullName || student.name}
              </span>
            </div>

            {/* हजेरी क्र. + सरल आय. डी. */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-36">
                <span className="font-black text-slate-900 whitespace-nowrap">हजेरी क्र. :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 text-center min-h-[18px]">
                  {profile?.rollNo || student.rollNo || "१"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">सरल आय. डी. :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 font-mono min-h-[18px]">
                  {profile?.saralId && profile.saralId !== "-" ? profile.saralId : student.saralId || ""}
                </span>
              </div>
            </div>

            {/* इयत्ता Checkboxes: बालवाटिका १ [ ] बालवाटिका २ [ ] बालवाटिका ३ [ ] इ. पहिली [✓] इ. दुसरी [ ] */}
            <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
              <span className="font-black text-slate-900 whitespace-nowrap">इयत्ता :</span>
              <label className="inline-flex items-center gap-1">
                <span>बालवाटिका १</span>
                <span className="size-4 border border-slate-900 inline-flex items-center justify-center font-bold text-xs bg-white">
                  {student.class === "balvatika_1" ? "✓" : ""}
                </span>
              </label>
              <label className="inline-flex items-center gap-1">
                <span>बालवाटिका २</span>
                <span className="size-4 border border-slate-900 inline-flex items-center justify-center font-bold text-xs bg-white">
                  {student.class === "balvatika_2" ? "✓" : ""}
                </span>
              </label>
              <label className="inline-flex items-center gap-1">
                <span>बालवाटिका ३</span>
                <span className="size-4 border border-slate-900 inline-flex items-center justify-center font-bold text-xs bg-white">
                  {student.class === "balvatika_3" ? "✓" : ""}
                </span>
              </label>
              <label className="inline-flex items-center gap-1 font-bold">
                <span>इ. पहिली</span>
                <span className="size-4 border border-slate-900 inline-flex items-center justify-center font-bold text-xs bg-white">
                  {student.class === "1st" || (!student.class?.includes("2nd") && !student.class?.includes("bal")) ? "✓" : ""}
                </span>
              </label>
              <label className="inline-flex items-center gap-1 font-bold">
                <span>इ. दुसरी</span>
                <span className="size-4 border border-slate-900 inline-flex items-center justify-center font-bold text-xs bg-white">
                  {student.class === "2nd" ? "✓" : ""}
                </span>
              </label>
            </div>

            {/* तुकडी + जन्म दिनांक */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 w-36">
                <span className="font-black text-slate-900 whitespace-nowrap">तुकडी :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 text-center min-h-[18px]">
                  {profile?.division || student.division || "अ"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">जन्म दिनांक :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.dob || student.dob || "DD / MM / YYYY"}
                </span>
              </div>
            </div>

            {/* पत्ता */}
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 whitespace-nowrap">पत्ता :</span>
              <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 truncate min-h-[18px]">
                {profile?.homeAddress && profile.homeAddress !== "-"
                  ? profile.homeAddress
                  : profile?.addressLine1 && profile.addressLine1 !== "-"
                  ? profile.addressLine1
                  : student.address && student.address !== "-"
                  ? student.address
                  : ""}
              </span>
            </div>

            {/* वजन + उंची */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 whitespace-nowrap">वजन :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 w-24 px-1 text-center min-h-[18px]">
                  {profile?.term1Weight ? `${profile.term1Weight} कि.ग्रॅ.` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 whitespace-nowrap">उंची :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 w-24 px-1 text-center min-h-[18px]">
                  {profile?.term1Height ? `${profile.term1Height} सें.मी.` : ""}
                </span>
              </div>
            </div>

            {/* आईचे/पालकांचे नाव + भ्रमणध्वनी */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">आईचे/पालकांचे नाव :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 truncate min-h-[18px]">
                  {profile?.motherName && profile.motherName !== "-" ? profile.motherName : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 w-52">
                <span className="font-black text-slate-900 whitespace-nowrap text-[10px]">
                  भ्रमणध्वनी (मोबाइल क्र.) :
                </span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.motherPhone && profile.motherPhone !== "-"
                    ? profile.motherPhone
                    : student.parentPhone && student.parentPhone !== "-"
                    ? student.parentPhone
                    : ""}
                </span>
              </div>
            </div>

            {/* आईचे शिक्षण + आईचा व्यवसाय */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">आईचे/पालकांचे शिक्षण :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.motherEducation && profile.motherEducation !== "-" ? profile.motherEducation : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">आई/पालकांचा व्यवसाय :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.motherOccupation && profile.motherOccupation !== "-" ? profile.motherOccupation : ""}
                </span>
              </div>
            </div>

            {/* वडिलांचे/पालकांचे नाव + वडिलांचा व्यवसाय */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">वडिलांचे/पालकांचे नाव :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 truncate min-h-[18px]">
                  {profile?.fatherName && profile.fatherName !== "-" ? profile.fatherName : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">वडील/पालकांचा व्यवसाय :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.fatherOccupation && profile.fatherOccupation !== "-" ? profile.fatherOccupation : ""}
                </span>
              </div>
            </div>

            {/* वडिलांचे शिक्षण */}
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 whitespace-nowrap">वडिलांचे/पालकांचे शिक्षण :</span>
              <span className="font-bold text-slate-900 border-b border-slate-700 w-80 px-1 min-h-[18px]">
                {profile?.fatherEducation && profile.fatherEducation !== "-" ? profile.fatherEducation : ""}
              </span>
            </div>

            {/* भावंडांची संख्या + भावंडांचे वय */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 whitespace-nowrap">भावंडांची संख्या :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 w-24 px-1 text-center min-h-[18px]">
                  {profile?.siblingCount && profile.siblingCount !== "-" ? profile.siblingCount : "०"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">भावंडांचे वय :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.siblingAge && profile.siblingAge !== "-" ? profile.siblingAge : ""}
                </span>
              </div>
            </div>

            {/* मातृभाषा + शिक्षणाचे माध्यम */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">मातृभाषा :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.motherTongue || "मराठी"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="font-black text-slate-900 whitespace-nowrap">शिक्षणाचे माध्यम :</span>
                <span className="font-bold text-slate-900 border-b border-slate-700 flex-1 px-1 min-h-[18px]">
                  {profile?.mediumOfInstruction || "मराठी"}
                </span>
              </div>
            </div>

            {/* ग्रामीण / शहरी */}
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 whitespace-nowrap">ग्रामीण / शहरी :</span>
              <span className="font-bold text-slate-900 border-b border-slate-700 w-44 px-1 min-h-[18px]">
                {profile?.areaType || "ग्रामीण"}
              </span>
            </div>
          </div>

          {/* Right Photo Box */}
          <div className="w-28 h-36 border-2 border-slate-800 flex flex-col items-center justify-center text-slate-500 font-bold text-xs shrink-0 overflow-hidden bg-slate-50 shadow-xs">
            <SafePhoto
              src={profile?.photoUrl || student.photoUrl}
              alt="Student Photo"
              className="w-full h-full object-cover"
              fallback={<span className="text-slate-600 font-bold">फोटो</span>}
            />
          </div>
        </div>

        {/* Section: उपस्थिती (13 Month Single-Table Layout with Magenta Borders) */}
        <div className="mt-2 pt-1">
          <h3 className="font-black text-[#d61a7f] text-sm mb-1.5">
            उपस्थिती
          </h3>

          <table className="w-full border-collapse border-2 border-[#d61a7f] text-center text-[10px]">
            <thead>
              <tr className="border-b-2 border-[#d61a7f] bg-[#fdf2f7] text-[#d61a7f] font-black">
                <th className="border-r border-[#d61a7f] p-1.5 w-24 text-left pl-2">महिने</th>
                {["जून", "जुलै", "ऑगस्ट", "सप्टें.", "ऑक्टो.", "नोव्हें.", "डिसें.", "जाने.", "फेब्रु.", "मार्च", "एप्रिल", "मे"].map((m) => (
                  <th key={m} className="border-r border-[#d61a7f] last:border-r-0 p-1">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d61a7f] text-slate-900 font-bold">
              {/* Row 1: कामाचे दिवस */}
              <tr>
                <td className="border-r border-[#d61a7f] p-1 text-left pl-2 font-black text-slate-800 bg-[#fafafa]">
                  कामाचे दिवस
                </td>
                {[20, 24, 22, 21, 18, 19, 24, 22, 20, 24, 6, 0].map((def, i) => (
                  <td key={i} className="border-r border-[#d61a7f] last:border-r-0 p-1">
                    {def > 0 ? def : ""}
                  </td>
                ))}
              </tr>

              {/* Row 2: उपस्थित दिवस */}
              <tr>
                <td className="border-r border-[#d61a7f] p-1 text-left pl-2 font-black text-slate-800 bg-[#fafafa]">
                  उपस्थित दिवस
                </td>
                {[19, 23, 21, 20, 17, 18, 23, 21, 19, 23, 6, 0].map((def, i) => (
                  <td key={i} className="border-r border-[#d61a7f] last:border-r-0 p-1 font-black text-slate-900">
                    {def > 0 ? def : ""}
                  </td>
                ))}
              </tr>

              {/* Row 3: उपस्थिती (% मध्ये) */}
              <tr>
                <td className="border-r border-[#d61a7f] p-1 text-left pl-2 font-black text-slate-800 bg-[#fafafa]">
                  उपस्थिती (% मध्ये)
                </td>
                {[95, 96, 95, 95, 94, 95, 96, 95, 95, 96, 100, 0].map((def, i) => (
                  <td key={i} className="border-r border-[#d61a7f] last:border-r-0 p-1 font-black text-[#d61a7f]">
                    {def > 0 ? `${def}%` : ""}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* उपस्थिती कमी असल्यास त्याची कारणे */}
          <div className="mt-2 space-y-1">
            <span className="font-bold text-slate-800 text-[10.5px]">
              उपस्थिती कमी असल्यास त्याची कारणे :
            </span>
            <div className="border-b border-slate-600 h-4.5" />
            <div className="border-b border-slate-600 h-4.5" />
          </div>
        </div>

        {/* Footer: Page 2 with Cyan Accent Line */}
        <div className="pt-2 border-t-2 border-[#00a0dc] flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="font-mono text-slate-900 font-bold">१</span>
          <span>{student.fullName || student.name} (इ. {student.class === "2nd" ? "२ री" : "१ ली"})</span>
        </div>
      </div>

      {/* =========================================================================
          PAGE 3: ME & MY SURROUNDINGS (भाग - अ (२) : मी व माझा परिसर)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-7 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border text-slate-900 text-xs">
        {/* Top Header */}
        <div className="text-center">
          <div className="text-sm font-black text-[#d61a7f] tracking-wide mb-1">
            भाग - अ (२)
          </div>
          <div className="inline-flex items-center justify-center gap-3 bg-[#c85a28] text-white px-10 py-1.5 rounded-full font-black text-xl tracking-wider shadow-sm">
            <span className="text-white text-base">★</span>
            <span>मी व माझा परिसर</span>
            <span className="text-white text-base">★</span>
          </div>
        </div>

        {/* Section 1: Photo & Age & Birthday & Address */}
        <div className="grid grid-cols-12 gap-4 items-start pt-1">
          {/* Tilted Photo Frame (col-span-5) */}
          <div className="col-span-5 relative pt-3 pl-2">
            <div className="relative -rotate-2 border-2 border-slate-900 rounded-3xl w-52 h-44 bg-white p-2 flex flex-col items-center justify-center shadow-xs">
              {/* Tilted label on top border */}
              <div className="absolute -top-3.5 left-3 flex items-center gap-1 bg-white px-1.5 text-sm font-black text-slate-900">
                <span className="text-amber-400 text-base">★</span>
                <span className="tracking-wide">माझा फोटो</span>
                <span className="text-rose-600 text-base">★</span>
                <span className="text-lime-500 text-base">★</span>
              </div>
              <SafePhoto
                src={student.photoUrl}
                alt="Student"
                className="w-full h-full object-cover rounded-2xl"
                fallback={
                  <div className="w-full h-full border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/60">
                    <span className="text-2xl mb-1">📷</span>
                    <span className="text-[11px] font-bold text-slate-600">फोटो येथे लावावा</span>
                  </div>
                }
              />
            </div>
          </div>

          {/* Age, Birthday Balloon, Address (col-span-7) */}
          <div className="col-span-7 flex flex-col justify-between h-44 pl-2">
            <div className="flex items-center justify-between gap-2">
              {/* Age Info */}
              <div className="flex items-center gap-2">
                <div className="text-sm font-black text-slate-900 leading-tight">
                  <div>माझे</div>
                  <div>वय</div>
                </div>
                <div className="w-16 h-9 rounded-full border-2 border-[#e67324] bg-white flex items-center justify-center text-sm font-black text-slate-900 shadow-2xs">
                  {profile?.age || "७"}
                </div>
                <div className="text-sm font-black text-slate-900 leading-tight">
                  <div>वर्षे</div>
                  <div className="flex items-center gap-1">
                    <span>आहे.</span>
                    <span className="text-amber-500 text-xs">★</span>
                  </div>
                </div>
              </div>

              {/* Birthday Balloon */}
              <div className="relative flex flex-col items-center shrink-0 pr-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#4b207e] to-[#250d42] text-white flex flex-col items-center justify-center text-center p-2 shadow-sm relative">
                  <div className="text-[10px] font-medium leading-none">माझा</div>
                  <div className="text-xs font-black leading-tight mt-0.5">वाढदिवस</div>
                  <div className="text-xs font-black text-amber-300 my-0.5">
                    {profile?.birthday && profile.birthday !== "-" ? profile.birthday : student.dob || "१५ ऑगस्ट"}
                  </div>
                  <div className="text-[9px] font-bold leading-none opacity-90">या दिवशी असतो.</div>
                </div>
                {/* Balloon string SVG */}
                <svg
                  className="w-8 h-8 absolute -bottom-6 right-3 text-slate-700 pointer-events-none"
                  viewBox="0 0 30 30"
                  fill="none"
                >
                  <path
                    d="M 12 0 C 14 10, 8 18, 20 28"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>

            {/* Address with House Icon */}
            <div className="mt-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-black text-slate-900">माझ्या घराचा पत्ता</span>
                {/* Blue line house icon */}
                <svg
                  className="size-7 text-[#00a0dc]"
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
                <div className="border-b border-slate-800 h-5 flex items-end px-1 text-xs font-bold text-slate-900">
                  {profile?.homeAddress && profile.homeAddress !== "-" ? profile.homeAddress : student.address || ""}
                </div>
                <div className="border-b border-slate-800 h-5 flex items-end px-1 text-xs font-bold text-slate-900" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Family & Ambition vs Friends Notepad */}
        <div className="grid grid-cols-12 gap-4 items-stretch pt-2">
          {/* Family & Ambition Column (col-span-7) */}
          <div className="col-span-7 flex flex-col justify-between">
            {/* Family Frame */}
            <div className="relative">
              {/* Smileys & Star on Frame Header */}
              <div className="absolute -top-3.5 left-3 flex items-center gap-1 z-10">
                {/* Yellow smiley face */}
                <div className="size-8 rounded-full bg-[#fdd835] border border-amber-500 flex items-center justify-center shadow-xs">
                  <span className="text-base leading-none">😊</span>
                </div>
                {/* Red smiley face */}
                <div className="size-7 rounded-full bg-[#e53935] border border-red-600 flex items-center justify-center shadow-xs">
                  <span className="text-sm leading-none">😄</span>
                </div>
              </div>
              <span className="absolute -top-2 right-4 text-indigo-600 text-lg z-10">★</span>

              {/* Nested Green Frame */}
              <div className="border-4 border-[#009b4d] rounded-3xl p-3 pt-4 bg-white min-h-[92px] flex flex-col justify-center">
                <p className="text-xs font-bold text-slate-800 leading-relaxed text-center px-2">
                  {profile?.familyDescription && profile.familyDescription !== "-"
                    ? profile.familyDescription
                    : "आई, वडील, आजी, आजोबा व भावंड."}
                </p>
              </div>
              <div className="text-center mt-1">
                <span className="text-sm font-black text-slate-900">माझे कुटुंब</span>
              </div>
            </div>

            {/* Ambition Box */}
            <div className="relative mt-2">
              <span className="absolute -top-3 right-3 text-sky-500 text-2xl z-10">★</span>
              <div className="border-4 border-[#8e237b] rounded-2xl p-2.5 bg-white">
                <div className="text-sm font-black text-slate-900">मोठे होऊन मला</div>
                <div className="border-b border-dotted border-slate-700 my-1 h-6 flex items-end px-2 text-xs font-black text-indigo-950">
                  {profile?.ambition && profile.ambition !== "-" ? profile.ambition : "शिक्षक / डॉक्टर / सैनिक"}
                </div>
                <div className="text-right text-sm font-black text-slate-900">व्हायचे आहे.</div>
              </div>
            </div>
          </div>

          {/* Friends Notepad Card (col-span-5) */}
          <div className="col-span-5 flex flex-col justify-between relative pt-1">
            <span className="absolute -top-2 left-6 text-rose-600 text-2xl z-10">★</span>
            <span className="absolute top-12 -right-1 text-sky-500 text-xl z-10">★</span>

            {/* Cyan Border Card */}
            <div className="border-[6px] border-[#009fd9] bg-white p-3 rounded-none flex-1 flex flex-col justify-between min-h-[195px] relative">
              <div className="space-y-2">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const frName = (profile?.friends || [])[idx] || "";
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-[#c8237b] shrink-0" />
                      <div className="border-b border-dotted border-slate-700 flex-1 h-5 flex items-end px-1 text-xs font-bold text-slate-900">
                        {frName}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Starburst Banner attached at bottom */}
              <div className="relative mt-2 -mb-5 -mx-3.5 z-20">
                <div className="bg-[#e65c00] text-white px-3 py-1.5 rounded-md text-xs font-black tracking-wide text-center shadow-md border border-amber-300 flex items-center justify-center gap-1">
                  <span>💥</span>
                  <span>हे माझे मित्र/मैत्रिणी आहेत.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: My Favorites (माझा आवडता) */}
        <div className="pt-4">
          <div className="text-center font-black text-base text-slate-900 mb-1.5 flex items-center justify-center gap-2">
            <span className="text-lime-600 text-lg">★</span>
            <span>माझा आवडता</span>
            <span className="text-amber-400 text-lg">★</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {/* Left Column: रंग, अन्नपदार्थ, प्राणी */}
            <div className="space-y-1.5">
              {/* Color */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🎨</span>
                <span className="w-20 text-xs font-black text-slate-900">रंग</span>
                <div className="flex-1 h-7 border border-slate-800 rounded-full px-3 flex items-center text-xs font-bold text-slate-900 bg-white shadow-2xs">
                  {profile?.favoriteColor && profile.favoriteColor !== "-" ? profile.favoriteColor : "निळा"}
                </div>
              </div>

              {/* Food */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🍲</span>
                <span className="w-20 text-xs font-black text-slate-900">अन्नपदार्थ</span>
                <div className="flex-1 h-7 border border-slate-800 rounded-full px-3 flex items-center text-xs font-bold text-slate-900 bg-white shadow-2xs">
                  {profile?.favoriteFood && profile.favoriteFood !== "-" ? profile.favoriteFood : "वरणभात"}
                </div>
              </div>

              {/* Animal */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🦌</span>
                <span className="w-20 text-xs font-black text-slate-900">प्राणी</span>
                <div className="flex-1 h-7 border border-slate-800 rounded-full px-3 flex items-center text-xs font-bold text-slate-900 bg-white shadow-2xs">
                  {profile?.favoriteAnimal && profile.favoriteAnimal !== "-" ? profile.favoriteAnimal : "मांजर"}
                </div>
              </div>
            </div>

            {/* Right Column: फूल, खेळ, विषय */}
            <div className="space-y-1.5">
              {/* Flower */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🌸</span>
                <span className="w-16 text-xs font-black text-slate-900">फूल</span>
                <div className="flex-1 h-7 border border-slate-800 rounded-full px-3 flex items-center text-xs font-bold text-slate-900 bg-white shadow-2xs">
                  {profile?.favoriteFlower && profile.favoriteFlower !== "-" ? profile.favoriteFlower : "गुलाब"}
                </div>
              </div>

              {/* Game */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">🎾</span>
                <span className="w-16 text-xs font-black text-slate-900">खेळ</span>
                <div className="flex-1 h-7 border border-slate-800 rounded-full px-3 flex items-center text-xs font-bold text-slate-900 bg-white shadow-2xs">
                  {profile?.favoriteGame && profile.favoriteGame !== "-" ? profile.favoriteGame : "लपंडाव"}
                </div>
              </div>

              {/* Subject */}
              <div className="flex items-center gap-2">
                <span className="text-base w-6 text-center">📚</span>
                <span className="w-16 text-xs font-black text-slate-900">विषय</span>
                <div className="flex-1 h-7 border border-slate-800 rounded-full px-3 flex items-center text-xs font-bold text-slate-900 bg-white shadow-2xs">
                  {profile?.favoriteSubject && profile.favoriteSubject !== "-" ? profile.favoriteSubject : "भाषा"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Hobbies & Home Chores */}
        <div className="pt-2">
          <div className="text-xs font-black text-[#d61a7f] mb-1">
            माझी आवड आहे :
          </div>

          <div className="border-2 border-[#d61a7f] bg-[#fdeee4] p-2.5 rounded-none space-y-2">
            {/* 12 Hobbies Grid: 2 rows of 6 */}
            <div className="grid grid-cols-6 gap-x-2 gap-y-1.5 text-xs">
              {[
                "वाचन",
                "नृत्य",
                "गायन",
                "वादन",
                "क्रीडा / खेळ",
                "सर्जनशील लेखन",
                "बागकाम",
                "योगाभ्यास",
                "कला",
                "हस्तकला",
                "पाककला",
                "इतर",
              ].map((h) => {
                const checked = (
                  profile?.hobbies || ["वाचन", "क्रीडा / खेळ", "कला"]
                ).some((hobby) => hobby.includes(h) || h.includes(hobby));
                return (
                  <div key={h} className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate text-[11.5px]">{h}</span>
                    <span className="size-5 border-2 border-slate-900 bg-white inline-flex items-center justify-center font-black text-rose-600 text-xs shrink-0">
                      {checked ? "✓" : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Chores Section */}
            <div className="pt-1">
              <div className="text-xs font-bold text-slate-900">
                इतर व्यक्तींसोबत (वडील, आई, पालक, भावंड इ.) घरातील खालील कामे नियमित करतो/करते.
              </div>
              <div className="space-y-1 mt-1">
                <div className="border-b border-slate-800 h-5 flex items-end px-1 text-xs font-bold text-slate-900">
                  {profile?.regularHomeChores && profile.regularHomeChores !== "-"
                    ? profile.regularHomeChores
                    : "स्वतःचे दप्तर जागेवर ठेवणे, जेवणानंतर ताट उचलून ठेवणे, झाडांना पाणी देणे."}
                </div>
                <div className="border-b border-slate-800 h-5 flex items-end px-1 text-xs font-bold text-slate-900" />
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="text-[10px] text-slate-700 font-medium mt-1">
            एकापेक्षा जास्त पर्याय निवडू शकता. पर्यायाच्या चौकटीवर (✓) अशी खूण करावी.
          </div>
        </div>

        {/* Footer: Page 3 with Cyan Accent Line on the Left */}
        <div className="pt-2 border-t-2 border-[#00a0dc] flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="font-mono text-slate-900 font-bold">२</span>
          <span>{student.fullName || student.name} (इ. {student.class === "2nd" ? "२ री" : "१ ली"})</span>
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

          // Core Rubric Levels selected
          const awLvl = currentAssessment?.awarenessLevel || "proficient";
          const seLvl = currentAssessment?.sensitivityLevel || "proficient";
          const crLvl = currentAssessment?.creativityLevel || "proficient";

          // Selected overall or default to पर्वत
          const defaultRemark =
            sess === "session1"
              ? area.defaultTeacherRemarkS1
              : area.defaultTeacherRemarkS2;
          const teacherRemark =
            currentAssessment?.threeSixty?.teacherRemarks?.observation ||
            defaultRemark;

          const defaultParentRemark =
            sess === "session1"
              ? area.defaultParentRemarkS1
              : area.defaultParentRemarkS2;
          const parentRemark =
            currentAssessment?.threeSixty?.parentFeedback?.parentObservations ||
            defaultParentRemark;

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
                        lvlStr === "पर्वत" ||
                        (!isNirjhar && !isAkash);

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
                      <SmileyOptions selected="yes" />
                    </div>
                    <div className="col-span-3 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        सोपे वाटले.
                      </div>
                      <SmileyOptions selected="yes" />
                    </div>
                    <div className="col-span-6 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        करताना मदत लागते.
                      </div>
                      <HelpOptions selected="peer" />
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
                      <SmileyOptions selected="yes" />
                    </div>
                    <div className="col-span-3 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        सोपे वाटले.
                      </div>
                      <SmileyOptions selected="yes" />
                    </div>
                    <div className="col-span-6 border border-slate-800 p-1 text-center bg-white">
                      <div className="text-[11px] font-bold text-slate-800 mb-0.5">
                        करताना मदत लागते.
                      </div>
                      <HelpOptions selected="peer" />
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
                <ProficiencyBadge level="आकाश" />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                  <span className="text-sky-700">✓ ✨ आकाश</span>
                  <span>⛰️ पर्वत</span>
                  <span>प्रवाह</span>
                  <span>पैलू</span>
                </div>
              </div>

              {/* Right Column: Qualitative Area Statements */}
              <div className="col-span-8 p-3 space-y-3 text-xs">
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 1 : शारीरिक विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {FOUNDATIONAL_AREA_DETAILS[0].qualitativeSummary}
                  </p>
                </div>
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 2 : सामाजिक, भावनिक आणि नैतिक विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {FOUNDATIONAL_AREA_DETAILS[1].qualitativeSummary}
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
                <ProficiencyBadge level="आकाश" />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                  <span className="text-sky-700">✓ ✨ आकाश</span>
                  <span>⛰️ पर्वत</span>
                  <span>प्रवाह</span>
                  <span>पैलू</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-span-8 p-3 space-y-3 text-xs">
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 3 : बोधात्मक विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {FOUNDATIONAL_AREA_DETAILS[2].qualitativeSummary}
                  </p>
                </div>
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 4 : भाषा आणि साक्षरता विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {FOUNDATIONAL_AREA_DETAILS[3].qualitativeSummary}
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
                <ProficiencyBadge level="आकाश" />
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-800 mt-1">
                  <span className="text-sky-700">✓ ✨ आकाश</span>
                  <span>⛰️ पर्वत</span>
                  <span>प्रवाह</span>
                  <span>पैलू</span>
                </div>
              </div>

              {/* Right Column */}
              <div className="col-span-8 p-3 space-y-3 text-xs">
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 5 : सौंदर्यदृष्टी आणि सांस्कृतिक विकास
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {FOUNDATIONAL_AREA_DETAILS[4].qualitativeSummary}
                  </p>
                </div>
                <div>
                  <span className="font-black text-xs text-[#c85a28] block mb-0.5">
                    क्षेत्र 5.1 : सकारात्मक अध्ययन सवयी
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {FOUNDATIONAL_AREA_DETAILS[5].qualitativeSummary}
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
            <p className="text-xs font-medium text-slate-800 leading-relaxed px-1">
              {annualSummary?.finalTeacherRemarks ||
                "विद्यार्थी नियमित शाळेत उपस्थित राहतो. वर्गातील सर्व उपक्रम व खेळांमध्ये उत्साहाने भाग घेतो. सहकाऱ्यांशी प्रेमाने व आदराने वागतो. प्रगती समाधानकारक व कौतुकास्पद आहे."}
            </p>
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
