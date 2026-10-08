import React, { forwardRef } from "react";
import { Sparkles, Calendar } from "lucide-react";
import type { MCQHomeworkSet, LocalMCQSubmission } from "@/types/mcqHomework";
import logoImg from "@/assets/logo.jpeg";

export interface MCQPrintDocumentProps {
  quiz: MCQHomeworkSet;
  submission?: LocalMCQSubmission | null;
  studentName?: string;
}

export const MCQPrintDocument = forwardRef<HTMLDivElement, MCQPrintDocumentProps>(
  ({ quiz, submission, studentName }, ref) => {
    const totalMarks = submission ? submission.totalMarks : quiz.totalMarks || quiz.questions?.length || 1;
    const score = submission ? submission.score : 0;
    const percentage = submission
      ? submission.percentage
      : Math.round((score / (totalMarks || 1)) * 100);

    const gradeText =
      percentage >= 90
        ? "A+ (उत्कृष्ट / Outstanding)"
        : percentage >= 75
        ? "A (फार छान / Distinction)"
        : percentage >= 60
        ? "B+ (छान / First Class)"
        : percentage >= 40
        ? "B (उत्तीर्ण / Pass)"
        : "सराव आवश्यक (Keep Practicing)";

    const formattedDate = quiz.date || new Date().toISOString().split("T")[0];

    return (
      <div
        ref={ref}
        id="mcq-scorecard-report"
        style={{
          width: "840px",
          minHeight: "580px",
          background: "#fffdf9",
          color: "#0f172a",
          boxSizing: "border-box",
        }}
        className="relative mx-auto rounded-3xl p-8 sm:p-10 shadow-none border-[6px] border-[#d97706] font-sans overflow-hidden"
      >
        {/* Inner Ornate Gold Border */}
        <div
          style={{
            borderColor: "#b45309",
          }}
          className="absolute inset-3 border-2 border-dashed rounded-2xl pointer-events-none opacity-40"
        />

        {/* Corner Flourish Elements (SVG Ornaments) */}
        <svg
          className="absolute top-2 left-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
          viewBox="0 0 100 100"
        >
          <path d="M 5,5 L 5,45 C 5,25 25,5 45,5 Z" fill="currentColor" />
          <circle cx="15" cy="15" r="4" fill="currentColor" />
        </svg>

        <svg
          className="absolute top-2 right-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
          viewBox="0 0 100 100"
        >
          <path d="M 95,5 L 95,45 C 95,25 75,5 55,5 Z" fill="currentColor" />
          <circle cx="85" cy="15" r="4" fill="currentColor" />
        </svg>

        <svg
          className="absolute bottom-2 left-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
          viewBox="0 0 100 100"
        >
          <path d="M 5,95 L 5,55 C 5,75 25,95 45,95 Z" fill="currentColor" />
          <circle cx="15" cy="85" r="4" fill="currentColor" />
        </svg>

        <svg
          className="absolute bottom-2 right-2 w-16 h-16 pointer-events-none text-amber-600 opacity-60"
          viewBox="0 0 100 100"
        >
          <path d="M 95,95 L 95,55 C 95,75 75,95 55,95 Z" fill="currentColor" />
          <circle cx="85" cy="85" r="4" fill="currentColor" />
        </svg>

        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035]">
          <span className="text-[120px] font-black tracking-widest text-slate-900 select-none">
            BRAINOVA
          </span>
        </div>

        {/* Certificate Content */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          {/* Header: Logo + Organization + Official Link */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-amber-200/80">
            <div className="flex items-center gap-3">
              <img
                src={logoImg}
                alt="SGK Brainova"
                className="w-12 h-12 rounded-xl object-cover shadow-sm border border-amber-300"
              />
              <div className="text-left">
                <span className="text-[11px] font-black tracking-widest uppercase text-amber-800 block">
                  SMART LEARNING WITH AI
                </span>
                <span className="text-base font-extrabold text-slate-900 block leading-tight">
                  SGK BRAINOVA DIGITAL ACADEMY
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                अधिकृत संकेतस्थळ (Official Portal)
              </span>
              <span className="text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-xs">
                🌐 sgkbrainova.com
              </span>
            </div>
          </div>

          {/* Certificate Header Banner */}
          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white text-xs sm:text-sm font-black uppercase tracking-[0.25em] shadow-md">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>गुणवत्ता प्रमाणपत्र • CERTIFICATE OF ACHIEVEMENT</span>
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-600 font-medium italic pt-1">
            हे प्रमाणपत्र अभिमानाने व सन्मानपूर्वक प्रमाणित करते की,
          </p>

          {/* Student Name */}
          <div className="w-full max-w-xl py-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-950 tracking-wide font-serif">
              {studentName || "विद्यार्थी"}
            </h1>
            <div className="h-1 w-48 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-full mt-2" />
          </div>

          {/* Body Description */}
          <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
            यांनी <span className="font-bold text-slate-900">“{quiz.title}”</span> (विषय:{" "}
            <span className="font-bold text-indigo-900">{quiz.subject}</span>, इयत्ता:{" "}
            <span className="font-bold text-slate-900">{quiz.classId}</span>) हा दैनिक बहुपर्यायी
            (MCQ) स्वाध्याय यशस्वीरीत्या पूर्ण केला असून खालीलप्रमाणे उत्तम यश संपादन केले आहे:
          </p>

          {/* Score & Evaluation Plaque */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-xl bg-amber-50/60 border border-amber-200/90 rounded-2xl p-3.5 my-2 shadow-xs">
            <div className="text-center border-r border-amber-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                मिळालेले गुण
              </span>
              <span className="text-xl sm:text-2xl font-black text-indigo-900">
                {score} / {totalMarks}
              </span>
            </div>

            <div className="text-center border-r border-amber-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                टक्केवारी (Score)
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                {percentage}%
              </span>
            </div>

            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                श्रेणी (Grade)
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-amber-800 line-clamp-1 mt-1">
                {gradeText}
              </span>
            </div>
          </div>

          {/* Footer Sign-off & Verification Seal */}
          <div className="w-full flex items-end justify-between pt-6 border-t border-amber-200/80 mt-2">
            {/* Date */}
            <div className="text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>दिनांक: {formattedDate}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                तपासणी: संगणकीय अचूक मूल्यमापन
              </div>
            </div>


            {/* Authority Signature */}
            <div className="text-right space-y-1">
              <div className="font-serif italic font-bold text-sm text-indigo-950 border-b border-slate-300 pb-0.5">
                SGK Brainova Academic Team
              </div>
              <div className="text-[11px] font-bold text-slate-700">
                स्वाध्याय प्रमुख (Examiner)
              </div>
              <div className="text-[10px] font-medium text-indigo-600">
                Smart Learning with AI
              </div>
            </div>
          </div>

          {/* Bottom URL Watermark */}
          <div className="pt-2 text-[10px] font-bold text-slate-400 tracking-wider">
            अधिकृत स्वाध्याय व निकाल पोर्टल:{" "}
            <span className="text-indigo-600 font-black">https://sgkbrainova.com</span>
          </div>
        </div>
      </div>
    );
  }
);

MCQPrintDocument.displayName = "MCQPrintDocument";
