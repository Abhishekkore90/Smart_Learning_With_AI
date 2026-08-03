import React, { useState, useMemo, useRef } from "react";
import {
  FileText,
  Search,
  BookOpen,
  Download,
  ExternalLink,
  Award,
  Layers,
  HelpCircle,
  Tag,
  BookMarked,
  Filter,
  Loader2,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  QuestionBankTargetSchema,
  QUESTION_BANK_TABLE_HEADERS,
  QuestionBankFlatRow,
  QuestionBankGroupItem,
} from "@/lib/questionBankParser";
import { convertElementToPdfBlob } from "@/lib/bunnyStorage";

interface QuestionBankViewerProps {
  data: QuestionBankTargetSchema;
  onClose?: () => void;
}

export const QuestionBankViewer: React.FC<QuestionBankViewerProps> = ({ data, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
  const [selectedObjective, setSelectedObjective] = useState<string>("ALL");
  const [downloading, setDownloading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const metadata = data?.header_metadata || {
    academic_year: "२०२३-२४",
    form_number: "प्रपत्र क्रमांक - 08  प्रश्नपेढी",
    standard_class: "इयत्त्ता - 5th",
    subject: "विषय - Maths",
  };

  const fileDetails = data?.file_details || {
    bunny_cdn_url: "#",
    uploaded_at: new Date().toISOString(),
  };

  const headers = data?.table_headers || QUESTION_BANK_TABLE_HEADERS;

  // Question Bank Groups
  const groups: QuestionBankGroupItem[] = useMemo(() => {
    if (data?.question_bank_groups && data.question_bank_groups.length > 0) {
      return data.question_bank_groups;
    }
    // Fallback convert flat_rows to groups
    if (data?.flat_rows && data.flat_rows.length > 0) {
      const gList: QuestionBankGroupItem[] = [];
      let curGroup: QuestionBankGroupItem | null = null;
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
              padding_bottom: "20px",
            },
          };
          gList.push(curGroup);
          if (!r.is_parent_instruction && r.question_text) {
            curGroup.sub_questions.push({
              sub_question_index: r.question_number || "1)",
              question_text: r.question_text,
              marks: parseFloat(r.marks) || 1,
              evaluation_type: r.evaluation_type || "लेखी",
              question_type: r.question_type || "वस्तुनिष्ठ",
              objective: r.objective || "उपयोजन",
              skill_feature: r.skill_feature || "",
              learning_outcome_code: r.learning_outcome_code || "05.71.01",
            });
          }
          return;
        }

        curGroup.sub_questions.push({
          sub_question_index: r.question_number || `${curGroup.sub_questions.length + 1})`,
          question_text: r.question_text,
          marks: parseFloat(r.marks) || 1,
          evaluation_type: r.evaluation_type || "लेखी",
          question_type: r.question_type || "वस्तुनिष्ठ",
          objective: r.objective || "उपयोजन",
          skill_feature: r.skill_feature || "",
          learning_outcome_code: r.learning_outcome_code || "05.71.01",
        });
      });
      return gList;
    }
    return [];
  }, [data]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => {
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
          sub_questions: filteredSubQs.length > 0 ? filteredSubQs : g.sub_questions,
        };
      })
      .filter(Boolean);
  }, [groups, searchTerm, selectedUnit, selectedObjective]);

  // Unique units & objectives
  const allUnits = useMemo(() => {
    return Array.from(new Set(groups.map((g) => g.unit_chapter).filter(Boolean)));
  }, [groups]);

  const allObjectives = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) =>
      g.sub_questions.forEach((sq) => {
        if (sq.objective) set.add(sq.objective);
      })
    );
    return Array.from(set);
  }, [groups]);

  // Download PDF Table using html2pdf.js
  const handleDownloadPdfTable = async () => {
    if (!containerRef.current) return;
    setDownloading(true);
    toast.info("📄 PDF तक्ता तयार करून डाऊनलोड होत आहे...");
    try {
      const cleanSubj = (metadata.subject || "Question_Bank").replace(/[^a-zA-Z0-9_\-]/g, "_");
      const pdfBlob = await convertElementToPdfBlob(
        containerRef.current,
        `Question_Bank_${cleanSubj}.pdf`
      );
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Question_Bank_Table_${cleanSubj}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("🎉 PDF तक्ता यशस्वीरित्या डाऊनलोड झाला!");
    } catch (pdfErr) {
      console.warn("PDF generation notice, falling back to window print:", pdfErr);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen p-3 sm:p-6 space-y-5 font-sans">
      {/* ── 1. EXACT HEADER METADATA BANNER ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider">
                {metadata.form_number}
              </span>
              <span className="px-3.5 py-1 rounded-full bg-white/15 text-amber-300 text-xs font-bold border border-white/10">
                {metadata.academic_year}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <BookOpen className="size-8 text-amber-300 shrink-0" />
              <span>
                {metadata.standard_class} &nbsp;|&nbsp; {metadata.subject}
              </span>
            </h1>
          </div>

          {/* PDF Download Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadPdfTable}
              disabled={downloading}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4 text-slate-950" />}
              <span>PDF तक्ता डाऊनलोड (Download PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. SEARCH & FILTER BAR ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="प्रश्न किंवा कोड शोधा (Search questions or outcome code)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Unit Filter */}
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700"
          >
            <option value="ALL">सर्व घटक (All Units)</option>
            {allUnits.map((u, i) => (
              <option key={i} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Objective Filter */}
          <select
            value={selectedObjective}
            onChange={(e) => setSelectedObjective(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-700"
          >
            <option value="ALL">सर्व उद्दिष्टे (All Objectives)</option>
            {allObjectives.map((o, i) => (
              <option key={i} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 3. EXACT 9-COLUMN EDUCATIONAL TABLE CONTAINER ────────────────────── */}
      <div ref={containerRef} className="bg-white rounded-3xl border-2 border-slate-300 shadow-xl overflow-x-auto p-2">
        <table className="w-full border-collapse border border-slate-400 text-xs font-sans">
          {/* 9 COLUMNS HEADER (Exact reference titles & light yellow bg #fef3c7) */}
          <thead>
            <tr className="bg-amber-100 text-slate-900 font-black border-b-2 border-slate-900 text-center" style={{ backgroundColor: "#fef3c7" }}>
              <th className="p-3 border border-slate-400 font-extrabold w-[6%]">{headers[0]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[13%]">{headers[1]}</th>
              <th className="p-3 border border-slate-400 font-extrabold text-left w-[33%]">{headers[2]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[5%]">{headers[3]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[8%]">{headers[4]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[9%]">{headers[5]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[9%]">{headers[6]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[9%]">{headers[7]}</th>
              <th className="p-3 border border-slate-400 font-extrabold w-[8%]">{headers[8]}</th>
            </tr>
          </thead>

          {/* TABLE BODY (Grouped with Explicit layout_spacing Blank Spacers) */}
          <tbody>
            {filteredGroups && filteredGroups.length > 0 ? (
              filteredGroups.map((g, gIdx) => (
                <React.Fragment key={gIdx}>
                  {/* Main Parent Instruction Header Row - Clean Plain Banner */}
                  <tr className="bg-indigo-950 text-white font-bold border-b border-indigo-900" style={{ backgroundColor: "#1e1b4b", color: "#ffffff" }}>
                    <td className="p-3 border border-indigo-900 font-black text-amber-300 text-xs" colSpan={9}>
                      📌 {g!.main_instruction}
                    </td>
                  </tr>

                  {/* Sub-Questions Rows */}
                  {g!.sub_questions.map((sq: any, sqIdx: number) => {
                    const isInstructionHeader = String(sq.question_text || "").trim().startsWith("*");

                    if (isInstructionHeader) {
                      return (
                        <tr
                          key={sqIdx}
                          className="bg-indigo-950 text-white font-bold border-b border-indigo-900"
                          style={{ backgroundColor: "#1e1b4b", color: "#ffffff" }}
                        >
                          <td className="p-3 border border-indigo-900 font-black text-amber-300 text-xs text-left" colSpan={9}>
                            📌 {sq.question_text}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={sqIdx} className="border-b border-slate-300 hover:bg-amber-50/30 transition-colors">
                        <td className="p-2.5 border border-slate-300 text-center font-bold text-slate-800 bg-slate-50">
                          {sq.sub_question_index || sq.sub_index || sq.sub_question_no}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center text-slate-700 font-medium bg-slate-50/70">
                          {g!.unit_chapter}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-slate-900 font-semibold leading-relaxed whitespace-pre-wrap">
                          {sq.question_text}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center font-black text-indigo-900">
                          {sq.marks}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center text-slate-800 font-bold bg-purple-50/40">
                          {sq.evaluation_type}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center text-slate-800 font-bold bg-blue-50/40">
                          {sq.question_type}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center font-bold text-emerald-900 bg-emerald-50/40">
                          {sq.objective}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center text-slate-700 text-[11px] leading-tight">
                          {sq.skill_feature || g!.skill_feature}
                        </td>
                        <td className="p-2.5 border border-slate-300 text-center font-mono font-bold text-slate-900 bg-amber-50/40">
                          {sq.learning_outcome_code}
                        </td>
                      </tr>
                    );
                  })}

                  {/* EXPLICIT LAYOUT SPACING / BLANK SEPARATOR ROW AFTER EACH GROUP */}
                  {g!.layout_spacing?.is_blank_spacer && (
                    <tr className="h-5 bg-slate-100/80 border-t-2 border-b-2 border-slate-300" style={{ height: g!.layout_spacing.padding_bottom || "20px" }}>
                      <td colSpan={9} className="h-5 text-center text-[10px] text-slate-400 font-bold bg-slate-200/50 tracking-widest select-none">
                        ✦ ✦ ✦
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-500 font-bold">
                  कोणतेही प्रश्न सापडले नाहीत. कृपया शोध किंवा फिल्टर बदलून पहा.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── 4. FOOTER SIGNATURES ──────────────────────────────────────────────── */}
        <div className="flex justify-between items-center pt-6 px-4 text-xs font-bold text-slate-800 border-t border-slate-300 mt-4">
          <div>✍️ विषय शिक्षक स्वाक्षरी</div>
          <div>✍️ मुख्याध्यापक स्वाक्षरी</div>
        </div>
      </div>
    </div>
  );
};
