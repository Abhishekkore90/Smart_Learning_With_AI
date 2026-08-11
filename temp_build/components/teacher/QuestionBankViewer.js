"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useMemo, useRef } from "react";
import {
  Search,
  BookOpen,
  ExternalLink,
  Loader2,
  FileDown
} from "lucide-react";
import { toast } from "sonner";
import {
  QUESTION_BANK_TABLE_HEADERS
} from "@/lib/questionBankParser";
import { convertElementToPdfBlob, uploadBlobToBunny } from "@/lib/bunnyStorage";
export const QuestionBankViewer = ({ data, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("ALL");
  const [selectedObjective, setSelectedObjective] = useState("ALL");
  const [downloading, setDownloading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const containerRef = useRef(null);
  const metadata = data?.header_metadata || {
    academic_year: "\u0968\u0966\u0968\u0969-\u0968\u096A",
    form_number: "\u092A\u094D\u0930\u092A\u0924\u094D\u0930 \u0915\u094D\u0930\u092E\u093E\u0902\u0915 - 08  \u092A\u094D\u0930\u0936\u094D\u0928\u092A\u0947\u0922\u0940",
    standard_class: "\u0907\u092F\u0924\u094D\u0924\u094D\u0924\u093E - 5th",
    subject: "\u0935\u093F\u0937\u092F - Maths"
  };
  const fileDetails = data?.file_details || {
    bunny_cdn_url: "#",
    uploaded_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const headers = data?.table_headers || QUESTION_BANK_TABLE_HEADERS;
  const groups = useMemo(() => {
    if (data?.question_bank_groups && data.question_bank_groups.length > 0) {
      return data.question_bank_groups;
    }
    if (data?.flat_rows && data.flat_rows.length > 0) {
      const gList = [];
      let curGroup = null;
      let gId = 1;
      data.flat_rows.forEach((r) => {
        if (r.is_parent_instruction || !curGroup) {
          curGroup = {
            group_id: gId++,
            question_number: r.question_number || `${gId}`,
            unit_chapter: r.unit_chapter || "Roman Numerals",
            main_instruction: r.question_text || "* Circle the correct option",
            numbering_type: "NUMERIC",
            skill_feature: r.skill_feature || "",
            sub_questions: [],
            layout_spacing: {
              is_blank_spacer: true,
              padding_bottom: "20px"
            }
          };
          gList.push(curGroup);
          if (!r.is_parent_instruction && r.question_text) {
            curGroup.sub_questions.push({
              sub_question_index: r.question_number || "1)",
              question_text: r.question_text,
              marks: parseFloat(r.marks) || 1,
              evaluation_type: r.evaluation_type || "\u0932\u0947\u0916\u0940",
              question_type: r.question_type || "\u0935\u0938\u094D\u0924\u0941\u0928\u093F\u0937\u094D\u0920",
              objective: r.objective || "\u0909\u092A\u092F\u094B\u091C\u0928",
              skill_feature: r.skill_feature || "",
              learning_outcome_code: r.learning_outcome_code || "05.71.01"
            });
          }
          return;
        }
        curGroup.sub_questions.push({
          sub_question_index: r.question_number || `${curGroup.sub_questions.length + 1})`,
          question_text: r.question_text,
          marks: parseFloat(r.marks) || 1,
          evaluation_type: r.evaluation_type || "\u0932\u0947\u0916\u0940",
          question_type: r.question_type || "\u0935\u0938\u094D\u0924\u0941\u0928\u093F\u0937\u094D\u0920",
          objective: r.objective || "\u0909\u092A\u092F\u094B\u091C\u0928",
          skill_feature: r.skill_feature || "",
          learning_outcome_code: r.learning_outcome_code || "05.71.01"
        });
      });
      return gList;
    }
    return [];
  }, [data]);
  const filteredGroups = useMemo(() => {
    return groups.map((g) => {
      if (selectedUnit !== "ALL" && g.unit_chapter !== selectedUnit) {
        return null;
      }
      const filteredSubQs = g.sub_questions.filter((sq) => {
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const mText = sq.question_text.toLowerCase().includes(term);
          const mCode = sq.learning_outcome_code.toLowerCase().includes(term);
          const mInst = g.main_instruction.toLowerCase().includes(term);
          if (!mText && !mCode && !mInst) return false;
        }
        if (selectedObjective !== "ALL" && sq.objective !== selectedObjective) {
          return false;
        }
        return true;
      });
      if (filteredSubQs.length === 0 && searchTerm.trim()) return null;
      return {
        ...g,
        sub_questions: filteredSubQs.length > 0 ? filteredSubQs : g.sub_questions
      };
    }).filter(Boolean);
  }, [groups, searchTerm, selectedUnit, selectedObjective]);
  const allUnits = useMemo(() => {
    return Array.from(new Set(groups.map((g) => g.unit_chapter).filter(Boolean)));
  }, [groups]);
  const allObjectives = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    groups.forEach(
      (g) => g.sub_questions.forEach((sq) => {
        if (sq.objective) set.add(sq.objective);
      })
    );
    return Array.from(set);
  }, [groups]);
  const handleDownloadPdfTable = async () => {
    if (!containerRef.current) return;
    setDownloading(true);
    toast.info("\u{1F4C4} PDF \u0924\u0915\u094D\u0924\u093E \u0924\u092F\u093E\u0930 \u0915\u0930\u0942\u0928 \u0921\u093E\u090A\u0928\u0932\u094B\u0921 \u0939\u094B\u0924 \u0906\u0939\u0947...");
    try {
      let rawClass = (metadata.standard_class || "\u0907\u092F\u0924\u094D\u0924\u093E").replace(/^इयत्त्ता\s*[:\-–]?\s*/i, "").replace(/^इयत्ता\s*[:\-–]?\s*/i, "").replace(/^Class\s*[:\-–]?\s*/i, "").replace(/^Std\.?\s*[:\-–]?\s*/i, "").replace(/\b(semi|english|medium|ok|bhavika|bhavik|margdarshak|prapatra|08|07|06|05|04|03|02|01)\b/gi, "").replace(/[()\[\]]/g, " ").trim();
      let rawSubj = (metadata.subject || "\u0935\u093F\u0937\u092F").replace(/^विषय\s*[:\-–]?\s*/i, "").replace(/^Subject\s*[:\-–]?\s*/i, "").replace(/\b(semi|english|medium|ok|bhavika|bhavik|margdarshak|prapatra|08|07|06|05|04|03|02|01)\b/gi, "").replace(/[()\[\]]/g, " ").trim();
      rawClass = rawClass.replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      rawSubj = rawSubj.replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
      if (!rawClass) rawClass = "\u0907\u092F\u0924\u094D\u0924\u093E";
      if (!rawSubj) rawSubj = "\u0935\u093F\u0937\u092F";
      const pdfFileName = `${rawClass}_\u092A\u094D\u0930\u0936\u094D\u0928\u092A\u0947\u0922\u0940_${rawSubj}.pdf`.replace(/[\/\\:*?"<>|]/g, "_");
      const pdfBlob = await convertElementToPdfBlob(
        containerRef.current,
        pdfFileName,
        "landscape"
      );
      uploadBlobToBunny(`question_banks/${pdfFileName}`, pdfBlob).catch((err) => {
        console.warn("Bunny Storage PDF upload notice:", err);
      });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = pdfFileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 1e4);
      toast.success("\u{1F389} PDF \u0924\u0915\u094D\u0924\u093E \u092F\u0936\u0938\u094D\u0935\u0940\u0930\u093F\u0924\u094D\u092F\u093E \u0921\u093E\u090A\u0928\u0932\u094B\u0921 \u091D\u093E\u0932\u093E!");
    } catch (pdfErr) {
      console.warn("PDF generation notice, falling back to window print:", pdfErr);
      window.print();
    } finally {
      setDownloading(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "bg-slate-100 min-h-screen p-3 sm:p-6 space-y-5 font-sans", children: [
    /* @__PURE__ */ jsx("div", { className: "bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 space-y-4", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider", children: metadata.form_number }),
          /* @__PURE__ */ jsx("span", { className: "px-3.5 py-1 rounded-full bg-white/15 text-amber-300 text-xs font-bold border border-white/10", children: metadata.academic_year })
        ] }),
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3", children: [
          /* @__PURE__ */ jsx(BookOpen, { className: "size-8 text-amber-300 shrink-0" }),
          /* @__PURE__ */ jsxs("span", { children: [
            metadata.standard_class,
            " \xA0|\xA0 ",
            metadata.subject
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setShowPdfModal(true),
            className: "px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer",
            children: [
              /* @__PURE__ */ jsx(ExternalLink, { className: "size-4" }),
              /* @__PURE__ */ jsx("span", { children: "\u{1F441}\uFE0F PDF \u092A\u094D\u0930\u0940\u0935\u094D\u0939\u094D\u092F\u0942 \u0909\u0918\u0921\u093E (View PDF Preview)" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handleDownloadPdfTable,
            disabled: downloading,
            className: "px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50",
            children: [
              downloading ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsx(FileDown, { className: "size-4 text-slate-950" }),
              /* @__PURE__ */ jsx("span", { children: "PDF \u0924\u0915\u094D\u0924\u093E \u0921\u093E\u090A\u0928\u0932\u094B\u0921 (Download PDF)" })
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1 min-w-[240px]", children: [
        /* @__PURE__ */ jsx(Search, { className: "size-4 text-slate-400 absolute left-3.5 top-3" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            placeholder: "\u092A\u094D\u0930\u0936\u094D\u0928 \u0915\u093F\u0902\u0935\u093E \u0915\u094B\u0921 \u0936\u094B\u0927\u093E (Search questions or outcome code)...",
            className: "w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: selectedUnit,
            onChange: (e) => setSelectedUnit(e.target.value),
            className: "px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700",
            children: [
              /* @__PURE__ */ jsx("option", { value: "ALL", children: "\u0938\u0930\u094D\u0935 \u0918\u091F\u0915 (All Units)" }),
              allUnits.map((u, i) => /* @__PURE__ */ jsx("option", { value: u, children: u }, i))
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: selectedObjective,
            onChange: (e) => setSelectedObjective(e.target.value),
            className: "px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700",
            children: [
              /* @__PURE__ */ jsx("option", { value: "ALL", children: "\u0938\u0930\u094D\u0935 \u0909\u0926\u094D\u0926\u093F\u0937\u094D\u091F\u0947 (All Objectives)" }),
              allObjectives.map((o, i) => /* @__PURE__ */ jsx("option", { value: o, children: o }, i))
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: containerRef, className: "bg-white rounded-3xl border-2 border-slate-300 shadow-xl overflow-x-auto p-2", children: [
      /* @__PURE__ */ jsxs("table", { className: "w-full border-collapse border border-slate-400 text-xs font-sans", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "bg-amber-100 text-slate-900 font-black border-b-2 border-slate-900 text-center", style: { backgroundColor: "#fef3c7" }, children: [
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[6%]", style: { width: "6%" }, children: headers[0] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[12%]", style: { width: "12%" }, children: headers[1] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold text-left w-[38%]", style: { width: "38%" }, children: headers[2] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[5%]", style: { width: "5%" }, children: headers[3] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[9%]", style: { width: "9%" }, children: headers[4] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[10%]", style: { width: "10%" }, children: headers[5] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[8%]", style: { width: "8%" }, children: headers[6] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[7%]", style: { width: "7%" }, children: headers[7] }),
          /* @__PURE__ */ jsx("th", { className: "p-3 border border-slate-400 font-extrabold w-[5%]", style: { width: "5%" }, children: headers[8] })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: filteredGroups && filteredGroups.length > 0 ? filteredGroups.map((g, gIdx) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
          /* @__PURE__ */ jsx("tr", { className: "bg-indigo-950 text-white font-bold border-b border-indigo-900", style: { backgroundColor: "#1e1b4b", color: "#ffffff" }, children: /* @__PURE__ */ jsxs("td", { className: "p-3 border border-indigo-900 font-black text-amber-300 text-xs", colSpan: 9, children: [
            "\u{1F4CC} ",
            g.main_instruction
          ] }) }),
          g.sub_questions.map((sq, sqIdx) => {
            const isInstructionHeader = String(sq.question_text || "").trim().startsWith("*");
            if (isInstructionHeader) {
              return /* @__PURE__ */ jsx(
                "tr",
                {
                  className: "bg-indigo-950 text-white font-bold border-b border-indigo-900",
                  style: { backgroundColor: "#1e1b4b", color: "#ffffff" },
                  children: /* @__PURE__ */ jsxs("td", { className: "p-3 border border-indigo-900 font-black text-amber-300 text-xs text-left", colSpan: 9, children: [
                    "\u{1F4CC} ",
                    sq.question_text
                  ] })
                },
                sqIdx
              );
            }
            return /* @__PURE__ */ jsxs("tr", { className: "border-b border-slate-300 hover:bg-amber-50/30 transition-colors", children: [
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center font-bold text-slate-800 bg-slate-50", children: sq.sub_question_index || sq.sub_index || sq.sub_question_no }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center text-slate-700 font-medium bg-slate-50/70", children: g.unit_chapter }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-slate-900 font-semibold leading-relaxed whitespace-pre-wrap", children: sq.question_text }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center font-black text-indigo-900", children: sq.marks }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center text-slate-800 font-bold bg-purple-50/40", children: sq.evaluation_type }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center text-slate-800 font-bold bg-blue-50/40", children: sq.question_type }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center font-bold text-emerald-900 bg-emerald-50/40", children: sq.objective }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center text-slate-700 text-[11px] leading-tight", children: sq.skill_feature || g.skill_feature }),
              /* @__PURE__ */ jsx("td", { className: "p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-900 bg-amber-50/40", children: sq.learning_outcome_code })
            ] }, sqIdx);
          }),
          g.layout_spacing?.is_blank_spacer && /* @__PURE__ */ jsx("tr", { className: "h-5 bg-slate-100/80 border-t-2 border-b-2 border-slate-300", style: { height: g.layout_spacing.padding_bottom || "20px" }, children: /* @__PURE__ */ jsx("td", { colSpan: 9, className: "h-5 text-center text-[10px] text-slate-400 font-bold bg-slate-200/50 tracking-widest select-none", children: "\u2726 \u2726 \u2726" }) })
        ] }, gIdx)) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { colSpan: 9, className: "p-12 text-center text-slate-500 font-bold", children: "\u0915\u094B\u0923\u0924\u0947\u0939\u0940 \u092A\u094D\u0930\u0936\u094D\u0928 \u0938\u093E\u092A\u0921\u0932\u0947 \u0928\u093E\u0939\u0940\u0924. \u0915\u0943\u092A\u092F\u093E \u0936\u094B\u0927 \u0915\u093F\u0902\u0935\u093E \u092B\u093F\u0932\u094D\u091F\u0930 \u092C\u0926\u0932\u0942\u0928 \u092A\u0939\u093E." }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center pt-6 px-4 text-xs font-bold text-slate-800 border-t border-slate-300 mt-4", children: [
        /* @__PURE__ */ jsx("div", { children: "\u270D\uFE0F \u0935\u093F\u0937\u092F \u0936\u093F\u0915\u094D\u0937\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" }),
        /* @__PURE__ */ jsx("div", { children: "\u270D\uFE0F \u092E\u0941\u0916\u094D\u092F\u093E\u0927\u094D\u092F\u093E\u092A\u0915 \u0938\u094D\u0935\u093E\u0915\u094D\u0937\u0930\u0940" })
      ] })
    ] }),
    showPdfModal && /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md p-4 md:p-8 flex flex-col gap-4 overflow-hidden", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 text-white shadow-xl", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("span", { className: "text-xl", children: "\u{1F4C4}" }),
          /* @__PURE__ */ jsxs("h2", { className: "text-base font-extrabold text-amber-300", children: [
            metadata.standard_class,
            " | ",
            metadata.subject,
            " \u2014 \u0911\u0928\u0932\u093E\u0908\u0928 PDF \u092A\u094D\u0930\u0940\u0935\u094D\u0939\u094D\u092F\u0942 (PDF Preview)"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleDownloadPdfTable,
              disabled: downloading,
              className: "px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md",
              children: [
                /* @__PURE__ */ jsx(FileDown, { className: "size-4" }),
                /* @__PURE__ */ jsx("span", { children: "\u0921\u093E\u090A\u0928\u0932\u094B\u0921 (Download PDF)" })
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => window.print(),
              className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md",
              children: /* @__PURE__ */ jsx("span", { children: "\u{1F5A8}\uFE0F \u092A\u094D\u0930\u093F\u0902\u0902\u091F (Print)" })
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setShowPdfModal(false),
              className: "px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md",
              children: "\u2716 \u092C\u0902\u0926 \u0915\u0930\u093E (Close)"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 bg-white rounded-2xl border border-slate-300 overflow-auto p-6 text-slate-900 shadow-2xl", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: "prose max-w-none text-slate-900",
          dangerouslySetInnerHTML: { __html: containerRef.current?.innerHTML || "" }
        }
      ) })
    ] })
  ] });
};
