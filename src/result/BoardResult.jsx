import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, ArrowLeft, Loader2, AlertCircle, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { getDefaultSubjectsForClass } from "@/data/cceSubjects";
import { getTeacherId, matchStudentTeacherClassAndMedium } from "../lib/teacherIsolationHelper";
import { fetchStudentsForClass, hasStudentFilledData, normalizeClassKey } from "./firestoreMarksHelper";
import "./result.css";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कलाशिक्षण",
  "कार्यशिक्षण",
  "शारीरिक शिक्षण",
];

// Calculate Grade from Percentage
const getGrade = (percentage) => {
  if (percentage >= 91) return "अ-1";
  if (percentage >= 81) return "अ-2";
  if (percentage >= 71) return "ब-1";
  if (percentage >= 61) return "ब-2";
  if (percentage >= 51) return "क-1";
  if (percentage >= 41) return "क-2";
  if (percentage >= 33) return "ड";
  if (percentage >= 21) return "इ-1";
  return "इ-2";
};

const GRADE_KEYS = ["a1", "a2", "b1", "b2", "c1", "c2", "d", "i1", "i2"];
const GRADE_LABELS = {
  a1: "अ-1",
  a2: "अ-2",
  b1: "ब-1",
  b2: "ब-2",
  c1: "क-1",
  c2: "क-2",
  d: "ड",
  i1: "इ-1",
  i2: "इ-2",
};

const getGradeKeyFromScore = (score, max = 100) => {
  const pct = (score / max) * 100;
  if (pct >= 91) return "a1";
  if (pct >= 81) return "a2";
  if (pct >= 71) return "b1";
  if (pct >= 61) return "b2";
  if (pct >= 51) return "c1";
  if (pct >= 41) return "c2";
  if (pct >= 33) return "d";
  if (pct >= 21) return "i1";
  return "i2";
};

// A4 Page Mobile Scale Wrapper to show authentic A4 proportions on mobile without horizontal scrollbar
function A4PageWrapper({ children, isLandscape = false, isLegal = false }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const targetWidth = isLegal ? 1344 : isLandscape ? 1123 : 794;

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const parentWidth = rect.width || containerRef.current.clientWidth || window.innerWidth;
      if (parentWidth > 0 && parentWidth < targetWidth) {
        setScale(Number((parentWidth / targetWidth).toFixed(4)));
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [targetWidth]);

  const supportsZoom = typeof document !== "undefined" && "zoom" in document.documentElement.style;

  return (
    <div
      ref={containerRef}
      className="a4-page-scale-wrapper w-full flex justify-center mb-6"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
      }}
    >
      <div
        className="a4-page-scale-inner"
        style={
          scale < 1
            ? supportsZoom
              ? {
                  zoom: scale,
                  width: `${targetWidth}px`,
                  minWidth: `${targetWidth}px`,
                  maxWidth: `${targetWidth}px`,
                }
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  width: `${targetWidth}px`,
                  minWidth: `${targetWidth}px`,
                  maxWidth: `${targetWidth}px`,
                  marginBottom: `-${Math.round((1 - scale) * (isLegal ? 816 : isLandscape ? 794 : 1123))}px`,
                }
            : {
                width: `${targetWidth}px`,
                minWidth: `${targetWidth}px`,
                maxWidth: `${targetWidth}px`,
              }
        }
      >
        {children}
      </div>
    </div>
  );
}

// Default weightage rules when user hasn't filled Bharansh Nischiti
const getDefaultSubjectWeightage = (clsStr, isPractical) => {
  if (isPractical) {
    return {
      tondiKaam: "20",
      pratyakshikPrayog: "40",
      upakramKriti: "40",
      prakalpa: "20",
      chaachaniLekhi: "10",
      swadhyayVargakarya: "10",
      itar: "10",
      sankalitTondi: "0",
      sankalitPratyakshik: "0",
      sankalitLekhi: "0",
    };
  }

  const c = String(clsStr || "").toLowerCase().trim();
  const is1or2 = c.includes("1") || c.includes("2") || c.includes("पहिली") || c.includes("दुसरी");
  const is3or4 = c.includes("3") || c.includes("4") || c.includes("तिसरी") || c.includes("चौथी");
  const is5or6 = c.includes("5") || c.includes("6") || c.includes("पाचवी") || c.includes("सहावी");
  const is7or8 = c.includes("7") || c.includes("8") || c.includes("सातवी") || c.includes("आठवी");

  if (is1or2) {
    // आकारिक 70 + संकलित 30 = 100
    return {
      tondiKaam: "10",
      pratyakshikPrayog: "10",
      upakramKriti: "10",
      prakalpa: "10",
      chaachaniLekhi: "20",
      swadhyayVargakarya: "10",
      itar: "0",
      sankalitTondi: "5",
      sankalitPratyakshik: "5",
      sankalitLekhi: "20",
    };
  } else if (is3or4) {
    // आकारिक 60 + संकलित 40 = 100
    return {
      tondiKaam: "10",
      pratyakshikPrayog: "10",
      upakramKriti: "10",
      prakalpa: "10",
      chaachaniLekhi: "10",
      swadhyayVargakarya: "10",
      itar: "0",
      sankalitTondi: "5",
      sankalitPratyakshik: "5",
      sankalitLekhi: "30",
    };
  } else if (is5or6) {
    // आकारिक 50 + संकलित 50 = 100
    return {
      tondiKaam: "10",
      pratyakshikPrayog: "5",
      upakramKriti: "10",
      prakalpa: "10",
      chaachaniLekhi: "10",
      swadhyayVargakarya: "5",
      itar: "0",
      sankalitTondi: "5",
      sankalitPratyakshik: "5",
      sankalitLekhi: "40",
    };
  } else if (is7or8) {
    // आकारिक 40 + संकलित 60 = 100
    return {
      tondiKaam: "5",
      pratyakshikPrayog: "5",
      upakramKriti: "10",
      prakalpa: "10",
      chaachaniLekhi: "5",
      swadhyayVargakarya: "5",
      itar: "0",
      sankalitTondi: "5",
      sankalitPratyakshik: "5",
      sankalitLekhi: "50",
    };
  } else {
    // Default fallback (Class 1 & 2: 70 + 30 = 100)
    return {
      tondiKaam: "10",
      pratyakshikPrayog: "10",
      upakramKriti: "10",
      prakalpa: "10",
      chaachaniLekhi: "20",
      swadhyayVargakarya: "10",
      itar: "0",
      sankalitTondi: "5",
      sankalitPratyakshik: "5",
      sankalitLekhi: "20",
    };
  }
};

const CASTE_CATEGORIES = [
  { key: "sc", label: "अनुसूचित जाती" },
  { key: "st", label: "अनुसूचित जमाती" },
  { key: "vjnt", label: "वि.जा.भ. जमाती" },
  { key: "obc", label: "इतर मागास" },
  { key: "open", label: "बिगर मागास" },
];

const isGirlStudent = (student) => {
  if (!student) return false;
  const g = String(student?.gender || student?.ling || student?.sex || student?.studentGender || student?.genderType || "").trim().toLowerCase();
  return (
    g.includes("girl") ||
    g.includes("female") ||
    g.includes("मुलगी") ||
    g.includes("मुली") ||
    g.includes("स्त्री") ||
    g === "f" ||
    g === "2"
  );
};

const getMarathiClassName = (clsStr) => {
  if (!clsStr) return "पहिली";
  const num = String(clsStr).match(/\d+/);
  const n = num ? parseInt(num[0], 10) : 1;
  const names = ["", "पहिली", "दुसरी", "तिसरी", "चौथी", "पाचवी", "सहावी", "सातवी", "आठवी", "नववी", "दहावी"];
  return names[n] || `${n} वी`;
};

const formatDivision = (divVal) => {
  if (divVal === undefined || divVal === null || String(divVal).trim() === "") return "";
  return String(divVal).trim();
};

const isBoyStudent = (student) => {
  if (!student) return false;
  if (isGirlStudent(student)) return false;
  return true;
};

const getStudentCasteCategory = (student) => {
  if (!student) return null;
  const raw = String(
    student?.caste ||
    student?.category ||
    student?.jaat ||
    student?.castCategory ||
    ""
  ).trim().toLowerCase();

  if (!raw || raw === "n/a" || raw === "none" || raw === "undefined" || raw === "null") {
    return null;
  }

  const tokens = raw.split(/[\s,_\-/()]+/);

  // 1. SC (Scheduled Caste / अनुसूचित जाती)
  if (
    tokens.includes("sc") ||
    raw.includes("scheduled caste") ||
    raw.includes("अनुसूचित जाती") ||
    raw.includes("अनुसूचीत जाती") ||
    raw.includes("मातंग") ||
    raw.includes("चर्मकार") ||
    raw.includes("बौद्ध") ||
    raw.includes("महार")
  ) {
    return "sc";
  }

  // 2. ST (Scheduled Tribe / अनुसूचित जमाती)
  if (
    tokens.includes("st") ||
    raw.includes("scheduled tribe") ||
    raw.includes("अनुसूचित जमाती") ||
    raw.includes("अनुसूचीत जमाती") ||
    raw.includes("भिल्ल") ||
    raw.includes("कोळी")
  ) {
    return "st";
  }

  // 3. VJNT (विमुक्त जाती व भटक्या जमाती / VJ / NTB / NTC / NTD)
  if (
    tokens.includes("vj") ||
    tokens.includes("nt") ||
    tokens.includes("vjnt") ||
    tokens.includes("ntb") ||
    tokens.includes("ntc") ||
    tokens.includes("ntd") ||
    raw.includes("vj-a") ||
    raw.includes("nt-b") ||
    raw.includes("nt-c") ||
    raw.includes("nt-d") ||
    raw.includes("vimukta") ||
    raw.includes("nomadic") ||
    raw.includes("वि.जा") ||
    raw.includes("भ.ज") ||
    raw.includes("विजा") ||
    raw.includes("भज") ||
    raw.includes("विमुक्त") ||
    raw.includes("भटक्या") ||
    raw.includes("धनगर") ||
    raw.includes("वंजारी")
  ) {
    return "vjnt";
  }

  // 4. OBC / SBC (इतर मागास / विशेष मागास)
  if (
    tokens.includes("obc") ||
    tokens.includes("sbc") ||
    raw.includes("other backward") ||
    raw.includes("special backward") ||
    raw.includes("इतर मागास") ||
    raw.includes("विशेष मागास") ||
    raw.includes("ओबीसी") ||
    raw.includes("एसबीसी") ||
    raw.includes("माळी") ||
    raw.includes("तेली") ||
    raw.includes("कुणबी")
  ) {
    return "obc";
  }

  // 5. OPEN / General (बिगर मागास / खुला)
  if (
    tokens.includes("open") ||
    tokens.includes("general") ||
    raw.includes("बिगर मागास") ||
    raw.includes("खुला") ||
    raw.includes("सर्वसाधारण")
  ) {
    return "open";
  }

  return null;
};

