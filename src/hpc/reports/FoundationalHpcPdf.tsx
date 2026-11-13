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
  student,
  schoolSettings = {},
  profile,
  session1,
  session2,
  annualSummary,
  attendance,
  academicYear = "२०२५ - २०२६",
}: FoundationalHpcPdfProps) {
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
    <div className="hpc-pdf-document font-sans text-slate-900 bg-white">
      {/* =========================================================================
          PAGE 1: COVER PAGE (मुद्रित मुखपृष्ठ)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-amber-50/50 flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Top Header */}
        <div className="text-right">
          <span className="inline-block text-xs font-black tracking-widest text-slate-800 border-2 border-slate-800 px-3 py-1 rounded-md">
            पथदर्शी प्रकल्प
          </span>
        </div>

        {/* Project Tag */}
        <div className="text-center mt-2">
          <span className="inline-block text-sm font-black border-2 border-slate-900 px-6 py-1.5 rounded-full tracking-wider bg-white">
            'STARS' प्रकल्पांतर्गत
          </span>
        </div>

        {/* Emblems row */}
        <div className="flex items-center justify-around my-6">
          <div className="text-center w-28">
            <div className="size-16 mx-auto rounded-full border-2 border-slate-800 flex items-center justify-center font-black text-xs p-1">
              NCERT / PARAKH
            </div>
            <p className="text-[10px] font-black mt-2 leading-tight">एन सी ई आर टी</p>
          </div>

          <div className="text-center w-36">
            <div className="size-20 mx-auto rounded-full border-2 border-amber-600 flex items-center justify-center font-black text-xs p-1 bg-amber-100">
              महाराष्ट्र शासन
            </div>
            <p className="text-xs font-black mt-2 leading-tight text-amber-900">महाराष्ट्र शासन</p>
          </div>

          <div className="text-center w-32">
            <div className="size-16 mx-auto rounded-full border-2 border-blue-800 flex items-center justify-center font-black text-[10px] p-1">
              SCERT PUNE
            </div>
            <p className="text-[10px] font-black mt-2 leading-tight">
              राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद, महाराष्ट्र, पुणे
            </p>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center my-4">
          <h1 className="text-4xl font-black text-pink-600 tracking-tight leading-tight mb-2">
            समग्र प्रगतिपत्रक (HPC)
          </h1>
          <h2 className="text-3xl font-black text-slate-900 tracking-wide">
            पायाभूत स्तर (Foundational Stage)
          </h2>
          <p className="text-sm font-bold text-slate-600 mt-2">
            इयत्ता १ ली व २ री (Classes 1st & 2nd)
          </p>
        </div>

        {/* Center Banner / Image Box */}
        <div className="w-full h-80 rounded-3xl border-4 border-amber-600/40 bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 overflow-hidden flex flex-col items-center justify-center relative p-6 shadow-inner">
          <div className="text-center space-y-2 z-10">
            <span className="text-6xl">🎒 📚 🎨</span>
            <p className="text-xl font-black text-amber-950">
              मूलभूत साक्षरता व संख्याज्ञान (FLN)
            </p>
            <p className="text-xs font-bold text-amber-900 max-w-md mx-auto leading-relaxed">
              खेळ, कृती, शोध व अनुभवातून ३६० अंश सर्वांगीण प्रगतीचा सर्वसमावेशक दस्तावेज
            </p>
          </div>
          <div className="absolute inset-0 bg-white/20 backdrop-blur-2xs pointer-events-none" />
        </div>

        {/* Bottom School & Student Strip */}
        <div className="bg-white rounded-2xl border-2 border-slate-800 p-4 mt-4 flex items-center justify-between text-xs font-bold">
          <div>
            <p className="text-slate-500 text-[10px]">शाळेचे नाव:</p>
            <p className="text-sm font-black text-slate-900">{schoolName}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px]">विद्यार्थ्याचे नाव:</p>
            <p className="text-sm font-black text-indigo-900">{student.fullName || student.name}</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE 2: STUDENT INFORMATION & ATTENDANCE (सर्वसाधारण माहिती व उपस्थिती)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Header */}
        <div className="text-center border-b-2 border-blue-800 pb-3">
          <p className="text-xs font-bold text-slate-600">{schoolName}</p>
          <h2 className="text-2xl font-black text-blue-900 tracking-tight">
            समग्र प्रगती पुस्तक (HPC)
          </h2>
          <p className="text-xs font-bold text-slate-700 mt-0.5">
            वार्षिक अहवाल / सन {academicYear} / {student.gender === "female" ? "विद्यार्थिनी नमुना" : "विद्यार्थी नमुना"}
          </p>
        </div>

        {/* Student Information Box */}
        <div className="relative mt-4 border-2 border-blue-900/40 rounded-2xl p-5 bg-blue-50/20">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 space-y-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 w-24">नाव:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1 text-slate-900 pb-0.5">
                  {student.fullName || student.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 w-24">शाळेचे नाव:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1 text-slate-900 pb-0.5">
                  {schoolName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">हजेरी क्र:</span>
                  <span className="font-black text-blue-900 border-b border-dotted border-slate-600 flex-1">
                    {student.rollNo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">सरल आयडी:</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.saralId || "-"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">आधार:</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.aadhaar || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">APAAR:</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.aparId || "-"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">जन्मतारीख:</span>
                  <span className="font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.dob || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">पत्ता:</span>
                  <span className="font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1 truncate">
                    {student.address || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Box */}
            <div className="w-24 h-32 border-2 border-slate-700 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 overflow-hidden flex-shrink-0 shadow-xs">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="ID" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] font-bold text-center p-1">ID Photo</span>
              )}
            </div>
          </div>

          {/* Parents & Teacher line */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-800 w-24">पालकांचे नाव:</span>
              <span className="font-bold border-b border-dotted border-slate-600 flex-1 text-slate-900">
                {student.parentName || "-"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800">व्यवसाय:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1">
                  {student.parentOccupation || "-"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800">शिक्षण:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1">
                  {student.parentEducation || "-"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800">वर्ग शिक्षक:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1">
                  {teacherName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800">शालार्थ:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1">
                  {schoolSettings?.udiseNumber || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Annual Attendance Report (वार्षिक उपस्थिती अहवाल) */}
        <div className="mt-6">
          <h3 className="text-sm font-black text-slate-900 mb-3 border-b border-slate-300 pb-1">
            वार्षिक उपस्थिती अहवाल
          </h3>

          {/* Term 1 */}
          <p className="text-xs font-black text-blue-900 mb-1">प्रथम सत्र (Term 1):</p>
          <table className="w-full border-collapse border border-slate-400 text-xs text-center mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-slate-400 p-1.5 w-24">महिना</th>
                <th className="border border-slate-400 p-1.5">जून</th>
                <th className="border border-slate-400 p-1.5">जुलै</th>
                <th className="border border-slate-400 p-1.5">ऑगस्ट</th>
                <th className="border border-slate-400 p-1.5">सप्टेंबर</th>
                <th className="border border-slate-400 p-1.5">ऑक्टोबर</th>
                <th className="border border-slate-400 p-1.5 font-black bg-blue-50">एकूण १</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 p-1.5 font-bold">कामकाज</td>
                <td className="border border-slate-400 p-1.5">२२</td>
                <td className="border border-slate-400 p-1.5">२५</td>
                <td className="border border-slate-400 p-1.5">२४</td>
                <td className="border border-slate-400 p-1.5">२१</td>
                <td className="border border-slate-400 p-1.5">१८</td>
                <td className="border border-slate-400 p-1.5 font-bold bg-blue-50">
                  {t1.totalWorking}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 p-1.5 font-bold">उपस्थिती</td>
                <td className="border border-slate-400 p-1.5">{t1.june || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t1.july || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t1.august || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t1.september || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t1.october || "-"}</td>
                <td className="border border-slate-400 p-1.5 font-black text-blue-900 bg-blue-50">
                  {t1.totalPresent || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Term 2 */}
          <p className="text-xs font-black text-blue-900 mb-1">द्वितीय सत्र (Term 2):</p>
          <table className="w-full border-collapse border border-slate-400 text-xs text-center mb-4">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-slate-400 p-1.5 w-24">महिना</th>
                <th className="border border-slate-400 p-1.5">नोव्हें.</th>
                <th className="border border-slate-400 p-1.5">डिसें.</th>
                <th className="border border-slate-400 p-1.5">जाने.</th>
                <th className="border border-slate-400 p-1.5">फेब्रु.</th>
                <th className="border border-slate-400 p-1.5">मार्च</th>
                <th className="border border-slate-400 p-1.5">एप्रिल</th>
                <th className="border border-slate-400 p-1.5 font-black bg-blue-50">एकूण २</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-400 p-1.5 font-bold">कामकाज</td>
                <td className="border border-slate-400 p-1.5">२१</td>
                <td className="border border-slate-400 p-1.5">२३</td>
                <td className="border border-slate-400 p-1.5">२४</td>
                <td className="border border-slate-400 p-1.5">२२</td>
                <td className="border border-slate-400 p-1.5">२३</td>
                <td className="border border-slate-400 p-1.5">१६</td>
                <td className="border border-slate-400 p-1.5 font-bold bg-blue-50">
                  {t2.totalWorking}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 p-1.5 font-bold">उपस्थिती</td>
                <td className="border border-slate-400 p-1.5">{t2.november || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t2.december || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t2.january || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t2.february || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t2.march || "-"}</td>
                <td className="border border-slate-400 p-1.5">{t2.april || "-"}</td>
                <td className="border border-slate-400 p-1.5 font-black text-blue-900 bg-blue-50">
                  {t2.totalPresent || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Grand Attendance Total Box */}
          <div className="border-2 border-slate-800 rounded-2xl p-4 flex items-center justify-around font-black text-sm bg-slate-50">
            <div>
              <span>वार्षिक एकूण उपस्थिती: </span>
              <span className="text-blue-900 text-base underline underline-offset-4">
                {totalPresent} / {totalWorking} दिवस
              </span>
            </div>
            <div>
              <span>टक्केवारी (%): </span>
              <span className="text-emerald-700 text-lg">{attendancePct}%</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200">
          {schoolName} | समग्र प्रगतिपत्रक (HPC) - पायाभूत स्तर
        </div>
      </div>

      {/* =========================================================================
          PAGE 3: ME & MY SURROUNDINGS (भाग - अ (२) : मी व माझा परिसर)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Header */}
        <div className="text-center mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-rose-700">
            भाग - अ (२)
          </span>
          <div className="inline-block px-8 py-2 bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white font-black text-xl rounded-full shadow-xs mt-1">
            मी व माझा परिसर
          </div>
        </div>

        {/* Graphic Box Layout matching official Page 3 */}
        <div className="space-y-4 my-2">
          {/* Top Row: Photo Box, Age Bubble, Birthday Balloon */}
          <div className="flex items-center justify-between gap-4">
            {/* My Photo Frame */}
            <div className="w-36 h-36 border-2 border-dashed border-amber-600 rounded-2xl flex flex-col items-center justify-center p-2 relative bg-amber-50/20">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="Photo" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-xs font-black text-amber-900">माझा फोटो ★</span>
              )}
            </div>

            {/* Age & Address */}
            <div className="flex-1 text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 px-4 py-2 rounded-2xl">
                <span className="font-bold text-xs text-slate-800">माझे वय</span>
                <span className="size-8 rounded-full bg-white border border-slate-400 font-black text-sm flex items-center justify-center text-slate-900">
                  {profile?.age || "७"}
                </span>
                <span className="font-bold text-xs text-slate-800">वर्षे आहे.</span>
              </div>
              <p className="text-xs font-bold text-slate-700">
                माझ्या घराचा पत्ता:{" "}
                <span className="underline decoration-dotted font-medium">
                  {profile?.homeAddress || student.address || "गावात"}
                </span>
              </p>
            </div>

            {/* Birthday Balloon Graphic */}
            <div className="w-32 h-36 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-700 text-white flex flex-col items-center justify-center p-3 text-center shadow-sm">
              <span className="text-[10px] font-black uppercase">माझा वाढदिवस</span>
              <span className="text-xs font-black mt-1">
                {profile?.birthday || student.dob || "१५ ऑगस्ट"}
              </span>
              <span className="text-[9px] opacity-80">या दिवशी असतो.</span>
            </div>
          </div>

          {/* Middle Row: Family Box & Ambition Bubble & Friends Box */}
          <div className="grid grid-cols-3 gap-4">
            {/* Family Box */}
            <div className="border-2 border-emerald-500 rounded-2xl p-3 bg-emerald-50/30 text-xs">
              <span className="font-black text-emerald-900 block mb-1">🏡 माझे कुटुंब:</span>
              <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
                {profile?.familyDescription || "आई, वडील, आजी, आजोबा व भावंड."}
              </p>
            </div>

            {/* Ambition Bubble */}
            <div className="border-2 border-purple-500 rounded-2xl p-3 bg-purple-50/30 text-xs text-center flex flex-col justify-center">
              <span className="font-black text-purple-900 block text-xs">
                मोठे होऊन मला व्हायचे आहे:
              </span>
              <span className="text-sm font-black text-indigo-900 underline mt-1">
                {profile?.ambition || "शिक्षक / डॉक्टर / सैनिक"}
              </span>
            </div>

            {/* Friends Box */}
            <div className="border-2 border-sky-500 rounded-2xl p-3 bg-sky-50/30 text-xs">
              <span className="font-black text-sky-900 block mb-1">
                👫 हे माझे मित्र/मैत्रिणी आहेत:
              </span>
              <ul className="text-[11px] text-slate-800 list-disc list-inside space-y-0.5">
                {(profile?.friends && profile.friends.length > 0
                  ? profile.friends
                  : ["राहुल", "स्नेहा", "अमित"]
                ).map((fr, idx) => (
                  <li key={idx}>{fr}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Favorites Strip (माझा आवडता) */}
          <div className="border-2 border-amber-300 rounded-2xl p-3 bg-amber-50/20">
            <span className="text-xs font-black text-amber-900 block mb-2">★ माझा आवडता:</span>
            <div className="grid grid-cols-6 gap-2 text-center text-xs">
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">🎨 रंग</span>
                <b className="text-slate-900 text-xs">{profile?.favoriteColor || "निळा"}</b>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">🌸 फूल</span>
                <b className="text-slate-900 text-xs">{profile?.favoriteFlower || "गुलाब"}</b>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">🍲 अन्नपदार्थ</span>
                <b className="text-slate-900 text-xs">{profile?.favoriteFood || "वरणभात"}</b>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">⚽ खेळ</span>
                <b className="text-slate-900 text-xs">{profile?.favoriteGame || "लपंडाव"}</b>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">🐘 प्राणी</span>
                <b className="text-slate-900 text-xs">{profile?.favoriteAnimal || "मांजर"}</b>
              </div>
              <div className="p-1.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block">📚 विषय</span>
                <b className="text-slate-900 text-xs">{profile?.favoriteSubject || "भाषा"}</b>
              </div>
            </div>
          </div>

          {/* Hobbies Checkbox Grid (माझी आवड आहे) */}
          <div className="border-2 border-rose-300 rounded-2xl p-3 bg-rose-50/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-rose-900">माझी आवड आहे:</span>
              <span className="text-[10px] text-slate-500">
                (एकापेक्षा जास्त पर्याय निवडू शकता. पर्यायाच्या चौकटीवर (✓) अशी खूण करावी.)
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[
                "वाचन",
                "नृत्य",
                "गायन",
                "वादन",
                "क्रीडा किंवा खेळ",
                "सर्जनशील लेखन",
                "बागकाम",
                "योगाभ्यास",
                "कला",
                "हस्तकला",
                "पाककला",
                "इतर",
              ].map((h) => {
                const checked = (profile?.hobbies || ["वाचन", "क्रीडा किंवा खेळ", "कला"]).includes(
                  h
                );
                return (
                  <div
                    key={h}
                    className="flex items-center justify-between p-1 px-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <span>{h}</span>
                    <span className="font-bold text-rose-600">{checked ? "☑" : "☐"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regular Chores Box */}
          <div className="border-2 border-slate-300 rounded-2xl p-3 bg-slate-50 text-xs">
            <span className="font-black text-slate-800 block mb-1">
              इतर व्यक्तींसोबत (वडील, आई, पालक, भावंड इ.) घरातील खालील कामे नियमित करतो/करते:
            </span>
            <p className="text-[11px] text-slate-700 italic border-b border-dotted border-slate-400 pb-1">
              {profile?.regularHomeChores ||
                "स्वतःचे दप्तर जागेवर ठेवणे, जेवणानंतर ताट उचलून ठेवणे, झाडांना पाणी देणे."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
          पृष्ठ क्र. २ | {schoolName}
        </div>
      </div>

      {/* =========================================================================
          PAGES 4 TO 15: THE 6 DEVELOPMENTAL AREAS (प्रथम सत्र व द्वितीय सत्र)
      ========================================================================= */}
      {FOUNDATIONAL_AREAS.map((area, areaIndex) => {
        const areaGoals = getGoalsForArea(area.id, "foundational");

        // Two pages per area: Session 1 (Page A) and Session 2 (Page B)
        return (["session1", "session2"] as const).map((sess) => {
          const currentAssessment =
            sess === "session1"
              ? session1?.areaAssessments?.[area.id]
              : session2?.areaAssessments?.[area.id];

          const sessLabel = sess === "session1" ? "प्रथम सत्र" : "द्वितीय सत्र";
          const sessTitle = sess === "session1" ? "सत्र पहिले" : "सत्र दुसरे";

          // Core Rubric Levels selected
          const awLvl = currentAssessment?.awarenessLevel || "proficient";
          const seLvl = currentAssessment?.sensitivityLevel || "proficient";
          const crLvl = currentAssessment?.creativityLevel || "proficient";

          return (
            <div
              key={`${area.id}_${sess}`}
              className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-6 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border"
            >
              {/* Top Banner Header */}
              <div className="text-center bg-blue-900 text-white py-2 rounded-2xl shadow-sm">
                <h3 className="text-base font-black tracking-wide">
                  {area.code}: {area.nameMarathi} ({sessLabel})
                </h3>
              </div>

              {/* Sub-Activities Box */}
              <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-3 my-2 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-sky-900">
                    सविस्तर उपक्रम व कृती (१०-१२ ओळी):
                  </span>
                  <span className="font-black text-[11px] text-sky-800 bg-sky-200 px-2 py-0.5 rounded-full">
                    स्तर: प्रयत्नस्त / प्रगत
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-800">
                  <div className="bg-white p-2 rounded-xl border border-sky-100">
                    <p className="font-black text-sky-950">
                      उपक्रम: {currentAssessment?.activity1Title || "दैनंदिन कृती व सराव"}
                    </p>
                    <p className="text-slate-600 line-clamp-2">
                      निष्पत्ती: {currentAssessment?.activity1Outcome || "सहकार्य व कौशल्य विकास होतो."}
                    </p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-sky-100">
                    <p className="font-black text-sky-950">
                      उपक्रम: {currentAssessment?.activity2Title || "खेळ व उपक्रम"}
                    </p>
                    <p className="text-slate-600 line-clamp-2">
                      निष्पत्ती: {currentAssessment?.activity2Outcome || "विद्यार्थ्यांची आवड व सहभाग वाढतो."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Curricular Goals & Competency Box */}
              <div className="border border-rose-300 rounded-2xl p-3 bg-rose-50/20 text-xs">
                <div className="text-center font-black text-rose-950 mb-1 border-b border-rose-200 pb-1">
                  {area.code} : विकास क्षेत्र / विषय - {area.nameMarathi}
                </div>
                <div className="font-bold text-slate-800 mb-1">अभ्यासक्रमाची ध्येये (CG):</div>
                <div className="space-y-1 text-[11px]">
                  {areaGoals.map((g) => (
                    <div key={g.id} className="flex items-center justify-between">
                      <span>
                        <b>{g.code}*:</b> {g.titleMarathi}
                      </span>
                      <span className="font-bold text-rose-700">☑</span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-rose-200 flex items-center justify-between">
                  <span className="font-black text-rose-900">{sessTitle}</span>
                  <span className="text-[11px] font-bold text-slate-700">
                    क्षमता**: {currentAssessment?.selectedCompetencyIds?.join(", ") || "सर्वसमावेशक"}
                  </span>
                </div>
              </div>

              {/* Dimensions Rubric Table (प्रवाह, पर्वत, आकाश) */}
              <table className="w-full border-collapse border border-slate-300 text-[10px] text-left my-2">
                <thead>
                  <tr className="bg-blue-50 text-center font-black text-slate-800">
                    <th className="border border-slate-300 p-1.5 w-24">पैलू</th>
                    <th className="border border-slate-300 p-1.5">प्रवाह (निर्झर)</th>
                    <th className="border border-slate-300 p-1.5">पर्वत</th>
                    <th className="border border-slate-300 p-1.5">आकाश</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Awareness Row */}
                  <tr>
                    <td className="border border-slate-300 p-2 font-black bg-slate-50 text-blue-900">
                      जाणीव जागृती
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        awLvl === "beginner" ? "bg-amber-100 font-bold border-2 border-amber-600" : ""
                      }`}
                    >
                      {awLvl === "beginner" && "✓ "}
                      {HPC_CORE_RUBRICS.awareness.levels.beginner.shortDesc}
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        awLvl === "proficient" ? "bg-emerald-100 font-bold border-2 border-emerald-600" : ""
                      }`}
                    >
                      {awLvl === "proficient" && "✓ "}
                      {HPC_CORE_RUBRICS.awareness.levels.proficient.shortDesc}
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        awLvl === "advanced" ? "bg-blue-100 font-bold border-2 border-blue-600" : ""
                      }`}
                    >
                      {awLvl === "advanced" && "✓ "}
                      {HPC_CORE_RUBRICS.awareness.levels.advanced.shortDesc}
                    </td>
                  </tr>

                  {/* Sensitivity Row */}
                  <tr>
                    <td className="border border-slate-300 p-2 font-black bg-slate-50 text-rose-900">
                      संवेदनशीलता
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        seLvl === "beginner" ? "bg-amber-100 font-bold border-2 border-amber-600" : ""
                      }`}
                    >
                      {seLvl === "beginner" && "✓ "}
                      {HPC_CORE_RUBRICS.sensitivity.levels.beginner.shortDesc}
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        seLvl === "proficient" ? "bg-emerald-100 font-bold border-2 border-emerald-600" : ""
                      }`}
                    >
                      {seLvl === "proficient" && "✓ "}
                      {HPC_CORE_RUBRICS.sensitivity.levels.proficient.shortDesc}
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        seLvl === "advanced" ? "bg-blue-100 font-bold border-2 border-blue-600" : ""
                      }`}
                    >
                      {seLvl === "advanced" && "✓ "}
                      {HPC_CORE_RUBRICS.sensitivity.levels.advanced.shortDesc}
                    </td>
                  </tr>

                  {/* Creativity Row */}
                  <tr>
                    <td className="border border-slate-300 p-2 font-black bg-slate-50 text-purple-900">
                      सर्जनशीलता
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        crLvl === "beginner" ? "bg-amber-100 font-bold border-2 border-amber-600" : ""
                      }`}
                    >
                      {crLvl === "beginner" && "✓ "}
                      {HPC_CORE_RUBRICS.creativity.levels.beginner.shortDesc}
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        crLvl === "proficient" ? "bg-emerald-100 font-bold border-2 border-emerald-600" : ""
                      }`}
                    >
                      {crLvl === "proficient" && "✓ "}
                      {HPC_CORE_RUBRICS.creativity.levels.proficient.shortDesc}
                    </td>
                    <td
                      className={`border border-slate-300 p-2 leading-relaxed ${
                        crLvl === "advanced" ? "bg-blue-100 font-bold border-2 border-blue-600" : ""
                      }`}
                    >
                      {crLvl === "advanced" && "✓ "}
                      {HPC_CORE_RUBRICS.creativity.levels.advanced.shortDesc}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 360-Degree Feedback 4 Boxes */}
              <div className="grid grid-cols-2 gap-3 text-xs my-2">
                {/* 1. Self */}
                <div className="border border-indigo-200 rounded-xl p-2.5 bg-indigo-50/20">
                  <span className="font-black text-indigo-900 block mb-0.5 text-[11px]">
                    स्वयं मूल्यमापन ({sessTitle}):
                  </span>
                  <p className="text-[11px] text-slate-800">
                    {currentAssessment?.threeSixty?.selfAssessment?.customRemark ||
                      "मला काम करायला आवडले व सोपे वाटले."}
                  </p>
                </div>

                {/* 2. Peer */}
                <div className="border border-teal-200 rounded-xl p-2.5 bg-teal-50/20">
                  <span className="font-black text-teal-900 block mb-0.5 text-[11px]">
                    सहकारी मूल्यमापन ({sessTitle}):
                  </span>
                  <p className="text-[11px] text-slate-800">
                    {currentAssessment?.threeSixty?.peerAssessment?.peerRemarks ||
                      "याचे काम छान असते, आम्ही सोबत खेळतो."}
                  </p>
                </div>

                {/* 3. Parent */}
                <div className="border border-amber-200 rounded-xl p-2.5 bg-amber-50/20">
                  <span className="font-black text-amber-900 block mb-0.5 text-[11px]">
                    पालक मूल्यमापन ({sessTitle}):
                  </span>
                  <p className="text-[11px] text-slate-800">
                    {currentAssessment?.threeSixty?.parentFeedback?.parentObservations ||
                      "वागण्यात सुधारणा दिसून येत आहे."}
                  </p>
                </div>

                {/* 4. Teacher */}
                <div className="border border-purple-200 rounded-xl p-2.5 bg-purple-50/20">
                  <span className="font-black text-purple-900 block mb-0.5 text-[11px]">
                    शिक्षक मूल्यमापन ({sessTitle}):
                  </span>
                  <p className="text-[11px] text-slate-800">
                    {currentAssessment?.threeSixty?.teacherRemarks?.observation ||
                      "खेळातून शिकतो, नियमित उपस्थिती ठेवावी."}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                {schoolName} | {area.nameMarathi} ({sessLabel})
              </div>
            </div>
          );
        });
      })}

      {/* =========================================================================
          PAGE 16: FINAL ANNUAL REMARKS & SIGNATURES (शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-10 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Header */}
        <div className="text-center border-b border-slate-200 pb-4">
          <p className="text-xs font-bold text-slate-500">{schoolName}</p>
          <h2 className="text-2xl font-black text-blue-900 tracking-tight mt-1">
            शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय
          </h2>
        </div>

        {/* Big Remarks Card matching official Page 16 */}
        <div className="my-8 flex-1 flex flex-col justify-center">
          <div className="border-4 border-blue-900/30 rounded-3xl p-8 bg-blue-50/10 space-y-6 text-sm leading-relaxed text-slate-800">
            <p className="font-medium text-base">
              {annualSummary?.finalTeacherRemarks ||
                "विद्यार्थ्याचा संकोची स्वभाव आणि एकाग्रतेची कमतरता यामुळे प्रारंभी प्रगती मंदावली असली तरी प्रेमाने आणि खेळाच्या माध्यमातून शिकवल्याने लक्षणीय सुधारणा झाली आहे."}
            </p>

            <p className="font-medium text-base">
              सामाजिक क्षेत्रात त्याने/तिने मित्र-मैत्रिणींशी जुळवून घेण्याची वृत्ती विकसित केली असून गटात सहकार्याने वागणे चांगले जमते. विद्यार्थ्याची एकंदर प्रगती समाधानकारक असून भविष्यासाठी महत्त्वाची ठरेल.
            </p>

            <p className="font-black text-lg text-indigo-950 pt-4">
              पुढील इयत्तेत यशस्वी प्रगती करण्यासाठी मनःपूर्वक शुभेच्छा!
            </p>
          </div>
        </div>

        {/* Signatures Row */}
        <div className="grid grid-cols-3 gap-6 pt-12 pb-6 border-t-2 border-slate-300 text-center text-xs font-black">
          <div>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className="text-[11px] text-slate-400 italic">{teacherName}</span>
            </div>
            <div className="border-t-2 border-slate-800 pt-2 text-slate-900">
              वर्गशिक्षकेची स्वाक्षरी
            </div>
          </div>

          <div>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className="text-[11px] text-slate-400 italic">शिक्का व स्वाक्षरी</span>
            </div>
            <div className="border-t-2 border-slate-800 pt-2 text-slate-900">
              मुख्याध्यापक शिक्का
            </div>
          </div>

          <div>
            <div className="h-12 flex items-end justify-center pb-1">
              <span className="text-[11px] text-slate-400 italic">स्वाक्षरी</span>
            </div>
            <div className="border-t-2 border-slate-800 pt-2 text-slate-900">
              पालकाची स्वाक्षरी
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
          {schoolName} | समग्र प्रगतिपत्रक (HPC) पायाभूत स्तर — अंतिम पान
        </div>
      </div>
    </div>
  );
}
