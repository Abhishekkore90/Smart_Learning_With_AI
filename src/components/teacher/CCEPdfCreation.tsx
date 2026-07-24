import React, { Component, ReactNode, useState, lazy, Suspense } from "react";
import { ArrowLeft, ChevronRight, FileText, Loader2, AlertCircle } from "lucide-react";

// Lazy load large result components for optimal bundle performance & instant load
// @ts-ignore
const BoardResult = lazy(() => import("@/result/BoardResult"));
// @ts-ignore
const SubjectWiseResult = lazy(() => import("@/result/SubjectWiseResult"));
// @ts-ignore
const ProgressSheet = lazy(() => import("@/result/ProgressSheet"));
// @ts-ignore
const Collectout = lazy(() => import("@/result/Collectout"));
// @ts-ignore
const GradeWise = lazy(() => import("@/result/GradeWise"));
// @ts-ignore
const Result5th8th = lazy(() => import("@/result/Result5th8th"));
// @ts-ignore
const ResultSSC = lazy(() => import("@/result/ResultSSC"));
// @ts-ignore
const ResultHSC = lazy(() => import("@/result/ResultHSC"));

interface ErrorBoundaryProps {
  children: ReactNode;
  title: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class PdfErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("PDF Component Error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-50/60 rounded-3xl border border-red-200 my-4 max-w-xl mx-auto">
          <div className="size-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="size-6" />
          </div>
          <h3 className="text-base font-bold text-red-800 mb-1">{this.props.title} लोड करताना त्रुटी आली</h3>
          <p className="text-xs text-red-600 font-mono mb-4 bg-white p-3 rounded-xl border border-red-100">
            {this.state.error?.message || "काही माहिती अनुपलब्ध आहे."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-red-200"
          >
            पुन्हा प्रयत्न करा (Retry)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const PDF_OPTIONS = [
  {
    id: "cce_register",
    label: "CCE मूल्यांकन नोंदवही",
    description: "संपूर्ण CCE मूल्यांकन नोंदवही PDF व तक्ता",
  },
  {
    id: "learning_outcomes",
    label: "अध्ययन निष्पतीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता\n(विद्यार्थीनिहाय)",
    description: "विद्यार्थीनिहाय अध्ययन निष्पती प्रगती चार्ट",
  },
  {
    id: "progress_card",
    label: "प्रगती पत्रक",
    description: "विद्यार्थी प्रगती पत्रक PDF",
  },
  {
    id: "annual_result",
    label: "वार्षिक निकाल पत्रक",
    description: "वार्षिक निकाल पत्रक PDF व संकलन",
  },
  {
    id: "grade_result",
    label: "श्रेणीनिहाय-निकाल-संकलन-प्रपत्र",
    description: "श्रेणीनिहाय निकाल संकलन प्रपत्र",
  },
];

export function CCEPdfCreation({ selectedClass, academicYear, onBack }: {
  selectedClass: string; academicYear: string; onBack: () => void;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center min-h-[350px] text-slate-500">
      <Loader2 className="size-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-bold text-slate-700">PDF डेटा लोड होत आहे...</p>
    </div>
  );

  if (selectedOption === "cce_register") {
    return (
      <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-6">
          <button onClick={() => setSelectedOption(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">CCE मूल्यांकन नोंदवही PDF</h2>
        </div>
        <div className="flex-1 overflow-x-auto">
          <PdfErrorBoundary title="CCE मूल्यांकन नोंदवही">
            <Suspense fallback={renderLoading()}>
              <BoardResult initialClass={selectedClass} initialYear={academicYear} />
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>
    );
  }

  if (selectedOption === "learning_outcomes") {
    return (
      <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-6">
          <button onClick={() => setSelectedOption(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">अध्ययन निष्पतीनिहाय संपादणूक प्रगतीदर्शक नोंदतक्ता</h2>
        </div>
        <div className="flex-1 overflow-x-auto">
          <PdfErrorBoundary title="अध्ययन निष्पती प्रगतीदर्शक">
            <Suspense fallback={renderLoading()}>
              <SubjectWiseResult initialClass={selectedClass} initialYear={academicYear} />
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>
    );
  }

  if (selectedOption === "progress_card") {
    return (
      <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-6">
          <button onClick={() => setSelectedOption(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">प्रगती पत्रक PDF</h2>
        </div>
        <div className="flex-1 overflow-x-auto">
          <PdfErrorBoundary title="प्रगती पत्रक">
            <Suspense fallback={renderLoading()}>
              <ProgressSheet initialClass={selectedClass} initialYear={academicYear} />
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>
    );
  }

  if (selectedOption === "annual_result") {
    return (
      <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-6">
          <button onClick={() => setSelectedOption(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">वार्षिक निकाल पत्रक PDF</h2>
        </div>
        <div className="flex-1 overflow-x-auto">
          <PdfErrorBoundary title="वार्षिक निकाल पत्रक">
            <Suspense fallback={renderLoading()}>
              {["5th", "8th"].includes(selectedClass) ? (
                <Result5th8th initialClass={selectedClass} initialYear={academicYear} />
              ) : selectedClass === "12th" ? (
                <ResultHSC initialClass={selectedClass} initialYear={academicYear} />
              ) : (
                <GradeWise initialClass={selectedClass} initialYear={academicYear} onBack={() => setSelectedOption(null)} />
              )}
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>
    );
  }

  if (selectedOption === "grade_result") {
    return (
      <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans">
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100 mb-6">
          <button onClick={() => setSelectedOption(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600">
            <ArrowLeft className="size-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">श्रेणीनिहाय-निकाल-संकलन-प्रपत्र PDF</h2>
        </div>
        <div className="flex-1 overflow-x-auto">
          <PdfErrorBoundary title="श्रेणीनिहाय निकाल संकलन प्रपत्र">
            <Suspense fallback={renderLoading()}>
              <GradeWise initialClass={selectedClass} initialYear={academicYear} />
            </Suspense>
          </PdfErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none overflow-hidden" style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">PDF निर्मिती</h2>
          <p className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">{selectedClass} • {academicYear}</p>
        </div>
      </div>

      {/* PDF Options List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {PDF_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => setSelectedOption(option.id)}
            className="w-full flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer group text-left shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4 flex-1 pr-4">
              <div className="size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug whitespace-pre-line">
                  {option.label}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{option.description}</p>
              </div>
            </div>
            <div className="size-8 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
              <ChevronRight className="size-4" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