const BoardResult = ({ initialClass = "1st", initialYear = "2025-26", initialTerm = "sem2", initialMedium, onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [division, setDivision] = useState("");
  const [pageMode, setPageMode] = useState("2pages");
  const [showLayoutModal, setShowLayoutModal] = useState(true);
  const [selectedMedium, setSelectedMedium] = useState(() => {
    if (initialMedium) return initialMedium;
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("cce_selected_medium") || "marathi";
    }
    return "marathi";
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (initialMedium && initialMedium !== selectedMedium) {
      setSelectedMedium(initialMedium);
    }
  }, [initialMedium]);

  useEffect(() => {
    const handleMediumUpdate = () => {
      if (typeof localStorage !== "undefined") {
        const storedMedium = localStorage.getItem("cce_selected_medium");
        if (storedMedium && storedMedium !== selectedMedium) {
          setSelectedMedium(storedMedium);
        }
      }
    };

    window.addEventListener("cce_settings_updated", handleMediumUpdate);
    window.addEventListener("storage", handleMediumUpdate);
    return () => {
      window.removeEventListener("cce_settings_updated", handleMediumUpdate);
      window.removeEventListener("storage", handleMediumUpdate);
    };
  }, [selectedMedium]);

  // User's School & Teacher Settings (No hardcoded sample names)
  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    rawSchoolName: "",
    address: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
    slogan: "मुलांचा सर्वांगीण विकास — हाच आमचा ध्यास!",
    schoolLogo: "",
    teacherSignature: "",
    headmasterSignature: "",
  });

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [sem1MarksData, setSem1MarksData] = useState({});
  const [sem2MarksData, setSem2MarksData] = useState({});
  const [totalWorkingDays, setTotalWorkingDays] = useState(0);
  const [weightageData, setWeightageData] = useState({});
  const [selectedTerm, setSelectedTerm] = useState(initialTerm || "sem2"); // "sem1" = प्रथम सत्र | "sem2" = द्वितीय सत्र

  const printRef = useRef(null);

  useEffect(() => {
    loadUserFirestoreData(selectedTerm);
    const handleWeightageUpdate = () => {
      loadUserFirestoreData(selectedTerm);
    };
    window.addEventListener("cce_weightage_updated", handleWeightageUpdate);
    return () => {
      window.removeEventListener("cce_weightage_updated", handleWeightageUpdate);
    };
  }, [selectedClass, academicYear, selectedMedium, selectedTerm]);

  const loadUserFirestoreData = async (term = "sem2") => {
    const termSuffix = term === "sem1" ? "sem1" : "sem2";
    setLoading(true);
    try {
      const docId = `${selectedClass}_${academicYear}`;
      const currentTeacherId = getTeacherId();

      // 1. Fetch Global & Class Settings (from CCESettings / Bunny Storage / school_settings)
      try {
        let schoolName = "";
        let udise = "";
        let teacherName = "";
        let headmasterName = "";
        let address = "";
        let slogan = "मुलांचा सर्वांगीण विकास — हाच आमचा ध्यास!";
        let schoolLogo = "";
        let teacherSignature = "";
        let headmasterSignature = "";
        let customSubjects = null;
        const uid = currentTeacherId;
        const medKey = selectedMedium.toLowerCase().includes("semi") ? "semi" : "marathi";

        const isCleanSchoolName = (val) => {
          if (!val || typeof val !== "string") return false;
          const s = val.trim();
          if (!s || s.includes("___") || s.toLowerCase().includes("willingdon")) return false;
          return true;
        };

        // 1a. User's own Firestore account profile (users & teachers collections where user filled school name)
        if (uid && uid !== "default_teacher" && uid !== "guest") {
          try {
            const uSnap = await getDoc(doc(db, "users", uid));
            if (uSnap.exists()) {
              const uData = uSnap.data();
              const cand = uData.schoolName || uData.school || uData.institutionName || uData.schoolConnection?.schoolName ||
                (uData.displayName && uData.displayName !== "Educator" && uData.displayName !== "Teacher" ? uData.displayName : null) ||
                (uData.fullName && uData.fullName !== "Educator" && uData.fullName !== "Teacher" ? uData.fullName : null);
              if (isCleanSchoolName(cand)) schoolName = cand.trim();
              if (!teacherName && (uData.fullName || uData.displayName || uData.teacherName)) {
                teacherName = uData.fullName || uData.displayName || uData.teacherName;
              }
              if (!udise && (uData.udise || uData.udiseNumber)) udise = uData.udise || uData.udiseNumber;
              if (!address && uData.address) address = uData.address;
            }
          } catch (e) { }

          if (!schoolName) {
            try {
              const tSnap = await getDoc(doc(db, "teachers", uid));
              if (tSnap.exists()) {
                const tData = tSnap.data();
                const cand = tData.schoolName || tData.school || tData.displayName || tData.fullName;
                if (isCleanSchoolName(cand)) schoolName = cand.trim();
              }
            } catch (e) { }
          }
        }

        // 1b. Check auth.currentUser displayName (e.g. "School Dhondewadi")
        if (!schoolName && auth?.currentUser?.displayName) {
          const dName = auth.currentUser.displayName.trim();
          if (isCleanSchoolName(dName) && dName !== "Educator" && dName !== "Teacher") {
            schoolName = dName;
          }
        }

        // 1c. Check cce_settings collection (Teacher Isolated)
        try {
          const cceDocIds = [
            uid ? `${uid}_${selectedClass}_${medKey}_${academicYear}` : null,
            uid ? `${uid}_${selectedClass}_${academicYear}` : null,
          ].filter(Boolean);

          for (const cId of cceDocIds) {
            const cRef = doc(db, "cce_settings", cId);
            const cSnap = await getDoc(cRef);
            if (cSnap.exists()) {
              const data = cSnap.data();
              const candSchool = data.schoolName || data.school_name || "";
              if (!schoolName && isCleanSchoolName(candSchool)) schoolName = candSchool.trim();
              if (!udise) udise = data.udiseCode || data.udise || "";
              if (!teacherName && data.teacherName) teacherName = data.teacherName;
              if (!headmasterName && (data.principalName || data.headmasterName || data.hmName)) {
                headmasterName = data.principalName || data.headmasterName || data.hmName;
              }
              if (!address) address = data.address || "";
              if (data.slogan) slogan = data.slogan;
              if (!schoolLogo) schoolLogo = data.schoolLogo || "";
              if (!teacherSignature) teacherSignature = data.signatureUrl || data.teacherSignature || "";
              if (!headmasterSignature) headmasterSignature = data.principalSignature || data.headmasterSignature || "";
              if (!customSubjects && data.subjects && Array.isArray(data.subjects) && data.subjects.length > 0) {
                customSubjects = data.subjects;
              }
            }
          }
        } catch (e) { }

        // 1d. Check school_settings collection strictly for this user (NEVER pull global willingdon)
        try {
          const settingsDocIds = [
            uid ? `${uid}_general` : null,
            uid ? uid : null,
          ].filter(Boolean);

          for (const dId of settingsDocIds) {
            const sRef = doc(db, "school_settings", dId);
            const sSnap = await getDoc(sRef);
            if (sSnap.exists()) {
              const data = sSnap.data();
              const candSchool = data.schoolName || data.school_name || data.school || "";
              if (!schoolName && isCleanSchoolName(candSchool)) schoolName = candSchool.trim();
              if (!udise) udise = data.udiseCode || data.udise || data.udiseNo || "";
              if (!teacherName && (data.teacherName || data.fullName || data.name)) teacherName = data.teacherName || data.fullName || data.name;
              if (!headmasterName && (data.principalName || data.headmasterName || data.hmName)) {
                headmasterName = data.principalName || data.headmasterName || data.hmName;
              }
              if (!address) address = data.address || "";
              if (data.slogan) slogan = data.slogan;
              if (!schoolLogo) schoolLogo = data.schoolLogo || "";
              if (!teacherSignature) teacherSignature = data.signatureUrl || data.teacherSignature || "";
              if (!headmasterSignature) headmasterSignature = data.principalSignature || data.headmasterSignature || "";
            }
          }
        } catch (e) { }

        // 1e. Unified local profile fallback (Guarantees logged-in user's accurate school and headmaster info)
        try {
          const { getUnifiedSchoolProfile } = await import("@/utils/schoolProfileHelper");
          const uni = getUnifiedSchoolProfile(uid);
          if (uni) {
            if (!schoolName && isCleanSchoolName(uni.schoolName)) schoolName = uni.schoolName.trim();
            if (!headmasterName && uni.headmaster) headmasterName = uni.headmaster;
            if (!teacherName && uni.teacherName) teacherName = uni.teacherName;
            if (!udise && uni.udise) udise = uni.udise;
            if (!address && uni.address) address = uni.address;
          }
        } catch (e) { }

        // 1f. Check LocalStorage caches strictly for this user
        const cacheKeys = [
          uid ? `user_school_name_${uid}` : null,
          uid ? `cce_general_school_settings_${uid}` : null,
        ].filter(Boolean);

        cacheKeys.forEach(k => {
          try {
            const val = localStorage.getItem(k);
            if (val) {
              try {
                const p = JSON.parse(val);
                const cand = p.schoolName || p.school_name;
                if (!schoolName && isCleanSchoolName(cand)) schoolName = cand.trim();
                if (!udise && (p.udiseCode || p.udise)) udise = p.udiseCode || p.udise;
                if (!teacherName && (p.teacherName || p.fullName || p.name)) teacherName = p.teacherName || p.fullName || p.name;
                if (!headmasterName && (p.principalName || p.headmasterName || p.hmName)) {
                  headmasterName = p.principalName || p.headmasterName || p.hmName;
                }
              } catch {
                if (typeof val === "string" && !schoolName && isCleanSchoolName(val)) {
                  schoolName = val.trim();
                }
              }
            }
          } catch (e) { }
        });

        // 1d. Fallback for teacherName, schoolName & udise: check logged-in teacher's profile/doc in teachers & users collections
        if (uid && (!teacherName || !schoolName || !udise)) {
          try {
            const tSnap = await getDoc(doc(db, "teachers", uid));
            if (tSnap.exists()) {
              const data = tSnap.data();
              if (!schoolName) schoolName = data.schoolName || data.school_name || "";
              if (!udise) udise = data.udise || data.udiseCode || "";
              if (!teacherName) teacherName = data.teacherName || data.fullName || data.name || "";
            }
            if (!teacherName || !schoolName) {
              const uSnap = await getDoc(doc(db, "users", uid));
              if (uSnap.exists()) {
                const data = uSnap.data();
                if (!schoolName) schoolName = data.schoolName || data.school_name || "";
                if (!udise) udise = data.udise || data.udiseCode || "";
                if (!teacherName) teacherName = data.teacherName || data.fullName || data.name || "";
              }
            }
          } catch (e) { }
        }

        // 1e. Fallback for standalone LocalStorage keys if still missing
        if (!schoolName) schoolName = localStorage.getItem("teacher_school_name") || localStorage.getItem("school_name") || localStorage.getItem("sqaf_cert_school_name") || "";
        if (!udise) udise = localStorage.getItem("teacher_udise") || localStorage.getItem("udise") || localStorage.getItem("sqaf_cert_udise") || "";
        if (!teacherName) teacherName = localStorage.getItem("teacher_name") || localStorage.getItem("user_name") || "";
        if (!headmasterName) headmasterName = localStorage.getItem("teacher_principal_name") || "";

        let divVal = division;
        const storedDiv = localStorage.getItem("cce_selected_division") || localStorage.getItem("teacher_division") || localStorage.getItem("division");
        if (storedDiv && storedDiv !== division) {
          divVal = storedDiv;
          setDivision(storedDiv);
        }

        setSchoolData({
          schoolName: schoolName ? `${schoolName}${address ? ` (${address.trim()})` : ""}` : "",
          rawSchoolName: (schoolName || "").trim(),
          address: (address || "").trim(),
          udise: udise || "",
          teacherName: teacherName || "",
          headmasterName: headmasterName || "",
          slogan: slogan || "मुलांचा सर्वांगीण विकास — हाच आमचा ध्यास!",
          schoolLogo: schoolLogo || "",
          teacherSignature: teacherSignature || "",
          headmasterSignature: headmasterSignature || "",
        });

        let classSubjects = [];
        if (customSubjects && Array.isArray(customSubjects) && customSubjects.length > 0) {
          classSubjects = customSubjects;
        } else {
          classSubjects = getDefaultSubjectsForClass(selectedClass, selectedMedium);
        }
        setSubjects(classSubjects);
      } catch (e) {
        console.error("Error fetching school settings:", e);
      }

      // 2. Fetch User's Real Students for this selected class & medium (Isolated by teacherId)
      const loadedStudents = await fetchStudentsForClass(selectedClass, selectedMedium, currentTeacherId);

      // Merge student_details collection for accurate gender, caste, religion, etc.
      try {
        const detailsMap = new Map();
        const detailsSnap = await getDocs(collection(db, "student_details"));
        detailsSnap.forEach((docSnap) => {
          detailsMap.set(docSnap.id, docSnap.data());
        });

        const mergedStudents = loadedStudents.map((s) => {
          const det = detailsMap.get(s.id) || detailsMap.get(s.name) || detailsMap.get(s.fullName) || {};
          return {
            ...s,
            gender: det.gender || s.gender || s.ling || s.sex || "",
            caste: det.caste || s.caste || s.category || det.category || s.jaat || "",
            religion: det.religion || s.religion || "",
            dob: det.dob || s.dob || "",
            phone: det.phone || s.phone || s.mobile || "",
          };
        });
        setStudents(mergedStudents);
      } catch (e) {
        setStudents(loadedStudents);
      }

      // 3. Fetch User's Entered Marks for this Class & Year (Merging all exam docs & Bunny CDN)
      try {
        let mergedMarks = {};

        const loadMarksDoc = async (examKey) => {
          const docIdsToTry = [
            `${currentTeacherId}_${selectedClass}_${academicYear}_${examKey}`,
            `${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}_${examKey}`,
            `${selectedClass}_${academicYear}_${examKey}`,
            `${selectedClass}_${selectedMedium}_${academicYear}_${examKey}`,
          ];
          for (const dId of docIdsToTry) {
            try {
              const snap = await getDoc(doc(db, "cce_marks_v2", dId));
              if (snap.exists()) {
                const d = snap.data();
                return d.records || d.marksData || d.data || d;
              }
            } catch (e) {}
          }
          return null;
        };

        // Term-aware exam keys: sem1 = test1/oral1/pratyakshik1, sem2 = test2/oral2/pratyakshik2
        const examKeys = termSuffix === "sem1"
          ? ["sem1", "test1", "oral1", "pratyakshik1", "general"]
          : ["sem2", "test2", "oral2", "pratyakshik2", "general"];

        for (const exKey of examKeys) {
          const exData = await loadMarksDoc(exKey);
          if (exData && typeof exData === "object") {
            Object.keys(exData).forEach((stdKey) => {
              if (!mergedMarks[stdKey]) mergedMarks[stdKey] = {};
              const stdObj = exData[stdKey];
              if (stdObj && typeof stdObj === "object") {
                Object.keys(stdObj).forEach((subKey) => {
                  if (!mergedMarks[stdKey][subKey]) mergedMarks[stdKey][subKey] = {};
                  if (typeof stdObj[subKey] === "object") {
                    Object.assign(mergedMarks[stdKey][subKey], stdObj[subKey]);
                  } else {
                    mergedMarks[stdKey][subKey] = stdObj[subKey];
                  }
                });
              }
            });
          }
        }

        // Bunny CDN fallback — only for selected term
        try {
          const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
          const bunnyFiles = termSuffix === "sem1"
            ? [
                `cce_results/${selectedClass}_${academicYear}_marks_first.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_sem1.json`,
              ]
            : [
                `cce_results/${selectedClass}_${academicYear}_marks_second.json`,
                `cce_results/${selectedClass}_${academicYear}_marks_sem2.json`,
              ];
          for (const file of bunnyFiles) {
            const bData = await fetchJsonFromBunny(file);
            if (bData && typeof bData === "object") {
              Object.keys(bData).forEach((stdKey) => {
                if (!mergedMarks[stdKey]) mergedMarks[stdKey] = {};
                const stdObj = bData[stdKey];
                if (stdObj && typeof stdObj === "object") {
                  Object.keys(stdObj).forEach((subKey) => {
                    if (!mergedMarks[stdKey][subKey]) mergedMarks[stdKey][subKey] = {};
                    if (typeof stdObj[subKey] === "object") {
                      Object.assign(mergedMarks[stdKey][subKey], stdObj[subKey]);
                    }
                  });
                }
              });
            }
          }
        } catch (e) {}

        setMarksData(mergedMarks);
      } catch (e) {
        console.error("Error fetching marks:", e);
      }

      // 4. Fetch User's Entered Remarks for this Class & Year (Merging sem1, sem2 & medium variants)
      try {
        let mergedRemarks = {};

        const loadSemesterRemarks = async (sem) => {
          let recs = {};
          const cacheKeysToTry = [
            currentTeacherId ? `cce_remarks_cache_${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}` : null,
            currentTeacherId ? `cce_remarks_cache_${currentTeacherId}_${selectedClass}_${academicYear}_${sem}` : null,
            `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
            `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}`,
            `cce_remarks_${selectedClass}_${academicYear}_${sem}`,
          ].filter(Boolean);

          for (const cKey of cacheKeysToTry) {
            try {
              const cached = localStorage.getItem(cKey);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
                  Object.keys(parsed).forEach((stdKey) => {
                    if (!recs[stdKey]) recs[stdKey] = {};
                    if (typeof parsed[stdKey] === "object" && parsed[stdKey] !== null) {
                      Object.assign(recs[stdKey], parsed[stdKey]);
                    } else {
                      recs[stdKey] = parsed[stdKey];
                    }
                  });
                }
              }
            } catch (e) {}
          }

          const docIds = [
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${selectedMedium}` : null,
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}` : null,
            `${selectedClass}_${academicYear}_${sem}_${selectedMedium}`,
            `${selectedClass}_${academicYear}_${sem}`,
            `${selectedClass}_${selectedMedium}_${academicYear}_${sem}`,
          ].filter(Boolean);

          for (const dId of docIds) {
            try {
              const snap = await getDoc(doc(db, "cce_remarks_v2", dId));
              if (snap.exists()) {
                const data = snap.data();
                const parsedRecs = data.records || data.remarks || data.data || null;
                if (parsedRecs && typeof parsedRecs === "object" && Object.keys(parsedRecs).length > 0) {
                  Object.keys(parsedRecs).forEach((stdKey) => {
                    if (!recs[stdKey]) recs[stdKey] = {};
                    if (typeof parsedRecs[stdKey] === "object" && parsedRecs[stdKey] !== null) {
                      Object.assign(recs[stdKey], parsedRecs[stdKey]);
                    } else {
                      recs[stdKey] = parsedRecs[stdKey];
                    }
                  });
                }
              }
            } catch (e) {}
          }
          return recs;
        };

        // Load only selected term's remarks
        const termRecs = await loadSemesterRemarks(termSuffix);

        const deepMergeRemarks = (target, source) => {
          if (!source || typeof source !== "object") return;
          Object.keys(source).forEach((stdKey) => {
            if (!target[stdKey]) target[stdKey] = {};
            if (typeof source[stdKey] === "object" && source[stdKey] !== null) {
              Object.assign(target[stdKey], source[stdKey]);
            } else {
              target[stdKey] = source[stdKey];
            }
          });
        };

        deepMergeRemarks(mergedRemarks, termRecs);
        setRemarksData(mergedRemarks);
      } catch (e) {
        console.error("Error fetching remarks:", e);
      }

      // 5. Fetch Working Days & Attendance Data
      try {
        let computedTotalWorkingDays = 0;
        try {
          let wDaysObj = null;
          // Try term-specific doc first, then legacy combined doc
          const wDocIdsToTry = [
            `${selectedClass}_${academicYear}_${termSuffix}`,
            `${selectedClass}_${academicYear}`,
          ];
          for (const wDocId of wDocIdsToTry) {
            const wSnap = await getDoc(doc(db, "cce_working_days", wDocId));
            if (wSnap.exists()) {
              wDaysObj = wSnap.data().days || wSnap.data().workingDays || wSnap.data();
              break;
            }
          }
          if (!wDaysObj) {
            const legacyWSnap = await getDoc(doc(db, "cce_attendance", `${selectedClass}_${academicYear}_working_days`));
            if (legacyWSnap.exists()) {
              wDaysObj = legacyWSnap.data().workingDays || legacyWSnap.data().days || legacyWSnap.data();
            }
          }

          if (!wDaysObj) {
            try {
              const cachedWDays = localStorage.getItem(`cce_working_days_${selectedClass}_${academicYear}`);
              if (cachedWDays) wDaysObj = JSON.parse(cachedWDays);
            } catch(e) {}
          }

          if (wDaysObj && typeof wDaysObj === "object") {
            let sumDays = 0;
            Object.values(wDaysObj).forEach((v) => {
              const numV = Number(v);
              if (!isNaN(numV) && numV > 0 && numV <= 31) sumDays += numV;
            });
            if (sumDays > 0) computedTotalWorkingDays = sumDays;
            else if (typeof wDaysObj.total === "number" && wDaysObj.total > 0) computedTotalWorkingDays = wDaysObj.total;
            else if (typeof wDaysObj.workingDays === "number" && wDaysObj.workingDays > 0) computedTotalWorkingDays = wDaysObj.workingDays;
          } else if (typeof wDaysObj === "number" && wDaysObj > 0) {
            computedTotalWorkingDays = wDaysObj;
          }
        } catch (e) {}

        setTotalWorkingDays(computedTotalWorkingDays);

        let attMap = {};

        // 5a. Try loading from term-specific _monthly doc first, then combined fallback
        const monthlyDocIdsToTry = [
          `${selectedClass}_${academicYear}_${termSuffix}_monthly`,
          `${selectedClass}_${academicYear}_monthly`,
        ];
        for (const monthlyDocId of monthlyDocIdsToTry) {
          try {
            const monthlySnap = await getDoc(doc(db, "cce_attendance", monthlyDocId));
            if (monthlySnap.exists()) {
            const recs = monthlySnap.data().records || monthlySnap.data();
            if (recs && typeof recs === "object") {
              // Structure: { studentId: { jun: 20, jul: 22, ... }, ... }
              Object.entries(recs).forEach(([stdKey, stdVal]) => {
                if (!attMap[stdKey]) attMap[stdKey] = {};
                if (typeof stdVal === "object" && stdVal !== null) {
                  Object.assign(attMap[stdKey], stdVal);
                } else if (typeof stdVal === "number") {
                  attMap[stdKey] = { total: stdVal };
                }
              });
            }
            if (Object.keys(attMap).length > 0) break;
          }
          } catch (e) {}
        }

        // 5b. Try localStorage cache if no Firestore data
        if (Object.keys(attMap).length === 0) {
          try {
            const cacheKeysToTry = [
              `cce_monthly_attendance_${selectedClass}_${academicYear}_${termSuffix}`,
              `cce_monthly_attendance_${selectedClass}_${academicYear}`,
            ];
            let cached = null;
            for (const cKey of cacheKeysToTry) {
              cached = localStorage.getItem(cKey);
              if (cached) break;
            }
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object") {
                Object.entries(parsed).forEach(([stdKey, stdVal]) => {
                  if (!attMap[stdKey]) attMap[stdKey] = {};
                  if (typeof stdVal === "object" && stdVal !== null) {
                    Object.assign(attMap[stdKey], stdVal);
                  } else if (typeof stdVal === "number") {
                    attMap[stdKey] = { total: stdVal };
                  }
                });
              }
            }
          } catch (e) {}
        }

        // 5c. Also try Bunny CDN fallback
        if (Object.keys(attMap).length === 0) {
          try {
            const { fetchJsonFromBunny } = await import("@/lib/bunnyStorage");
            const bunnyAtt = await fetchJsonFromBunny(`cce_results/${selectedClass}_${academicYear}_attendance.json`);
            if (bunnyAtt && typeof bunnyAtt === "object" && Object.keys(bunnyAtt).length > 0) {
              Object.entries(bunnyAtt).forEach(([stdKey, stdVal]) => {
                if (!attMap[stdKey]) attMap[stdKey] = {};
                if (typeof stdVal === "object" && stdVal !== null) {
                  Object.assign(attMap[stdKey], stdVal);
                } else if (typeof stdVal === "number") {
                  attMap[stdKey] = { total: stdVal };
                }
              });
            }
          } catch (e) {}
        }

        // 5d. Also try legacy docId fallback
        if (Object.keys(attMap).length === 0) {
          try {
            const attSnap = await getDoc(doc(db, "cce_attendance", docId));
            if (attSnap.exists()) {
              const data = attSnap.data().attendanceData || attSnap.data();
              if (data && typeof data === "object") {
                Object.entries(data).forEach(([stdKey, stdVal]) => {
                  if (!attMap[stdKey]) attMap[stdKey] = {};
                  if (typeof stdVal === "object" && stdVal !== null) {
                    Object.assign(attMap[stdKey], stdVal);
                  } else if (typeof stdVal === "number") {
                    attMap[stdKey] = { total: stdVal };
                  }
                });
              }
            }
          } catch (e) {}
        }

        setAttendanceData(attMap);
      } catch (e) {
        setAttendanceData({});
      }

      // 6. Fetch Weightage Data (cce_weightage_v2 & local cache)
      try {
        let weightageMap = {};
        const normCls = normalizeClassKey(selectedClass) || selectedClass;
        const cacheKeys = [
          currentTeacherId ? `cce_weightage_cache_${currentTeacherId}_${selectedClass}_${academicYear}` : null,
          currentTeacherId ? `cce_weightage_cache_${currentTeacherId}_${normCls}_${academicYear}` : null,
          `cce_weightage_cache_${selectedClass}_${academicYear}`,
          `cce_weightage_cache_${normCls}_${academicYear}`,
        ].filter(Boolean);

        for (const ck of cacheKeys) {
          try {
            const cached = localStorage.getItem(ck);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === "object" && (parsed.semester1 || parsed.semester2 || parsed.rows || parsed.data)) {
                weightageMap = parsed;
                break;
              }
            }
          } catch (e) {}
        }

        if (Object.keys(weightageMap).length === 0) {
          const docIdsToTry = [
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
            currentTeacherId ? `${currentTeacherId}_${normCls}_${academicYear}` : null,
            `${selectedClass}_${academicYear}`,
            `${normCls}_${academicYear}`,
          ].filter(Boolean);

          for (const dId of docIdsToTry) {
            try {
              const snap = await getDoc(doc(db, "cce_weightage_v2", dId));
              if (snap.exists()) {
                const d = snap.data();
                weightageMap = d.data || d;
                break;
              }
            } catch (e) {}
          }
        }

        setWeightageData(weightageMap);
      } catch (e) {
        console.error("Error fetching weightage:", e);
      }

    } catch (err) {
      console.error("Error loading CCE Register data:", err);
    }
    setLoading(false);
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("मूल्यांकन नोंदवही PDF तयार होत आहे, कृपया वाट पाहा...");
    const container = printRef.current;

    try {
      let html2canvas;
      try {
        const hModule = await import("html2canvas-pro");
        html2canvas = hModule.default || hModule;
      } catch (e) {
        const hModule = await import("html2canvas");
        html2canvas = hModule.default || hModule;
      }

      const { default: jsPDF } = await import("jspdf");

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {}
      }

      const images = Array.from(container.querySelectorAll("img"));
      await Promise.all(
        images.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) resolve();
              else {
                img.onload = resolve;
                img.onerror = resolve;
              }
            })
        )
      );

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise((resolve) => setTimeout(resolve, 150));

      const pdfPages = Array.from(container.querySelectorAll(".pdf-page"));
      if (!pdfPages || pdfPages.length === 0) {
        toast.error("पेजेस सापडले नाहीत!");
        setDownloading(false);
        return;
      }

      setDownloadProgress({ current: 0, total: pdfPages.length });

      let pdf = null;

      for (let i = 0; i < pdfPages.length; i++) {
        setDownloadProgress({ current: i + 1, total: pdfPages.length });
        const pageEl = pdfPages[i];
        const isLandscape = pageEl.classList.contains("pdf-page-landscape") || pageEl.getAttribute("data-orientation") === "landscape";
        const isLegal = pageEl.classList.contains("pdf-page-legal") || pageEl.getAttribute("data-paper") === "legal";

        const targetWidth = isLegal ? 1344 : (isLandscape ? 1123 : 794);
        const targetHeight = isLegal ? 816 : (isLandscape ? 794 : 1123);

        // Create an isolated fixed-size sandbox on document.body
        // This ensures the render size is ALWAYS 100% full A4 resolution,
        // completely unaffected by mobile screen width (360px), WebView scaling, or CSS zoom!
        const sandbox = document.createElement("div");
        sandbox.className = "cce-export-sandbox";
        sandbox.style.position = "fixed";
        sandbox.style.left = "0px";
        sandbox.style.top = "0px";
        sandbox.style.width = `${targetWidth}px`;
        sandbox.style.minWidth = `${targetWidth}px`;
        sandbox.style.maxWidth = `${targetWidth}px`;
        sandbox.style.height = `${targetHeight}px`;
        sandbox.style.minHeight = `${targetHeight}px`;
        sandbox.style.maxHeight = `${targetHeight}px`;
        sandbox.style.zIndex = "50";
        sandbox.style.backgroundColor = "#ffffff";
        sandbox.style.fontFamily = "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif";
        sandbox.style.letterSpacing = "0px";
        sandbox.style.webkitFontSmoothing = "antialiased";
        sandbox.style.textRendering = "geometricPrecision";
        sandbox.style.pointerEvents = "none";
        sandbox.style.overflow = "hidden";
        sandbox.style.transform = "none";
        sandbox.style.zoom = "1";

        const clone = pageEl.cloneNode(true);
        clone.style.width = `${targetWidth}px`;
        clone.style.minWidth = `${targetWidth}px`;
        clone.style.maxWidth = `${targetWidth}px`;
        clone.style.height = `${targetHeight}px`;
        clone.style.minHeight = `${targetHeight}px`;
        clone.style.maxHeight = `${targetHeight}px`;
        clone.style.margin = "0px";
        clone.style.boxSizing = "border-box";
        clone.style.transform = "none";
        clone.style.zoom = "1";

        // Ensure overflow is visible and tables have full width on ALL pages (portrait and landscape)
        clone.querySelectorAll(".overflow-x-auto").forEach((scrollContainer) => {
          scrollContainer.style.overflow = "visible";
          scrollContainer.style.width = "100%";
        });
        clone.querySelectorAll("table").forEach((tbl) => {
          tbl.style.width = "100%";
        });

        sandbox.appendChild(clone);
        document.body.appendChild(sandbox);

        // Auto-fit wide consolidated marksheet tables if many subjects exceed Legal container width
        clone.querySelectorAll("table.consolidated-legal-table").forEach((tbl) => {
          const wrapper = tbl.parentElement;
          const availW = wrapper ? wrapper.clientWidth : 0;
          if (availW > 0 && tbl.scrollWidth > availW) {
            const fitScale = Math.floor((availW / tbl.scrollWidth) * 1000) / 1000;
            const origH = tbl.offsetHeight;
            tbl.style.width = `${tbl.scrollWidth}px`;
            tbl.style.transform = `scale(${fitScale})`;
            tbl.style.transformOrigin = "top left";
            if (wrapper && origH > 0) {
              wrapper.style.height = `${Math.ceil(origH * fitScale)}px`;
              wrapper.style.overflow = "hidden";
            }
          }
        });

        // Fix html2canvas table rendering bug:
        // When a <tr> has a background-color, html2canvas fills a rectangle across the ENTIRE row width.
        // For any cells spanning from previous rows (via rowSpan), this <tr> color rectangle is painted
        // ON TOP of those cells, hiding their text with an unwanted colored bar (yellow, green, etc.).
        // Solution: Push the background color down to the individual <th> and <td> cells,
        // and make the <tr> itself background transparent!
        clone.querySelectorAll("tr").forEach((tr) => {
          const comp = window.getComputedStyle(tr);
          const bg = comp.backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
            tr.querySelectorAll("th, td").forEach((cell) => {
              const cellComp = window.getComputedStyle(cell);
              const cellBg = cellComp.backgroundColor;
              if (!cellBg || cellBg === "rgba(0, 0, 0, 0)" || cellBg === "transparent") {
                cell.style.backgroundColor = bg;
              }
            });
            tr.style.backgroundColor = "transparent";
            tr.style.background = "transparent";
          }
        });

        // Pre-convert any non-data images inside clone to data URLs for reliable offline/WebView canvas rendering
        const cloneImgs = Array.from(clone.querySelectorAll("img"));
        await Promise.all(
          cloneImgs.map(async (img) => {
            try {
              if (img.src && !img.src.startsWith("data:")) {
                const c = document.createElement("canvas");
                c.width = img.naturalWidth || img.width || 80;
                c.height = img.naturalHeight || img.height || 80;
                const ctx = c.getContext("2d");
                if (ctx) {
                  ctx.drawImage(img, 0, 0, c.width, c.height);
                  img.src = c.toDataURL("image/png");
                }
              }
            } catch (e) {}
          })
        );

        const canvas = await html2canvas(clone, {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          width: targetWidth,
          height: targetHeight,
          windowWidth: targetWidth,
          windowHeight: targetHeight,
          imageTimeout: 0,
        });

        // Immediately detach sandbox to free DOM & GPU memory
        if (sandbox.parentNode) {
          sandbox.parentNode.removeChild(sandbox);
        }

        const imgData = canvas.toDataURL("image/png");

        if (isLegal) {
          if (!pdf) {
            pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "legal", compress: true });
          } else {
            pdf.addPage("legal", "landscape");
          }
          pdf.addImage(imgData, "PNG", 2, 2, 351.6, 211.9, undefined, "FAST");
        } else if (isLandscape) {
          if (!pdf) {
            pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
          } else {
            pdf.addPage("a4", "landscape");
          }
          pdf.addImage(imgData, "PNG", 2, 2, 293, 206, undefined, "FAST");
        } else {
          if (!pdf) {
            pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
          } else {
            pdf.addPage("a4", "portrait");
          }
          pdf.addImage(imgData, "PNG", 2, 2, 206, 293, undefined, "FAST");
        }
      }

      if (pdf) {
        const termLabel = selectedTerm === "sem1" ? "प्रथम_सत्र" : "द्वितीय_सत्र";
        pdf.save(`CCE_मूल्यांकन_नोंदवही_${selectedClass}_${termLabel}_${academicYear}.pdf`);
        toast.success("PDF यशस्वीरित्या थेट डाऊनलोड झाली!");
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF निर्मितीत अडचण आली: " + err.message);
    } finally {
      const strays = document.querySelectorAll(".cce-export-sandbox");
      strays.forEach((s) => s.parentNode && s.parentNode.removeChild(s));
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 font-sans">
        <Loader2 className="size-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">माहिती लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  return (
    <div className="text-black" style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif", letterSpacing: 0 }}>
      <style>{`
        .pdf-page, .pdf-page * {
          font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif;
          font-weight: 700 !important;
          letter-spacing: 0 !important;
          -webkit-font-smoothing: antialiased;
          text-rendering: geometricPrecision;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .pdf-page .font-extrabold, .pdf-page b, .pdf-page strong, .pdf-page th, .pdf-page h1, .pdf-page h2, .pdf-page h3 {
          font-weight: 800 !important;
        }
        .pdf-page .font-black {
          font-weight: 900 !important;
        }
        .pdf-page::-webkit-scrollbar, .pdf-page *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .pdf-page:not(.pdf-page-landscape) {
          width: 794px !important;
          min-width: 794px !important;
          max-width: 794px !important;
          min-height: 1085px !important;
        }
        .pdf-page-landscape {
          width: 1123px !important;
          min-width: 1123px !important;
          max-width: 1123px !important;
          min-height: 794px !important;
        }
        .pdf-page-landscape.pdf-page-legal {
          width: 1344px !important;
          min-width: 1344px !important;
          max-width: 1344px !important;
          min-height: 816px !important;
        }
        table.consolidated-legal-table th,
        table.consolidated-legal-table td {
          padding: 2px 1.5px !important;
          width: auto !important;
        }
        table.consolidated-legal-table.is-many-subjects th,
        table.consolidated-legal-table.is-many-subjects td {
          padding: 1.5px 0.5px !important;
          width: auto !important;
        }
        table.summary-subcol-table th,
        table.summary-subcol-table td {
          padding: 2px 0.5px !important;
          width: auto !important;
        }
        @media print {
          .a4-page-scale-wrapper {
            overflow: visible !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            width: auto !important;
          }
          .a4-page-scale-inner {
            zoom: 1 !important;
            transform: none !important;
            margin-bottom: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, nav, header, sidebar, footer {
            display: none !important;
          }
          .cce-pdf-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .pdf-page {
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            box-sizing: border-box !important;
            padding: 10mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: visible !important;
          }
          .pdf-page-landscape {
            width: 297mm !important;
            height: 210mm !important;
            max-height: 210mm !important;
            padding: 10mm !important;
            overflow: visible !important;
          }
          .pdf-page-landscape.pdf-page-legal {
            width: 355.6mm !important;
            height: 215.9mm !important;
            max-height: 215.9mm !important;
            padding: 7mm !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Full-Screen PDF Downloading Progress Modal */}
      {downloading && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[999999] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 relative shadow-inner">
              <Loader2 className="size-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">मूल्यांकन नोंदवही PDF तयार होत आहे</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">
              कृपया प्रतीक्षा करा, उच्च दर्जाची (HD) PDF तयार केली जात आहे...
            </p>

            {/* Progress Bar & Counter */}
            {downloadProgress.total > 0 && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>प्रगती</span>
                  <span className="text-blue-600 font-black">
                    पान {downloadProgress.current} / {downloadProgress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-xs"
                    style={{
                      width: `${Math.max(5, Math.round((downloadProgress.current / downloadProgress.total) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-bold text-right pt-0.5">
                  {Math.round((downloadProgress.current / downloadProgress.total) * 100)}% पूर्ण
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Layout Selection Dialog Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="size-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">नोंदवही PDF स्वरूप निवडा</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              तुम्हाला एका विद्यार्थ्याची नोंदवही १ पानामध्ये हवी आहे की २ पानांमध्ये?
            </p>

            <div className="grid grid-cols-1 gap-3.5 mb-2">
              <button
                onClick={() => {
                  setPageMode("1page");
                  setShowLayoutModal(false);
                }}
                className="p-4 rounded-2xl border-2 border-blue-500 bg-blue-50/50 hover:bg-blue-100/80 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-black text-blue-950 group-hover:text-blue-600">
                    १ पानाची नोंदवही (Single Page)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight">
                    एकाच पानावर गुण तक्ता + वर्णनात्मक नोंदी कॉम्पॅक्ट.
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setPageMode("2pages");
                  setShowLayoutModal(false);
                }}
                className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-slate-700">
                    २ पानांची नोंदवही (Two Pages)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight">
                    दोन पानांमध्ये सविस्तर गुण तक्ता व वर्णनात्मक नोंदी.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action & Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-600"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div>
            <h2 className="text-base font-black text-slate-800">सातत्यपूर्ण सर्वंकष मूल्यांकन नोंदवही</h2>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{selectedClass} • {academicYear}</p>
          </div>
        </div>


        {/* Term Switcher — प्रथम सत्र / द्वितीय सत्र */}
        <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-200 text-xs font-bold">
          <button
            onClick={() => { setSelectedTerm("sem1"); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTerm === "sem1"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            }`}
          >
            प्रथम सत्र
          </button>
          <button
            onClick={() => { setSelectedTerm("sem2"); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTerm === "sem2"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            }`}
          >
            द्वितीय सत्र
          </button>
        </div>

        {/* Page Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setPageMode("1page")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              pageMode === "1page"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="size-3.5" />
            <span>१ पान</span>
          </button>
          <button
            onClick={() => setPageMode("2pages")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              pageMode === "2pages"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Copy className="size-3.5" />
            <span>२ पाने</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading || students.length === 0}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            <span>{downloading ? "डाउनलोड होत आहे..." : "PDF डाऊनलोड करा"}</span>
          </button>
        </div>
      </div>

      {/* Warning Banner if No Students or Settings entered */}
      {students.length === 0 && (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 mb-6 text-center max-w-xl mx-auto no-print">
          <AlertCircle className="size-8 text-amber-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-800 mb-1">या वर्गामध्ये अद्याप कोणतेही विद्यार्थी जोडलेले नाहीत</h3>
          <p className="text-xs text-amber-700">कृपया डॅशबोर्डवरील <b>'विद्यार्थी'</b> विभागात जाऊन या वर्गासाठी विद्यार्थी जोडा.</p>
        </div>
      )}

      {/* -------------------- 11-PAGE PRINT CONTAINER (USING USER'S AUTHENTIC DATA) -------------------- */}
      <div ref={printRef} className="cce-pdf-container max-w-4xl mx-auto">
        {/* -------------------- PAGE 1: COVER PAGE -------------------- */}
        <A4PageWrapper>
        <div
          className="pdf-page bg-white border-none relative overflow-hidden text-center flex flex-col justify-between h-[287mm] shadow-sm mb-4"
          style={{ padding: "10mm", boxSizing: "border-box", pageBreakAfter: "always", breakAfter: "page" }}
        >
          {/* Main Border Box with Equal Spacing on All Sides */}
          <div className="border-2 border-slate-700 rounded-none p-6 sm:p-10 h-full w-full flex flex-col justify-center items-center text-center relative z-10 space-y-7 sm:space-y-8" style={{ boxSizing: "border-box" }}>

            {/* Top School Header Section */}
            <div className="space-y-2 w-full">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-black leading-snug">
                {schoolData.rawSchoolName || schoolData.schoolName || "जिल्हा परिषद प्राथमिक शाळा"}
              </h2>
              {schoolData.address && (
                <p className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                  ({schoolData.address})
                </p>
              )}
              <p className="text-base sm:text-lg font-extrabold text-slate-900 font-mono uppercase mt-2">
                UDISE : <span className="text-lg sm:text-xl font-black text-black">{schoolData.udise || "s1"}</span>
              </p>

              {/* Horizontal Line with Diamond Node */}
              <div className="flex items-center justify-center gap-3 my-4 max-w-xs mx-auto">
                <div className="h-[1.5px] bg-slate-400 w-24" />
                <div className="size-1.5 bg-slate-600 rotate-45 shrink-0" />
                <div className="h-[1.5px] bg-slate-400 w-24" />
              </div>
            </div>

            {/* Main Title & Academic Year Section */}
            <div className="space-y-2.5 w-full">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#881337]">
                सातत्यपूर्ण सर्वंकष मूल्यांकन नोंदवही
              </h1>
              <p className="text-xl sm:text-2xl font-extrabold text-[#1e3a8a]">
                सन {academicYear}
              </p>
            </div>

            {/* Class & Division Box */}
            <div className="w-full">
              <div className="inline-block bg-[#e0f2fe] border border-[#60a5fa] rounded-lg px-8 py-3.5 shadow-xs">
                <h3 className="text-xl sm:text-2xl font-extrabold text-black">
                  इयत्ता : {getMarathiClassName(selectedClass)} {formatDivision(division) ? `  तुकडी : ${formatDivision(division)}` : "  तुकडी : अ"}
                </h3>
              </div>
            </div>

            {/* Teacher Section */}
            <div className="space-y-1 w-full">
              <p className="text-sm font-bold text-slate-900">वर्गशिक्षक</p>
              <p className="text-xl sm:text-2xl font-extrabold text-black">
                {schoolData.teacherName ? (schoolData.teacherName.startsWith("श्री") || schoolData.teacherName.startsWith("श्रीमती") ? schoolData.teacherName : `श्री. ${schoolData.teacherName}`) : "श्री. शिवकुमार"}
              </p>
            </div>

            {/* Bottom Slogan & Footer Line */}
            <div className="space-y-3 w-full">
              <div className="w-28 h-[1px] bg-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-900">
                {schoolData.slogan || "ज्ञान, संस्कार आणि प्रगतीसाठी"}
              </p>
            </div>

          </div>
        </div>
        </A4PageWrapper>

        {/* -------------------- PAGE 2: INDEX (अनुक्रमणिका) -------------------- */}
        <A4PageWrapper>
        <div
          className="pdf-page bg-white border-none relative overflow-hidden flex flex-col justify-between h-[287mm] shadow-sm mb-4"
          style={{ padding: "10mm", boxSizing: "border-box", pageBreakAfter: "always", breakAfter: "page" }}
        >
          <div className="border-2 border-slate-700 rounded-none p-6 md:p-8 h-full w-full flex flex-col justify-between relative z-10" style={{ boxSizing: "border-box" }}>
            <div>
              <h2 className="text-2xl font-extrabold text-black mb-6 border-b-2 border-slate-800 pb-2">अनुक्रमणिका</h2>
              <table className="w-full border-collapse border border-amber-900/70 text-[15px] font-semibold text-black">
                <thead>
                  <tr className="bg-amber-50/90 text-amber-950 font-extrabold border-b border-amber-900/70">
                    <th className="p-3 text-left border-r border-amber-900/70 w-3/4">विद्यार्थ्याचे नाव / तपशील</th>
                    <th className="p-3 text-center w-1/4">पान क्रमांक</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-slate-700 font-bold">कोणतेही विद्यार्थी जोडलेले नाहीत.</td>
                    </tr>
                  ) : (
                    students.map((student, idx) => (
                      <tr key={student.id} className="border-b border-amber-900/40 hover:bg-slate-50">
                        <td className="p-3 border-r border-amber-900/40 text-blue-900 font-extrabold">
                          {idx + 1}. {student.name}
                        </td>
                        <td className="p-3 text-center text-black font-mono font-bold">
                          {pageMode === "1page" ? (idx + 3) : `${idx * 2 + 3} - ${idx * 2 + 4}`}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="border-b border-amber-900/40 bg-slate-50">
                    <td className="p-3 border-r border-amber-900/40 text-blue-900 font-extrabold">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</td>
                    <td className="p-3 text-center text-black font-mono font-bold">
                      {pageMode === "1page" ? (students.length + 3) : (students.length * 2 + 3)}
                    </td>
                  </tr>
                  <tr className="border-b border-amber-900/40 bg-slate-50">
                    <td className="p-3 border-r border-amber-900/40 text-blue-900 font-extrabold">जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक</td>
                    <td className="p-3 text-center text-black font-mono font-bold">
                      {pageMode === "1page" ? (students.length + 4) : (students.length * 2 + 4)}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="p-3 border-r border-amber-900/40 text-blue-900 font-extrabold">सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक</td>
                    <td className="p-3 text-center text-black font-mono font-bold">
                      {pageMode === "1page" ? (students.length + 5) : (students.length * 2 + 5)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-300 text-[13px] font-bold text-black">
              <div className="text-center">
                <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                <p className="text-xs text-slate-900 font-bold">वर्गशिक्षक</p>
              </div>
              <div className="text-center">
                <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                <p className="text-xs text-slate-900 font-bold">मुख्याध्यापक</p>
              </div>
            </div>
          </div>
        </div>
        </A4PageWrapper>

        {/* -------------------- STUDENT PAGES -------------------- */}
        {(() => {
          const displayedStudents = students;

          return displayedStudents.map((student, sIdx) => {
            const studentId = student.id || student.name;
          const studentMarks = marksData[student.id]
            || marksData[student.rollNo]
            || marksData[student.name]
            || marksData[student.fullName]
            || marksData[String(student.rollNo)]
            || marksData[studentId]
            || {};

          const getStudentRemarksObj = (std) => {
            if (!std) return {};
            const sId = String(std.id || "").trim();
            const sRoll = std.rollNo !== undefined && std.rollNo !== null ? String(std.rollNo).trim() : "";
            const sName = String(std.name || "").trim().toLowerCase();
            const sFullName = String(std.fullName || "").trim().toLowerCase();

            if (sId && remarksData[sId]) return remarksData[sId];
            if (sRoll && remarksData[sRoll]) return remarksData[sRoll];
            if (sName && remarksData[sName]) return remarksData[sName];
            if (sFullName && remarksData[sFullName]) return remarksData[sFullName];

            for (const [rKey, rVal] of Object.entries(remarksData)) {
              const lowerKey = String(rKey).trim().toLowerCase();
              if (
                (sId && (lowerKey === sId.toLowerCase() || lowerKey === `student_${sId.toLowerCase()}`)) ||
                (sRoll && (lowerKey === sRoll.toLowerCase() || lowerKey === `roll_${sRoll.toLowerCase()}` || lowerKey === `student_${sRoll.toLowerCase()}`)) ||
                (sName && (lowerKey === sName || lowerKey.includes(sName) || sName.includes(lowerKey))) ||
                (sFullName && (lowerKey === sFullName || lowerKey.includes(sFullName) || sFullName.includes(lowerKey)))
              ) {
                return rVal;
              }
            }
            return {};
          };

          const studentRemarks = getStudentRemarksObj(student);

          return (
            <React.Fragment key={student.id}>
              {/* Page A: Formative & Summative Evaluation Table */}
              <A4PageWrapper>
              <div
                className="pdf-page bg-white border-none relative overflow-hidden flex flex-col justify-between h-[287mm] shadow-sm mb-4"
                style={{ padding: "10mm", boxSizing: "border-box", pageBreakAfter: "always", breakAfter: "page" }}
              >
                <div
                  className={`border-2 border-slate-700 rounded-none h-full w-full flex flex-col justify-between relative z-10 ${pageMode === "1page" ? "p-2 sm:p-2.5" : "p-6"}`}
                  style={{ boxSizing: "border-box" }}
                >
                <div>
                  <h2 className={`font-extrabold text-[#004080] text-center ${pageMode === "1page" ? "text-[18px] mb-1" : "text-[25px] mb-4"}`}>सातत्यपूर्ण सर्वंकष मूल्यांकन</h2>

                  {/* Student Meta Header */}
                  <div className={`flex items-center justify-between font-bold text-black border-b-2 border-sky-200 ${pageMode === "1page" ? "text-[12px] font-extrabold pb-1 mb-1.5" : "text-[15px] font-extrabold pb-3 mb-4"}`}>
                    <span>विद्यार्थ्याचे नाव - <b className="text-black">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Marks Table */}
                  <div className="overflow-x-auto">
                    <table className={`w-full border-collapse border-2 border-[#0080ff] text-center font-medium table-fixed text-xs`}>
                      <colgroup>
                        <col style={{ width: "3.2%" }} />
                        <col style={{ width: "18.0%" }} />
                        <col style={{ width: "5.8%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.5%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.0%" }} />
                        <col style={{ width: "5.5%" }} />
                        <col style={{ width: "6.0%" }} />
                        <col style={{ width: "6.0%" }} />
                      </colgroup>
                      <thead>
                        {/* Header Row 1 */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-extrabold" style={{ height: "28px" }}>
                          <th className="border-x border-t border-b-0 border-[#0080ff] bg-[#bfe5ff] p-0.5 text-center font-extrabold text-[11px] leading-tight">
                            अ. क्र.
                          </th>
                          <th colSpan={2} className="border-x border-t border-b-0 border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-extrabold text-[13px]">
                            तपशील
                          </th>
                          <th colSpan={8} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-extrabold text-[13px]">
                            (अ) आकारिक मूल्यांकन
                          </th>
                          <th colSpan={4} className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-extrabold text-[13px]">
                            (ब) संकलित मूल्यांकन
                          </th>
                          <th className="border-x border-t border-b-0 border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-extrabold text-[13px]">
                            अ + ब
                          </th>
                          <th className="border-x border-t border-b-0 border-[#0080ff] bg-[#bfe5ff] p-1 text-center font-extrabold text-[13px]">
                            श्रेणी
                          </th>
                        </tr>

                        {/* Header Row 2: Vertical Labels */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-bold" style={{ height: pageMode === "1page" ? "92px" : "110px" }}>
                          <th className="border-x border-y-0 border-[#0080ff] bg-[#bfe5ff] p-0"></th>
                          <th colSpan={2} className="border-x border-y-0 border-[#0080ff] bg-[#bfe5ff] p-0"></th>
                          {[
                            { label: "तोंडीकाम" },
                            { label: "प्रात्यक्षिक / प्रयोग" },
                            { label: "उपक्रम / कृती" },
                            { label: "प्रकल्प" },
                            { label: "चाचणी (लेखी)" },
                            { label: "स्वाध्याय / वर्गकार्य" },
                            { label: "इतर" },
                            { label: "एकूण", bold: true },
                            { label: "तोंडी" },
                            { label: "प्रात्यक्षिक" },
                            { label: "लेखी" },
                            { label: "एकूण", bold: true },
                            { label: "एकूण", bold: true, noYBorder: true, large: true },
                            { label: "श्रेणी", bold: true, noYBorder: true, large: true },
                          ].map((col, idx) => (
                            <th
                              key={idx}
                              className={`${col.noYBorder ? "border-x border-y-0" : "border"} border-[#0080ff] bg-[#bfe5ff] ${col.bold ? "font-extrabold" : ""}`}
                              style={{
                                textAlign: "center",
                                verticalAlign: "middle",
                                padding: 0,
                                position: "relative",
                                height: pageMode === "1page" ? "92px" : "110px",
                                overflow: "hidden",
                              }}
                            >
                              <span
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%) rotate(-90deg)",
                                  whiteSpace: "nowrap",
                                  textAlign: "center",
                                  fontSize: col.large
                                    ? (pageMode === "1page" ? "11px" : "12.5px")
                                    : (pageMode === "1page" ? "10.5px" : "12px"),
                                  lineHeight: "1.1",
                                  display: "inline-block",
                                }}
                              >
                                {col.label}
                              </span>
                            </th>
                          ))}
                        </tr>

                        {/* Header Row 3: Numbers */}
                        <tr className="bg-[#bfe5ff] text-[#002b66] font-extrabold border-b-2 border-[#0080ff] text-[12px]" style={{ height: "24px" }}>
                          <th className="border-x border-b border-t-0 border-[#0080ff] bg-[#bfe5ff] p-0.5"></th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 font-extrabold text-[13px] text-center">विषय</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] py-1 px-0.5 text-center font-extrabold text-[12px] whitespace-nowrap">गुण</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">1</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">2</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">3</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">4</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">5</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">6</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">7</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 font-black"></th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">1</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">2</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 text-center">3</th>
                          <th className="border border-[#0080ff] bg-[#bfe5ff] p-1 font-black"></th>
                          <th className="border-x border-b border-t-0 border-[#0080ff] bg-[#bfe5ff] p-1 font-black text-center text-xs"></th>
                          <th className="border-x border-b border-t-0 border-[#0080ff] bg-[#bfe5ff] p-1 font-black text-center text-xs"></th>
                        </tr>
                      </thead>

                      <tbody>
                        {subjects.map((subjectName, subIdx) => {
                          const getSubData = (subName) => {
                            if (!studentMarks || typeof studentMarks !== "object") return {};
                            if (studentMarks[subName]) return studentMarks[subName];
                            const lower = String(subName).toLowerCase().trim();
                            if (lower.includes("मराठी")) return studentMarks["marathi"] || studentMarks["prathambhasha"] || studentMarks["प्रथम भाषा : मराठी"] || studentMarks["प्रथम भाषा: मराठी"] || studentMarks["प्रथम भाषा"] || studentMarks["मराठी"] || {};
                            if (lower.includes("इंग्रजी")) return studentMarks["english"] || studentMarks["dvitiybhasha"] || studentMarks["द्वितीय भाषा : इंग्रजी"] || studentMarks["द्वितीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा : इंग्रजी"] || studentMarks["तृतीय भाषा"] || studentMarks["इंग्रजी"] || {};
                            if (lower.includes("हिंदी")) return studentMarks["hindi"] || studentMarks["tritiyabhasha"] || studentMarks["हिंदी"] || {};
                            if (lower.includes("गणित")) return studentMarks["ganit"] || studentMarks["math"] || studentMarks["maths"] || studentMarks["गणित"] || {};
                            if (lower.includes("परिसर") || lower.includes("संभोवतालचे")) return studentMarks["parisar"] || studentMarks["parisar1"] || studentMarks["parisar2"] || studentMarks["आपले संभोवतालचे जग"] || studentMarks["परिसर अभ्यास"] || studentMarks["vijnan"] || studentMarks["vidnyan"] || studentMarks["विज्ञान"] || {};
                            if (lower.includes("कला")) return studentMarks["kala"] || studentMarks["art"] || studentMarks["कलाशिक्षण"] || studentMarks["कला"] || {};
                            if (lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) return studentMarks["karyanubhav"] || studentMarks["work"] || studentMarks["कार्यशिक्षण"] || studentMarks["कार्यानुभव"] || {};
                            if (lower.includes("शारीरिक")) return studentMarks["sharirik"] || studentMarks["pe"] || studentMarks["शारीरिक शिक्षण"] || studentMarks["शारीरिक शिक्षण व आरोग्य"] || {};

                            for (const [k, v] of Object.entries(studentMarks)) {
                              const kLower = String(k).toLowerCase().trim();
                              if (
                                (lower.includes("मराठी") && kLower.includes("मराठी")) ||
                                (lower.includes("इंग्रजी") && kLower.includes("इंग्रजी")) ||
                                (lower.includes("हिंदी") && kLower.includes("हिंदी")) ||
                                (lower.includes("गणित") && kLower.includes("गणित")) ||
                                (lower.includes("कला") && kLower.includes("कला")) ||
                                ((lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) && (kLower.includes("कार्यानुभव") || kLower.includes("कार्यशिक्षण") || kLower.includes("कार्य"))) ||
                                (lower.includes("शारीरिक") && kLower.includes("शारीरिक")) ||
                                ((lower.includes("परिसर") || lower.includes("संभोवतालचे")) && (kLower.includes("परिसर") || kLower.includes("संभोवतालचे"))) ||
                                kLower === lower
                              ) {
                                return v;
                              }
                            }
                            return {};
                          };

                          const getSubjectWeightage = (subName, stdId, stdRoll) => {
                            if (!weightageData || typeof weightageData !== "object" || Object.keys(weightageData).length === 0) return null;

                            const findInList = (list) => {
                              if (!Array.isArray(list) || list.length === 0) return null;

                              const matchSub = (subjectsMap) => {
                                if (!subjectsMap || typeof subjectsMap !== "object") return null;
                                if (subjectsMap[subName]) return subjectsMap[subName];
                                const lower = String(subName).toLowerCase().trim();
                                for (const [sKey, sVal] of Object.entries(subjectsMap)) {
                                  const sLower = String(sKey).toLowerCase().trim();
                                  if (
                                    (lower.includes("मराठी") && sLower.includes("मराठी")) ||
                                    (lower.includes("इंग्रजी") && sLower.includes("इंग्रजी")) ||
                                    (lower.includes("हिंदी") && sLower.includes("हिंदी")) ||
                                    (lower.includes("गणित") && sLower.includes("गणित")) ||
                                    (lower.includes("कला") && sLower.includes("कला")) ||
                                    (lower.includes("कार्यानुभव") && sLower.includes("कार्यानुभव")) ||
                                    (lower.includes("शारीरिक") && sLower.includes("शारीरिक")) ||
                                    (lower.includes("परिसर") && sLower.includes("परिसर")) ||
                                    (lower.includes("विज्ञान") && sLower.includes("विज्ञान")) ||
                                    (lower.includes("सामाजिक") && sLower.includes("सामाजिक")) ||
                                    (lower.includes("इतिहास") && sLower.includes("इतिहास")) ||
                                    (lower.includes("भूगोल") && sLower.includes("भूगोल")) ||
                                    sLower === lower
                                  ) {
                                    return sVal;
                                  }
                                }
                                return null;
                              };

                              // 1. Try matching student by ID or roll number
                              if (stdId || stdRoll) {
                                const stdMatch = list.find((i) => {
                                  if (!i.studentIds || !Array.isArray(i.studentIds) || i.studentIds.length === 0) return false;
                                  return i.studentIds.some(id => String(id) === String(stdId) || String(id) === String(stdRoll));
                                });
                                if (stdMatch && stdMatch.subjects) {
                                  const res = matchSub(stdMatch.subjects);
                                  if (res) return res;
                                }
                              }

                              // 2. Try group with empty studentIds (applicable to all students)
                              const allStudentsItem = list.find((i) => !i.studentIds || !Array.isArray(i.studentIds) || i.studentIds.length === 0);
                              if (allStudentsItem && allStudentsItem.subjects) {
                                const res = matchSub(allStudentsItem.subjects);
                                if (res) return res;
                              }

                              // 3. Fallback to any item in list
                              for (const item of list) {
                                if (item && item.subjects) {
                                  const res = matchSub(item.subjects);
                                  if (res) return res;
                                }
                              }
                              return null;
                            };

                            const sem1 = weightageData.semester1 || (weightageData.data ? weightageData.data.semester1 : null);
                            const sem2 = weightageData.semester2 || (weightageData.data ? weightageData.data.semester2 : null);
                            const rows = weightageData.rows || (weightageData.data ? weightageData.data.rows : null);

                            const activeSemList = selectedTerm === "sem1" ? sem1 : sem2;
                            const fallbackSemList = selectedTerm === "sem1" ? sem2 : sem1;

                            const matchActive = findInList(activeSemList);
                            if (matchActive) return matchActive;
                            const matchFallback = findInList(fallbackSemList);
                            if (matchFallback) return matchFallback;
                            const matchRows = findInList(rows);
                            if (matchRows) return matchRows;

                            if (weightageData[subName]) return weightageData[subName];
                            if (weightageData.data && weightageData.data[subName]) return weightageData.data[subName];

                            return null;
                          };

                          const subData = getSubData(subjectName);
                          const sw = getSubjectWeightage(subjectName, student.id, student.rollNo);
                          const hasWeightage = !!(sw && typeof sw === "object" && Object.values(sw).some(v => v !== undefined && v !== null && String(v).trim() !== ""));
                          const isPracticalSub = subjectName.includes("कला") || subjectName.includes("कार्यानुभव") || subjectName.includes("कार्यशिक्षण") || subjectName.includes("कार्य") || subjectName.includes("शारीरिक");

                          const getWVal = (keys) => {
                            if (hasWeightage && sw && typeof sw === "object") {
                              for (const k of keys) {
                                if (sw[k] !== undefined && sw[k] !== null && String(sw[k]).trim() !== "") {
                                  return String(sw[k]).trim();
                                }
                              }
                            }
                            return "";
                          };

                          const tondiKaamMax = getWVal(["tondiKaam", "tondi", "oral"]);
                          const pratyakshikPrayogMax = getWVal(["pratyakshikPrayog", "pratyakshik", "practical", "activity"]);
                          const upakramKritiMax = getWVal(["upakramKriti", "upakram", "kriti"]);
                          const prakalpaMax = getWVal(["prakalpa", "prakalp", "project"]);
                          const chaachaniLekhiMax = getWVal(["chaachaniLekhi", "chaachani", "test", "exam"]);
                          const swadhyayVargakaryaMax = getWVal(["swadhyayVargakarya", "swadhyay", "vargakarya", "homework"]);
                          const itarMax = getWVal(["itar", "other"]);

                          const sankalitTondiMax = isPracticalSub ? "" : getWVal(["sankalitTondi", "sankalitOral"]);
                          const sankalitPratyakshikMax = isPracticalSub ? "" : getWVal(["sankalitPratyakshik", "sankalitPractical"]);
                          const sankalitLekhiMax = isPracticalSub ? "" : getWVal(["sankalitLekhi", "sankalitWritten"]);

                          const tondiKaamObt = (hasWeightage && Number(tondiKaamMax) === 0) ? "" : (subData.tondiKaam ?? subData.tondi ?? subData.oral ?? "");
                          const pratyakshikPrayogObt = (hasWeightage && Number(pratyakshikPrayogMax) === 0) ? "" : (subData.pratyakshikPrayog ?? subData.practical ?? subData.activity ?? "");
                          const upakramKritiObt = (hasWeightage && Number(upakramKritiMax) === 0) ? "" : (subData.upakramKriti ?? subData.upakram ?? subData.project ?? "");
                          const prakalpaObt = (hasWeightage && Number(prakalpaMax) === 0) ? "" : (subData.prakalp ?? subData.prakalpa ?? "");
                          const chaachaniLekhiObt = (hasWeightage && Number(chaachaniLekhiMax) === 0) ? "" : (subData.chaachaniLekhi ?? subData.chaachani ?? subData.test ?? subData.exam ?? "");
                          const swadhyayVargakaryaObt = (hasWeightage && Number(swadhyayVargakaryaMax) === 0) ? "" : (subData.swadhyayVargakarya ?? subData.swadhyay ?? subData.vargakarya ?? subData.homework ?? "");
                          const itarObt = (hasWeightage && Number(itarMax) === 0) ? "" : (subData.itar ?? subData.other ?? "");

                          const sankalitTondiObt = (!isPracticalSub && (!hasWeightage || Number(sankalitTondiMax) > 0)) ? (subData.sankalitTondi ?? subData.semesterOral ?? "") : "";
                          const sankalitPratyakshikObt = (!isPracticalSub && (!hasWeightage || Number(sankalitPratyakshikMax) > 0)) ? (subData.sankalitPratyakshik ?? subData.semesterPractical ?? "") : "";
                          const sankalitLekhiObt = (!isPracticalSub && (!hasWeightage || Number(sankalitLekhiMax) > 0)) ? (subData.sankalitLekhi ?? subData.lekhi ?? subData.written ?? subData.semesterWritten ?? "") : "";

                          const hasFormative = tondiKaamObt !== "" || pratyakshikPrayogObt !== "" || upakramKritiObt !== "" || prakalpaObt !== "" || chaachaniLekhiObt !== "" || swadhyayVargakaryaObt !== "" || itarObt !== "";
                          const formTotalObt = hasFormative ? ((Number(tondiKaamObt) || 0) + (Number(pratyakshikPrayogObt) || 0) + (Number(upakramKritiObt) || 0) + (Number(prakalpaObt) || 0) + (Number(chaachaniLekhiObt) || 0) + (Number(swadhyayVargakaryaObt) || 0) + (Number(itarObt) || 0)) : (subData.akarik ?? subData.formTotal ?? subData.Akarik?.Total ?? "");
                          const formTotalMaxNum = (Number(tondiKaamMax) || 0) + (Number(pratyakshikPrayogMax) || 0) + (Number(upakramKritiMax) || 0) + (Number(prakalpaMax) || 0) + (Number(chaachaniLekhiMax) || 0) + (Number(swadhyayVargakaryaMax) || 0) + (Number(itarMax) || 0);
                          const formTotalMax = hasWeightage ? (formTotalMaxNum > 0 ? formTotalMaxNum : "") : "";

                          const hasSummative = (sankalitTondiObt !== "" || sankalitPratyakshikObt !== "" || sankalitLekhiObt !== "") && !isPracticalSub;
                          const semTotalObt = hasSummative ? ((Number(sankalitTondiObt) || 0) + (Number(sankalitPratyakshikObt) || 0) + (Number(sankalitLekhiObt) || 0)) : (isPracticalSub ? "" : (subData.sankalit ?? subData.semTotal ?? subData.Sanklik?.Total ?? ""));
                          const semTotalMaxNum = (Number(sankalitTondiMax) || 0) + (Number(sankalitPratyakshikMax) || 0) + (Number(sankalitLekhiMax) || 0);
                          const semTotalMax = isPracticalSub ? "" : (hasWeightage ? (semTotalMaxNum > 0 ? semTotalMaxNum : "") : "");

                          const hasGrand = formTotalObt !== "" || semTotalObt !== "";
                          const grandTotalObt = hasGrand ? ((Number(formTotalObt) || 0) + (Number(semTotalObt) || 0)) : (subData.total ?? subData.grandTotal ?? subData.obtained ?? subData.marks ?? "");
                          const grandMax = hasWeightage ? 100 : "";
                          const grade = grandTotalObt !== "" ? getGrade((Number(grandTotalObt) / 100) * 100) : "";

                          const isCompact = pageMode === "1page";
                          const cellTextSize = isCompact ? "text-[11px]" : "text-[13px]";
                          const markTextSize = isCompact ? "text-[10.5px]" : "text-[12px]";

                          const renderCellPair = (maxVal, obtVal, isBold = false) => (
                            <td className="border border-[#0080ff] bg-white p-0 align-middle" style={{ padding: 0 }}>
                              <div
                                className={`${isCompact ? "py-1" : "py-1.5"} px-0.5 text-center ${markTextSize} ${isBold ? "font-extrabold" : "font-bold"} leading-tight`}
                                style={{ borderBottom: "1px solid #ccc" }}
                              >
                                {maxVal !== "" && maxVal !== undefined && maxVal !== null ? maxVal : "\u00A0"}
                              </div>
                              <div className={`${isCompact ? "py-1" : "py-1.5"} px-0.5 text-center ${markTextSize} ${isBold ? "font-extrabold" : "font-bold"} leading-tight`}>
                                {obtVal !== "" && obtVal !== undefined && obtVal !== null ? obtVal : "\u00A0"}
                              </div>
                            </td>
                          );

                          return (
                            <tr key={subjectName} className="bg-white text-slate-900 border-b-2 border-[#0080ff]">
                              {/* Col 1: Serial No */}
                              <td className={`border border-[#0080ff] bg-white p-0.5 text-center align-middle font-extrabold text-slate-900 ${cellTextSize}`}>
                                {subIdx + 1}
                              </td>

                              {/* Col 2: Subject Name */}
                              <td className={`border border-[#0080ff] bg-white p-1 text-center align-middle text-[#002b66] font-extrabold ${cellTextSize} whitespace-normal break-words`} style={{ lineHeight: "1.25" }}>
                                {subjectName}
                              </td>

                              {/* Col 3: पैकी / प्राप्त */}
                              <td className="border border-[#0080ff] bg-white p-0 align-middle" style={{ padding: 0 }}>
                                <div
                                  className={`${isCompact ? "py-1" : "py-1.5"} px-0.5 text-slate-800 font-extrabold text-center whitespace-nowrap ${markTextSize} leading-tight`}
                                  style={{ borderBottom: "1px solid #ccc" }}
                                >
                                  पैकी
                                </div>
                                <div className={`${isCompact ? "py-1" : "py-1.5"} px-0.5 text-slate-800 font-extrabold text-center whitespace-nowrap ${markTextSize} leading-tight`}>
                                  प्राप्त
                                </div>
                              </td>

                              {/* Col 4-10: Formative Tools 1-7 */}
                              {renderCellPair(tondiKaamMax, tondiKaamObt)}
                              {renderCellPair(pratyakshikPrayogMax, pratyakshikPrayogObt)}
                              {renderCellPair(upakramKritiMax, upakramKritiObt)}
                              {renderCellPair(prakalpaMax, prakalpaObt)}
                              {renderCellPair(chaachaniLekhiMax, chaachaniLekhiObt)}
                              {renderCellPair(swadhyayVargakaryaMax, swadhyayVargakaryaObt)}
                              {renderCellPair(itarMax, itarObt)}

                              {/* Col 11: Formative Total */}
                              {renderCellPair(formTotalMax, formTotalObt, true)}

                              {/* Col 12-15: Summative Tools 1-3 + Total */}
                              {isPracticalSub ? (
                                <td colSpan={4} className="border border-[#0080ff] bg-slate-100/80 align-middle text-center"></td>
                              ) : (
                                <>
                                  {renderCellPair(sankalitTondiMax, sankalitTondiObt)}
                                  {renderCellPair(sankalitPratyakshikMax, sankalitPratyakshikObt)}
                                  {renderCellPair(sankalitLekhiMax, sankalitLekhiObt)}
                                  {renderCellPair(semTotalMax, semTotalObt, true)}
                                </>
                              )}

                              {/* Col 16: Grand Total (अ + ब) */}
                              {renderCellPair(grandMax, grandTotalObt, true)}

                              {/* Col 17: Grade */}
                              <td className={`border border-[#0080ff] bg-white p-0.5 text-center align-middle font-extrabold text-slate-900 ${cellTextSize}`}>
                                {grade || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Inline Compact Remarks — ONLY in 1-page mode */}
                  {pageMode === "1page" && (
                    <div className={pageMode === "1page" ? "mt-1" : "mt-2"}>
                      <h3 className={`font-extrabold text-sky-900 text-center border-b border-sky-300 ${pageMode === "1page" ? "text-[12.5px] mb-0.5 pb-0.5" : "text-sm mb-1 pb-1"}`}>वर्णनात्मक नोंदी</h3>
                      {(() => {
                            const getFormattedRemark = (remarksObj, labelOrKey) => {
                              if (!remarksObj || typeof remarksObj !== "object") return "-";
                              let val = remarksObj[labelOrKey];

                              if (!val) {
                                const lower = String(labelOrKey).toLowerCase().trim();
                                if (lower.includes("मराठी") || lower.includes("prathambhasha")) {
                                  val = remarksObj["prathambhasha"] || remarksObj["marathi"] || remarksObj["प्रथम भाषा : मराठी"] || remarksObj["प्रथम भाषा: मराठी"] || remarksObj["प्रथम भाषा (मराठी)"] || remarksObj["प्रथम भाषा"] || remarksObj["मराठी"];
                                } else if (lower.includes("इंग्रजी") || lower.includes("dvitiybhasha")) {
                                  val = remarksObj["dvitiybhasha"] || remarksObj["english"] || remarksObj["द्वितीय भाषा : इंग्रजी"] || remarksObj["द्वितीय भाषा: इंग्रजी"] || remarksObj["तृतीय भाषा: इंग्रजी"] || remarksObj["तृतीय भाषा : इंग्रजी"] || remarksObj["द्वितीय भाषा (इंग्रजी)"] || remarksObj["तृतीय भाषा"] || remarksObj["इंग्रजी"];
                                } else if (lower.includes("हिंदी") || lower.includes("tritiyabhasha")) {
                                  val = remarksObj["tritiyabhasha"] || remarksObj["hindi"] || remarksObj["तृतीय भाषा (हिंदी)"] || remarksObj["तृतीय भाषा: हिंदी"] || remarksObj["हिंदी"];
                                } else if (lower.includes("गणित") || lower.includes("ganit")) {
                                  val = remarksObj["ganit"] || remarksObj["math"] || remarksObj["maths"] || remarksObj["गणित"];
                                } else if (lower.includes("परिसर") || lower.includes("parisar") || lower.includes("संभोवतालचे")) {
                                  val = remarksObj["parisar"] || remarksObj["parisar1"] || remarksObj["parisar2"] || remarksObj["आपले संभोवतालचे जग"] || remarksObj["परिसर अभ्यास"] || remarksObj["परिसर अभ्यास १"] || remarksObj["परिसर अभ्यास २"];
                                } else if (lower.includes("विज्ञान") || lower.includes("vijnan") || lower.includes("vidnyan")) {
                                  val = remarksObj["vijnan"] || remarksObj["vidnyan"] || remarksObj["विज्ञान"] || remarksObj["विज्ञान व तंत्रज्ञान"];
                                } else if (lower.includes("सामाजिक") || lower.includes("samajik_shastra") || lower.includes("samajshastra")) {
                                  val = remarksObj["samajik_shastra"] || remarksObj["samajshastra"] || remarksObj["सामाजिक शास्त्रे"];
                                } else if (lower.includes("कला") || lower.includes("kala")) {
                                  val = remarksObj["kala"] || remarksObj["art"] || remarksObj["कलाशिक्षण"] || remarksObj["कला"];
                                } else if (lower.includes("कार्यानुभव") || lower.includes("karyanubhav") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) {
                                  val = remarksObj["karyanubhav"] || remarksObj["work"] || remarksObj["कार्यशिक्षण"] || remarksObj["कार्यानुभव"];
                                } else if (lower.includes("शारीरिक") || lower.includes("sharirik")) {
                                  val = remarksObj["sharirik"] || remarksObj["pe"] || remarksObj["शारीरिक शिक्षण"] || remarksObj["शारीरिक शिक्षण व आरोग्य"];
                                } else if (lower.includes("विशेष") || lower.includes("visheshpragati")) {
                                  val = remarksObj["visheshpragati"] || remarksObj["vishesh"] || remarksObj["विशेष प्रगती"];
                                } else if (lower.includes("सुधारणा") || lower.includes("sudharna")) {
                                  val = remarksObj["sudharna"] || remarksObj["sudharana"] || remarksObj["सुधारणा आवश्यक"];
                                } else if (lower.includes("आवड") || lower.includes("aavad")) {
                                  val = remarksObj["aavad"] || remarksObj["आवड / छंद"] || remarksObj["छंद"];
                                } else if (lower.includes("व्यक्तिमत्त्व") || lower.includes("vyaktimatva")) {
                                  val = remarksObj["vyaktimatva"] || remarksObj["व्यक्तिमत्त्व गुणविशेष"] || remarksObj["व्यक्तिमत्व गुणविशेष"];
                                }
                              }

                              if (!val) {
                                const lLower = String(labelOrKey).toLowerCase().trim();
                                for (const [k, v] of Object.entries(remarksObj)) {
                                  const kLower = String(k).toLowerCase().trim();
                                  if (
                                    (lLower.includes("मराठी") && (kLower.includes("मराठी") || kLower.includes("prathambhasha"))) ||
                                    (lLower.includes("इंग्रजी") && (kLower.includes("इंग्रजी") || kLower.includes("dvitiybhasha"))) ||
                                    (lLower.includes("हिंदी") && (kLower.includes("हिंदी") || kLower.includes("tritiyabhasha"))) ||
                                    (lLower.includes("गणित") && (kLower.includes("गणित") || kLower.includes("ganit"))) ||
                                    (lLower.includes("कला") && (kLower.includes("कला") || kLower.includes("kala"))) ||
                                    ((lLower.includes("कार्यानुभव") || lLower.includes("कार्यशिक्षण") || lLower.includes("कार्य")) && (kLower.includes("कार्यानुभव") || kLower.includes("कार्यशिक्षण") || kLower.includes("karyanubhav") || kLower.includes("कार्य"))) ||
                                    (lLower.includes("शारीरिक") && (kLower.includes("शारीरिक") || kLower.includes("sharirik"))) ||
                                    ((lLower.includes("परिसर") || lLower.includes("संभोवतालचे")) && (kLower.includes("परिसर") || kLower.includes("parisar") || kLower.includes("संभोवतालचे"))) ||
                                    kLower === lLower
                                  ) {
                                    val = v;
                                    break;
                                  }
                                }
                              }

                              if (!val) return "-";
                              if (Array.isArray(val)) {
                                const filtered = val.filter(Boolean).map((x) => String(x).trim()).filter((x) => x.length > 0);
                                return filtered.length > 0 ? filtered.join(" ") : "-";
                              }
                              if (typeof val === "object") {
                                const vals = Object.values(val).filter(Boolean).map((x) => String(x).trim()).filter((x) => x.length > 0);
                                return vals.length > 0 ? vals.join(" ") : "-";
                              }
                              return String(val).trim() || "-";
                            };

                            const getR = getFormattedRemark;
                            const allRemarksItems = [
                              ...subjects,
                              "विशेष प्रगती",
                              "सुधारणा आवश्यक",
                              "आवड / छंद",
                              "व्यक्तिमत्त्व गुणविशेष"
                            ];

                            if (subjects.length >= 8) {
                              const half = Math.ceil(allRemarksItems.length / 2);
                              const col1 = allRemarksItems.slice(0, half);
                              const col2 = allRemarksItems.slice(half);

                              const renderSubTable = (itemsList) => (
                                <table className="w-full border-collapse border border-sky-500 text-[11px] font-semibold table-fixed">
                                  <colgroup>
                                    <col style={{ width: "35%" }} />
                                    <col style={{ width: "65%" }} />
                                  </colgroup>
                                  <thead>
                                    <tr className="bg-sky-100 text-sky-950 font-extrabold">
                                      <th className="border border-sky-500 p-0.5 text-left">विषय / घटक</th>
                                      <th className="border border-sky-500 p-0.5 text-left">वर्णनात्मक नोंदी</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {itemsList.map((item) => (
                                      <tr key={item} className="border-b border-sky-400">
                                        <td className="border border-sky-500 p-0.5 font-bold text-black bg-sky-50/50 leading-tight whitespace-normal break-words align-top">{item}</td>
                                        <td className="border border-sky-500 p-0.5 text-black leading-snug text-[10.5px] whitespace-normal break-words align-top">{getR(studentRemarks, item)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              );

                              return (
                                <div className="grid grid-cols-2 gap-2 items-start">
                                  <div>{renderSubTable(col1)}</div>
                                  <div>{renderSubTable(col2)}</div>
                                </div>
                              );
                            }

                            return (
                              <table className="w-full border-collapse border border-sky-500 text-xs font-semibold table-fixed">
                                <colgroup>
                                  <col style={{ width: "22%" }} />
                                  <col style={{ width: "78%" }} />
                                </colgroup>
                                <thead>
                                  <tr className="bg-sky-100 text-sky-950 font-extrabold">
                                    <th className="border border-sky-500 py-0.5 px-1.5 text-left text-[11.5px]">विषय / घटक</th>
                                    <th className="border border-sky-500 py-0.5 px-1.5 text-left text-[11.5px]">वर्णनात्मक नोंदी</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allRemarksItems.map((item) => (
                                    <tr key={item} className="border-b border-sky-400">
                                      <td className="border border-sky-500 py-0.5 px-1.5 font-bold text-black bg-sky-50/50 text-[11px] leading-snug whitespace-normal break-words">{item}</td>
                                      <td className="border border-sky-500 py-0.5 px-1.5 text-black text-[11px] leading-snug whitespace-normal break-words">{getR(studentRemarks, item)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                    </div>
                  )}
                </div>

                {/* Footer Signatures */}
                <div className={`flex items-center justify-between border-t border-slate-300 font-bold text-black ${pageMode === "1page" ? "pt-1 mt-1 text-[12px]" : "pt-4 mt-3 text-[13px]"}`}>
                  <div className="text-center">
                    <p className={pageMode === "1page" ? "font-extrabold text-[13px]" : "font-extrabold text-[15px]"}>{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className={pageMode === "1page" ? "text-[11px] text-slate-900 font-bold" : "text-xs text-slate-900 font-bold"}>वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className={pageMode === "1page" ? "font-extrabold text-[13px]" : "font-extrabold text-[15px]"}>{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className={pageMode === "1page" ? "text-[11px] text-slate-900 font-bold" : "text-xs text-slate-900 font-bold"}>मुख्याध्यापक</p>
                  </div>
                </div>
              </div>
            </div>
            </A4PageWrapper>

              {/* Page B: Descriptive Remarks Table — ONLY in 2-pages mode */}
              {pageMode === "2pages" && (
              <A4PageWrapper>
              <div
                className="pdf-page bg-white border-none relative overflow-hidden flex flex-col justify-between h-[287mm] shadow-sm mb-4"
                style={{ padding: "10mm", boxSizing: "border-box", pageBreakAfter: "always", breakAfter: "page" }}
              >
                <div className="border-2 border-slate-700 rounded-none p-6 h-full w-full flex flex-col justify-between relative z-10" style={{ boxSizing: "border-box" }}>
                <div>
                  <h2 className="text-2xl font-extrabold text-sky-900 text-center mb-4 border-b border-sky-300 pb-2">वर्णनात्मक नोंदी</h2>

                  {/* Student Meta Header */}
                  <div className="flex items-center justify-between text-sm font-extrabold text-black bg-sky-50/90 p-3 rounded-xl border border-sky-200 mb-4">
                    <span>विद्यार्थ्याचे नाव - <b className="text-blue-900">{student.name}</b></span>
                    <span>इयत्ता - <b>{selectedClass}</b></span>
                    <span>तुकडी - <b>{division}</b></span>
                    <span>हजेरी क्र. <b>{student.rollNo}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                  </div>

                  {/* Descriptive Remarks Table */}
                  <table className="w-full border-collapse border border-sky-500 text-sm font-semibold text-black">
                    <thead>
                      <tr className="bg-sky-100 text-sky-950 font-extrabold">
                        <th className="border border-sky-500 p-2.5 text-left w-1/3">विषय / घटक</th>
                        <th className="border border-sky-500 p-2.5 text-left w-2/3">वर्णनात्मक नोंदी</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const getFormattedRemark = (remarksObj, labelOrKey) => {
                          if (!remarksObj || typeof remarksObj !== "object") return "-";
                          let val = remarksObj[labelOrKey];

                          if (!val) {
                            const lower = String(labelOrKey).toLowerCase();
                            if (lower.includes("मराठी") || lower.includes("prathambhasha")) {
                              val = remarksObj["prathambhasha"] || remarksObj["marathi"] || remarksObj["प्रथम भाषा : मराठी"] || remarksObj["प्रथम भाषा: मराठी"];
                            } else if (lower.includes("इंग्रजी") || lower.includes("dvitiybhasha")) {
                              val = remarksObj["dvitiybhasha"] || remarksObj["english"] || remarksObj["द्वितीय भाषा : इंग्रजी"] || remarksObj["तृतीय भाषा: इंग्रजी"] || remarksObj["तृतीय भाषा : इंग्रजी"];
                            } else if (lower.includes("गणित") || lower.includes("ganit")) {
                              val = remarksObj["ganit"] || remarksObj["math"] || remarksObj["गणित"];
                            } else if (lower.includes("परिसर") || lower.includes("parisar") || lower.includes("संभोवतालचे")) {
                              val = remarksObj["parisar"] || remarksObj["parisar1"] || remarksObj["parisar2"] || remarksObj["आपले संभोवतालचे जग"] || remarksObj["परिसर अभ्यास"];
                            } else if (lower.includes("कला") || lower.includes("kala")) {
                              val = remarksObj["kala"] || remarksObj["कलाशिक्षण"] || remarksObj["कला"];
                            } else if (lower.includes("कार्यानुभव") || lower.includes("karyanubhav") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) {
                              val = remarksObj["karyanubhav"] || remarksObj["कार्यशिक्षण"] || remarksObj["कार्यानुभव"];
                            } else if (lower.includes("शारीरिक") || lower.includes("sharirik")) {
                              val = remarksObj["sharirik"] || remarksObj["शारीरिक शिक्षण"];
                            } else if (lower.includes("विशेष") || lower.includes("visheshpragati")) {
                              val = remarksObj["visheshpragati"] || remarksObj["vishesh"] || remarksObj["विशेष प्रगती"];
                            } else if (lower.includes("सुधारणा") || lower.includes("sudharna")) {
                              val = remarksObj["sudharna"] || remarksObj["sudharana"] || remarksObj["सुधारणा आवश्यक"];
                            } else if (lower.includes("आवड") || lower.includes("aavad")) {
                              val = remarksObj["aavad"] || remarksObj["आवड / छंद"];
                            } else if (lower.includes("व्यक्तिमत्त्व") || lower.includes("vyaktimatva")) {
                              val = remarksObj["vyaktimatva"] || remarksObj["व्यक्तिमत्त्व गुणविशेष"] || remarksObj["व्यक्तिमत्व गुणविशेष"];
                            }
                          }

                          if (!val) return "-";
                          if (Array.isArray(val)) {
                            return val.length > 0 ? val.join(" ") : "-";
                          }
                          return String(val).trim() || "-";
                        };

                        return (
                          <>
                            {subjects.map((subjectName) => {
                              const remarkText = getFormattedRemark(studentRemarks, subjectName);
                              return (
                                <tr key={subjectName} className="border-b border-sky-300 hover:bg-slate-50">
                                  <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">{subjectName}</td>
                                  <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{remarkText}</td>
                                </tr>
                              );
                            })}
                            <tr className="border-b border-sky-300">
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">विशेष प्रगती</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "विशेष प्रगती")}</td>
                            </tr>
                            <tr className="border-b border-sky-300">
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">सुधारणा आवश्यक</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "सुधारणा आवश्यक")}</td>
                            </tr>
                            <tr className="border-b border-sky-300">
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">आवड / छंद</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "आवड / छंद")}</td>
                            </tr>
                            <tr>
                              <td className="border border-sky-400 p-2.5 font-bold text-slate-900 bg-sky-50/50">व्यक्तिमत्त्व गुणविशेष</td>
                              <td className="border border-sky-400 p-2.5 text-slate-800 leading-relaxed">{getFormattedRemark(studentRemarks, "व्यक्तिमत्त्व गुणविशेष")}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-300 mt-6 text-[13px] font-bold text-black">
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className="text-xs text-slate-900 font-bold">वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className="text-xs text-slate-900 font-bold">मुख्याध्यापक</p>
                  </div>
                </div>
              </div>
            </div>
            </A4PageWrapper>
            )}
            </React.Fragment>
          );
        });
        })()}

        {/* -------------------- DYNAMIC CALCULATIONS FOR FINAL 3 PAGES -------------------- */}
        {(() => {
          const getStudentMarksObj = (student) => {
            if (!student) return {};
            const sId = String(student.id || "").trim();
            const sRoll = student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo).trim() : "";
            const sName = String(student.name || "").trim().toLowerCase();
            const sFullName = String(student.fullName || "").trim().toLowerCase();

            if (sId && marksData[sId]) return marksData[sId];
            if (sRoll && marksData[sRoll]) return marksData[sRoll];
            if (sName && marksData[sName]) return marksData[sName];
            if (sFullName && marksData[sFullName]) return marksData[sFullName];

            for (const [mKey, mVal] of Object.entries(marksData)) {
              const lowerKey = String(mKey).trim().toLowerCase();
              if (
                (sId && (lowerKey === sId.toLowerCase() || lowerKey === `student_${sId.toLowerCase()}`)) ||
                (sRoll && (lowerKey === sRoll.toLowerCase() || lowerKey === `roll_${sRoll.toLowerCase()}` || lowerKey === `student_${sRoll.toLowerCase()}`)) ||
                (sName && (lowerKey === sName || lowerKey.includes(sName) || sName.includes(lowerKey))) ||
                (sFullName && (lowerKey === sFullName || lowerKey.includes(sFullName) || sFullName.includes(lowerKey)))
              ) {
                return mVal;
              }
            }
            return {};
          };

          const getStudentSubjectStats = (student, subjectName) => {
            let studentMarks = getStudentMarksObj(student);
            if (studentMarks && studentMarks.subjects && typeof studentMarks.subjects === "object") {
              studentMarks = studentMarks.subjects;
            } else if (studentMarks && studentMarks.records && typeof studentMarks.records === "object") {
              studentMarks = studentMarks.records;
            }

            const lower = String(subjectName).toLowerCase().trim();

            let subData = {};
            if (studentMarks[subjectName]) {
              subData = studentMarks[subjectName];
            } else if (lower.includes("मराठी")) {
              subData = studentMarks["marathi"] || studentMarks["prathambhasha"] || studentMarks["प्रथम भाषा : मराठी"] || studentMarks["प्रथम भाषा: मराठी"] || studentMarks["प्रथम भाषा"] || studentMarks["मराठी"] || {};
            } else if (lower.includes("इंग्रजी")) {
              subData = studentMarks["english"] || studentMarks["dvitiybhasha"] || studentMarks["द्वितीय भाषा : इंग्रजी"] || studentMarks["द्वितीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा: इंग्रजी"] || studentMarks["तृतीय भाषा : इंग्रजी"] || studentMarks["तृतीय भाषा"] || studentMarks["इंग्रजी"] || {};
            } else if (lower.includes("हिंदी")) {
              subData = studentMarks["hindi"] || studentMarks["tritiyabhasha"] || studentMarks["हिंदी"] || {};
            } else if (lower.includes("गणित")) {
              subData = studentMarks["ganit"] || studentMarks["math"] || studentMarks["maths"] || studentMarks["गणित"] || {};
            } else if (lower.includes("परिसर") || lower.includes("संभोवतालचे")) {
              subData = studentMarks["parisar"] || studentMarks["parisar1"] || studentMarks["parisar2"] || studentMarks["आपले संभोवतालचे जग"] || studentMarks["परिसर अभ्यास"] || studentMarks["vijnan"] || studentMarks["vidnyan"] || studentMarks["विज्ञान"] || {};
            } else if (lower.includes("कला")) {
              subData = studentMarks["kala"] || studentMarks["कलाशिक्षण"] || studentMarks["कला"] || {};
            } else if (lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) {
              subData = studentMarks["karyanubhav"] || studentMarks["कार्यशिक्षण"] || studentMarks["कार्यानुभव"] || {};
            } else if (lower.includes("शारीरिक")) {
              subData = studentMarks["sharirik"] || studentMarks["शारीरिक शिक्षण"] || studentMarks["शारीरिक शिक्षण व आरोग्य"] || {};
            }

            if (!subData || Object.keys(subData).length === 0) {
              for (const [k, v] of Object.entries(studentMarks)) {
                const kLower = String(k).toLowerCase().trim();
                if (
                  (lower.includes("मराठी") && kLower.includes("मराठी")) ||
                  (lower.includes("इंग्रजी") && kLower.includes("इंग्रजी")) ||
                  (lower.includes("हिंदी") && kLower.includes("हिंदी")) ||
                  (lower.includes("गणित") && kLower.includes("गणित")) ||
                  (lower.includes("कला") && kLower.includes("कला")) ||
                  ((lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) && (kLower.includes("कार्यानुभव") || kLower.includes("कार्यशिक्षण") || kLower.includes("कार्य"))) ||
                  (lower.includes("शारीरिक") && kLower.includes("शारीरिक")) ||
                  ((lower.includes("परिसर") || lower.includes("संभोवतालचे")) && (kLower.includes("परिसर") || kLower.includes("संभोवतालचे"))) ||
                  kLower === lower
                ) {
                  subData = v;
                  break;
                }
              }
            }

            const isPracticalSub = lower.includes("कला") || lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य") || lower.includes("शारीरिक");

            const tondiKaamObt = Number(subData.tondiKaam ?? subData.tondi ?? subData.oral ?? 0);
            const pratyakshikPrayogObt = Number(subData.pratyakshikPrayog ?? subData.practical ?? subData.activity ?? 0);
            const upakramKritiObt = Number(subData.upakramKriti ?? subData.upakram ?? subData.project ?? 0);
            const prakalpaObt = Number(subData.prakalp ?? subData.prakalpa ?? 0);
            const chaachaniLekhiObt = Number(subData.chaachaniLekhi ?? subData.chaachani ?? subData.test ?? subData.exam ?? 0);
            const swadhyayVargakaryaObt = Number(subData.swadhyayVargakarya ?? subData.swadhyay ?? subData.vargakarya ?? subData.homework ?? 0);
            const itarObt = Number(subData.itar ?? subData.other ?? 0);

            const sankalitTondiObt = Number(subData.sankalitTondi ?? subData.semesterOral ?? 0);
            const sankalitPratyakshikObt = Number(subData.sankalitPratyakshik ?? subData.semesterPractical ?? 0);
            const sankalitLekhiObt = Number(subData.sankalitLekhi ?? subData.lekhi ?? subData.written ?? subData.semesterWritten ?? 0);

            const hasForm = tondiKaamObt > 0 || pratyakshikPrayogObt > 0 || upakramKritiObt > 0 || prakalpaObt > 0 || chaachaniLekhiObt > 0 || swadhyayVargakaryaObt > 0 || itarObt > 0;
            const formTotal = hasForm ? (tondiKaamObt + pratyakshikPrayogObt + upakramKritiObt + prakalpaObt + chaachaniLekhiObt + swadhyayVargakaryaObt + itarObt) : Number(subData.akarik ?? subData.formTotal ?? subData.Akarik?.Total ?? 0);

            const hasSem = sankalitTondiObt > 0 || sankalitPratyakshikObt > 0 || sankalitLekhiObt > 0;
            const semTotal = isPracticalSub ? 0 : (hasSem ? (sankalitTondiObt + sankalitPratyakshikObt + sankalitLekhiObt) : Number(subData.sankalit ?? subData.semTotal ?? subData.Sanklik?.Total ?? 0));
            const grandTotal = (formTotal + semTotal) > 0 ? (formTotal + semTotal) : Number(subData.total ?? subData.grandTotal ?? subData.obtained ?? subData.marks ?? 0);

            return {
              formTotal,
              semTotal,
              grandTotal,
              gradeStr: grandTotal > 0 ? getGrade(grandTotal) : "-",
              isPracticalSub
            };
          };

          const getStudentAttendanceDays = (student) => {
            if (!student) return 0;
            const sId = String(student.id || "").trim();
            const sRoll = student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo).trim() : "";
            const sName = String(student.name || "").trim().toLowerCase();
            const sFullName = String(student.fullName || "").trim().toLowerCase();

            let rec = attendanceData[sId] || attendanceData[sRoll] || attendanceData[student.name] || attendanceData[student.fullName] || null;

            if (!rec || (typeof rec === "object" && Object.keys(rec).length === 0)) {
              for (const [aKey, aVal] of Object.entries(attendanceData)) {
                const lowerKey = String(aKey).trim().toLowerCase();
                if (
                  (sId && lowerKey === sId.toLowerCase()) ||
                  (sRoll && (lowerKey === sRoll.toLowerCase() || lowerKey === `roll_${sRoll.toLowerCase()}`)) ||
                  (sName && (lowerKey === sName || lowerKey === sName.replace(/\s+/g, ""))) ||
                  (sFullName && (lowerKey === sFullName || lowerKey === sFullName.replace(/\s+/g, "")))
                ) {
                  rec = aVal;
                  break;
                }
              }
            }

            if (typeof rec === "number" && rec > 0) return rec;
            if (typeof rec === "object" && rec !== null) {
              let total = 0;
              Object.entries(rec).forEach(([k, v]) => {
                const lowerK = String(k).toLowerCase().trim();
                // Filter out non-monthly keys to prevent double addition
                if (["total", "workingdays", "updatedat", "id", "name", "fullname", "rollno"].includes(lowerK)) {
                  return;
                }
                const numV = Number(v);
                if (!isNaN(numV) && numV > 0 && numV <= 31) {
                  total += numV;
                }
              });
              if (total > 0) return total;
              if (typeof rec.total === "number" && rec.total > 0 && rec.total <= 366) return rec.total;
              if (typeof rec.attendance === "number" && rec.attendance > 0 && rec.attendance <= 366) return rec.attendance;
            }
            return 0;
          };

          const getSubjectDisplayName = (s) => {
            if (!s) return "";
            const str = String(s).trim();
            if (str.includes("प्रथम") || str.includes("मराठी")) return "प्रथम भाषा : मराठी";
            if (str.includes("द्वितीय") || str.includes("इंग्रजी")) return "द्वितीय भाषा : इंग्रजी";
            if (str.includes("तृतीय") || str.includes("हिंदी")) return "तृतीय भाषा : हिंदी";
            if (str.includes("गणित")) return "गणित";
            if (str.includes("परिसर") || str.includes("संभोवतालचे")) return "आपले संभोवतालचे जग";
            if (str.includes("कला")) return "कलाशिक्षण";
            if (str.includes("कार्यानुभव") || str.includes("कार्यशिक्षण") || str.includes("कार्य")) return "कार्यशिक्षण";
            if (str.includes("शारीरिक")) return "शारीरिक शिक्षण व आरोग्य";
            return str;
          };

          return (
            <>
              {/* ========================================================================= */}
              {/* PAGE 1: श्रेणी निहाय संकलन तक्ता (वर्गस्तर)                                */}
              {/* ========================================================================= */}
              <A4PageWrapper>
              <div
                className="pdf-page bg-white border-none relative overflow-hidden flex flex-col justify-between h-[287mm] shadow-sm mb-4"
                style={{ padding: "10mm", boxSizing: "border-box", pageBreakAfter: "always", breakAfter: "page" }}
              >
                <div className="border-2 border-slate-700 rounded-none p-6 h-full w-full flex flex-col justify-between relative z-10" style={{ boxSizing: "border-box" }}>
                <div>
                  <h2 className="text-2xl font-extrabold text-black text-center mb-4">श्रेणी निहाय संकलन तक्ता (वर्गस्तर)</h2>
                  <div className="flex items-center justify-between text-[13px] font-bold text-black border-b border-slate-400 pb-2 mb-4">
                    <span>शाळा: <b>{schoolData.schoolName || ""}</b></span>
                    <span>इयत्ता: <b>{selectedClass}</b></span>
                    <span>तुकडी: <b>{division}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                    <span>सन: <b>{academicYear}</b></span>
                  </div>

                  {/* Table 1: Overall Grade Counts */}
                  <div className="mb-6">
                    <table className="w-full table-fixed border-collapse border border-amber-600 text-[13px] text-center font-semibold text-black">
                      <colgroup>
                        <col style={{ width: "5.5%" }} />
                        <col style={{ width: "21%" }} />
                        <col style={{ width: "7%" }} />
                        <col style={{ width: "8%" }} />
                        {GRADE_KEYS.map((g) => (
                          <col key={g} style={{ width: "6.5%" }} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="text-black font-extrabold border-b border-amber-600">
                          <th className="border border-amber-600 bg-amber-100 p-1.5 text-center">अ. क्र.</th>
                          <th className="border border-amber-600 bg-amber-100 p-1.5 text-left">विषय</th>
                          <th className="border border-amber-600 bg-amber-100 p-1.5 text-center">संख्या</th>
                          <th className="border border-amber-600 bg-amber-100 p-1.5 text-center">उपस्थिती</th>
                          {GRADE_KEYS.map((g) => (
                            <th key={g} className="border border-amber-600 bg-amber-100 p-1.5 text-center">{GRADE_LABELS[g]}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Calculate overall class-wide present student count:
                          // If a student has attendance > 0 OR has marks > 0 in ANY subject, count them present for all subjects
                          const classPresentCount = students.filter((std) => {
                            if (getStudentAttendanceDays(std) > 0) return true;
                            return subjects.some((subKey) => getStudentSubjectStats(std, subKey).grandTotal > 0);
                          }).length;
                          const displayPresent = classPresentCount > 0 ? classPresentCount : students.length;

                          return subjects.map((sub, idx) => {
                            const gradeCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0, d: 0, i1: 0, i2: 0 };
                            students.forEach((std) => {
                              const stats = getStudentSubjectStats(std, sub);
                              gradeCounts[getGradeKeyFromScore(stats.grandTotal)]++;
                            });

                            return (
                              <tr key={sub} className="border-b border-amber-500 hover:bg-amber-50/40">
                                <td className="border border-amber-600 p-1.5 font-bold text-center">{idx + 1}</td>
                                <td className="border border-amber-600 px-2 py-1.5 text-left font-bold text-black text-[12px] leading-snug break-words">{getSubjectDisplayName(sub)}</td>
                                <td className="border border-amber-600 p-1.5 font-bold text-center">{students.length}</td>
                                <td className="border border-amber-600 p-1.5 font-bold text-center">{displayPresent}</td>
                                {GRADE_KEYS.map((g) => (
                                  <td key={g} className="border border-amber-600 p-1.5 font-bold text-center">
                                    {gradeCounts[g]}
                                  </td>
                                ))}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Table 2: Gender-wise Grade Counts */}
                  <div>
                    <table className="w-full table-fixed border-collapse border border-amber-600 text-[12.5px] text-center font-semibold text-black summary-subcol-table">
                      <colgroup>
                        <col style={{ width: "3.5%" }} />
                        <col style={{ width: "19.0%" }} />
                        <col style={{ width: "4.5%" }} />
                        <col style={{ width: "4.5%" }} />
                        {GRADE_KEYS.map((g) => (
                          <React.Fragment key={g}>
                            <col style={{ width: "3.8%" }} />
                            <col style={{ width: "3.8%" }} />
                          </React.Fragment>
                        ))}
                      </colgroup>
                      <thead>
                        <tr className="text-black font-extrabold border-b border-amber-600">
                          <th className="border border-amber-600 bg-amber-100 p-1 text-[11px] text-center" rowSpan={2}>अ. क्र.</th>
                          <th className="border border-amber-600 bg-amber-100 p-1 text-left text-[12.5px]" rowSpan={2}>विषय</th>
                          <th className="border border-amber-600 bg-amber-100 p-0.5 text-[11px] text-center" rowSpan={2}>संख्या</th>
                          <th className="border border-amber-600 bg-amber-100 p-0.5 text-[11px] text-center" rowSpan={2}>उपस्थिती</th>
                          {GRADE_KEYS.map((g) => (
                            <th key={g} className="border border-amber-600 bg-amber-100 p-0.5 text-[11px] text-center" colSpan={2}>{GRADE_LABELS[g]}</th>
                          ))}
                        </tr>
                        <tr className="text-black font-extrabold border-b border-amber-600">
                          {GRADE_KEYS.map((g) => (
                            <React.Fragment key={g}>
                              <th className="border border-amber-600 bg-amber-100 p-0.5 text-[10.5px] text-center">मुले</th>
                              <th className="border border-amber-600 bg-amber-100 p-0.5 text-[10.5px] text-center">मुली</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const classPresentCount2 = students.filter((std) => {
                            if (getStudentAttendanceDays(std) > 0) return true;
                            return subjects.some((subKey) => getStudentSubjectStats(std, subKey).grandTotal > 0);
                          }).length;
                          const displayPresent2 = classPresentCount2 > 0 ? classPresentCount2 : students.length;

                          return subjects.map((sub, idx) => {
                            const boyCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0, d: 0, i1: 0, i2: 0 };
                            const girlCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0, c2: 0, d: 0, i1: 0, i2: 0 };

                            students.forEach((std) => {
                              const stats = getStudentSubjectStats(std, sub);
                              const gKey = getGradeKeyFromScore(stats.grandTotal);
                              if (isBoyStudent(std)) {
                                boyCounts[gKey]++;
                              } else {
                                girlCounts[gKey]++;
                              }
                            });

                            return (
                              <tr key={sub} className="border-b border-amber-500 hover:bg-amber-50/40">
                                <td className="border border-amber-600 p-1 font-bold w-8">{idx + 1}</td>
                                <td className="border border-amber-600 p-1 text-left font-bold text-black text-[11.5px] leading-tight w-40">{getSubjectDisplayName(sub)}</td>
                                <td className="border border-amber-600 p-1 font-bold w-10">{students.length}</td>
                                <td className="border border-amber-600 p-1 font-bold w-10">{displayPresent2}</td>
                                {GRADE_KEYS.map((g) => (
                                  <React.Fragment key={g}>
                                    <td className="border border-amber-600 p-0.5 font-bold text-center w-8 min-w-[28px]">{boyCounts[g]}</td>
                                    <td className="border border-amber-600 p-0.5 font-bold text-center w-8 min-w-[28px]">{girlCounts[g]}</td>
                                  </React.Fragment>
                                ))}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-300 mt-6 text-[13px] font-bold text-black">
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className="text-xs text-slate-900 font-bold">वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className="text-xs text-slate-900 font-bold">मुख्याध्यापक</p>
                  </div>
                </div>
              </div>
            </div>
            </A4PageWrapper>

              {/* ========================================================================= */}
              {/* PAGE 2: जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक (अनेक पानांमध्ये विभागलेले)    */}
              {/* ========================================================================= */}
              {(() => {
                const SUBJECTS_PER_PAGE = 3;
                const subjectChunks = [];
                for (let i = 0; i < subjects.length; i += SUBJECTS_PER_PAGE) {
                  subjectChunks.push(subjects.slice(i, i + SUBJECTS_PER_PAGE));
                }

                return subjectChunks.map((chunkSubjects, pageIdx) => (
                  <A4PageWrapper key={`caste_summary_page_${pageIdx}`}>
                  <div
                    className="pdf-page bg-white border-none relative overflow-hidden flex flex-col justify-between h-[287mm] shadow-sm mb-4"
                    style={{ padding: "10mm", boxSizing: "border-box", pageBreakAfter: "always", breakAfter: "page" }}
                  >
                    <div className="border-2 border-slate-700 rounded-none p-3.5 h-full w-full flex flex-col justify-between relative z-10" style={{ boxSizing: "border-box" }}>
                    <div>
                      <h2 className="text-2xl font-extrabold text-black text-center mb-3">
                        जातनिहाय व विषयनिहाय एकूण तेरीज पत्रक {subjectChunks.length > 1 ? `(भाग ${pageIdx + 1})` : ""}
                      </h2>
                      <div className="flex items-center justify-between text-[13px] font-bold text-black border-b border-slate-400 pb-2 mb-3">
                        <span>शाळा: <b>{schoolData.schoolName || ""}</b></span>
                        <span>इयत्ता: <b>{selectedClass}</b></span>
                        <span>तुकडी: <b>{formatDivision(division)}</b></span>
                        <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                        <span>सन: <b>{academicYear}</b></span>
                      </div>

                      <table className="w-full table-fixed border-collapse border border-amber-600 text-[11.5px] text-center font-semibold text-black summary-subcol-table">
                        <colgroup>
                          <col style={{ width: "8%" }} />
                          <col style={{ width: "8%" }} />
                          {Array.from({ length: 30 }).map((_, cIdx) => (
                            <col key={cIdx} style={{ width: "2.8%" }} />
                          ))}
                        </colgroup>
                        <thead>
                          <tr className="text-black font-extrabold border-b border-amber-600">
                            <th className="border border-amber-600 bg-amber-100 p-1 text-center" rowSpan={2}>विषय</th>
                            <th className="border border-amber-600 bg-amber-100 p-1 text-center" rowSpan={2}>जात संवर्ग</th>
                            <th className="border border-amber-600 bg-amber-100 p-0.5 text-center" colSpan={3}>संख्या</th>
                            {GRADE_KEYS.map((g) => (
                              <th key={g} className="border border-amber-600 bg-amber-100 p-0.5 text-center" colSpan={3}>{GRADE_LABELS[g]}</th>
                            ))}
                          </tr>
                          <tr className="text-black font-extrabold border-b border-amber-600">
                            <th className="border border-amber-600 bg-amber-100 text-[8.5px] leading-none text-center whitespace-nowrap">मुले</th>
                            <th className="border border-amber-600 bg-amber-100 text-[8.5px] leading-none text-center whitespace-nowrap">मुली</th>
                            <th className="border border-amber-600 bg-amber-100 text-[8.5px] leading-none text-center whitespace-nowrap">एकूण</th>
                            {GRADE_KEYS.map((g) => (
                              <React.Fragment key={g}>
                                <th className="border border-amber-600 bg-amber-100 text-[8.5px] leading-none text-center whitespace-nowrap">मुले</th>
                                <th className="border border-amber-600 bg-amber-100 text-[8.5px] leading-none text-center whitespace-nowrap">मुली</th>
                                <th className="border border-amber-600 bg-amber-100 text-[8.5px] leading-none text-center whitespace-nowrap">एकूण</th>
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {chunkSubjects.map((sub) => {
                            const categoryData = {};
                            CASTE_CATEGORIES.forEach((c) => {
                              categoryData[c.key] = {
                                countBoys: 0, countGirls: 0, countTotal: 0,
                                grades: { a1: { b: 0, g: 0, t: 0 }, a2: { b: 0, g: 0, t: 0 }, b1: { b: 0, g: 0, t: 0 }, b2: { b: 0, g: 0, t: 0 }, c1: { b: 0, g: 0, t: 0 }, c2: { b: 0, g: 0, t: 0 }, d: { b: 0, g: 0, t: 0 }, i1: { b: 0, g: 0, t: 0 }, i2: { b: 0, g: 0, t: 0 } }
                              };
                            });
                            const totalCategoryData = {
                              countBoys: 0, countGirls: 0, countTotal: 0,
                              grades: { a1: { b: 0, g: 0, t: 0 }, a2: { b: 0, g: 0, t: 0 }, b1: { b: 0, g: 0, t: 0 }, b2: { b: 0, g: 0, t: 0 }, c1: { b: 0, g: 0, t: 0 }, c2: { b: 0, g: 0, t: 0 }, d: { b: 0, g: 0, t: 0 }, i1: { b: 0, g: 0, t: 0 }, i2: { b: 0, g: 0, t: 0 } }
                            };

                            students.forEach((std) => {
                              const cKey = getStudentCasteCategory(std);
                              const stats = getStudentSubjectStats(std, sub);
                              const gKey = getGradeKeyFromScore(stats.grandTotal);
                              const boy = isBoyStudent(std);

                              if (categoryData[cKey]) {
                                if (boy) {
                                  categoryData[cKey].countBoys++;
                                  categoryData[cKey].grades[gKey].b++;
                                  totalCategoryData.countBoys++;
                                  totalCategoryData.grades[gKey].b++;
                                } else {
                                  categoryData[cKey].countGirls++;
                                  categoryData[cKey].grades[gKey].g++;
                                  totalCategoryData.countGirls++;
                                  totalCategoryData.grades[gKey].g++;
                                }
                                categoryData[cKey].countTotal++;
                                categoryData[cKey].grades[gKey].t++;
                                totalCategoryData.countTotal++;
                                totalCategoryData.grades[gKey].t++;
                              }
                            });

                            return (
                              <React.Fragment key={sub}>
                                {CASTE_CATEGORIES.map((cat, cIdx) => {
                                  const rowData = categoryData[cat.key];
                                  return (
                                    <tr key={cat.key} className="border-b border-amber-300">
                                      {cIdx === 0 && (
                                        <td rowSpan={6} className="border border-amber-600 p-1 font-bold text-black align-middle text-center bg-amber-50/50 w-24 text-[11.5px] leading-tight">{getSubjectDisplayName(sub)}</td>
                                      )}
                                      <td className="border border-amber-600 p-1 text-left font-bold text-black w-24">{cat.label}</td>
                                      <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.countBoys}</td>
                                      <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.countGirls}</td>
                                      <td className="border border-amber-500 p-0.5 font-extrabold text-blue-800 text-center w-7 min-w-[24px]">{rowData.countTotal}</td>
                                      {GRADE_KEYS.map((g) => (
                                        <React.Fragment key={g}>
                                          <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.grades[g].b}</td>
                                          <td className="border border-amber-500 p-0.5 font-bold text-center w-7 min-w-[24px]">{rowData.grades[g].g}</td>
                                          <td className="border border-amber-500 p-0.5 font-extrabold text-slate-900 text-center w-7 min-w-[24px]">{rowData.grades[g].t}</td>
                                        </React.Fragment>
                                      ))}
                                    </tr>
                                  );
                                })}
                                {/* Total Row for Subject */}
                                <tr className="font-black border-b-2 border-amber-600">
                                  <td className="border border-amber-500 bg-amber-100/70 p-1 text-left font-black text-slate-900 w-24">एकूण</td>
                                  <td className="border border-amber-500 bg-amber-100/70 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.countBoys}</td>
                                  <td className="border border-amber-500 bg-amber-100/70 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.countGirls}</td>
                                  <td className="border border-amber-500 bg-amber-100/70 p-0.5 font-black text-blue-900 text-center w-7 min-w-[24px]">{totalCategoryData.countTotal}</td>
                                  {GRADE_KEYS.map((g) => (
                                    <React.Fragment key={g}>
                                      <td className="border border-amber-500 bg-amber-100/70 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.grades[g].b}</td>
                                      <td className="border border-amber-500 bg-amber-100/70 p-0.5 font-black text-center w-7 min-w-[24px]">{totalCategoryData.grades[g].g}</td>
                                      <td className="border border-amber-500 bg-amber-100/70 p-0.5 font-black text-slate-900 text-center w-7 min-w-[24px]">{totalCategoryData.grades[g].t}</td>
                                    </React.Fragment>
                                  ))}
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-300 mt-6 text-[13px] font-bold text-black">
                      <div className="text-center">
                        <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                        <p className="text-xs text-slate-900 font-bold">वर्गशिक्षक</p>
                      </div>
                      <div className="text-center">
                        <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                        <p className="text-xs text-slate-900 font-bold">मुख्याध्यापक</p>
                      </div>
                    </div>
                  </div>
                </div>
                </A4PageWrapper>
                ));
              })()}

              {/* ========================================================================= */}
              {/* PAGE 3: सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक (एकत्रित लँडस्केप टेबल)    */}
              {/* ========================================================================= */}
              <A4PageWrapper isLandscape={true} isLegal={true}>
              <div
                className="pdf-page pdf-page-landscape pdf-page-legal bg-white border-none relative overflow-hidden flex flex-col justify-between min-h-[215.9mm] min-w-[355.6mm] shadow-sm mb-4"
                data-orientation="landscape"
                data-paper="legal"
                style={{ padding: "7mm", boxSizing: "border-box", pageBreakBefore: "always", breakBefore: "page" }}
              >
                <div className="border-2 border-slate-700 rounded-none p-3.5 h-full w-full flex flex-col justify-between relative z-10" style={{ boxSizing: "border-box" }}>
                <div>
                  <h2 className="text-2xl font-extrabold text-lime-950 text-center mb-2">सातत्यपूर्ण सर्वंकष मूल्यांकन: निकाल पत्रक</h2>
                  <div className="flex items-center justify-between text-[13.5px] font-bold text-black border-b border-lime-400 pb-2 mb-3">
                    <span>शाळा: <b>{schoolData.schoolName || ""}</b></span>
                    <span>इयत्ता: <b>{selectedClass}</b></span>
                    <span>तुकडी: <b>{division}</b></span>
                    <span>{selectedTerm === "sem1" ? "प्रथम सत्र" : "द्वितीय सत्र"}</span>
                    <span>सन: <b>{academicYear}</b></span>
                  </div>

                  <div className="overflow-x-auto">
                    {(() => {
                      const manySubs = subjects.length >= 7;
                      const nameColCls = manySubs ? "min-w-[82px] max-w-[105px]" : "min-w-[110px] max-w-[140px]";
                      const subHeadCls = manySubs ? "text-[9px] leading-tight" : "text-[11px] leading-tight";
                      const subColCls = manySubs ? "text-[8px] leading-none" : "text-[9.5px] leading-tight";
                      const sumHeadCls = manySubs ? "text-[8.5px] leading-tight" : "text-[10px] leading-tight";
                      return (
                    <table className={`w-full border-collapse border border-lime-700 text-center font-semibold text-black table-auto consolidated-legal-table ${manySubs ? "is-many-subjects" : ""}`}>
                      <thead>
                        <tr className="text-black font-extrabold border-b border-lime-700">
                          <th className={`border border-lime-700 bg-lime-200 p-0.5 w-5 ${manySubs ? "text-[8.5px]" : "text-[10px]"} leading-tight`} rowSpan={2}>अ.क्र.</th>
                          <th className={`border border-lime-700 bg-lime-200 p-0.5 text-left ${manySubs ? "text-[9.5px]" : "text-[11.5px]"} ${nameColCls} truncate`} rowSpan={2}>विद्यार्थ्याचे नाव</th>
                          {subjects.map((sub) => {
                            return (
                              <th key={sub} className={`border border-lime-700 bg-lime-200 p-0.5 ${subHeadCls}`} colSpan={4}>
                                {sub}
                              </th>
                            );
                          })}
                          <th className={`border border-lime-700 bg-lime-200 p-0.5 ${sumHeadCls}`} rowSpan={2}>उपस्थिती</th>
                          <th className={`border border-lime-700 bg-lime-200 p-0.5 ${sumHeadCls}`} rowSpan={2}>एकूण<br />गुण</th>
                          <th className={`border border-lime-700 bg-lime-200 p-0.5 ${sumHeadCls}`} rowSpan={2}>टक्केवारी</th>
                          <th className={`border border-lime-700 bg-lime-200 p-0.5 ${sumHeadCls}`} rowSpan={2}>अंतिम<br />श्रेणी</th>
                        </tr>
                        <tr className="text-black font-extrabold border-b border-lime-700">
                          {subjects.map((sub) => {
                            const isPractical = sub.includes("कला") || sub.includes("कार्यानुभव") || sub.includes("कार्यशिक्षण") || sub.includes("कार्य") || sub.includes("शारीरिक");
                            return isPractical ? (
                              <React.Fragment key={sub}>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`} colSpan={2}>आकारिक (अ)</th>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`}>एकूण</th>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`}>श्रेणी</th>
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={sub}>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`}>आकारिक<br/><span className={manySubs ? "text-[7.5px] font-bold" : "text-[9px] font-bold"}>(अ)</span></th>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`}>संकलित<br/><span className={manySubs ? "text-[7.5px] font-bold" : "text-[9px] font-bold"}>(ब)</span></th>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`}>एकूण</th>
                                <th className={`border border-lime-700 bg-lime-200 p-0.5 ${subColCls} font-extrabold`}>श्रेणी</th>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                        {/* Sub-Header Row: Max Marks (पैकी) */}
                        <tr className={`text-black font-extrabold border-b border-lime-700 ${manySubs ? "text-[9px]" : "text-[10.5px]"}`}>
                          <td className="border border-lime-700 bg-lime-100 p-0 w-5"></td>
                          <td className="border border-lime-700 bg-lime-100 p-0.5 text-left font-extrabold">पैकी</td>
                          {subjects.map((sub) => {
                            const isPractical = sub.includes("कला") || sub.includes("कार्यानुभव") || sub.includes("कार्यशिक्षण") || sub.includes("कार्य") || sub.includes("शारीरिक");
                            const formMax = ["1st", "2nd", "1", "2"].includes(String(selectedClass)) ? "70" : ["3rd", "4th", "3", "4"].includes(String(selectedClass)) ? "60" : ["5th", "6th", "5", "6"].includes(String(selectedClass)) ? "50" : "40";
                            const semMax = ["1st", "2nd", "1", "2"].includes(String(selectedClass)) ? "30" : ["3rd", "4th", "3", "4"].includes(String(selectedClass)) ? "40" : ["5th", "6th", "5", "6"].includes(String(selectedClass)) ? "50" : "60";

                            return isPractical ? (
                              <React.Fragment key={sub}>
                                <td className="border border-lime-700 bg-lime-100 p-0.5" colSpan={2}>100</td>
                                <td className="border border-lime-700 bg-lime-100 p-0.5">100</td>
                                <td className="border border-lime-700 bg-lime-100 p-0.5"></td>
                              </React.Fragment>
                            ) : (
                              <React.Fragment key={sub}>
                                <td className="border border-lime-700 bg-lime-100 p-0.5">{formMax}</td>
                                <td className="border border-lime-700 bg-lime-100 p-0.5">{semMax}</td>
                                <td className="border border-lime-700 bg-lime-100 p-0.5">100</td>
                                <td className="border border-lime-700 bg-lime-100 p-0.5"></td>
                              </React.Fragment>
                            );
                          })}
                          <td className={`border border-lime-700 bg-lime-100 p-0 ${manySubs ? "text-[8.5px]" : "text-[10px]"}`}>{totalWorkingDays > 0 ? totalWorkingDays : "-"}</td>
                          <td className={`border border-lime-700 bg-lime-100 p-0 ${manySubs ? "text-[8.5px]" : "text-[10px]"}`}>{subjects.length * 100}</td>
                          <td className={`border border-lime-700 bg-lime-100 p-0 ${manySubs ? "text-[8.5px]" : "text-[10px]"}`}>100%</td>
                          <td className="border border-lime-700 bg-lime-100 p-0"></td>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => {
                          let grandObtainedTotal = 0;
                          subjects.forEach((sub) => {
                            const stats = getStudentSubjectStats(student, sub);
                            grandObtainedTotal += stats.grandTotal;
                          });
                          const totalMaxMarks = subjects.length * 100;
                          const attDays = getStudentAttendanceDays(student);
                          const pctVal = totalMaxMarks > 0 ? (grandObtainedTotal / totalMaxMarks) * 100 : 0;
                          const overallPct = pctVal.toFixed(2) + "%";
                          const overallGrade = getGrade(pctVal);

                          return (
                            <tr key={student.id} className={`border-b border-lime-400 hover:bg-lime-50/40 ${manySubs ? "text-[9px]" : "text-[10.5px]"}`}>
                              <td className={`border border-lime-700 p-0 font-bold w-5 text-center ${manySubs ? "text-[8.5px]" : "text-[10px]"}`}>{idx + 1}</td>
                              <td className={`border border-lime-700 p-0.5 text-left font-bold text-black ${manySubs ? "text-[9.5px]" : "text-[11px]"} ${nameColCls} truncate`} title={student.name}>{student.name}</td>
                              {subjects.map((sub) => {
                                const stats = getStudentSubjectStats(student, sub);
                                return stats.isPracticalSub ? (
                                  <React.Fragment key={sub}>
                                    <td className="border border-lime-700 p-0.5 font-bold" colSpan={2}>{stats.formTotal || "-"}</td>
                                    <td className="border border-lime-700 p-0.5 font-extrabold text-blue-900">{stats.grandTotal || "-"}</td>
                                    <td className="border border-lime-700 p-0.5 font-bold text-emerald-900">{stats.gradeStr}</td>
                                  </React.Fragment>
                                ) : (
                                  <React.Fragment key={sub}>
                                    <td className="border border-lime-700 p-0.5 font-bold">{stats.formTotal || "-"}</td>
                                    <td className="border border-lime-700 p-0.5 font-bold">{stats.semTotal || "-"}</td>
                                    <td className="border border-lime-700 p-0.5 font-extrabold text-blue-900">{stats.grandTotal || "-"}</td>
                                    <td className="border border-lime-700 p-0.5 font-bold text-emerald-900">{stats.gradeStr}</td>
                                  </React.Fragment>
                                );
                              })}
                              <td className="border border-lime-700 p-0 font-bold text-[10px]">{attDays > 0 ? attDays : "-"}</td>
                              <td className="border border-lime-700 p-0 font-extrabold text-blue-950 text-[10px]">{grandObtainedTotal}</td>
                              <td className="border border-lime-700 p-0 font-extrabold text-blue-950 text-[9.5px]">{overallPct}</td>
                              <td className="border border-lime-700 p-0 font-extrabold text-emerald-950 text-[10px]">{overallGrade}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-300 mt-6 text-[13px] font-bold text-black">
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.teacherName || "वर्गशिक्षक"}</p>
                    <p className="text-xs text-slate-900 font-bold">वर्गशिक्षक</p>
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold">{schoolData.headmasterName || "मुख्याध्यापक"}</p>
                    <p className="text-xs text-slate-900 font-bold">मुख्याध्यापक</p>
                  </div>
                </div>
              </div>
            </div>
            </A4PageWrapper>
          </>
          );
        })()}

      </div>
    </div>
  );
};

export default BoardResult;
