import React from "react";
import { StudentInfoSummary } from "../services/hpcService";
import {
  HpcStudentProfile,
  HpcSessionAssessment,
  HpcAnnualSummary,
} from "../types/hpc";
import {
  PREPARATORY_AREAS,
  getGoalsForArea,
} from "../data/hpcCurricularGoals";
import { HPC_CORE_RUBRICS } from "../data/hpcRubrics";

interface PreparatoryHpcPdfProps {
  student: StudentInfoSummary;
  schoolSettings?: any;
  profile?: HpcStudentProfile | null;
  session1?: HpcSessionAssessment | null;
  session2?: HpcSessionAssessment | null;
  annualSummary?: HpcAnnualSummary | null;
  attendance?: any;
  academicYear?: string;
}

export function PreparatoryHpcPdf({
  student,
  schoolSettings = {},
  profile,
  session1,
  session2,
  annualSummary,
  attendance,
  academicYear = "२०२५ - २०२६",
}: PreparatoryHpcPdfProps) {
  const schoolName =
    schoolSettings?.schoolName ||
    schoolSettings?.name ||
    student?.schoolName ||
    "जिल्हा परिषद प्राथमिक शाळा";

  const teacherName =
    schoolSettings?.classTeacher ||
    schoolSettings?.teacherName ||
    student?.teacherName ||
    "वर्ग शिक्षक";

  const hmName = schoolSettings?.headMaster || "मुख्याध्यापक";

  const t1 = attendance?.term1 || { totalWorking: 110, totalPresent: 0 };
  const t2 = attendance?.term2 || { totalWorking: 115, totalPresent: 0 };
  const totalWorking = attendance?.annualTotalWorking || 225;
  const totalPresent = attendance?.annualTotalPresent || (t1.totalPresent + t2.totalPresent);
  const attendancePct = attendance?.attendancePercentage || "0.0";

  return (
    <div className="hpc-pdf-document font-sans text-slate-900 bg-white">
      {/* =========================================================================
          PAGE 1: COVER & STUDENT PROFILE & ATTENDANCE
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Top Header */}
        <div className="text-center border-b-2 border-emerald-800 pb-3">
          <p className="text-xs font-black tracking-widest text-emerald-800 uppercase">
            महाराष्ट्र शासन | राज्य शैक्षणिक संशोधन व प्रशिक्षण परिषद, महाराष्ट्र, पुणे
          </p>
          <h1 className="text-3xl font-black text-emerald-950 tracking-tight mt-1">
            समग्र प्रगतिपत्रक (HPC)
          </h1>
          <h2 className="text-xl font-black text-slate-800">
            पूर्वतयारी स्तर (Preparatory Stage) — इयत्ता ३ री ते ५ वी
          </h2>
          <p className="text-xs font-bold text-slate-600 mt-0.5">
            वार्षिक अहवाल / शैक्षणिक वर्ष: {academicYear}
          </p>
        </div>

        {/* Student Profile Card */}
        <div className="border-2 border-emerald-800/30 rounded-2xl p-5 bg-emerald-50/20 my-3">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 w-24">विद्यार्थ्याचे नाव:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1 text-slate-900">
                  {student.fullName || student.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">इयत्ता व तुकडी:</span>
                  <span className="font-black text-emerald-900 border-b border-dotted border-slate-600 flex-1">
                    {student.class || "इयत्ता ३ री"} / {student.division || "अ"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">हजेरी क्रमांक:</span>
                  <span className="font-black text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.rollNo}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">सरल आयडी:</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.saralId || "-"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-800">आधार क्रमांक:</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.aadhaar || "-"}
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
                  <span className="font-black text-slate-800">APAAR ID:</span>
                  <span className="font-mono font-bold text-slate-900 border-b border-dotted border-slate-600 flex-1">
                    {student.aparId || "-"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 w-24">शाळेचे नाव:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1 text-slate-900">
                  {schoolName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-800 w-24">पालकांचे नाव:</span>
                <span className="font-bold border-b border-dotted border-slate-600 flex-1 text-slate-900">
                  {student.parentName || "-"}
                </span>
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
        </div>

        {/* Part A: Personal Reflection & Interests */}
        <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 my-2 space-y-2 text-xs">
          <span className="font-black text-slate-900 block border-b border-slate-200 pb-1">
            भाग अ: विद्यार्थी वैयक्तिक विचार व उद्दिष्टे (Part A: Personal Reflection)
          </span>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="font-bold text-slate-600">ध्येय / मोठे होऊन मला व्हायचे आहे: </span>
              <b className="text-emerald-900">{profile?.ambition || "शास्त्रज्ञ / शिक्षक"}</b>
            </div>
            <div>
              <span className="font-bold text-slate-600">माझे आवडते विषय व खेळ: </span>
              <b className="text-slate-900">
                {profile?.favoriteSubject || "गणित"}, {profile?.favoriteGame || "खो-खो"}
              </b>
            </div>
          </div>
          <div>
            <span className="font-bold text-slate-600">माझी आवड (छंद): </span>
            <span className="font-medium text-slate-800">
              {(profile?.hobbies || ["वाचन", "चित्रकला", "खेळ"]).join(", ")}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-600">विद्यार्थी स्वतःच्या प्रगतीविषयी नोंद: </span>
            <span className="font-medium text-slate-800 italic">
              {profile?.studentSelfReflection || "मी दररोज नियमित अभ्यास करतो व मित्रांना मदत करतो."}
            </span>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="border-2 border-slate-800 rounded-2xl p-3 bg-white text-xs flex items-center justify-around font-black">
          <div>
            <span>सत्र १ उपस्थिती: </span>
            <span className="text-emerald-800">
              {t1.totalPresent} / {t1.totalWorking} दिवस
            </span>
          </div>
          <div>
            <span>सत्र २ उपस्थिती: </span>
            <span className="text-emerald-800">
              {t2.totalPresent} / {t2.totalWorking} दिवस
            </span>
          </div>
          <div>
            <span>एकूण टक्केवारी: </span>
            <span className="text-blue-900 text-sm">{attendancePct}%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200">
          {schoolName} | पूर्वतयारी स्तर समग्र प्रगतिपत्रक — पृष्ठ १
        </div>
      </div>

      {/* =========================================================================
          PAGES: SUBJECT-WISE ASSESSMENT (PART B)
      ========================================================================= */}
      {PREPARATORY_AREAS.map((subj, idx) => {
        const s1Assessment = session1?.areaAssessments?.[subj.id];
        const s2Assessment = session2?.areaAssessments?.[subj.id];
        const areaGoals = getGoalsForArea(subj.id, "preparatory");

        return (
          <div
            key={subj.id}
            className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-7 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border"
          >
            {/* Header */}
            <div className="text-center bg-emerald-900 text-white py-2 rounded-2xl shadow-sm">
              <h3 className="text-base font-black tracking-wide">
                भाग ब: विषय - {subj.nameMarathi}
              </h3>
            </div>

            {/* Goals & Competencies */}
            <div className="border border-slate-300 rounded-2xl p-3 bg-slate-50 my-2 text-xs space-y-1.5">
              <span className="font-black text-emerald-950 block border-b border-slate-200 pb-1">
                अभ्यासक्रमाची ध्येये व क्षमता (Curricular Goals & Competencies):
              </span>
              {areaGoals.map((g) => (
                <div key={g.id} className="text-[11px] flex justify-between">
                  <span>
                    <b>{g.code}:</b> {g.titleMarathi}
                  </span>
                  <span className="font-bold text-emerald-700">☑</span>
                </div>
              ))}
            </div>

            {/* Two Sessions Side-by-Side or Stacked */}
            <div className="grid grid-cols-2 gap-4 flex-1 my-1">
              {/* Session 1 */}
              <div className="border-2 border-slate-300 rounded-2xl p-3 bg-white flex flex-col justify-between text-xs space-y-2">
                <div>
                  <span className="font-black text-blue-900 block bg-blue-50 p-1.5 rounded-lg text-center mb-2">
                    प्रथम सत्र (Session 1)
                  </span>

                  <div className="space-y-1.5 text-[11px]">
                    <p>
                      <b>उपक्रम:</b> {s1Assessment?.activity1Title || "प्रात्यक्षिक व गटचर्चा"}
                    </p>
                    <p className="text-slate-600 line-clamp-2">
                      <b>निष्पत्ती:</b> {s1Assessment?.activity1Outcome || "संकल्पना स्पष्ट होऊन सराव होतो."}
                    </p>
                  </div>

                  {/* 3 Dimensions Levels */}
                  <div className="mt-3 border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between items-center bg-blue-50/50 p-1 rounded-md">
                      <span>जाणीवजागृती:</span>
                      <b className="text-blue-900">
                        {s1Assessment?.awarenessLevel === "advanced"
                          ? "प्रगत"
                          : s1Assessment?.awarenessLevel === "proficient"
                          ? "प्रवीण"
                          : "प्रारंभिक"}
                      </b>
                    </div>
                    <div className="flex justify-between items-center bg-rose-50/50 p-1 rounded-md">
                      <span>संवेदनशीलता:</span>
                      <b className="text-rose-900">
                        {s1Assessment?.sensitivityLevel === "advanced"
                          ? "प्रगत"
                          : s1Assessment?.sensitivityLevel === "proficient"
                          ? "प्रवीण"
                          : "प्रारंभिक"}
                      </b>
                    </div>
                    <div className="flex justify-between items-center bg-purple-50/50 p-1 rounded-md">
                      <span>सर्जनशीलता:</span>
                      <b className="text-purple-900">
                        {s1Assessment?.creativityLevel === "advanced"
                          ? "प्रगत"
                          : s1Assessment?.creativityLevel === "proficient"
                          ? "प्रवीण"
                          : "प्रारंभिक"}
                      </b>
                    </div>
                  </div>
                </div>

                {/* 360 Feedback S1 */}
                <div className="border-t border-slate-200 pt-2 text-[10px] space-y-1">
                  <p>
                    <b>स्वयं मूल्यमापन:</b> {s1Assessment?.threeSixty?.selfAssessment?.customRemark || "काम आवडले व सोपे वाटले."}
                  </p>
                  <p>
                    <b>सहाध्यायी अभिप्राय:</b> {s1Assessment?.threeSixty?.peerAssessment?.peerRemarks || "गटात सहकार्याने काम केले."}
                  </p>
                  <p>
                    <b>शिक्षक शेरा:</b> {s1Assessment?.threeSixty?.teacherRemarks?.observation || "चांगली प्रगती आहे."}
                  </p>
                </div>
              </div>

              {/* Session 2 */}
              <div className="border-2 border-slate-300 rounded-2xl p-3 bg-white flex flex-col justify-between text-xs space-y-2">
                <div>
                  <span className="font-black text-emerald-900 block bg-emerald-50 p-1.5 rounded-lg text-center mb-2">
                    द्वितीय सत्र (Session 2)
                  </span>

                  <div className="space-y-1.5 text-[11px]">
                    <p>
                      <b>उपक्रम:</b> {s2Assessment?.activity1Title || "स्वाध्याय व प्रकल्प सादरीकरण"}
                    </p>
                    <p className="text-slate-600 line-clamp-2">
                      <b>निष्पत्ती:</b> {s2Assessment?.activity1Outcome || "ज्ञान उपयोजन व आत्मविश्वासात वाढ."}
                    </p>
                  </div>

                  {/* 3 Dimensions Levels */}
                  <div className="mt-3 border-t border-slate-200 pt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between items-center bg-blue-50/50 p-1 rounded-md">
                      <span>जाणीवजागृती:</span>
                      <b className="text-blue-900">
                        {s2Assessment?.awarenessLevel === "advanced"
                          ? "प्रगत"
                          : s2Assessment?.awarenessLevel === "proficient"
                          ? "प्रवीण"
                          : "प्रारंभिक"}
                      </b>
                    </div>
                    <div className="flex justify-between items-center bg-rose-50/50 p-1 rounded-md">
                      <span>संवेदनशीलता:</span>
                      <b className="text-rose-900">
                        {s2Assessment?.sensitivityLevel === "advanced"
                          ? "प्रगत"
                          : s2Assessment?.sensitivityLevel === "proficient"
                          ? "प्रवीण"
                          : "प्रारंभिक"}
                      </b>
                    </div>
                    <div className="flex justify-between items-center bg-purple-50/50 p-1 rounded-md">
                      <span>सर्जनशीलता:</span>
                      <b className="text-purple-900">
                        {s2Assessment?.creativityLevel === "advanced"
                          ? "प्रगत"
                          : s2Assessment?.creativityLevel === "proficient"
                          ? "प्रवीण"
                          : "प्रारंभिक"}
                      </b>
                    </div>
                  </div>
                </div>

                {/* 360 Feedback S2 */}
                <div className="border-t border-slate-200 pt-2 text-[10px] space-y-1">
                  <p>
                    <b>स्वयं मूल्यमापन:</b> {s2Assessment?.threeSixty?.selfAssessment?.customRemark || "नवीन बाबी शिकायला आवडल्या."}
                  </p>
                  <p>
                    <b>सहाध्यायी अभिप्राय:</b> {s2Assessment?.threeSixty?.peerAssessment?.peerRemarks || "अतिशय छान काम केले."}
                  </p>
                  <p>
                    <b>शिक्षक शेरा:</b> {s2Assessment?.threeSixty?.teacherRemarks?.observation || "सातत्यपूर्ण प्रगती."}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-slate-200">
              {schoolName} | पूर्वतयारी स्तर — {subj.nameMarathi}
            </div>
          </div>
        );
      })}

      {/* =========================================================================
          PAGE: ANNUAL SUMMARY & FINAL REMARKS (PART C)
      ========================================================================= */}
      <div className="pdf-page w-[794px] h-[1123px] max-h-[1123px] overflow-hidden p-8 mx-auto bg-white flex flex-col justify-between border border-slate-300 relative box-border">
        {/* Header */}
        <div className="text-center border-b border-slate-200 pb-3">
          <p className="text-xs font-bold text-slate-500">{schoolName}</p>
          <h2 className="text-2xl font-black text-emerald-950 tracking-tight mt-1">
            भाग क: वार्षिक प्रगती गोषवारा व शिक्षक अभिप्राय
          </h2>
          <p className="text-xs font-bold text-slate-600">
            {student.fullName || student.name} | इयत्ता {student.class || "३ री"} | {academicYear}
          </p>
        </div>

        {/* Subject-wise Annual Levels Table */}
        <div className="my-4">
          <h4 className="text-xs font-black text-slate-900 mb-2">
            विषयनिहाय वार्षिक संपादन स्तर व गुणात्मक शेरे:
          </h4>
          <table className="w-full border-collapse border border-slate-400 text-xs text-left">
            <thead>
              <tr className="bg-emerald-50 text-emerald-950 font-black">
                <th className="border border-slate-400 p-2 w-12 text-center">अ.क्र.</th>
                <th className="border border-slate-400 p-2">विषय</th>
                <th className="border border-slate-400 p-2 w-32 text-center">संपादन स्तर</th>
                <th className="border border-slate-400 p-2">गुणात्मक निरीक्षण व प्रगती</th>
              </tr>
            </thead>
            <tbody>
              {PREPARATORY_AREAS.map((subj, sIdx) => {
                const summ = annualSummary?.areaSummaries?.[subj.id];
                const lvl = summ?.finalLevel === "advanced" ? "प्रगत" : summ?.finalLevel === "beginner" ? "प्रारंभिक" : "प्रवीण";

                return (
                  <tr key={subj.id} className="even:bg-slate-50">
                    <td className="border border-slate-400 p-2 text-center font-bold">{sIdx + 1}</td>
                    <td className="border border-slate-400 p-2 font-bold">{subj.nameMarathi}</td>
                    <td className="border border-slate-400 p-2 text-center font-black text-emerald-900 bg-emerald-50/50">
                      {lvl}
                    </td>
                    <td className="border border-slate-400 p-2 text-[11px] font-medium text-slate-800">
                      {summ?.qualitativeRemarks || "विषयातील मूलभूत संकल्पना स्पष्ट असून प्रगती समाधानकारक आहे."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Final Remarks Box */}
        <div className="border-2 border-emerald-900/30 rounded-2xl p-6 bg-emerald-50/15 space-y-4 my-2 text-xs">
          <div>
            <span className="font-black text-sm text-emerald-950 block mb-1">
              शिक्षकांचा अंतिम सर्वंकष वार्षिक अभिप्राय:
            </span>
            <p className="text-sm font-medium leading-relaxed text-slate-800">
              {annualSummary?.finalTeacherRemarks ||
                "विद्यार्थ्याने शैक्षणिक व सहशालेय उपक्रमांत उत्साहाने सहभाग नोंदविला आहे. विचार मांडण्याचा आत्मविश्वास वाढला असून सहकाऱ्यांशी उत्तम समन्वय साधतो. पुढील इयत्तेत यशस्वी प्रगतीसाठी मनःपूर्वक शुभेच्छा!"}
            </p>
          </div>

          <div>
            <span className="font-bold text-slate-700">पुढील इयत्तेसाठी शिफारस: </span>
            <b className="text-slate-900">
              {annualSummary?.recommendationsForNextClass || "पुढील इयत्तेत प्रवेशास पात्र."}
            </b>
          </div>
        </div>

        {/* Signatures Row */}
        <div className="grid grid-cols-3 gap-6 pt-10 pb-4 border-t-2 border-slate-300 text-center text-xs font-black">
          <div>
            <div className="h-10 flex items-end justify-center pb-1">
              <span className="text-[11px] text-slate-400 italic">{teacherName}</span>
            </div>
            <div className="border-t-2 border-slate-800 pt-2 text-slate-900">
              वर्गशिक्षकाची स्वाक्षरी
            </div>
          </div>

          <div>
            <div className="h-10 flex items-end justify-center pb-1">
              <span className="text-[11px] text-slate-400 italic">{hmName}</span>
            </div>
            <div className="border-t-2 border-slate-800 pt-2 text-slate-900">
              मुख्याध्यापक शिक्का व सही
            </div>
          </div>

          <div>
            <div className="h-10 flex items-end justify-center pb-1">
              <span className="text-[11px] text-slate-400 italic">स्वाक्षरी</span>
            </div>
            <div className="border-t-2 border-slate-800 pt-2 text-slate-900">
              पालकाची स्वाक्षरी
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 pt-1 border-t border-slate-100">
          {schoolName} | समग्र प्रगतिपत्रक पूर्वतयारी स्तर — अंतिम पान
        </div>
      </div>
    </div>
  );
}
