"use strict";
import { jsx, jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Download, Printer, Loader2, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { matchStudentClassAndMedium } from "./firestoreMarksHelper";
import { getTeacherId } from "@/lib/teacherIsolationHelper";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
const getMarathiGrade = (percent) => {
  if (percent === void 0 || percent === null || isNaN(percent) || percent <= 0) return "-";
  const p = Number(percent);
  if (p >= 91) return "\u0905-1";
  if (p >= 81) return "\u0905-2";
  if (p >= 71) return "\u092C-1";
  if (p >= 61) return "\u092C-2";
  if (p >= 51) return "\u0915-1";
  if (p >= 41) return "\u0915-2";
  if (p >= 33) return "\u0921";
  return "\u0907-1";
};
const getSubjectDisplayLabel = (subName) => {
  if (!subName) return "";
  const s = String(subName).trim();
  if (s.toLowerCase().includes("\u092E\u0930\u093E\u0920\u0940") && !s.includes("\u092A\u094D\u0930\u0925\u092E")) return "\u092A\u094D\u0930\u0925\u092E \u092D\u093E\u0937\u093E: \u092E\u0930\u093E\u0920\u0940";
  if (s.toLowerCase().includes("\u0907\u0902\u0917\u094D\u0930\u091C\u0940") && !s.includes("\u0924\u0943\u0924\u0940\u092F") && !s.includes("\u0926\u094D\u0935\u093F\u0924\u0940\u092F")) return "\u0924\u0943\u0924\u0940\u092F \u092D\u093E\u0937\u093E: \u0907\u0902\u0917\u094D\u0930\u091C\u0940";
  if (s.toLowerCase().includes("\u0939\u093F\u0902\u0926\u0940") && !s.includes("\u0924\u0943\u0924\u0940\u092F") && !s.includes("\u0926\u094D\u0935\u093F\u0924\u0940\u092F")) return "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u092D\u093E\u0937\u093E: \u0939\u093F\u0902\u0926\u0940";
  if (s.toLowerCase().includes("\u0936\u093E\u0930\u0940\u0930\u093F\u0915")) return "\u0936\u093E\u0930\u0940\u0930\u093F\u0915 \u0936\u093F\u0915\u094D\u0937\u0923";
  return s;
};
const formatClassName = (clsStr) => {
  if (!clsStr) return "1";
  const s = String(clsStr).trim();
  const match = s.match(/\d+/);
  return match ? match[0] : s;
};
export default function AnnualResultRegister({ initialClass, initialYear, onBack }) {
  const [selectedClass, setSelectedClass] = useState(
    initialClass || localStorage.getItem("cce_selected_class") || "1st"
  );
  const [academicYear, setAcademicYear] = useState(
    initialYear || localStorage.getItem("cce_academic_year") || "2025-26"
  );
  const [selectedMedium, setSelectedMedium] = useState(
    localStorage.getItem("cce_selected_medium") || "marathi"
  );
  const [schoolName, setSchoolName] = useState(
    localStorage.getItem("schoolName") || localStorage.getItem("teacher_school_name") || "\u091C\u093F\u0932\u094D\u0939\u093E \u092A\u0930\u093F\u0937\u0926 \u0936\u093E\u0933\u093E \u0927\u094B\u0902\u0921\u0947\u0935\u093E\u0921\u0940(\u092A\u0947\u0921)\u0924\u093E.\u0924\u093E\u0938\u0917\u093E\u0935 \u091C\u093F.\u0938\u093E\u0902\u0917\u0932\u0940"
  );
  const [division, setDivision] = useState("1");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sem1MarksData, setSem1MarksData] = useState({});
  const [sem2MarksData, setSem2MarksData] = useState({});
  const printRef = useRef(null);
  useEffect(() => {
    loadRegisterData();
  }, [selectedClass, academicYear, selectedMedium]);
  const loadRegisterData = async () => {
    setLoading(true);
    try {
      let sName = "";
      try {
        const cached = localStorage.getItem("cce_general_school_settings");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.schoolName) sName = parsed.schoolName;
        }
      } catch (e) {
      }
      if (!sName) {
        sName = localStorage.getItem("schoolName") || localStorage.getItem("teacher_school_name") || "";
      }
      if (!sName) {
        try {
          const genSnap = await getDoc(doc(db, "school_settings", "general"));
          if (genSnap.exists() && genSnap.data().schoolName) {
            sName = genSnap.data().schoolName;
          }
        } catch (e) {
        }
      }
      if (sName) setSchoolName(sName);
      const classSubjects = getDefaultSubjectsForClass(selectedClass, selectedMedium) || [
        "\u092E\u0930\u093E\u0920\u0940",
        "\u0907\u0902\u0917\u094D\u0930\u091C\u0940",
        "\u0917\u0923\u093F\u0924",
        "\u0915\u0932\u093E",
        "\u0915\u093E\u0930\u094D\u092F\u093E\u0928\u0941\u092D\u0935",
        "\u0936\u093E\u0930\u0940\u0930\u093F\u0915 \u0936\u093F\u0915\u094D\u0937\u0923 \u0935 \u0906\u0930\u094B\u0917\u094D\u092F"
      ];
      setSubjects(classSubjects);
      const uSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      const matchedStudents = [];
      uSnap.forEach((docSnap) => {
        const sData = docSnap.data();
        if (matchStudentClassAndMedium({ id: docSnap.id, ...sData }, selectedClass, selectedMedium)) {
          matchedStudents.push({ id: docSnap.id, ...sData });
        }
      });
      matchedStudents.sort((a, b) => {
        const rA = parseInt(a.rollNo || a.roll_number || "999", 10);
        const rB = parseInt(b.rollNo || b.roll_number || "999", 10);
        return rA - rB;
      });
      setStudents(matchedStudents);
      const currentTeacherId = getTeacherId();
      const loadSemesterMarks = async (semKey) => {
        let merged = {};
        const aliasBunny = semKey === "sem1" ? "first" : "second";
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const b1 = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_${semKey}.json`);
          if (b1) Object.assign(merged, b1.records || b1.marksData || b1);
          const bAlias = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks_${aliasBunny}.json`);
          if (bAlias) Object.assign(merged, bAlias.records || bAlias.marksData || bAlias);
          const bGen = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_marks.json`);
          if (bGen) Object.assign(merged, bGen.records || bGen.marksData || bGen);
        } catch (e) {
        }
        const docIds = [
          ...currentTeacherId ? [
            `${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}_${semKey}`,
            `${currentTeacherId}_${selectedClass}_${academicYear}_${semKey}`,
            `${currentTeacherId}_${selectedClass}_${academicYear}`
          ] : [],
          `${selectedClass}_${selectedMedium}_${academicYear}_${semKey}`,
          `${selectedClass}_${academicYear}_${semKey}`,
          `${selectedClass}_${academicYear}`
        ];
        for (const dId of docIds) {
          try {
            const mSnap = await getDoc(doc(db, "cce_marks_v2", dId));
            if (mSnap.exists()) {
              const dData = mSnap.data();
              const recs = dData.records || dData.marksData || dData.marks || dData.data || dData;
              if (recs && typeof recs === "object") {
                Object.assign(merged, recs);
              }
            }
          } catch (e) {
          }
        }
        return merged;
      };
      const sem1 = await loadSemesterMarks("sem1");
      const sem2 = await loadSemesterMarks("sem2");
      setSem1MarksData(sem1);
      setSem2MarksData(sem2);
    } catch (err) {
      console.error("Error loading Annual Result Register:", err);
    }
    setLoading(false);
  };
  const getSubjectMarkForTerm = (student, subjectName, termData) => {
    if (!student || !termData) return 0;
    const stdKeys = [student.id, student.rollNo, String(student.rollNo), student.name, student.fullName, student.studentId];
    let stdRec = null;
    for (const k of stdKeys) {
      if (k && termData[k]) {
        stdRec = termData[k];
        break;
      }
    }
    if (!stdRec) return 0;
    const targetSubLower = subjectName.toLowerCase();
    const matchedKey = Object.keys(stdRec).find(
      (k) => k.toLowerCase() === targetSubLower || k.includes(subjectName) || subjectName.includes(k)
    );
    if (!matchedKey || !stdRec[matchedKey]) return 0;
    const subVal = stdRec[matchedKey];
    if (typeof subVal === "number") return subVal;
    if (typeof subVal === "string" && !isNaN(subVal)) return Number(subVal);
    if (typeof subVal === "object") {
      if (subVal.total !== void 0) return Number(subVal.total) || 0;
      if (subVal.obtained !== void 0) return Number(subVal.obtained) || 0;
      if (subVal.mark !== void 0) return Number(subVal.mark) || 0;
      let sum = 0;
      const markKeys = [
        "tondiKaam",
        "pratyakshikPrayog",
        "upakramKriti",
        "prakalpa",
        "chaachaniLekhi",
        "swadhyayVargakarya",
        "itar",
        "sankalitTondi",
        "sankalitPratyakshik",
        "sankalitLekhi"
      ];
      markKeys.forEach((mk) => {
        if (subVal[mk] !== void 0 && subVal[mk] !== null && subVal[mk] !== "") {
          const n = Number(subVal[mk]);
          if (!isNaN(n)) sum += n;
        }
      });
      return sum;
    }
    return 0;
  };
  const handlePrint = () => {
    window.print();
  };
  return /* @__PURE__ */ jsxs("div", { className: "bg-slate-50 min-h-screen p-4 sm:p-6 font-sans", children: [
    /* @__PURE__ */ jsxs("div", { className: "no-print max-w-7xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        onBack && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: onBack,
            className: "p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600 cursor-pointer",
            children: /* @__PURE__ */ jsx(ArrowLeft, { className: "size-5" })
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-base font-bold text-slate-800", children: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915 (Annual Result Sheet)" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500", children: [
            "\u0907\u092F\u0924\u094D\u0924\u093E ",
            formatClassName(selectedClass),
            " \u0935\u0940 | \u0938\u0924\u094D\u0930 \u0967 \u0935 \u0968 \u0917\u0941\u0923 \u0938\u0902\u0915\u0932\u0928"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: loadRegisterData,
            className: "flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsx(RefreshCw, { className: "size-4" }),
              " \u0930\u093F\u092B\u094D\u0930\u0947\u0936"
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: handlePrint,
            className: "flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all cursor-pointer",
            children: [
              /* @__PURE__ */ jsx(Printer, { className: "size-4" }),
              " \u092A\u094D\u0930\u093F\u0902\u091F \u0915\u093E\u0922\u093E"
            ]
          }
        )
      ] })
    ] }),
    loading ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] text-slate-500", children: [
      /* @__PURE__ */ jsx(Loader2, { className: "size-9 text-emerald-600 animate-spin mb-3" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-700", children: "\u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915 \u0932\u094B\u0921 \u0939\u094B\u0924 \u0906\u0939\u0947..." })
    ] }) : /* @__PURE__ */ jsxs(
      "div",
      {
        ref: printRef,
        className: "print-area max-w-[100%] mx-auto bg-white p-6 rounded-2xl border border-slate-300 shadow-xl overflow-x-auto",
        style: { fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" },
        children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ jsx("h1", { className: "text-xl sm:text-2xl font-black text-slate-900 tracking-wide mb-4", style: { color: "#2b4009" }, children: "\u0938\u093E\u0924\u0924\u094D\u092F\u092A\u0942\u0930\u094D\u0923 \u0938\u0930\u094D\u0935\u0902\u0915\u0937 \u092E\u0942\u0932\u094D\u092F\u092E\u093E\u092A\u0928: \u0935\u093E\u0930\u094D\u0937\u093F\u0915 \u0928\u093F\u0915\u093E\u0932 \u092A\u0924\u094D\u0930\u0915" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center justify-between text-xs sm:text-sm font-bold text-slate-800 px-2 py-1 border-b-2 border-slate-800 gap-2", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "font-extrabold", children: "\u0936\u093E\u0933\u093E:" }),
                " ",
                schoolName
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "font-extrabold", children: "\u0907\u092F\u0924\u094D\u0924\u093E:" }),
                " ",
                formatClassName(selectedClass)
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "font-extrabold", children: "\u0924\u0941\u0915\u0921\u0940:" }),
                " ",
                division
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "font-extrabold", children: "\u0938\u0928:" }),
                " ",
                academicYear
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(
            "table",
            {
              className: "w-full text-center text-xs border-collapse border border-slate-800",
              style: { borderColor: "#2b4009", borderWidth: "1.5px" },
              children: [
                /* @__PURE__ */ jsxs("thead", { children: [
                  /* @__PURE__ */ jsxs("tr", { style: { backgroundColor: "#edf5bd", color: "#1f2e0c" }, children: [
                    /* @__PURE__ */ jsx(
                      "th",
                      {
                        rowSpan: 3,
                        className: "border border-slate-700 px-2 py-2 font-black",
                        style: { width: "40px" },
                        children: "\u0905. \u0915\u094D\u0930."
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "th",
                      {
                        rowSpan: 3,
                        className: "border border-slate-700 px-3 py-2 font-black text-left",
                        style: { minWidth: "160px" },
                        children: "\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u094D\u092F\u093E\u091A\u0947 \u0928\u093E\u0935"
                      }
                    ),
                    subjects.map((sub, sIdx) => /* @__PURE__ */ jsx(
                      "th",
                      {
                        colSpan: 4,
                        className: "border border-slate-700 px-2 py-1 font-extrabold text-sm",
                        children: getSubjectDisplayLabel(sub)
                      },
                      sIdx
                    )),
                    /* @__PURE__ */ jsx("th", { rowSpan: 3, className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u0909\u092A\u0938\u094D\u0925\u093F\u0924\u0940" }) }),
                    /* @__PURE__ */ jsx("th", { rowSpan: 3, className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u090F\u0915\u0942\u0923" }) }),
                    /* @__PURE__ */ jsx("th", { rowSpan: 3, className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u091F\u0915\u094D\u0915\u0947\u0935\u093E\u0930\u0940" }) }),
                    /* @__PURE__ */ jsx("th", { rowSpan: 3, className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u0936\u094D\u0930\u0947\u0923\u0940" }) })
                  ] }),
                  /* @__PURE__ */ jsx("tr", { style: { backgroundColor: "#edf5bd", color: "#1f2e0c" }, children: subjects.map((_, sIdx) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u092A\u094D\u0930\u0925\u092E \u0938\u0924\u094D\u0930" }) }),
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u0926\u094D\u0935\u093F\u0924\u0940\u092F \u0938\u0924\u094D\u0930" }) }),
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u090F\u0915\u0942\u0923" }) }),
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-bold", children: /* @__PURE__ */ jsx("div", { className: "writing-vertical", children: "\u0936\u094D\u0930\u0947\u0923\u0940" }) })
                  ] }, sIdx)) }),
                  /* @__PURE__ */ jsx("tr", { style: { backgroundColor: "#edf5bd", color: "#1f2e0c" }, children: subjects.map((_, sIdx) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-extrabold", children: "100" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-extrabold", children: "100" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1 font-extrabold", children: "200" }),
                    /* @__PURE__ */ jsx("th", { className: "border border-slate-700 px-1 py-1" })
                  ] }, sIdx)) })
                ] }),
                /* @__PURE__ */ jsx("tbody", { children: students.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx(
                  "td",
                  {
                    colSpan: 2 + subjects.length * 4 + 4,
                    className: "border border-slate-700 py-8 text-center text-slate-500 font-bold",
                    children: "\u092F\u093E \u0907\u092F\u0924\u094D\u0924\u0947\u0924 \u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u093E\u0939\u0940\u0924."
                  }
                ) }) : students.map((st, idx) => {
                  let grandTotalObt = 0;
                  const grandTotalMax = subjects.length * 200;
                  const subjectRows = subjects.map((sub) => {
                    const m1 = getSubjectMarkForTerm(st, sub, sem1MarksData);
                    const m2 = getSubjectMarkForTerm(st, sub, sem2MarksData);
                    const subTotal = m1 + m2;
                    grandTotalObt += subTotal;
                    const subPercent = subTotal / 200 * 100;
                    const subGrade = getMarathiGrade(subPercent);
                    return { m1, m2, subTotal, subGrade };
                  });
                  const overallPercent = grandTotalMax > 0 ? grandTotalObt / grandTotalMax * 100 : 0;
                  const overallGrade = getMarathiGrade(overallPercent);
                  const attendance = st.attendance || st.presentDays || 234;
                  return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-slate-50 transition-colors", children: [
                    /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-2 py-1.5 font-bold text-center", children: idx + 1 }),
                    /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-3 py-1.5 font-bold text-left text-slate-900 whitespace-nowrap", children: st.fullName || st.name || `\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940 ${idx + 1}` }),
                    subjectRows.map((subRes, sIdx) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
                      /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-semibold text-slate-800", children: subRes.m1 > 0 ? subRes.m1 : "-" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-semibold text-slate-800", children: subRes.m2 > 0 ? subRes.m2 : "-" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-black text-slate-950", children: subRes.subTotal > 0 ? subRes.subTotal : "-" }),
                      /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-extrabold text-slate-900", children: subRes.subGrade })
                    ] }, sIdx)),
                    /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-bold text-slate-800", children: attendance }),
                    /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-black text-slate-950", children: grandTotalObt > 0 ? grandTotalObt : "-" }),
                    /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-black text-slate-950", children: overallPercent > 0 ? overallPercent.toFixed(2) : "-" }),
                    /* @__PURE__ */ jsx("td", { className: "border border-slate-700 px-1.5 py-1.5 font-black text-slate-950", children: overallGrade })
                  ] }, st.id || idx);
                }) })
              ]
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx("style", { children: `
        .writing-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          text-align: center;
          white-space: nowrap;
          margin: 0 auto;
          padding: 8px 2px;
          height: 100px;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
      ` })
  ] });
}
