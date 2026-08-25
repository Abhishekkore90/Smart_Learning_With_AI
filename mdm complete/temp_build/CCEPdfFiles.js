"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState, lazy, Suspense } from "react";
import { ArrowLeft, Download, Eye, Loader2 } from "lucide-react";
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
const GradeWise = safeLazy(() => import("@/result/GradeWise"));
const Result5th8th = safeLazy(() => import("@/result/Result5th8th"));
function PdfIcon({ className = "w-9 h-11" }) {
  return /* @__PURE__ */ jsxs("svg", { className, viewBox: "0 0 32 40", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [
    /* @__PURE__ */ jsx("path", { d: "M4 0h18l10 10v26a4 4 0 01-4 4H4a4 4 0 01-4-4V4a4 4 0 014-4z", fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: "1" }),
    /* @__PURE__ */ jsx("path", { d: "M22 0l10 10H26a4 4 0 01-4-4V0z", fill: "#cbd5e1" }),
    /* @__PURE__ */ jsx("path", { d: "M7 22h3.5c1.1 0 2 .9 2 2s-.9 2-2 2H9v2H7v-6zm2 3h1.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5H9v1z", fill: "#ef4444" }),
    /* @__PURE__ */ jsx("path", { d: "M14 22h2.5c1.9 0 3.5 1.6 3.5 3.5S18.4 29 16.5 29H14v-7zm2 5h.5c.8 0 1.5-.7 1.5-1.5S17.3 24 16.5 24H16v3z", fill: "#ef4444" }),
    /* @__PURE__ */ jsx("path", { d: "M21 22h4v2h-2v1h2v1h-2v2h-2v-6z", fill: "#ef4444" }),
    /* @__PURE__ */ jsx("text", { x: "16", y: "13", textAnchor: "middle", fill: "#dc2626", fontSize: "6.5", fontWeight: "900", fontFamily: "sans-serif", children: "PDF" })
  ] });
}
const CLASS_OPTIONS = [
  { value: "1st", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u0967 \u0932\u0940 (1st)" },
  { value: "2nd", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u0968 \u0930\u0940 (2nd)" },
  { value: "3rd", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u0969 \u0930\u0940 (3rd)" },
  { value: "4th", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u096A \u0925\u0940 (4th)" },
  { value: "5th", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u096B \u0935\u0940 (5th)" },
  { value: "6th", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u096C \u0935\u0940 (6th)" },
  { value: "7th", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u096D \u0935\u0940 (7th)" },
  { value: "8th", label: "\u0907\u092F\u0924\u094D\u0924\u093E \u096E \u0935\u0940 (8th)" }
];
export function CCEPdfFiles({
  selectedClass: defaultClass,
  academicYear: defaultYear,
  onBack
}) {
  const [activeClass, setActiveClass] = useState(defaultClass || "1st");
  const [academicYear, setAcademicYear] = useState(defaultYear || "2025-26");
  const [viewingReportId, setViewingReportId] = useState(null);
  const pdfFiles = [
    {
      id: "progress_card",
      title: "\u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915 (Progress Sheet)",
      name: `\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940-\u092A\u094D\u0930\u0917\u0924\u0940-\u092A\u0924\u094D\u0930\u0915-${activeClass}-${academicYear}.pdf`,
      category: "\u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200"
    },
    {
      id: "cce_register",
      title: "CCE \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940",
      name: `CCE-\u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928-\u0928\u094B\u0902\u0926\u0935\u0939\u0940-${activeClass}-${academicYear}.pdf`,
      category: "\u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200"
    },
    {
      id: "learning_outcomes",
      title: "\u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940\u0928\u093F\u0939\u093E\u092F \u0938\u0902\u092A\u093E\u0926\u0923\u0942\u0915 \u092A\u094D\u0930\u0917\u0924\u0940\u0926\u0930\u094D\u0936\u0915 \u0928\u094B\u0902\u0926\u0924\u0915\u094D\u0924\u093E",
      name: `\u0905\u0927\u094D\u092F\u092F\u0928-\u0928\u093F\u0937\u094D\u092A\u0924\u0940-\u092A\u094D\u0930\u0917\u0924\u0940\u0926\u0930\u094D\u0936\u0915-${activeClass}-${academicYear}.pdf`,
      category: "\u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200"
    },
    {
      id: "grade_result",
      title: "\u0938\u093E\u0924\u0924\u094D\u092F\u092A\u0942\u0930\u094D\u0923 \u0938\u0930\u094D\u0935\u0902\u0915\u0937 \u092E\u0942\u0932\u094D\u092F\u092E\u093E\u092A\u0928 \u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F \u0928\u093F\u0915\u093E\u0932 \u0938\u0902\u0915\u0932\u0928 \u092A\u094D\u0930\u092A\u0924\u094D\u0930 - 1",
      name: `\u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F-\u0928\u093F\u0915\u093E\u0932-\u0938\u0902\u0915\u0932\u0928-\u092A\u094D\u0930\u092A\u0924\u094D\u0930-1-${academicYear}.pdf`,
      category: "\u0938\u0902\u0915\u0932\u0928 \u092A\u094D\u0930\u092A\u0924\u094D\u0930",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200"
    },
    {
      id: "annual_result",
      title: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915 (Annual Result Sheet)",
      name: `\u0935\u093E\u0930\u094D\u0937\u093F\u0915-\u0928\u093F\u0915\u093E\u0932-\u092A\u0924\u094D\u0930\u0915-${activeClass}-${academicYear}.pdf`,
      category: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200"
    }
  ];
  const renderLoading = () => /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] text-slate-500", children: [
    /* @__PURE__ */ jsx(Loader2, { className: "size-9 text-blue-600 animate-spin mb-3" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-700", children: "PDF \u092B\u093E\u0908\u0932 \u0932\u094B\u0921 \u0939\u094B\u0924 \u0906\u0939\u0947..." })
  ] });
  if (viewingReportId === "progress_card") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setViewingReportId(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
        /* @__PURE__ */ jsxs("h2", { className: "text-base font-bold text-slate-800", children: [
          "\u092A\u094D\u0930\u0917\u0924\u0940 \u092A\u0924\u094D\u0930\u0915 - \u0907\u092F\u0924\u094D\u0924\u093E ",
          activeClass
        ] })
      ] }),
      /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(ProgressSheet, { initialClass: activeClass, initialYear: academicYear, onBack: () => setViewingReportId(null) }) })
    ] });
  }
  if (viewingReportId === "cce_register") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setViewingReportId(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
        /* @__PURE__ */ jsxs("h2", { className: "text-base font-bold text-slate-800", children: [
          "CCE \u092E\u0942\u0932\u094D\u092F\u093E\u0902\u0915\u0928 \u0928\u094B\u0902\u0926\u0935\u0939\u0940 - \u0907\u092F\u0924\u094D\u0924\u093E ",
          activeClass
        ] })
      ] }),
      /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(BoardResult, { initialClass: activeClass, initialYear: academicYear }) })
    ] });
  }
  if (viewingReportId === "learning_outcomes") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setViewingReportId(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
        /* @__PURE__ */ jsxs("h2", { className: "text-base font-bold text-slate-800", children: [
          "\u0905\u0927\u094D\u092F\u092F\u0928 \u0928\u093F\u0937\u094D\u092A\u0924\u0940 \u092A\u094D\u0930\u0917\u0924\u0940\u0926\u0930\u094D\u0936\u0915 - \u0907\u092F\u0924\u094D\u0924\u093E ",
          activeClass
        ] })
      ] }),
      /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(SubjectWiseResult, { initialClass: activeClass, initialYear: academicYear }) })
    ] });
  }
  if (viewingReportId === "grade_result") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setViewingReportId(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
        /* @__PURE__ */ jsx("h2", { className: "text-base font-bold text-slate-800", children: "\u0936\u094D\u0930\u0947\u0923\u0940\u0928\u093F\u0939\u093E\u092F \u0928\u093F\u0915\u093E\u0932 \u0938\u0902\u0915\u0932\u0928 \u092A\u094D\u0930\u092A\u0924\u094D\u0930 - 1" })
      ] }),
      /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(GradeWise, { initialClass: activeClass, initialYear: academicYear, onBack: () => setViewingReportId(null) }) })
    ] });
  }
  if (viewingReportId === "annual_result") {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl p-6 min-h-[600px] flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between pb-4 border-b border-slate-100 mb-4", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setViewingReportId(null), className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" }) }),
        /* @__PURE__ */ jsxs("h2", { className: "text-base font-bold text-slate-800", children: [
          "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915 - \u0907\u092F\u0924\u094D\u0924\u093E ",
          activeClass
        ] })
      ] }),
      /* @__PURE__ */ jsx(Suspense, { fallback: renderLoading(), children: /* @__PURE__ */ jsx(Result5th8th, { initialClass: activeClass, initialYear: academicYear }) })
    ] });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "bg-white text-slate-800 rounded-[2.5rem] border border-slate-200 shadow-2xl min-h-[600px] flex flex-col font-sans select-none overflow-hidden",
      style: { fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-slate-100 bg-slate-50/70", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: onBack,
                className: "p-2 hover:bg-white rounded-full transition-colors cursor-pointer text-slate-600 flex items-center justify-center shadow-sm",
                children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" })
              }
            ),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h2", { className: "text-lg font-bold tracking-tight text-slate-800", children: "PDF Files & \u0938\u093E\u0920\u0935\u0932\u0947\u0932\u0947 \u0928\u093F\u0915\u093E\u0932" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-medium", children: "\u0924\u092F\u093E\u0930 \u091D\u093E\u0932\u0947\u0932\u094D\u092F\u093E \u0938\u0930\u094D\u0935 PDF \u092B\u093E\u0908\u0932\u094D\u0938 \u0921\u093E\u090A\u0928\u0932\u094B\u0921 \u0935 \u0909\u092A\u0932\u092C\u094D\u0927 \u0915\u0930\u093E" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("span", { className: "text-xs font-bold text-slate-600", children: "\u0907\u092F\u0924\u094D\u0924\u093E:" }),
            /* @__PURE__ */ jsx(
              "select",
              {
                value: activeClass,
                onChange: (e) => setActiveClass(e.target.value),
                className: "px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer",
                children: CLASS_OPTIONS.map((opt) => /* @__PURE__ */ jsx("option", { value: opt.value, children: opt.label }, opt.value))
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto p-5 space-y-3.5", children: pdfFiles.map((file) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all group",
            children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4 flex-1", children: [
                /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 pt-0.5", children: /* @__PURE__ */ jsx(PdfIcon, { className: "w-9 h-11 group-hover:scale-105 transition-transform" }) }),
                /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
                    /* @__PURE__ */ jsx("h3", { className: "text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-snug", children: file.title }),
                    /* @__PURE__ */ jsx("span", { className: `text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${file.badgeColor}`, children: file.category })
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 font-mono break-all leading-tight", children: file.name })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 self-end sm:self-center", children: [
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setViewingReportId(file.id),
                    className: "flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer",
                    title: "\u092A\u0939\u093E",
                    children: [
                      /* @__PURE__ */ jsx(Eye, { className: "size-4 text-slate-600" }),
                      /* @__PURE__ */ jsx("span", { children: "\u092A\u0939\u093E" })
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: () => setViewingReportId(file.id),
                    className: "flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer",
                    title: "PDF \u0921\u093E\u090A\u0928\u0932\u094B\u0921 \u0915\u0930\u093E",
                    children: [
                      /* @__PURE__ */ jsx(Download, { className: "size-4" }),
                      /* @__PURE__ */ jsx("span", { children: "\u0921\u093E\u090A\u0928\u0932\u094B\u0921" })
                    ]
                  }
                )
              ] })
            ]
          },
          file.id
        )) })
      ]
    }
  );
}
