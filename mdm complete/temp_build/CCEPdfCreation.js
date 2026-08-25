"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
import { Component, useState, lazy, Suspense } from "react";
import { ArrowLeft, ChevronRight, FileText, Loader2, AlertCircle } from "lucide-react";
const safeLazy = (factory) => lazy(
  () => factory().catch((err) => {
    console.warn("Failed to fetch dynamically imported module. Reloading page...", err);
    window.location.reload();
    return new Promise(() => {
    });
  })
);
const BoardResult = safeLazy(() => import("@/result/BoardResult"));
const SubjectWiseResult = safeLazy(() => import("@/result/SubjectWiseResult"));
const ProgressSheet = safeLazy(() => import("@/result/ProgressSheet"));
const Collectout = safeLazy(() => import("@/result/Collectout"));
const GradeWise = safeLazy(() => import("@/result/GradeWise"));
const Result5th8th = safeLazy(() => import("@/result/Result5th8th"));
const ResultSSC = safeLazy(() => import("@/result/ResultSSC"));
const ResultHSC = safeLazy(() => import("@/result/ResultHSC"));
class PdfErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null
  };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("PDF Component Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ jsxs("div", { className: "p-8 text-center bg-red-50/60 rounded-3xl border border-red-200 my-4 max-w-xl mx-auto", children: [
        /* @__PURE__ */ jsx("div", { className: "size-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3", children: /* @__PURE__ */ jsx(AlertCircle, { className: "size-6" }) }),
        /* @__PURE__ */ jsxs("h3", { className: "text-base font-bold text-red-800 mb-1", children: [
          this.props.title,
          " \u0932\u094B\u0921 \u0915\u0930\u0924\u093E\u0928\u093E \u0924\u094D\u0930\u0941\u091F\u0940 \u0906\u0932\u0940"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-red-600 font-mono mb-4 bg-white p-3 rounded-xl border border-red-100", children: this.state.error?.message || "\u0915\u093E\u0939\u0940 \u092E\u093E\u0939\u093F\u0924\u0940 \u0905\u0928\u0941\u092A\u0932\u092C\u094D\u0927 \u0906\u0939\u0947." }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => this.setState({ hasError: false, error: null }),
            className: "px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-red-200",
            children: "\u092A\u0941\u0928\u094D\u0939\u093E \u092A\u094D\u0930\u092F\u0924\u094D\u0928 \u0915\u0930\u093E (Retry)"
          }
        )
      ] });
    }
    return this.props.children;
  }
}
const PDF_OPTIONS = [
  {
    id: "cce_register",
    label: "CCE \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940",
    description: "\u0938\u0902\u092A\u0942\u0930\u094D\u0923 CCE \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940 PDF \u0935 \u0924\u0915\u094D\u0924\u093E"
  },
  {
    id: "learning_outcomes",
    label: "\u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940\u0928\u093F\u0939\u093E\u092F \u0938\u0902\u092A\u093E\u0926\u0923\u0942\u0915 \u092A\u094D\u0930\u0917\u0924\u0940\u0926\u0930\u094D\u0936\u0915 \u0928\u094B\u0902\u0926\u0924\u0915\u094D\u0924\u093E\n(\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940\u0928\u093F\u0939\u093E\u092F)",
    description: "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940\u0928\u093F\u0939\u093E\u092F \u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940 \u092A\u094D\u0930\u0917\u0924\u0940 \u091A\u093E\u0930\u094D\u091F"
  },
  {
    id: "progress_card",
    label: "\u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915",
    description: "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915 PDF"
  },
  {
    id: "annual_result",
    label: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915",
    description: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915 PDF \u0935 \u0938\u0902\u0915\u0932\u0928"
  },
  {
    id: "grade_result",
    label: "\u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F-\u0928\u093F\u0915\u093E\u0932-\u0938\u0902\u0915\u0932\u0928-\u092A\u094D\u0930\u092A\u0924\u094D\u0930",
    description: "\u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F \u0928\u093F\u0915\u093E\u0932 \u0938\u0902\u0915\u0932\u0928 \u092A\u094D\u0930\u092A\u0924\u094D\u0930"
  }
];
export function CCEPdfCreation({ selectedClass, academicYear, onBack }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("sem2");
  const renderLoading = () => /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center min-h-[350px] text-slate-500", children: [
    /* @__PURE__ */ jsx(Loader2, { className: "size-8 text-blue-600 animate-spin mb-3" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-700", children: "PDF \u0921\u0947\u091F\u093E \u0932\u094B\u0921 \u0939\u094B\u0924 \u0906\u0939\u0947..." })
  ] });
  const SemesterToggle = () => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setSelectedSemester("sem1"),
        className: `px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${selectedSemester === "sem1" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"}`,
        children: "\u{1F4D8} \u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 (Sem 1)"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setSelectedSemester("sem2"),
        className: `px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${selectedSemester === "sem2" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"}`,
        children: "\u{1F4D9} \u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 (Sem 2)"
      }
    )
  ] });
  if (selectedOption === "cce_register") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setSelectedOption(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-800", children: "CCE \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940 PDF" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 font-bold", children: selectedSemester === "sem1" ? "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 (Sem 1)" : "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 (Sem 2)" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SemesterToggle, {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto", children: /* @__PURE__ */ jsx(PdfErrorBoundary, { title: "CCE \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940", children: /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(BoardResult, { initialClass: selectedClass, initialYear: academicYear, initialTerm: selectedSemester }, `${selectedClass}_${academicYear}_${selectedSemester}`) }) }) })
    ] });
  }
  if (selectedOption === "learning_outcomes") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setSelectedOption(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-800", children: "\u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940\u0928\u093F\u0939\u093E\u092F \u0938\u0902\u092A\u093E\u0926\u0923\u0942\u0915 \u092A\u094D\u0930\u0917\u0924\u0940\u0926\u0930\u094D\u0936\u0915 \u0928\u094B\u0902\u0926\u0924\u0915\u094D\u0924\u093E" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 font-bold", children: selectedSemester === "sem1" ? "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 (Sem 1)" : "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 (Sem 2)" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SemesterToggle, {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto", children: /* @__PURE__ */ jsx(PdfErrorBoundary, { title: "\u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940 \u092A\u094D\u0930\u0917\u0924\u0940\u0926\u0930\u094D\u0936\u0915", children: /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(SubjectWiseResult, { initialClass: selectedClass, initialYear: academicYear, initialTerm: selectedSemester }, `${selectedClass}_${academicYear}_${selectedSemester}`) }) }) })
    ] });
  }
  if (selectedOption === "progress_card") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setSelectedOption(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-800", children: "\u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915 PDF" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 font-bold", children: selectedSemester === "sem1" ? "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 (Sem 1)" : "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 (Sem 2)" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SemesterToggle, {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto", children: /* @__PURE__ */ jsx(PdfErrorBoundary, { title: "\u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915", children: /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(ProgressSheet, { initialClass: selectedClass, initialYear: academicYear, initialTerm: selectedSemester, onBack: () => setSelectedOption(null) }, `${selectedClass}_${academicYear}_${selectedSemester}`) }) }) })
    ] });
  }
  if (selectedOption === "annual_result") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setSelectedOption(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-800", children: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915 PDF" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 font-bold", children: selectedSemester === "sem1" ? "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 (Sem 1)" : "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 (Sem 2)" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SemesterToggle, {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto", children: /* @__PURE__ */ jsx(PdfErrorBoundary, { title: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915", children: /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: selectedClass === "12th" ? /* @__PURE__ */ jsx(ResultHSC, { initialClass: selectedClass, initialYear: academicYear, initialTerm: selectedSemester }, `${selectedClass}_${academicYear}_${selectedSemester}`) : /* @__PURE__ */ jsx(Result5th8th, { initialClass: selectedClass, initialYear: academicYear, initialTerm: selectedSemester }, `${selectedClass}_${academicYear}_${selectedSemester}`) }) }) })
    ] });
  }
  if (selectedOption === "grade_result") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col font-sans", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-6 flex-wrap gap-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => setSelectedOption(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold text-slate-800", children: "\u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F-\u0928\u093F\u0915\u093E\u0932-\u0938\u0902\u0915\u0932\u0928-\u092A\u094D\u0930\u092A\u0924\u094D\u0930 PDF" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-600 font-bold", children: selectedSemester === "sem1" ? "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930 (Sem 1)" : "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930 (Sem 2)" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SemesterToggle, {})
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-x-auto", children: /* @__PURE__ */ jsx(PdfErrorBoundary, { title: "\u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F \u0928\u093F\u0915\u093E\u0932 \u0938\u0902\u0915\u0932\u0928 \u092A\u094D\u0930\u092A\u0924\u094D\u0930", children: /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(GradeWise, { initialClass: selectedClass, initialYear: academicYear, initialTerm: selectedSemester, onBack: () => setSelectedOption(null) }, `${selectedClass}_${academicYear}_${selectedSemester}`) }) }) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none overflow-hidden", style: { fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50 flex-wrap gap-3 flex-shrink-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onBack,
            className: "p-2 hover:bg-white rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center shadow-sm",
            children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" })
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold tracking-tight text-slate-800", children: "PDF \u0928\u093F\u0930\u094D\u092E\u093F\u0924\u0940 (\u0938\u0924\u094D\u0930 \u0928\u093F\u0935\u0921\u093E)" }),
          /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-blue-600 font-bold uppercase tracking-wider", children: [
            selectedClass,
            " \u2022 ",
            academicYear
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(SemesterToggle, {})
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-4 space-y-2.5", children: PDF_OPTIONS.map((option) => /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setSelectedOption(option.id),
        className: "w-full flex items-center justify-between p-4.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 transition-all cursor-pointer group text-left shadow-sm hover:shadow-md",
        children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 flex-1 pr-4", children: [
            /* @__PURE__ */ jsx("div", { className: "size-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors flex-shrink-0", children: /* @__PURE__ */ jsx(FileText, { className: "size-5" }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { className: "text-[15px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug whitespace-pre-line", children: option.label }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-medium mt-0.5", children: option.description })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "size-8 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0", children: /* @__PURE__ */ jsx(ChevronRight, { className: "size-4" }) })
        ]
      },
      option.id
    )) })
  ] });
}
