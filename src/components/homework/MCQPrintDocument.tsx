import React from "react";
import type { MCQHomeworkSet, LocalMCQSubmission } from "@/types/mcqHomework";

interface MCQPrintDocumentProps {
  quiz: MCQHomeworkSet;
  submission?: LocalMCQSubmission | null;
  studentName?: string;
}

export const MCQPrintDocument: React.FC<MCQPrintDocumentProps> = ({
  quiz,
  submission,
  studentName,
}) => {
  const letters = ["A", "B", "C", "D"];
  const isResult = Boolean(submission);

  return (
    <div
      id="mcq-printable-area"
      className="bg-white text-slate-900 p-8 max-w-4xl mx-auto font-sans leading-relaxed print:p-0 print:m-0 print:max-w-none"
      style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
    >
      {/* Header */}
      <div className="border-b-2 border-indigo-600 pb-4 mb-6 text-center">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
          <span>स्मार्ट लर्निंग विथ AI (Smart Learning With AI)</span>
          <span>तारीख: {quiz.date}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          {quiz.title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-sm text-slate-700 font-medium">
          <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            <strong>विषय:</strong> {quiz.subject}
          </span>
          <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            <strong>इयत्ता:</strong> {quiz.classId}
          </span>
          <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
            <strong>माध्यम:</strong> {quiz.medium === "marathi" ? "मराठी" : "सेमी-इंग्रजी"}
          </span>
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md border border-indigo-200 font-semibold">
            <strong>एकूण गुण:</strong> {quiz.totalMarks}
          </span>
        </div>
      </div>

      {/* Student Details Row */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between text-sm">
        <div className="flex-1 min-w-[200px]">
          <span className="text-slate-500 font-medium">विद्यार्थ्याचे नाव:</span>{" "}
          <span className="font-semibold text-slate-800 border-b border-slate-400 pb-0.5 inline-block min-w-[180px]">
            {studentName || "______________________________"}
          </span>
        </div>
        {isResult && submission && (
          <div className="flex items-center gap-3 font-semibold text-slate-800">
            <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
              मिळालेले गुण: {submission.score} / {submission.totalMarks} ({submission.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {quiz.instructions && (
        <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 p-2.5 rounded mb-6">
          <strong>सूचना:</strong> {quiz.instructions}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const userAns = submission?.answers[q.id];
          const isAttempted = typeof userAns === "number";
          const isCorrect = isAttempted && userAns === q.correctIndex;

          return (
            <div
              key={q.id}
              className={`p-4 rounded-lg border transition-all ${
                isResult
                  ? isCorrect
                    ? "border-emerald-300 bg-emerald-50/40"
                    : isAttempted
                    ? "border-rose-300 bg-rose-50/40"
                    : "border-slate-200 bg-slate-50/50"
                  : "border-slate-200 bg-white"
              }`}
            >
              {/* Question Text */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2 text-slate-900 font-medium text-base">
                  <span className="font-bold text-indigo-700 min-w-[28px]">
                    प्र.{idx + 1})
                  </span>
                  <span>{q.question}</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                  {q.marks || 1} गुण
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 ml-8">
                {q.options.map((opt, oIdx) => {
                  let optStyle = "bg-slate-50 border-slate-200 text-slate-800";
                  if (isResult) {
                    if (oIdx === q.correctIndex) {
                      optStyle = "bg-emerald-100 border-emerald-400 font-semibold text-emerald-900";
                    } else if (userAns === oIdx && !isCorrect) {
                      optStyle = "bg-rose-100 border-rose-400 font-semibold text-rose-900 line-through";
                    }
                  }

                  return (
                    <div
                      key={oIdx}
                      className={`flex items-center gap-2 p-2.5 rounded-md border text-sm ${optStyle}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {letters[oIdx]}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  );
                })}
              </div>

              {/* Result explanation / details */}
              {isResult && (
                <div className="mt-3 ml-8 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    {isCorrect ? (
                      <span className="text-emerald-700 font-semibold">✓ बरोबर उत्तर!</span>
                    ) : (
                      <span className="text-rose-700 font-semibold">
                        ✗ चुकीचे! (योग्य उत्तर: पर्याय {letters[q.correctIndex]} - {q.options[q.correctIndex]})
                      </span>
                    )}
                    {q.explanation && (
                      <p className="text-slate-600 mt-1 italic font-normal">
                        स्पष्टीकरण: {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
        स्मार्ट लर्निंग विथ AI — सर्व हक्क राखीव © {new Date().getFullYear()}
      </div>
    </div>
  );
};
