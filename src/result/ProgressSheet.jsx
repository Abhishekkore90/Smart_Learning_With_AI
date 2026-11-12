import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, ArrowLeft, Loader2, AlertCircle, Copy, FileText, User } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

import { matchStudentClassAndMedium, fetchStudentsForClass, hasStudentFilledData } from "./firestoreMarksHelper";
import { getDefaultSubjectsForClass } from "../data/cceSubjects";
import { getTeacherId } from "../lib/teacherIsolationHelper";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कलाशिक्षण",
  "कार्यशिक्षण",
  "शारीरिक शिक्षण"
];

// Grade calculation helper based on percentage
const getGrade = (percentage) => {
  const p = Number(percentage) || 0;
  if (p >= 91) return "अ-1";
  if (p >= 81) return "अ-2";
  if (p >= 71) return "ब-1";
  if (p >= 61) return "ब-2";
  if (p >= 51) return "क-1";
  if (p >= 41) return "क-2";
  if (p >= 33) return "ड";
  if (p >= 21) return "इ-1";
  return "इ-2";
};

// Helper to filter out auto-generated internal student IDs (e.g. student_1st_...)
const getCleanStudentId = (id) => {
  if (!id) return "";
  const str = String(id).trim();
  if (str.startsWith("student_") || str.startsWith("student-")) return "";
  return str;
};

// A4 Page Mobile Scale Wrapper to show authentic A4 proportions on mobile without horizontal scrollbar
function A4PageWrapper({ children, isLandscape = false }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  const targetWidth = isLandscape ? 1123 : 794;

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
                marginBottom: `-${Math.round((1 - scale) * (isLandscape ? 794 : 1123))}px`,
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

const ProgressSheet = ({ initialClass = "1st", initialYear = "2025-26", initialSemester = "sem2", initialMedium, onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || "sem2"); // sem1 = प्रथम सत्र | sem2 = द्वितीय सत्र
  const [division, setDivision] = useState("सर्व");
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedMedium, setSelectedMedium] = useState(() => {
    if (initialMedium) return initialMedium;
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("cce_selected_medium") || "marathi";
    }
    return "marathi";
  });
  const [layoutMode, setLayoutMode] = useState("landscape"); // "portrait" (उभा) | "landscape" (फोल्डिंग)
  const [showLayoutModal, setShowLayoutModal] = useState(true);
  const [pageMode, setPageMode] = useState("1page"); // "1page" | "2pages"
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  // Sync initialMedium when prop changes
  useEffect(() => {
    if (initialMedium && initialMedium !== selectedMedium) {
      setSelectedMedium(initialMedium);
    }
  }, [initialMedium]);

  // Sync selectedMedium from localStorage / event triggers
  useEffect(() => {
    const syncMedium = () => {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("cce_selected_medium");
        if (saved && saved !== selectedMedium) {
          setSelectedMedium(saved);
        }
      }
    };

    window.addEventListener("cce_settings_updated", syncMedium);
    window.addEventListener("storage", syncMedium);
    return () => {
      window.removeEventListener("cce_settings_updated", syncMedium);
      window.removeEventListener("storage", syncMedium);
    };
  }, [selectedMedium]);

  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
    address: "",
    slogan: "मुलांचा सर्वांगीण विकास — हाच आमचा ध्यास!",
  });

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [workingDaysData, setWorkingDaysData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    // 0. Check LocalStorage Cache first for initial render, but strictly filter by selectedClass, selectedMedium & teacherId
    const currentTeacherId = getTeacherId();
    const cacheKey = `cce_progress_cache_${currentTeacherId}_${selectedClass}_${selectedMedium}_${academicYear}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.students && parsed.students.length > 0) {
          const validStudents = parsed.students.filter(s => matchStudentClassAndMedium(s, selectedClass, selectedMedium, currentTeacherId, academicYear));
          if (validStudents.length > 0) {
            if (parsed.schoolData) setSchoolData(parsed.schoolData);
            setStudents(validStudents);
            if (parsed.marksData) setMarksData(parsed.marksData);
            if (parsed.remarksData) setRemarksData(parsed.remarksData);
            if (parsed.attendanceData) setAttendanceData(parsed.attendanceData);
            if (parsed.workingDaysData) setWorkingDaysData(parsed.workingDaysData);
            setLoading(false);
          } else {
            setStudents([]);
          }
        }
      }
    } catch (e) { }

    loadUserFirestoreData();
  }, [selectedClass, academicYear, selectedMedium, selectedSemester]);

  // Helper function to format Date of Birth cleanly (e.g. 02052004 -> 02-05-2004)
  const formatDob = (dobStr) => {
    if (!dobStr) return "";
    const str = String(dobStr).trim();
    if (str.length === 0 || str === "-") return "";

    // 1. Raw 8 digits e.g. "02052004" -> "02-05-2004"
    if (/^\d{8}$/.test(str)) {
      const p1 = str.substring(0, 2);
      const p2 = str.substring(2, 4);
      const p3 = str.substring(4, 8);
      if (Number(p1) > 31 || (Number(str.substring(0, 4)) >= 1900 && Number(str.substring(0, 4)) <= 2100)) {
        const yyyy = str.substring(0, 4);
        const mm = str.substring(4, 6);
        const dd = str.substring(6, 8);
        return `${dd}-${mm}-${yyyy}`;
      }
      return `${p1}-${p2}-${p3}`;
    }

    // 2. ISO format "2004-05-02"
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const parts = str.split("T")[0].split("-");
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // 3. Slash or Dash format
    if (str.includes("/") || str.includes("-")) {
      const parts = str.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        }
        return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      }
    }

    return str;
  };

  const loadUserFirestoreData = async () => {
    const docId = `${selectedClass}_${academicYear}`;
    const currentTeacherId = getTeacherId();
    const currentMedium = selectedMedium || (typeof localStorage !== "undefined" ? localStorage.getItem("cce_selected_medium") : null) || "marathi";

    try {
      setLoading(true);
      const [settingsResult, studentsResult, marksResult, remarksResult, attResult] = await Promise.all([
        // Task 1: School Settings & Subjects (Fetching directly from CCESettings - school_settings collection)
        (async () => {
          let schoolName = "";
          let udise = "";
          let teacherName = "";
          let headmasterName = "";
          let address = "";
          let slogan = "मुलांचा सर्वांगीण विकास — हाच आमचा ध्यास!";
          const uid = currentTeacherId;
          const medKey = currentMedium.toLowerCase().includes("semi") ? "semi" : "marathi";

          // 1. Check cce_settings collection FIRST for class + medium specific teacherName and principalName
          try {
            const cceDocIds = [
              uid ? `${uid}_${selectedClass}_${medKey}_${academicYear}` : null,
              uid ? `${uid}_${selectedClass}_${academicYear}` : null,
            ].filter(Boolean);

            if (cceDocIds.length === 0) {
              cceDocIds.push(
                `${selectedClass}_${currentMedium}_${academicYear}`,
                `${selectedClass}_${medKey}_${academicYear}`,
                docId
              );
            }

            for (const cId of cceDocIds) {
              const cRef = doc(db, "cce_settings", cId);
              const cSnap = await getDoc(cRef);
              if (cSnap.exists()) {
                const data = cSnap.data();
                if (!schoolName) schoolName = data.schoolName || data.school_name || "";
                if (!udise) udise = data.udiseCode || data.udise || "";
                if (!teacherName && data.teacherName) teacherName = data.teacherName;
                if (!headmasterName && (data.principalName || data.headmasterName || data.hmName)) {
                  headmasterName = data.principalName || data.headmasterName || data.hmName;
                }
                if (!address) address = data.address || "";
                if (data.slogan) slogan = data.slogan;
              }
            }
          } catch (e) { }

          const isCleanSchoolName = (val) => {
            if (!val || typeof val !== "string") return false;
            const s = val.trim();
            if (!s || s.includes("___") || s.toLowerCase().includes("willingdon")) return false;
            return true;
          };

          // 2a. Check user's own Firestore account profile (users & teachers collections)
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

          // 2b. Check auth.currentUser displayName (e.g., "School Dhondewadi")
          if (!schoolName && auth?.currentUser?.displayName) {
            const dName = auth.currentUser.displayName.trim();
            if (isCleanSchoolName(dName) && dName !== "Educator" && dName !== "Teacher") {
              schoolName = dName;
            }
          }

          // 2c. Check school_settings collection strictly for this user (NEVER pull global willingdon)
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
                if (!teacherName && data.teacherName) teacherName = data.teacherName;
                if (!headmasterName && (data.principalName || data.headmasterName || data.hmName)) {
                  headmasterName = data.principalName || data.headmasterName || data.hmName;
                }
                if (!address) address = data.address || "";
                if (data.slogan) slogan = data.slogan;
              }
            }
          } catch (e) { }

          // 2d. Unified local profile fallback (Guarantees logged in user's own headmaster and school info)
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

          // 3. Check LocalStorage strictly for this user
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
                  if (!teacherName && p.teacherName) teacherName = p.teacherName;
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

          // 4. Fallback for teacherName ONLY if still missing: check logged-in teacher's profile/doc
          if (uid && !teacherName) {
            try {
              const tSnap = await getDoc(doc(db, "teachers", uid));
              if (tSnap.exists()) {
                const data = tSnap.data();
                if (!schoolName) schoolName = data.schoolName || "";
                if (!udise) udise = data.udise || "";
                if (!teacherName) teacherName = data.teacherName || data.fullName || "";
              }
              if (!teacherName) {
                const uSnap = await getDoc(doc(db, "users", uid));
                if (uSnap.exists()) {
                  const data = uSnap.data();
                  if (!schoolName) schoolName = data.schoolName || data.school_name || "";
                  if (!udise) udise = data.udise || data.udiseCode || "";
                  if (!teacherName) teacherName = data.teacherName || data.fullName || "";
                }
              }
            } catch (e) { }
          }

          const schoolObj = {
            schoolName: schoolName || "",
            udise: udise || "",
            teacherName: teacherName || "",
            headmasterName: headmasterName || "",
            address: address || "",
            slogan: slogan,
          };

          let classSubjects = getDefaultSubjectsForClass(selectedClass, currentMedium);

          return { schoolObj, classSubjects };
        })(),

        // Task 2: Students List (strictly isolated by current teacher ID)
        (async () => {
          let loadedStudents = await fetchStudentsForClass(selectedClass, currentMedium, currentTeacherId) || [];
          if (!Array.isArray(loadedStudents)) loadedStudents = [];

          try {
            // Enforce strict class and teacher filtering on loaded students
            loadedStudents = loadedStudents.filter((s) => matchStudentClassAndMedium(s, selectedClass, currentMedium, currentTeacherId));

            const detailsList = [];
            // Fetch users, student_details, students, cce_students collections simultaneously
            const [uSnap, detSnap, stSnap, cceSnap] = await Promise.all([
              getDocs(query(collection(db, "users"), where("role", "==", "student"))).catch(() => null),
              getDocs(collection(db, "student_details")).catch(() => null),
              getDocs(collection(db, "students")).catch(() => null),
              getDocs(collection(db, "cce_students")).catch(() => null),
            ]);

            if (uSnap) uSnap.forEach(d => detailsList.push({ docId: d.id, ...d.data() }));
            if (detSnap) detSnap.forEach(d => detailsList.push({ docId: d.id, ...d.data() }));
            if (stSnap) stSnap.forEach(d => detailsList.push({ docId: d.id, ...d.data() }));
            if (cceSnap) cceSnap.forEach(d => detailsList.push({ docId: d.id, ...d.data() }));

            // Filter detailsList to only include items matching logged-in teacher ID
            const filteredDetailsList = detailsList.filter(dItem => {
              const dTeacher = dItem.teacherId || dItem.createdById || dItem.userId;
              if (currentTeacherId && currentTeacherId !== "admin" && currentTeacherId !== "super_admin") {
                if (dTeacher && dTeacher !== currentTeacherId && dTeacher !== "global") return false;
              }
              return true;
            });

            loadedStudents = loadedStudents.map((s, idx) => {
              const sRollStr = String(s.rollNo || s.srNo || (idx + 1)).trim();
              const sNameLower = String(s.fullName || s.name || "").toLowerCase().trim();
              const sIdStr = String(s.id || s.studentId || "").trim();

              const matchedDocs = filteredDetailsList.filter(dItem => {
                const dId = String(dItem.docId || dItem.id || dItem.studentId || "").trim();
                const dName = String(dItem.fullName || dItem.name || dItem.studentName || "").toLowerCase().trim();

                if (sIdStr && dId && sIdStr === dId) return true;
                if (sNameLower && dName && (sNameLower === dName || (sNameLower.length > 3 && dName.length > 3 && (sNameLower.includes(dName) || dName.includes(sNameLower))))) return true;
                return false;
              });

              let det = {};
              matchedDocs.forEach(mDoc => {
                det = { ...det, ...mDoc };
              });

              const info = s.studentInfo || det.studentInfo || {};

              // Collect ALL photo candidates across s, det, matchedDocs, info
              const photoCandidates = [];
              if (s) photoCandidates.push(s.photoUrl, s.photo, s.photoURL, s.studentPhoto, s.profilePhoto, s.imageUrl, s.profileImage, s.avatar);
              if (det) photoCandidates.push(det.photoUrl, det.photo, det.photoURL, det.studentPhoto, det.profilePhoto, det.imageUrl, det.profileImage, det.avatar);
              matchedDocs.forEach(mDoc => {
                photoCandidates.push(mDoc.photoUrl, mDoc.photo, mDoc.photoURL, mDoc.studentPhoto, mDoc.profilePhoto, mDoc.imageUrl, mDoc.profileImage, mDoc.avatar);
              });
              if (info) photoCandidates.push(info.photoUrl, info.photo, info.photoURL, info.studentPhoto, info.profilePhoto, info.imageUrl);

              const photoUrl = photoCandidates.find(p => p && typeof p === "string" && p.trim().length > 5 && p !== "null" && p !== "undefined") || null;

              return {
                ...s,
                photoUrl,
                rollNo: s.rollNo || det.rollNo || info.rollNo || String(idx + 1),
                name: s.name || s.fullName || det.name || info.studentName || "",
                fullName: s.fullName || s.name || det.fullName || det.name || info.studentName || "",
                fatherName: det.fatherName || s.fatherName || info.fatherName || "",
                fatherOccupation: det.fatherOccupation || s.fatherOccupation || info.fatherOccupation || "",
                motherName: det.motherName || s.motherName || info.motherName || "",
                motherOccupation: det.motherOccupation || s.motherOccupation || info.motherOccupation || "",
                dob: det.dob || s.dob || info.dob || "",
                aadhar: det.aadhar || det.aadharNo || det.aadhaarNo || s.aadhar || info.aadhaarNo || "",
                generalRegNo: det.generalRegNo || det.registrationNo || det.grNo || s.generalRegNo || s.grNo || info.grNo || "",
                studentId: getCleanStudentId(det.studentId || det.saralId || det.studentID || s.studentId || s.saralId || info.studentId || ""),
                motherTongue: det.motherTongue || (s.motherTongue && s.motherTongue !== "मराठी" ? s.motherTongue : "") || "",
                religion: det.religion || (s.religion && s.religion !== "हिंदू" ? s.religion : "") || "",
                caste: det.casteCategory || det.caste || (s.casteCategory && s.casteCategory !== "OPEN (ओपन)" && s.casteCategory !== "ओपन" ? s.casteCategory : "") || (s.caste && s.caste !== "OPEN (ओपन)" && s.caste !== "ओपन" ? s.caste : "") || "",
                medium: det.medium || s.medium || "",
                address: det.address || s.address || info.address || "",
                mobile: det.mobile || det.phone || det.parentMobile || s.mobile || s.phone || s.parentMobile || info.mobile || "",
                weight: det.weight || s.weight || info.weight || "",
                height: det.height || s.height || info.height || "",
                division: det.division || s.division || info.division || s.section || "",
                penNo: det.penNo || det.pen_no || s.penNo || info.penNo || "",
              };
            });

            loadedStudents.sort((a, b) => (Number(a.rollNo) || 999) - (Number(b.rollNo) || 999));
          } catch (e) { }

          return loadedStudents;
        })(),

        // Task 3: Marks Data (checking cce_marks_v2 + cce_marks + localStorage caches)
        (async () => {
          let mergedMarks = {};
          try {
            const cacheKey = `cce_marks_cache_${selectedClass}_${academicYear}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached)
              mergedMarks = JSON.parse(cached) || {};
          } catch (e) { }

          const docIds = [
            docId,
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}` : null,
            `${selectedClass}_${academicYear}_${currentMedium}`,
          ].filter(Boolean);

          for (const dId of docIds) {
            try {
              const mSnap = await getDoc(doc(db, "cce_marks", dId));
              if (mSnap.exists()) {
                const data = mSnap.data();
                const recs = data.students || data.records || data;
                mergedMarks = { ...mergedMarks, ...recs };
              }
            } catch (e) { }

            try {
              const mSnapV2 = await getDoc(doc(db, "cce_marks_v2", dId));
              if (mSnapV2.exists()) {
                const data = mSnapV2.data();
                const recs = data.students || data.records || data;
                mergedMarks = { ...mergedMarks, ...recs };
              }
            } catch (e) { }
          }
          return mergedMarks;
        })(),

        // Task 4: Remarks Data (checking cce_remarks_v2 + cce_remarks for both sem1 & sem2 + localStorage caches)
        (async () => {
          let mergedRemarks = {};
          // 1. Check LocalStorage caches
          for (const sem of ["sem1", "sem2"]) {
            try {
              const cacheKey = `cce_remarks_cache_${selectedClass}_${academicYear}_${sem}_${currentMedium}`;
              const cached = localStorage.getItem(cacheKey);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && typeof parsed === "object") {
                  Object.entries(parsed).forEach(([stKey, rObj]) => {
                    if (!mergedRemarks[stKey]) mergedRemarks[stKey] = {};
                    mergedRemarks[stKey][sem] = rObj;
                  });
                }
              }
            } catch (e) { }
          }

          // 2. Query Firestore cce_remarks_v2 & cce_remarks
          const semList = ["sem1", "sem2"];
          for (const sem of semList) {
            const dIds = [
              currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}_${currentMedium}` : null,
              currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_${sem}` : null,
              `${selectedClass}_${academicYear}_${sem}_${currentMedium}`,
              `${selectedClass}_${academicYear}_${sem}`,
              `${selectedClass}_${academicYear}`,
            ].filter(Boolean);

            for (const dId of dIds) {
              try {
                const rSnap = await getDoc(doc(db, "cce_remarks_v2", dId));
                if (rSnap.exists()) {
                  const data = rSnap.data();
                  const recs = data.records || data.remarks || data.data || {};
                  Object.entries(recs).forEach(([stKey, rObj]) => {
                    if (!mergedRemarks[stKey]) mergedRemarks[stKey] = {};
                    mergedRemarks[stKey][sem] = rObj;
                  });
                }
              } catch (e) { }

              try {
                const rSnapOld = await getDoc(doc(db, "cce_remarks", dId));
                if (rSnapOld.exists()) {
                  const data = rSnapOld.data();
                  const recs = data.students || data.records || data.remarks || {};
                  Object.entries(recs).forEach(([stKey, rObj]) => {
                    if (!mergedRemarks[stKey]) mergedRemarks[stKey] = {};
                    mergedRemarks[stKey][sem] = rObj;
                  });
                }
              } catch (e) { }
            }
          }
          return mergedRemarks;
        })(),

        // Task 5: Attendance Data
        (async () => {
          let attData = {};
          let wdData = {};
          const dIds = [
            `${selectedClass}_${academicYear}_monthly`,
            docId,
            currentTeacherId ? `${currentTeacherId}_${selectedClass}_${academicYear}_monthly` : null,
          ].filter(Boolean);

          for (const dId of dIds) {
            try {
              const attSnap = await getDoc(doc(db, "cce_attendance", dId));
              if (attSnap.exists()) {
                const data = attSnap.data();
                attData = { ...attData, ...(data.students || data.attendance || data.records || {}) };
                if (data.workingDays || data.monthlyWorkingDays) {
                  wdData = { ...wdData, ...(data.workingDays || data.monthlyWorkingDays) };
                }
              }
            } catch (e) { }
          }

          try {
            const wdSnap = await getDoc(doc(db, "cce_working_days", docId));
            if (wdSnap.exists()) {
              wdData = { ...wdData, ...(wdSnap.data().days || wdSnap.data()) };
            }
          } catch (e) { }

          return { attendance: attData, workingDays: wdData };
        })(),
      ]);

      if (settingsResult.schoolObj) setSchoolData(settingsResult.schoolObj);
      if (settingsResult.classSubjects) setSubjects(settingsResult.classSubjects);
      if (studentsResult) setStudents(studentsResult);
      if (marksResult) setMarksData(marksResult);
      if (remarksResult) setRemarksData(remarksResult);
      if (attResult.attendance) setAttendanceData(attResult.attendance);
      if (attResult.workingDays) setWorkingDaysData(attResult.workingDays);

      // Save to localStorage cache
      const cacheKey = `cce_progress_cache_${currentTeacherId}_${selectedClass}_${currentMedium}_${academicYear}`;
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            schoolData: settingsResult.schoolObj,
            students: studentsResult,
            marksData: marksResult,
            remarksData: remarksResult,
            attendanceData: attResult.attendance,
            workingDaysData: attResult.workingDays,
          })
        );
      } catch (e) { }

    } catch (err) {
      console.error("Error loading ProgressSheet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    toast.info("प्रगती पत्रक PDF तयार होत आहे, कृपया वाट पाहा...");
    try {
      let html2canvas;
      try {
        const hModule = await import("html2canvas-pro");
        html2canvas = hModule.default || hModule;
      } catch (e) {
        const hModule = await import("html2canvas");
        html2canvas = hModule.default || hModule;
      }

      const { jsPDF } = await import("jspdf");

      const container = printRef.current;

      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) { }
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

      const pageElements = Array.from(container.querySelectorAll(".pdf-page"));

      if (pageElements.length === 0) {
        toast.error("काहीही डेटा सापडला नाही!");
        setDownloading(false);
        return;
      }

      setDownloadProgress({ current: 0, total: pageElements.length });

      const isPortrait = layoutMode === "portrait";
      const orientation = isPortrait ? "portrait" : "landscape";
      const pdfWidth = isPortrait ? 210 : 297;
      const pdfHeight = isPortrait ? 297 : 210;

      // Fixed target pixel dimensions (A4 standard: Landscape 1123x782, Portrait 794x1123)
      const targetWidth = isPortrait ? 794 : 1123;
      const targetHeight = isPortrait ? 1123 : 782;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < pageElements.length; i++) {
        setDownloadProgress({ current: i + 1, total: pageElements.length });
        const pageEl = pageElements[i];

        // Create an isolated fixed-size sandbox on document.body
        // This ensures the render size is ALWAYS 100% full A4 resolution (1123px/794px),
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

        // In portrait booklet mode with rotated inner div, ensure the inner div has full 1123x782 dimensions
        if (isPortrait) {
          const innerRotated = clone.querySelector("div[style*='rotate']");
          if (innerRotated) {
            innerRotated.style.width = "1123px";
            innerRotated.style.minWidth = "1123px";
            innerRotated.style.maxWidth = "1123px";
            innerRotated.style.height = "782px";
            innerRotated.style.minHeight = "782px";
            innerRotated.style.maxHeight = "782px";
          }
        }

        sandbox.appendChild(clone);
        document.body.appendChild(sandbox);

        // Fix html2canvas table rendering bug:
        // Push <tr> background-color down to child <th>/<td> and set <tr> to transparent
        // to prevent colored rectangles from painting over rowSpan cells
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
            } catch (e) { }
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

        if (i > 0) {
          pdf.addPage("a4", orientation);
        }

        // Add blank space margins on all sides (Top, Bottom, Left, Right)
        const margin = 7; // 7mm clean blank space around the card
        const availWidth = pdfWidth - margin * 2;
        const availHeight = pdfHeight - margin * 2;

        const canvasAspect = targetWidth / targetHeight;
        let imgWidth = availWidth;
        let imgHeight = imgWidth / canvasAspect;

        if (imgHeight > availHeight) {
          imgHeight = availHeight;
          imgWidth = imgHeight * canvasAspect;
        }

        const pdfMarginX = (pdfWidth - imgWidth) / 2;
        const pdfMarginY = (pdfHeight - imgHeight) / 2;

        pdf.addImage(
          imgData,
          "PNG",
          pdfMarginX,
          pdfMarginY,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
      }

      pdf.save(`प्रगती_पत्रक_${layoutMode}_${selectedClass}_${academicYear}.pdf`);
      toast.success(`प्रगती पत्रक PDF यशस्वीरित्या डाऊनलोड झाली! (एकूण ${pageElements.length} पाने)`);
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("PDF तयार करताना एरर आली. कृपया पुन्हा प्रयत्न करा.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Default CCE Primary Remarks matching Master Reference PDF
  const defaultRemarks = {
    sem1: {
      "विशेष प्रगती": "गृहपाठ आणि स्वाध्याय वेळेवर आणि अचूकतेने पूर्ण करतो. वाचन प्रवाह आणि समज यात उल्लेखनीय प्रगती दाखवतो.",
      "आवड / छंद": "मजा आणि तंदुरुस्तीसाठी सायकल चालवणे, गाणी गाणे किंवा संगीतमय उपक्रमांमध्ये सहभागी होणे.",
      "सुधारणा आवश्यक": "वाचनाचा नियमित सराव करून समज आणि शब्दसंग्रह वाढवावा. हस्ताक्षर सुधारून स्पष्टता आणि सादरीकरण वाढवावे.",
    },
    sem2: {
      "विशेष प्रगती": "गृहपाठ आणि स्वाध्याय वेळेवर आणि अचूकतेने पूर्ण करतो. तोंडी मूल्यांकनात आत्मविश्वासाने आणि स्पष्ट उत्तरे देतो.",
      "आवड / छंद": "गाणी गाणे किंवा संगीतमय उपक्रमांमध्ये सहभागी होणे. क्रीडा उपक्रमात आनंद घेणे.",
      "सुधारणा आवश्यक": "हस्ताक्षर सुधारून स्पष्टता आणि सादरीकरण वाढवावे. गणितीय क्रियांचा नियमित सराव करावा.",
    },
  };

  // Helper to extract formatted descriptive remarks (ONLY fetched teacher-entered remarks)
  const getFormattedRemark = (student, labelOrKey, term = "sem1") => {
    const defaultVal = "-";

    if (!student || !remarksData) return defaultVal;
    const stdKeys = [student.id, student.rollNo, student.name, student.fullName, String(student.rollNo)].filter(Boolean);

    let studentRemarksObj = null;
    for (const k of stdKeys) {
      if (remarksData[k]) {
        studentRemarksObj = remarksData[k];
        break;
      }
    }
    if (!studentRemarksObj || typeof studentRemarksObj !== "object") return defaultVal;

    const termObj = term === "sem2"
      ? (studentRemarksObj.sem2 || studentRemarksObj.term2 || studentRemarksObj)
      : (studentRemarksObj.sem1 || studentRemarksObj.term1 || studentRemarksObj);

    if (!termObj || typeof termObj !== "object") return defaultVal;

    const notesObj = termObj.descriptiveNotes || termObj;
    let val = notesObj[labelOrKey];

    if (!val) {
      const lower = String(labelOrKey).toLowerCase();
      const allTermKeys = Object.keys(termObj);
      for (const tKey of allTermKeys) {
        const lowerTKey = tKey.toLowerCase();
        if (
          ((lower.includes("विशेष") || lower.includes("vishesh")) && (lowerTKey.includes("vishesh") || lowerTKey.includes("विशेष"))) ||
          ((lower.includes("आवड") || lower.includes("aavad") || lower.includes("छंद")) && (lowerTKey.includes("aavad") || lowerTKey.includes("आवड") || lowerTKey.includes("छंद"))) ||
          ((lower.includes("सुधारणा") || lower.includes("sudharna")) && (lowerTKey.includes("sudharna") || lowerTKey.includes("सुधारणा")))
        ) {
          val = termObj[tKey];
          break;
        }
      }
    }

    if (!val) return defaultVal;
    if (Array.isArray(val)) {
      const filtered = val.map(v => String(v).trim()).filter(Boolean);
      return filtered.length > 0 ? filtered.join(" ") : defaultVal;
    }
    return String(val).trim() || defaultVal;
  };

  // Helper to calculate subject grade for a student and semester term
  const getSubjectGradeForTerm = (student, subjectName, term = "sem1") => {
    if (!student) return "-";

    const schemaTerm = term === "sem2" ? (student.term2 || student.sem2) : (student.term1 || student.sem1);
    if (schemaTerm && schemaTerm.grades) {
      const lower = String(subjectName).toLowerCase();
      const g = schemaTerm.grades;
      if (lower.includes("मराठी") && g.firstLanguage) return g.firstLanguage;
      if (lower.includes("इंग्रजी") && g.secondLanguage) return g.secondLanguage;
      if (lower.includes("गणित") && (g.maths || g.math)) return g.maths || g.math;
      if (lower.includes("कला") && g.art) return g.art;
      if ((lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) && g.workExperience) return g.workExperience;
      if (lower.includes("शारीरिक") && g.physicalEdu) return g.physicalEdu;
      if ((lower.includes("परिसर") || lower.includes("संभोवतालचे")) && g.evs) return g.evs;
    }

    if (marksData) {
      const stdKeys = [student.id, student.studentId, student.rollNo, student.name, student.fullName, String(student.rollNo)].filter(Boolean);

      let studentMarksObj = null;
      for (const k of stdKeys) {
        if (marksData[k]) {
          studentMarksObj = marksData[k];
          break;
        }
      }

      if (studentMarksObj && typeof studentMarksObj === "object") {
        const termMap = term === "sem1"
          ? (studentMarksObj.term1 || studentMarksObj.sem1 || studentMarksObj.semester1 || studentMarksObj)
          : (studentMarksObj.term2 || studentMarksObj.sem2 || studentMarksObj.semester2 || studentMarksObj);

        let subData = termMap[subjectName];
        if (!subData) {
          const lower = String(subjectName).toLowerCase();
          if (lower.includes("मराठी")) subData = termMap["marathi"] || termMap["firstLanguage"] || termMap["प्रथम भाषा : मराठी"] || termMap["मराठी"];
          else if (lower.includes("इंग्रजी")) subData = termMap["english"] || termMap["secondLanguage"] || termMap["द्वितीय भाषा : इंग्रजी"] || termMap["इंग्रजी"];
          else if (lower.includes("गणित")) subData = termMap["math"] || termMap["maths"] || termMap["गणित"];
          else if (lower.includes("कला")) subData = termMap["kala"] || termMap["art"] || termMap["कलाशिक्षण"] || termMap["कला"];
          else if (lower.includes("कार्यानुभव") || lower.includes("कार्यशिक्षण") || lower.includes("कार्य")) subData = termMap["karyanubhav"] || termMap["workExperience"] || termMap["कार्यशिक्षण"] || termMap["कार्यानुभव"];
          else if (lower.includes("शारीरिक")) subData = termMap["sharirik"] || termMap["physicalEdu"] || termMap["शारीरिक शिक्षण"];
          else if (lower.includes("परिसर") || lower.includes("संभोवतालचे")) subData = termMap["parisar"] || termMap["evs"] || termMap["आपले संभोवतालचे जग"] || termMap["परिसर अभ्यास"];
        }

        if (subData) {
          if (typeof subData === "string" && subData.trim().length > 0) return subData.trim();
          if (typeof subData === "object") {
            if (subData.total !== undefined && subData.total !== null && Number(subData.total) > 0) {
              return getGrade(subData.total);
            }
          }
          if (typeof subData === "number" && subData > 0) {
            return getGrade(subData);
          }
        }
      }
    }

    return "-";
  };

  const monthsList = [
    { label: "जून", key: "june", defaultDays: 13 },
    { label: "जुलै", key: "july", defaultDays: 25 },
    { label: "ऑगस्ट", key: "august", defaultDays: 23 },
    { label: "सप्टेंबर", key: "september", defaultDays: 21 },
    { label: "ऑक्टोबर", key: "october", defaultDays: 12 },
    { label: "नोव्हेंबर", key: "november", defaultDays: 23 },
    { label: "डिसेंबर", key: "december", defaultDays: 26 },
    { label: "जानेवारी", key: "january", defaultDays: 24 },
    { label: "फेब्रुवारी", key: "february", defaultDays: 22 },
    { label: "मार्च", key: "march", defaultDays: 21 },
    { label: "एप्रिल", key: "april", defaultDays: 24 },
    { label: "मे", key: "may", defaultDays: 0 },
  ];

  const getWorkingDaysForMonth = (student, m) => {
    if (student && student.attendance && Array.isArray(student.attendance)) {
      const match = student.attendance.find((a) => {
        const mLabel = String(a.month || "").toLowerCase();
        const targetLabel = m.label.toLowerCase();
        return mLabel.includes(targetLabel) || targetLabel.includes(mLabel);
      });
      if (match && match.workingDays !== undefined && match.workingDays !== null) return Number(match.workingDays);
    }
    const customWD = workingDaysData[m.key.toLowerCase()];
    return customWD !== undefined ? Number(customWD) : m.defaultDays;
  };

  const getStudentPresentDays = (student, m) => {
    if (!student) return "-";
    if (student.attendance && Array.isArray(student.attendance)) {
      const match = student.attendance.find((a) => {
        const mLabel = String(a.month || "").toLowerCase();
        const targetLabel = m.label.toLowerCase();
        return mLabel.includes(targetLabel) || targetLabel.includes(mLabel);
      });
      if (match && match.presentDays !== undefined && match.presentDays !== null && match.presentDays !== "") return Number(match.presentDays);
    }
    if (attendanceData) {
      const stdKeys = [student.id, student.studentId, student.saralId, student.penNo, student.rollNo, String(student.rollNo)].filter(Boolean);
      let stdAttMap = null;
      for (const k of stdKeys) {
        if (attendanceData[k]) { stdAttMap = attendanceData[k]; break; }
      }
      if (!stdAttMap && (student.fullName || student.name)) {
        const nKey = (student.fullName || student.name).trim();
        if (attendanceData[nKey]) stdAttMap = attendanceData[nKey];
      }
      if (stdAttMap && typeof stdAttMap === "object") {
        const val = stdAttMap[m.key.toLowerCase()] || stdAttMap[m.label];
        if (val !== undefined && val !== null && val !== "") {
          const parsed = Number(val);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
      }
    }
    return "-";
  };

  const getMarathiClassName = (clsStr) => {
    if (!clsStr) return "पहिली";
    const num = String(clsStr).match(/\d+/);
    const n = num ? parseInt(num[0], 10) : 1;
    const names = ["", "पहिली", "दुसरी", "तिसरी", "चौथी", "पांचवी", "सहावी", "सातवी", "आठवी", "नववी", "दहावी"];
    return names[n] || `${n} वी`;
  };

  const getNextClassName = (clsStr) => {
    if (!clsStr) return "दुसरी";
    const num = String(clsStr).match(/\d+/);
    const n = num ? parseInt(num[0], 10) : 1;
    const names = ["", "दुसरी", "तिसरी", "चौथी", "पांचवी", "सहावी", "सातवी", "आठवी", "नववी", "दहावी", "अकरावी"];
    return names[n] || `${n + 1} वी`;
  };

  const formatDivision = (divVal, fallbackDiv) => {
    if (divVal !== undefined && divVal !== null && String(divVal).trim() !== "" && String(divVal).trim() !== "null" && String(divVal).trim() !== "undefined") {
      return String(divVal).trim();
    }
    if (fallbackDiv && fallbackDiv !== "सर्व" && String(fallbackDiv).trim() !== "" && String(fallbackDiv).trim() !== "null") {
      return String(fallbackDiv).trim();
    }
    return "";
  };

  const filteredByDiv = division === "सर्व"
    ? students
    : students.filter((s) => formatDivision(s.division || s.studentInfo?.division || s.section, division) === division);

  // Every student added to the class MUST appear in Pragati Patrak regardless of filled data
  const displayedStudents = selectedStudentId === "all"
    ? filteredByDiv
    : filteredByDiv.filter((s) => String(s.id) === String(selectedStudentId) || String(s.rollNo) === String(selectedStudentId) || String(s.studentId) === String(selectedStudentId));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="size-10 text-orange-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">विद्यार्थी प्रगती पत्रक लोड होत आहे, कृपया वाट पाहा...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-100 min-h-screen p-4 md:p-6 text-slate-800">
      {/* Full-Screen PDF Downloading Progress Modal */}
      {downloading && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[999999] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 relative shadow-inner">
              <Loader2 className="size-8 text-orange-600 animate-spin" />
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">प्रगती पत्रक PDF तयार होत आहे</h3>
            <p className="text-xs text-slate-500 font-medium mb-5">
              कृपया प्रतीक्षा करा, उच्च दर्जाची (HD) PDF तयार केली जात आहे...
            </p>

            {/* Progress Bar & Counter */}
            {downloadProgress.total > 0 && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>प्रगती</span>
                  <span className="text-orange-600 font-black">
                    पान {downloadProgress.current} / {downloadProgress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-300 shadow-xs"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="size-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5">प्रगती पत्रक PDF स्वरूप निवडा</h3>
            <p className="text-xs text-slate-500 font-medium mb-6">
              तुम्हाला एका विद्यार्थ्याचे प्रगती पत्रक १ पानामध्ये हवे आहे की २ पानांमध्ये?
            </p>

            <div className="grid grid-cols-1 gap-3.5 mb-2">
              <button
                onClick={() => {
                  setPageMode("1page");
                  setShowLayoutModal(false);
                }}
                className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98] ${pageMode === "1page"
                    ? "border-orange-500 bg-orange-50/50"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  }`}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-orange-600">
                    १ पानाचे प्रगती पत्रक (Single Page)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight">
                    एकाच पानामध्ये संपूर्ण प्रगती पत्रकाचा अहवाल (सर्व माहिती १ पानात fit).
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setPageMode("2pages");
                  setShowLayoutModal(false);
                }}
                className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98] ${pageMode === "2pages"
                    ? "border-orange-500 bg-orange-50/50"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 group-hover:text-slate-700">
                    २ पानांचे प्रगती पत्रक (Two Pages)
                  </h4>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight">
                    दोन पानांमध्ये प्रगती पत्रकाचा अहवाल (पान १: माहिती व प्रथम सत्र | पान २: द्वितीय सत्र व स्वाक्षऱ्या).
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Actions */}
      <div className="max-w-[305mm] mx-auto flex flex-wrap items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 no-print gap-3 transition-all">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              मागे जा
            </button>
          )}
          <div>
            <h1 className="text-base sm:text-lg font-black text-orange-950">विद्यार्थी प्रगती पत्रक (Progress Sheet)</h1>
            <p className="text-xs text-slate-500 font-medium">इयत्ता {selectedClass} | शैक्षणिक वर्ष {academicYear}</p>
          </div>
        </div>

        {/* PDF Format Selector Buttons Stacked Vertically */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setPageMode("2pages")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 border-2 text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs ${pageMode === "2pages"
                ? "bg-amber-100 border-amber-500 text-amber-950 shadow-sm"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
          >
            <FileText className="size-3.5 text-orange-600" />
            <span>स्वरूप: २ पाने (Two Pages)</span>
          </button>
          <button
            onClick={() => setPageMode("1page")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 border-2 text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs ${pageMode === "1page"
                ? "bg-amber-100 border-amber-500 text-amber-950 shadow-sm"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
          >
            <FileText className="size-3.5 text-orange-600" />
            <span>स्वरूप: १ पान (One Page)</span>
          </button>
        </div>

        {/* Layout Switcher (Portrait vs Landscape Booklet) - for both 1page and 2pages modes */}
        <div className="flex items-center bg-orange-50/80 p-1 rounded-xl border border-orange-200 gap-1 shadow-xs">
          <button
            onClick={() => setLayoutMode("portrait")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${layoutMode === "portrait"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-700 hover:text-orange-950 hover:bg-orange-100/60"
              }`}
          >
            <span>📄</span>
            <span>उभा लेआउट (Portrait)</span>
          </button>
          <button
            onClick={() => setLayoutMode("landscape")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${layoutMode === "landscape"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-700 hover:text-orange-950 hover:bg-orange-100/60"
              }`}
          >
            <span>📖</span>
            <span>फोल्डिंग लेआउट (Landscape)</span>
          </button>
        </div>

        {/* Division Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-orange-950 whitespace-nowrap">तुकडी निवडा:</label>
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="px-3.5 py-2 bg-orange-50 border border-orange-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-xs"
          >
            <option value="सर्व">सर्व तुकड्या</option>
            <option value="अ">तुकडी अ (A)</option>
            <option value="ब">तुकडी ब (B)</option>
            <option value="क">तुकडी क (C)</option>
            <option value="ड">तुकडी ड (D)</option>
          </select>
        </div>

        {/* Student Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-orange-950 whitespace-nowrap">विद्यार्थी निवडा:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3.5 py-2 bg-orange-50 border border-orange-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-xs"
          >
            <option value="all">सर्व विद्यार्थी ({filteredByDiv.length})</option>
            {filteredByDiv.map((st, idx) => (
              <option key={st.id || idx} value={st.id}>
                {st.rollNo ? `${st.rollNo}. ` : `${idx + 1}. `}{st.fullName || st.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            PDF डाउनलोड
          </button>
        </div>
      </div>

      {/* -------------------- PRINTABLE PROGRESS SHEET CONTAINER -------------------- */}
      <div ref={printRef} className={`w-full ${layoutMode === "portrait" ? "max-w-[215mm]" : "max-w-[305mm]"} mx-auto overflow-x-auto space-y-8 p-2`}>
        <style>{`
          .cce-pdf-generating {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            width: ${layoutMode === "portrait" ? "210mm" : "297mm"} !important;
            background-color: #ffffff !important;
          }
          .cce-pdf-generating .a4-page-scale-wrapper {
            height: auto !important;
            overflow: visible !important;
          }
          .cce-pdf-generating .a4-page-scale-inner {
            transform: none !important;
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
          }
          .cce-pdf-generating .pdf-page {
            margin: 0 !important;
            padding: 14px 20px !important;
            box-shadow: none !important;
            border: 2px solid #f97316 !important;
            border-radius: 16px !important;
            height: ${layoutMode === "portrait" ? "294mm" : "207mm"} !important;
            max-height: ${layoutMode === "portrait" ? "294mm" : "207mm"} !important;
            min-height: ${layoutMode === "portrait" ? "294mm" : "207mm"} !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .cce-pdf-generating .pdf-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .pdf-page, .pdf-page * {
            font-family: 'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: 0 !important;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
          }
          .pdf-page .font-extrabold, .pdf-page b, .pdf-page strong, .pdf-page th, .pdf-page h1, .pdf-page h2, .pdf-page h3 {
            font-weight: 800 !important;
          }
          .pdf-page .font-black {
            font-weight: 900 !important;
          }
          table.progress-compact-table th,
          table.progress-compact-table td {
            padding: 2px 4px !important;
            width: auto !important;
          }
          @media print {
            @page {
              size: ${layoutMode === "portrait" ? "A4 portrait" : "A4 landscape"};
              margin: 0;
            }
            html, body {
              width: ${layoutMode === "portrait" ? "210mm" : "297mm"};
              height: ${layoutMode === "portrait" ? "297mm" : "210mm"};
              margin: 0 !important;
              padding: 0 !important;
              background: #fff;
              overflow: hidden;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden;
            }
            .no-print {
              display: none !important;
            }
            .pdf-page, .pdf-page * {
              visibility: visible !important;
            }
            .pdf-page {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: ${layoutMode === "portrait" ? "210mm" : "297mm"} !important;
              height: ${layoutMode === "portrait" ? "294mm" : "207mm"} !important;
              max-width: ${layoutMode === "portrait" ? "210mm" : "297mm"} !important;
              max-height: ${layoutMode === "portrait" ? "294mm" : "207mm"} !important;
              min-width: ${layoutMode === "portrait" ? "210mm" : "297mm"} !important;
              min-height: ${layoutMode === "portrait" ? "294mm" : "207mm"} !important;
              margin: 0 !important;
              padding: 14px 20px !important;
              page-break-before: auto !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              background-color: #ffffff !important;
            }
            .pdf-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
          }
        `}</style>

        {displayedStudents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-amber-200 shadow-sm max-w-2xl mx-auto my-8">
            <h3 className="text-lg font-bold text-slate-800 mb-2">कोणताही विद्यार्थी सापडला नाही</h3>
            <p className="text-sm text-slate-600">
              निवडलेल्या फिल्टरनुसार विद्यार्थी डेटा उपलब्ध नाही.
            </p>
          </div>
        ) : (
          displayedStudents.map((student, idx) => {
            const isLastStudent = idx === displayedStudents.length - 1;

            const renderSinglePageProgressSheet = () => (
              <div className="flex flex-col w-full bg-white text-black space-y-1.5 my-auto" style={{ fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif", letterSpacing: 0 }}>
                {/* 1. TOP HEADER BAR */}
                <div className="flex items-center justify-between border-b-2 border-orange-400 pb-1 px-1">
                  {/* Top Left: Logo */}
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center font-extrabold text-[10px] shadow-xs shrink-0">
                      SS
                    </div>
                    <div>
                      <h3 className="text-[13px] font-extrabold text-orange-800 uppercase leading-none">समग्र शिक्षा</h3>
                      <p className="text-[9.5px] text-slate-900 font-bold leading-none mt-0.5">Samagra Shiksha</p>
                    </div>
                  </div>

                  {/* Top Center: Title Pill & UDISE */}
                  <div className="text-center">
                    <div className="bg-amber-100/90 px-4 py-0.5 rounded-full border border-orange-400 inline-block shadow-2xs">
                      <h2 className="text-[13.5px] font-extrabold text-amber-950">
                        विद्यार्थी प्रगतीपुस्तक सत्र {academicYear}
                      </h2>
                    </div>
                    <p className="text-[11px] font-extrabold text-black mt-0.5">
                      यु-डायस क्र. : <span className="font-extrabold text-black">{schoolData.udise || student.udise || ""}</span>
                    </p>
                  </div>

                  {/* Top Right: Circular Photo Frame */}
                  <div className="w-[44px] h-[44px] rounded-full overflow-hidden border-2 border-orange-500 bg-white flex items-center justify-center shrink-0 shadow-xs p-0.5">
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.fullName || student.name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallbackElem = e.currentTarget.parentElement?.querySelector('.photo-fallback');
                          if (fallbackElem) fallbackElem.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="photo-fallback flex flex-col items-center justify-center text-center p-0.5"
                      style={{ display: student.photoUrl ? 'none' : 'flex' }}
                    >
                      <User className="size-3.5 text-orange-500 mb-0.5" />
                      <span className="text-[8.5px] font-extrabold text-orange-950 leading-tight">फोटो</span>
                    </div>
                  </div>
                </div>

                {/* 2. MAIN 2-COLUMN CONTENT BODY */}
                <div className="grid grid-cols-12 gap-2">
                  {/* LEFT COLUMN (6 cols): Student Info + Attendance + Performance */}
                  <div className="col-span-6 space-y-1.5">
                    {/* Student Info Box */}
                    <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white text-[10.5px] leading-tight">
                      <table className="w-full border-collapse">
                        <tbody>
                          {/* 1. हजेरी क्र. & UDISE */}
                          <tr className="border-b border-orange-300 bg-orange-50/40 font-bold">
                            <td className="w-[50%] py-[1.5px] px-1.5 border-r border-orange-300 text-slate-900">
                              हजेरी क्र. : <b className="text-black font-extrabold">{student.rollNo || idx + 1}</b>
                            </td>
                            <td className="w-[50%] py-[1.5px] px-1.5 text-right text-slate-900">
                              यु-डायस : <b className="text-black font-extrabold">{schoolData.udise || student.udise || ""}</b>
                            </td>
                          </tr>

                          {/* 2. शाळेचे नाव */}
                          <tr className="border-b border-orange-300 bg-amber-50">
                            <td colSpan={2} className="py-[1.5px] px-1.5 font-bold text-black text-center text-[11px]">
                              शाळेचे नाव : <b className="text-black font-extrabold">{schoolData.schoolName || student.schoolName || ""}</b>
                            </td>
                          </tr>

                          {/* 3. विद्यार्थ्याचे नाव */}
                          <tr className="border-b border-orange-300 bg-amber-100/90">
                            <td colSpan={2} className="py-[1.5px] px-1.5 font-extrabold text-black text-[12px] text-center">
                              विद्यार्थ्याचे नाव : <b className="text-blue-950 font-extrabold">{student.fullName || student.name || ""}</b>
                            </td>
                          </tr>

                          {/* 4. जन्म दिनांक, इयत्ता, तुकडी, आधार क्रमांक */}
                          <tr className="border-b border-orange-300">
                            <td colSpan={2} className="py-[1.5px] px-1.5 font-bold text-slate-900">
                              <div className="flex justify-between items-center text-[10px]">
                                <span>जन्म दिनांक : <b className="text-black font-extrabold">{formatDob(student.dob)}</b></span>
                                <span>इयत्ता : <b className="text-black font-extrabold">{getMarathiClassName(selectedClass)}</b></span>
                                <span>आधार क्रमांक : <b className="text-black font-extrabold">{student.aadhar || student.aadhaarNo || ""}</b></span>
                                <span>तुकडी : <b className="text-black font-extrabold">{formatDivision(student.division || student.studentInfo?.division || student.section, division)}</b></span>
                              </div>
                            </td>
                          </tr>

                          {/* 5. स्टुडन्ट आयडी & जन. रजि. नं */}
                          <tr className="border-b border-orange-300 bg-orange-50/20">
                            <td className="w-[60%] py-[1.5px] px-1.5 font-bold text-slate-900 border-r border-orange-300">
                              स्टुडन्ट आयडी : <b className="text-black font-bold">{getCleanStudentId(student.studentId || student.saralId || student.penNo)}</b>
                            </td>
                            <td className="w-[40%] py-[1.5px] px-1.5 font-bold text-slate-900 text-right">
                              जन. रजि. नं : <b className="text-black font-bold">{student.generalRegNo || student.grNo || ""}</b>
                            </td>
                          </tr>

                          {/* 6. वडिलांचे नाव & व्यवसाय */}
                          <tr className="border-b border-orange-300">
                            <td className="w-[60%] py-[1.5px] px-1.5 font-bold text-slate-900 border-r border-orange-300">
                              वडिलांचे नाव : <b className="text-black font-bold">{student.fatherName || ""}</b>
                            </td>
                            <td className="w-[40%] py-[1.5px] px-1.5 font-bold text-slate-900 text-right">
                              व्यवसाय : <b className="text-black font-bold">{student.fatherOccupation || ""}</b>
                            </td>
                          </tr>

                          {/* 7. आईचे नाव & व्यवसाय */}
                          <tr className="border-b border-orange-300 bg-orange-50/20">
                            <td className="w-[60%] py-[1.5px] px-1.5 font-bold text-slate-900 border-r border-orange-300">
                              आईचे नाव : <b className="text-black font-bold">{student.motherName || ""}</b>
                            </td>
                            <td className="w-[40%] py-[1.5px] px-1.5 font-bold text-slate-900 text-right">
                              व्यवसाय : <b className="text-black font-bold">{student.motherOccupation || ""}</b>
                            </td>
                          </tr>

                          {/* 8. मातृभाषा & माध्यम */}
                          <tr className="border-b border-orange-300">
                            <td className="w-[50%] py-[1.5px] px-1.5 font-bold text-slate-900 border-r border-orange-300">
                              मातृभाषा : <b className="text-black font-bold">{student.motherTongue || ""}</b>
                            </td>
                            <td className="w-[50%] py-[1.5px] px-1.5 font-bold text-slate-900 text-right">
                              माध्यम : <b className="text-black font-bold">{student.medium || ""}</b>
                            </td>
                          </tr>

                          {/* 9. धर्म & संवर्ग */}
                          <tr className="border-b border-orange-300 bg-orange-50/20">
                            <td className="w-[50%] py-[1.5px] px-1.5 font-bold text-slate-900 border-r border-orange-300">
                              धर्म : <b className="text-black font-bold">{student.religion || ""}</b>
                            </td>
                            <td className="w-[50%] py-[1.5px] px-1.5 font-bold text-slate-900 text-right">
                              संवर्ग : <b className="text-black font-bold">{student.caste || student.casteCategory || ""}</b>
                            </td>
                          </tr>

                          {/* 10. पत्ता */}
                          <tr className="border-b border-orange-300">
                            <td colSpan={2} className="py-[1.5px] px-1.5 font-bold text-slate-900">
                              पत्ता : <b className="text-black font-bold">{student.address || ""}</b>
                            </td>
                          </tr>

                          {/* 11. संपर्क */}
                          <tr>
                            <td colSpan={2} className="py-[1.5px] px-1.5 font-bold text-slate-900">
                              संपर्क : <b className="text-black font-bold">{student.mobile || student.phone || ""}</b>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Bottom Left: Attendance & Performance Tables Side-by-Side */}
                    <div className="grid grid-cols-12 gap-1.5">
                      {/* Attendance Table */}
                      <div className="col-span-6 border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[12px] font-extrabold text-orange-950 text-center bg-amber-100/90 py-0.5 border-b border-orange-400">
                          उपस्थिती
                        </h4>
                        <table className="w-full text-center text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-orange-50/60 font-extrabold text-black border-b border-orange-300 text-[10.5px] min-h-[18px]">
                              <th className="border-r border-orange-300 px-0.5 py-[1px] text-center w-[34%]">महिना</th>
                              <th className="border-r border-orange-300 px-0.5 py-[1px] text-center w-[33%]">कामाचे दिवस</th>
                              <th className="px-0.5 py-[1px] text-center w-[33%]">उपस्थित दिवस</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthsList.map((m) => {
                              const workingDays = getWorkingDaysForMonth(student, m);
                              const pres = getStudentPresentDays(student, m);
                              return (
                                <tr key={m.key} className="border-b border-orange-200 min-h-[16px]">
                                  <td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black bg-orange-50/20 text-[10.5px]">{m.label}</td>
                                  <td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">{workingDays}</td>
                                  <td className="px-0.5 py-[1px] font-extrabold text-blue-950 text-[11px]">{pres}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Grade Scale Table (शैक्षणिक कामगिरी) */}
                      <div className="col-span-6 border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[12px] font-extrabold text-orange-950 text-center bg-amber-100/90 py-0.5 border-b border-orange-400">
                          शैक्षणिक कामगिरी
                        </h4>
                        <table className="w-full text-center text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-orange-50/60 font-extrabold text-black border-b border-orange-300 text-[10.5px] min-h-[18px]">
                              <th className="border-r border-orange-300 px-0.5 py-[1px] text-center w-[65%]">गुणांचे प्रतिशत</th>
                              <th className="px-0.5 py-[1px] text-center w-[35%]">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">91% ते 100%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">अ-1</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">81% ते 90%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">अ-2</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">71% ते 80%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">ब-1</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">61% ते 70%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">ब-2</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">51% ते 60%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">क-1</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">41% ते 50%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">क-2</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">33% ते 40%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">ड</td></tr>
                            <tr className="border-b border-orange-200 min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">21% ते 32%</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">इ-1</td></tr>
                            <tr className="min-h-[16px]"><td className="border-r border-orange-300 px-0.5 py-[1px] font-bold text-black text-[10.5px]">20% व कमी</td><td className="px-0.5 py-[1px] font-extrabold text-blue-900 text-[11px]">इ-2</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN (6 cols): Term 1 & Term 2 Subject Tables */}
                  <div className="col-span-6 space-y-1.5">
                    {/* Term 1 Box */}
                    <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                      <h3 className="text-[12.5px] font-extrabold text-orange-950 text-center py-0.5 border-b border-orange-400 bg-amber-100/90">
                        प्रथम सत्र
                      </h3>
                      <table className="w-full table-fixed border-collapse text-[11px] text-center font-medium">
                        <colgroup>
                          <col className="w-[46%]" />
                          <col className="w-[9%]" />
                          <col className="w-[45%]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-orange-50/60 font-extrabold text-black border-b border-orange-300 text-[10.5px] min-h-[18px]">
                            <th className="border-r border-orange-300 p-0.5 text-center">विषय</th>
                            <th className="border-r border-orange-300 p-0.5 text-center">श्रेणी</th>
                            <th className="p-0.5 text-center">वर्णनात्मक नोंदी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const numSubjects = subjects.length || 6;
                            const span1 = Math.max(1, Math.floor(numSubjects / 3));
                            const span2 = Math.max(1, Math.floor((numSubjects - span1) / 2));
                            const span3 = Math.max(1, numSubjects - span1 - span2);
                            const idx1 = 0;
                            const idx2 = span1;
                            const idx3 = span1 + span2;
                            const singlePageRowPx = Math.max(18, Math.floor(170 / numSubjects));

                            return subjects.map((subName, sIdx) => {
                              const sem1Grade = getSubjectGradeForTerm(student, subName, "sem1");
                              return (
                                <tr key={subName} style={{ height: `${singlePageRowPx}px` }}>
                                  <td className="border-r border-b border-orange-300 border-b-orange-200 py-[1px] px-1 text-left font-bold text-black bg-orange-50/10 text-[11px] pl-1.5 align-middle truncate">
                                    {subName}
                                  </td>
                                  <td className="border-r border-b border-orange-300 border-b-orange-200 py-[1px] px-0.5 font-extrabold text-blue-950 text-[12.5px] align-middle">
                                    {sem1Grade}
                                  </td>
                                  {sIdx === idx1 && (
                                    <td rowSpan={span1} className="py-0.5 px-1 text-center align-top bg-orange-50/10 border-l border-b border-orange-200">
                                      <span className="font-extrabold text-orange-950 block text-center mb-0.5 text-[11px] leading-tight">विशेष प्रगती</span>
                                      <p className="text-black leading-tight font-bold px-0.5 text-[10px] text-center line-clamp-2 pt-0.5">
                                        {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === idx2 && (
                                    <td rowSpan={span2} className="py-0.5 px-1 text-center align-top bg-orange-50/10 border-l border-b border-orange-200">
                                      <span className="font-extrabold text-orange-950 block text-center mb-0.5 text-[11px] leading-tight">आवड / छंद</span>
                                      <p className="text-black leading-tight font-bold px-0.5 text-[10px] text-center line-clamp-2 pt-0.5">
                                        {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === idx3 && (
                                    <td rowSpan={span3} className="py-0.5 px-1 text-center align-top bg-orange-50/10 border-l border-b border-orange-200">
                                      <span className="font-extrabold text-orange-950 block text-center mb-0.5 text-[11px] leading-tight">सुधारणा आवश्यक</span>
                                      <p className="text-black leading-tight font-bold px-0.5 text-[10px] text-center line-clamp-2 pt-0.5">
                                        {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                      </p>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    {/* Term 2 Box */}
                    <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                      <h3 className="text-[12.5px] font-extrabold text-orange-950 text-center py-0.5 border-b border-orange-400 bg-amber-100/90">
                        द्वितीय सत्र
                      </h3>
                      <table className="w-full table-fixed border-collapse text-[11px] text-center font-medium">
                        <colgroup>
                          <col className="w-[46%]" />
                          <col className="w-[9%]" />
                          <col className="w-[45%]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-orange-50/60 font-extrabold text-black border-b border-orange-300 text-[10.5px] min-h-[18px]">
                            <th className="border-r border-orange-300 p-0.5 text-center">विषय</th>
                            <th className="border-r border-orange-300 p-0.5 text-center">श्रेणी</th>
                            <th className="p-0.5 text-center">वर्णनात्मक नोंदी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const numSubjects = subjects.length || 6;
                            const span1 = Math.max(1, Math.floor(numSubjects / 3));
                            const span2 = Math.max(1, Math.floor((numSubjects - span1) / 2));
                            const span3 = Math.max(1, numSubjects - span1 - span2);
                            const idx1 = 0;
                            const idx2 = span1;
                            const idx3 = span1 + span2;
                            const singlePageRowPx = Math.max(18, Math.floor(170 / numSubjects));

                            return subjects.map((subName, sIdx) => {
                              const sem2Grade = getSubjectGradeForTerm(student, subName, "sem2");
                              return (
                                <tr key={subName} style={{ height: `${singlePageRowPx}px` }}>
                                  <td className="border-r border-b border-orange-300 border-b-orange-200 py-[1px] px-1 text-left font-bold text-black bg-orange-50/10 text-[11px] pl-1.5 align-middle truncate">
                                    {subName}
                                  </td>
                                  <td className="border-r border-b border-orange-300 border-b-orange-200 py-[1px] px-0.5 font-extrabold text-blue-950 text-[12.5px] align-middle">
                                    {sem2Grade}
                                  </td>
                                  {sIdx === idx1 && (
                                    <td rowSpan={span1} className="py-0.5 px-1 text-center align-top bg-orange-50/10 border-l border-b border-orange-200">
                                      <span className="font-extrabold text-orange-950 block text-center mb-0.5 text-[11px] leading-tight">विशेष प्रगती</span>
                                      <p className="text-black leading-tight font-bold px-0.5 text-[10px] text-center line-clamp-2 pt-0.5">
                                        {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === idx2 && (
                                    <td rowSpan={span2} className="py-0.5 px-1 text-center align-top bg-orange-50/10 border-l border-b border-orange-200">
                                      <span className="font-extrabold text-orange-950 block text-center mb-0.5 text-[11px] leading-tight">आवड / छंद</span>
                                      <p className="text-black leading-tight font-bold px-0.5 text-[10px] text-center line-clamp-2 pt-0.5">
                                        {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === idx3 && (
                                    <td rowSpan={span3} className="py-0.5 px-1 text-center align-top bg-orange-50/10 border-l border-b border-orange-200">
                                      <span className="font-extrabold text-orange-950 block text-center mb-0.5 text-[11px] leading-tight">सुधारणा आवश्यक</span>
                                      <p className="text-black leading-tight font-bold px-0.5 text-[10px] text-center line-clamp-2 pt-0.5">
                                        {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                      </p>
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 3. FULL WIDTH BOTTOM FOOTER SIGNATURES */}
                <div className="flex items-center justify-around border-2 border-orange-400 py-1 px-8 text-[11.5px] font-extrabold text-black bg-orange-50/20 rounded-xl mt-1">
                  <div className="text-center w-[170px] flex flex-col justify-end items-center min-h-[40px] pb-0.5">
                    <span className="font-extrabold text-black text-[12px] leading-tight truncate w-full px-0.5 mb-0.5">
                      {schoolData.teacherName || ""}
                    </span>
                    <span className="text-[11.5px] font-extrabold text-black block leading-tight">वर्गशिक्षक स्वाक्षरी</span>
                  </div>
                  <div className="text-center w-[170px] flex flex-col justify-end items-center min-h-[40px] pb-0.5">
                    <span className="font-extrabold text-black text-[12px] leading-tight truncate w-full px-0.5 mb-0.5">
                      {schoolData.headmasterName || ""}
                    </span>
                    <span className="text-[11.5px] font-extrabold text-black block leading-tight">मुख्याध्यापक स्वाक्षरी</span>
                  </div>
                  <div className="text-center w-[170px] flex flex-col justify-end items-center min-h-[40px] pb-0.5">
                    <span className="font-extrabold text-black text-[12px] leading-tight truncate w-full px-0.5 mb-0.5 invisible">
                      -
                    </span>
                    <span className="text-[11.5px] font-extrabold text-black block leading-tight">पालक स्वाक्षरी</span>
                  </div>
                </div>
              </div>
            );

            const renderTwoPageProgressSheet = () => {
              const page1Inner = (
                <div className="grid grid-cols-12 gap-3 h-full w-full">
                  <div className="col-span-6 border-r-2 border-orange-400 border-dashed pr-3 flex flex-col justify-between h-full">
                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[14px] font-extrabold text-orange-950 text-center bg-orange-100/90 py-1 border-b-2 border-orange-400">
                          उपस्थिती
                        </h4>
                        <table className="w-full text-center text-[13px] border-collapse border border-orange-300 progress-compact-table">
                          <thead>
                            <tr className="bg-amber-100/90 font-extrabold text-amber-950 border-b border-orange-300 text-[13px] min-h-[24px]">
                              <th className="border border-orange-300 px-1 py-0.5 w-[34%] text-center">महिना</th>
                              <th className="border border-orange-300 px-1 py-0.5 w-[33%] text-center">कामाचे दिवस</th>
                              <th className="border border-orange-300 px-1 py-0.5 w-[33%] text-center">हजर दिवस</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthsList.map((m) => {
                              const workingDays = getWorkingDaysForMonth(student, m);
                              const pres = getStudentPresentDays(student, m);
                              return (
                                <tr key={m.key} className="border-b border-orange-200 min-h-[20px]">
                                  <td className="border border-orange-300 px-1 py-[1px] font-bold text-black bg-orange-50/40 text-[13px]">{m.label}</td>
                                  <td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">{workingDays}</td>
                                  <td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">{pres}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[14px] font-extrabold text-orange-950 text-center bg-orange-100/90 py-1 border-b-2 border-orange-400">
                          श्रेणी तक्ता
                        </h4>
                        <table className="w-full text-center text-[13px] border-collapse border border-orange-300 progress-compact-table">
                          <thead>
                            <tr className="bg-amber-100/90 font-extrabold text-amber-950 border-b border-orange-300 text-[13px] min-h-[22px]">
                              <th className="border border-orange-300 px-1 py-0.5 w-[65%] text-center">गुणांचे वर्गीकरण</th>
                              <th className="border border-orange-300 px-1 py-0.5 w-[35%] text-center">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">91% ते 100%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">अ-1</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">81% ते 90%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">अ-2</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">71% ते 80%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">ब-1</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">61% ते 70%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">ब-2</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">51% ते 60%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">क-1</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">41% ते 50%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">क-2</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">33% ते 40%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">ड</td></tr>
                            <tr className="border-b border-orange-200 min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">21% ते 32%</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">इ-1</td></tr>
                            <tr className="min-h-[19px]"><td className="border border-orange-300 px-1 py-[1px] font-bold text-black text-[13px]">20% व त्यापेक्षा कमी</td><td className="border border-orange-300 px-1 py-[1px] font-extrabold text-blue-950 text-[13.5px]">इ-2</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-6 pl-1 flex flex-col justify-between h-full space-y-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between border-b-2 border-orange-400 pb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-orange-600 text-white rounded-lg flex items-center justify-center font-extrabold text-[10px] shadow-sm shrink-0">
                            SS
                          </div>
                          <div>
                            <h3 className="text-[12px] font-extrabold text-orange-800 uppercase">समग्र शिक्षा</h3>
                            <p className="text-[9px] text-slate-900 font-bold">Samagra Shiksha</p>
                          </div>
                        </div>
                        <div className="text-center bg-amber-50 px-2.5 py-0.5 rounded-xl border border-orange-300">
                          <h2 className="text-[13.5px] font-extrabold text-amber-950">
                            विद्यार्थी प्रगतीपत्रक सन {academicYear}
                          </h2>
                        </div>
                        <div className="w-[56px] h-[64px] rounded-xl border-2 border-orange-500 overflow-hidden bg-white shrink-0 shadow-sm p-0.5 flex items-center justify-center">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                              <User className="size-6 text-orange-400 mb-0.5" />
                              <span className="text-[10px] font-extrabold text-orange-950 leading-tight">फोटो</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="border-2 border-orange-400 rounded-xl px-2.5 py-1.5 bg-white space-y-0.5 text-[12.5px]">
                        <div className="flex items-center justify-between font-extrabold text-black border-b-2 border-orange-300 pb-0.5 text-[13px]">
                          <span>हजेरी क्र. : <b className="text-blue-950 font-extrabold text-[13.5px]">{student.rollNo || idx + 1}</b></span>
                          <span>यु-डायस : <b className="text-blue-950 font-extrabold text-[13.5px]">{schoolData.udise || student.udise || ""}</b></span>
                        </div>
                        <div className="space-y-0.5 pt-0.5">
                          <div className="flex border-b border-slate-300 pb-0.5 items-baseline">
                            <span className="text-slate-900 font-bold shrink-0 text-[12.5px] mr-1.5">शाळेचे नाव :</span>
                            <span className="font-bold text-black text-[12.5px] leading-snug break-words flex-1">{schoolData.schoolName || student.schoolName || ""}</span>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 bg-amber-100/70 px-1 py-0.5 rounded-md items-baseline">
                            <span className="text-black font-bold shrink-0 text-[12.5px] mr-1.5">विद्यार्थ्याचे नाव:</span>
                            <span className="font-extrabold text-blue-950 text-[13px] leading-snug break-words flex-1">{student.fullName || student.name || ""}</span>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 items-baseline">
                            <span className="text-slate-900 font-bold shrink-0 text-[12.5px] mr-1.5">जन्म दिनांक :</span>
                            <span className="font-bold text-black text-[12.5px]">{formatDob(student.dob)}</span>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 justify-between items-baseline">
                            <div><span className="text-slate-900 font-bold text-[12.5px]">इयत्ता : </span><b className="text-black text-[12.5px]">{getMarathiClassName(selectedClass)}</b></div>
                            <div><span className="text-slate-900 font-bold text-[12.5px]">आधार क्रमांक : </span><b className="text-black text-[12.5px]">{student.aadhar || student.aadhaarNo || ""}</b></div>
                            <div><span className="text-slate-900 font-bold text-[12.5px]">तुकडी : </span><b className="text-black text-[12.5px]">{formatDivision(student.division || student.studentInfo?.division || student.section, division)}</b></div>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 justify-between items-baseline">
                            <div><span className="text-slate-900 font-bold text-[12.5px]">स्टुडन्ट आयडी : </span><b className="text-black text-[12.5px]">{getCleanStudentId(student.studentId || student.saralId || student.penNo)}</b></div>
                            <div><span className="text-slate-900 font-bold text-[12.5px]">जन. रजि. नं : </span><b className="text-black text-[12.5px]">{student.generalRegNo || student.grNo || ""}</b></div>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 justify-between items-baseline">
                            <div className="flex-1 min-w-0 mr-2"><span className="text-slate-900 font-bold text-[12.5px]">वडिलांचे नाव : </span><b className="text-black text-[12.5px] break-words">{student.fatherName || ""}</b></div>
                            <div className="shrink-0 ml-2"><span className="text-slate-900 font-bold text-[12.5px]">व्यवसाय : </span><b className="text-black text-[12.5px]">{student.fatherOccupation || ""}</b></div>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 justify-between items-baseline">
                            <div className="flex-1 min-w-0 mr-2"><span className="text-slate-900 font-bold text-[12.5px]">आईचे नाव : </span><b className="text-black text-[12.5px] break-words">{student.motherName || ""}</b></div>
                            <div className="shrink-0 ml-2"><span className="text-slate-900 font-bold text-[12.5px]">व्यवसाय : </span><b className="text-black text-[12.5px]">{student.motherOccupation || ""}</b></div>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 justify-between items-baseline">
                            <div><span className="text-slate-900 font-bold text-[12.5px]">मातृभाषा : </span><b className="text-black text-[12.5px]">{student.motherTongue || ""}</b></div>
                            <div><span className="text-slate-900 font-bold text-[12.5px]">माध्यम : </span><b className="text-black text-[12.5px]">{student.medium || ""}</b></div>
                          </div>
                          <div className="flex border-b border-slate-300 pb-0.5 justify-between items-baseline">
                            <div><span className="text-slate-900 font-bold text-[12.5px]">धर्म : </span><b className="text-black text-[12.5px]">{student.religion || ""}</b></div>
                            <div><span className="text-slate-900 font-bold text-[12.5px]">संवर्ग : </span><b className="text-black text-[12.5px]">{student.caste || student.casteCategory || ""}</b></div>
                          </div>
                          <div className="flex items-baseline">
                            <span className="text-slate-900 font-bold shrink-0 text-[12.5px] mr-1.5">पत्ता :</span>
                            <span className="font-bold text-black text-[12.5px] leading-snug break-words flex-1">{student.address || ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border border-orange-300 bg-orange-50/40 rounded-lg px-2 py-1 text-[13px] font-extrabold text-black flex items-center justify-between">
                        <span>संपर्क: <b className="text-black font-extrabold text-[13.5px]">{student.mobile || student.phone || ""}</b></span>
                      </div>
                      <div className="border border-orange-400 bg-orange-50/50 rounded-lg px-2 py-1 text-[13px] flex items-center justify-between font-extrabold text-black">
                        <span>वजन: <b className="text-blue-950 font-extrabold text-[13.5px]">{student.weight ? `${student.weight} किलो` : ""}</b></span>
                        <span className="text-orange-950 font-extrabold text-[13.5px]">आरोग्य विषयक माहिती</span>
                        <span>उंची: <b className="text-blue-950 font-extrabold text-[13.5px]">{student.height ? `${student.height} सेमी` : ""}</b></span>
                      </div>
                    </div>
                    <div className="border-2 border-orange-400 bg-amber-50/90 rounded-xl px-2.5 py-1.5 text-[13px] flex items-center justify-between font-extrabold text-black shadow-xs mt-auto">
                      <span>शाळा भरण्याचा दिनांक: <b className="text-blue-950 font-extrabold text-[13.5px]">15 Jun 2026</b></span>
                      <span>पुढील वर्षाची इयत्ता: <b className="text-emerald-900 font-extrabold text-[13.5px]">{getNextClassName(selectedClass)}</b></span>
                    </div>
                  </div>
                </div>
              );

              const studentFullName = (student.fullName || student.name || "").trim();
              const nameCharLength = studentFullName.length;
              // Dynamic font size scaling based on length (strength) of student name:
              const dynamicNameSizeClass = nameCharLength > 36
                ? "text-[13px] sm:text-[13.5px]"
                : nameCharLength > 24
                  ? "text-[14.5px] sm:text-[15px]"
                  : "text-[16px] sm:text-[17px]";

              const page2Inner = (
                <>
                  <div className="w-full flex items-center justify-between border-2 border-orange-400 py-1.5 px-5 mb-2.5 text-[15px] font-extrabold text-black bg-amber-50/95 rounded-full shadow-xs shrink-0 box-border">
                    <div className="flex items-center gap-2 flex-1 mr-4 min-w-0">
                      <span className="text-slate-900 font-extrabold shrink-0 text-[14.5px] whitespace-nowrap">
                        विद्यार्थ्याचे नाव :
                      </span>
                      <span className={`font-extrabold text-blue-950 leading-snug break-words ${dynamicNameSizeClass}`}>
                        {studentFullName || "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3.5 sm:gap-5 text-[14.5px] shrink-0 whitespace-nowrap font-bold text-slate-900">
                      <span>
                        इयत्ता : <b className="font-extrabold text-[15px] text-black">{getMarathiClassName(selectedClass)}</b>
                      </span>
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        तुकडी : <b className="font-extrabold text-[15px] text-black">{formatDivision(student.division || student.studentInfo?.division || student.section, division)}</b>
                      </span>
                      <span className="text-orange-500 font-bold">•</span>
                      <span>
                        हजेरी क्र. : <b className="font-extrabold text-[16px] text-blue-950">{student.rollNo || idx + 1}</b>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 flex-1 w-full overflow-hidden min-h-0">
                    <div className="col-span-6 border-r-2 border-orange-400 border-dashed pr-2 flex flex-col justify-between h-full space-y-3 min-h-0">
                      <div className="flex flex-col border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h3 className="text-[15px] font-extrabold text-orange-950 text-center py-1 border-b-2 border-orange-400 bg-orange-100/90 shrink-0">
                          प्रथम सत्र
                        </h3>
                        <table className="w-full table-fixed border-collapse text-[13px] text-center font-medium">
                          <colgroup>
                            <col className="w-[44%]" />
                            <col className="w-[8%]" />
                            <col className="w-[48%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-amber-100/90 font-extrabold text-amber-950 border-b border-orange-400 text-[13.5px] min-h-[26px]">
                              <th className="border border-orange-300 p-0.5 text-center">विषय</th>
                              <th className="border border-orange-300 p-0.5 text-center">श्रेणी</th>
                              <th className="border border-orange-300 p-0.5 text-center">वर्णनात्मक नोंदी</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const numSubjects = subjects.length || 6;
                              const span1 = Math.max(1, Math.floor(numSubjects / 3));
                              const span2 = Math.max(1, Math.floor((numSubjects - span1) / 2));
                              const span3 = Math.max(1, numSubjects - span1 - span2);
                              const idx1 = 0;
                              const idx2 = span1;
                              const idx3 = span1 + span2;
                              const twoPageRowPx = Math.max(36, Math.floor(510 / numSubjects));

                              return subjects.map((subName, sIdx) => {
                                const sem1Grade = getSubjectGradeForTerm(student, subName, "sem1");
                                return (
                                  <tr key={subName} style={{ height: `${twoPageRowPx}px` }}>
                                    <td className="border border-orange-300 py-1 px-1.5 text-left font-extrabold text-black bg-orange-50/20 text-[13.5px] pl-2 align-middle">
                                      {subName}
                                    </td>
                                    <td className="border border-orange-300 py-1 px-1 font-extrabold text-blue-950 text-[15px] align-middle">
                                      {sem1Grade}
                                    </td>
                                    {sIdx === idx1 && (
                                      <td rowSpan={span1} className="border border-orange-300 p-1 text-center align-top bg-orange-50/10">
                                        <span className="font-extrabold text-orange-950 block text-center mb-1 text-[13px] leading-snug">विशेष प्रगती</span>
                                        <p className="text-black leading-snug font-bold px-1 text-[12px] text-center pt-0.5 line-clamp-4">
                                          {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                        </p>
                                      </td>
                                    )}
                                    {sIdx === idx2 && (
                                      <td rowSpan={span2} className="border border-orange-300 p-1 text-center align-top bg-orange-50/10">
                                        <span className="font-extrabold text-orange-950 block text-center mb-1 text-[13px] leading-snug">आवड / छंद</span>
                                        <p className="text-black leading-snug font-bold px-1 text-[12px] text-center pt-0.5 line-clamp-4">
                                          {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                        </p>
                                      </td>
                                    )}
                                    {sIdx === idx3 && (
                                      <td rowSpan={span3} className="border border-orange-300 p-1 text-center align-top bg-orange-50/10">
                                        <span className="font-extrabold text-orange-950 block text-center mb-1 text-[13px] leading-snug">सुधारणा आवश्यक</span>
                                        <p className="text-black leading-snug font-bold px-1 text-[12px] text-center pt-0.5 line-clamp-4">
                                          {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                        </p>
                                      </td>
                                    )}
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* First Term Signatures Footer */}
                      <div className="grid grid-cols-3 gap-1 border-2 border-orange-400 py-1.5 text-[11.5px] font-bold text-black shrink-0 bg-orange-50/40 px-2 rounded-xl mt-auto">
                        <div className="text-center flex flex-col justify-end items-center h-[46px] pb-0.5">
                          <span className="font-extrabold text-black text-[12.5px] leading-tight truncate w-full px-0.5 mb-0.5">
                            {schoolData.teacherName || ""}
                          </span>
                          <span className="text-[11.5px] text-black font-extrabold block leading-tight">वर्गशिक्षक स्वाक्षरी</span>
                        </div>
                        <div className="text-center flex flex-col justify-end items-center h-[46px] pb-0.5">
                          <span className="font-extrabold text-black text-[12.5px] leading-tight truncate w-full px-0.5 mb-0.5">
                            {schoolData.headmasterName || ""}
                          </span>
                          <span className="text-[11.5px] text-black font-extrabold block leading-tight">मुख्याध्यापक स्वाक्षरी</span>
                        </div>
                        <div className="text-center flex flex-col justify-end items-center h-[46px] pb-0.5">
                          <span className="font-extrabold text-black text-[12.5px] leading-tight truncate w-full px-0.5 mb-0.5 invisible">
                            -
                          </span>
                          <span className="text-[11.5px] text-black font-extrabold block leading-tight">पालक स्वाक्षरी</span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-6 pl-1 flex flex-col justify-between h-full space-y-3 min-h-0">
                      <div className="flex flex-col border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h3 className="text-[15px] font-extrabold text-orange-950 text-center py-1 border-b-2 border-orange-400 bg-orange-100/90 shrink-0">
                          द्वितीय सत्र
                        </h3>
                        <table className="w-full table-fixed border-collapse text-[13px] text-center font-medium">
                          <colgroup>
                            <col className="w-[44%]" />
                            <col className="w-[8%]" />
                            <col className="w-[48%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-amber-100/90 font-extrabold text-amber-950 border-b border-orange-400 text-[13.5px] min-h-[26px]">
                              <th className="border border-orange-300 p-0.5 text-center">विषय</th>
                              <th className="border border-orange-300 p-0.5 text-center">श्रेणी</th>
                              <th className="border border-orange-300 p-0.5 text-center">वर्णनात्मक नोंदी</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const numSubjects = subjects.length || 6;
                              const span1 = Math.max(1, Math.floor(numSubjects / 3));
                              const span2 = Math.max(1, Math.floor((numSubjects - span1) / 2));
                              const span3 = Math.max(1, numSubjects - span1 - span2);
                              const idx1 = 0;
                              const idx2 = span1;
                              const idx3 = span1 + span2;
                              const twoPageRowPx = Math.max(36, Math.floor(510 / numSubjects));

                              return subjects.map((subName, sIdx) => {
                                const sem2Grade = getSubjectGradeForTerm(student, subName, "sem2");
                                return (
                                  <tr key={subName} style={{ height: `${twoPageRowPx}px` }}>
                                    <td className="border border-orange-300 py-1 px-1.5 text-left font-extrabold text-black bg-orange-50/20 text-[13.5px] pl-2 align-middle">
                                      {subName}
                                    </td>
                                    <td className="border border-orange-300 py-1 px-1 font-extrabold text-blue-950 text-[15px] align-middle">
                                      {sem2Grade}
                                    </td>
                                    {sIdx === idx1 && (
                                      <td rowSpan={span1} className="border border-orange-300 p-1 text-center align-top bg-orange-50/10">
                                        <span className="font-extrabold text-orange-950 block text-center mb-1 text-[13px] leading-snug">विशेष प्रगती</span>
                                        <p className="text-black leading-snug font-bold px-1 text-[12px] text-center pt-0.5 line-clamp-4">
                                          {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                        </p>
                                      </td>
                                    )}
                                    {sIdx === idx2 && (
                                      <td rowSpan={span2} className="border border-orange-300 p-1 text-center align-top bg-orange-50/10">
                                        <span className="font-extrabold text-orange-950 block text-center mb-1 text-[13px] leading-snug">आवड / छंद</span>
                                        <p className="text-black leading-snug font-bold px-1 text-[12px] text-center pt-0.5 line-clamp-4">
                                          {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                        </p>
                                      </td>
                                    )}
                                    {sIdx === idx3 && (
                                      <td rowSpan={span3} className="border border-orange-300 p-1 text-center align-top bg-orange-50/10">
                                        <span className="font-extrabold text-orange-950 block text-center mb-1 text-[13px] leading-snug">सुधारणा आवश्यक</span>
                                        <p className="text-black leading-snug font-bold px-1 text-[12px] text-center pt-0.5 line-clamp-4">
                                          {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                        </p>
                                      </td>
                                    )}
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {/* Second Term Signatures Footer */}
                      <div className="grid grid-cols-3 gap-1 border-2 border-orange-400 py-1.5 text-[11.5px] font-bold text-black shrink-0 bg-orange-50/40 px-2 rounded-xl mt-auto">
                        <div className="text-center flex flex-col justify-end items-center h-[46px] pb-0.5">
                          <span className="font-extrabold text-black text-[12.5px] leading-tight truncate w-full px-0.5 mb-0.5">
                            {schoolData.teacherName || ""}
                          </span>
                          <span className="text-[11.5px] text-black font-extrabold block leading-tight">वर्गशिक्षक स्वाक्षरी</span>
                        </div>
                        <div className="text-center flex flex-col justify-end items-center h-[46px] pb-0.5">
                          <span className="font-extrabold text-black text-[12.5px] leading-tight truncate w-full px-0.5 mb-0.5">
                            {schoolData.headmasterName || ""}
                          </span>
                          <span className="text-[11.5px] text-black font-extrabold block leading-tight">मुख्याध्यापक स्वाक्षरी</span>
                        </div>
                        <div className="text-center flex flex-col justify-end items-center h-[46px] pb-0.5">
                          <span className="font-extrabold text-black text-[12.5px] leading-tight truncate w-full px-0.5 mb-0.5 invisible">
                            -
                          </span>
                          <span className="text-[11.5px] text-black font-extrabold block leading-tight">पालक स्वाक्षरी</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );

              return (
                <>
                  {/* PAGE 1 */}
                  <A4PageWrapper isLandscape={layoutMode !== "portrait"}>
                    {layoutMode === "portrait" ? (
                      <div
                        className="pdf-page bg-white relative w-[210mm] max-w-[210mm] min-w-[210mm] h-[297mm] max-h-[297mm] min-h-[297mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none box-border border-2 border-orange-500 rounded-xl flex items-center justify-center p-0"
                        style={{
                          pageBreakAfter: "always",
                          breakAfter: "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif",
                        }}
                      >
                        <div
                          className="w-[297mm] h-[207mm] max-w-[297mm] max-h-[207mm] bg-white px-5 py-3.5 box-border flex flex-col justify-center items-center shrink-0"
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "center center",
                          }}
                        >
                          {page1Inner}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="pdf-page bg-white relative w-[297mm] max-w-[297mm] min-w-[297mm] h-[207mm] max-h-[207mm] min-h-[207mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none px-5 py-3.5 box-border border-2 border-orange-500 rounded-2xl flex flex-col justify-center items-center"
                        style={{
                          pageBreakAfter: "always",
                          breakAfter: "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif",
                        }}
                      >
                        {page1Inner}
                      </div>
                    )}
                  </A4PageWrapper>

                  {/* PAGE 2 */}
                  <A4PageWrapper isLandscape={layoutMode !== "portrait"}>
                    {layoutMode === "portrait" ? (
                      <div
                        className="pdf-page bg-white relative w-[210mm] max-w-[210mm] min-w-[210mm] h-[297mm] max-h-[297mm] min-h-[297mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none box-border border-2 border-orange-500 rounded-xl flex items-center justify-center p-0"
                        style={{
                          pageBreakAfter: isLastStudent ? "avoid" : "always",
                          breakAfter: isLastStudent ? "avoid" : "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif",
                        }}
                      >
                        <div
                          className="w-[297mm] h-[207mm] max-w-[297mm] max-h-[207mm] bg-white px-5 py-3.5 box-border flex flex-col justify-center items-center shrink-0"
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "center center",
                          }}
                        >
                          {page2Inner}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="pdf-page bg-white relative w-[297mm] max-w-[297mm] min-w-[297mm] h-[207mm] max-h-[207mm] min-h-[207mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none px-5 py-3.5 box-border border-2 border-orange-500 rounded-2xl flex flex-col justify-center items-center"
                        style={{
                          pageBreakAfter: isLastStudent ? "avoid" : "always",
                          breakAfter: isLastStudent ? "avoid" : "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif",
                        }}
                      >
                        {page2Inner}
                      </div>
                    )}
                  </A4PageWrapper>
                </>
              );
            };

            return (
              <React.Fragment key={student.id || idx}>
                {pageMode === "2pages" ? (
                  renderTwoPageProgressSheet()
                ) : (
                  <A4PageWrapper isLandscape={layoutMode !== "portrait"}>
                    {layoutMode === "portrait" ? (
                      /* ROTATED PORTRAIT BOOKLET (A4 210mm x 297mm ROTATED FOR PORTRAIT PDF) */
                      <div
                        className="pdf-page bg-white relative w-[210mm] max-w-[210mm] min-w-[210mm] h-[297mm] max-h-[297mm] min-h-[297mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none box-border border-2 border-orange-500 rounded-xl flex items-center justify-center p-0"
                        style={{
                          pageBreakAfter: isLastStudent ? "avoid" : "always",
                          breakAfter: isLastStudent ? "avoid" : "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif",
                        }}
                      >
                        <div
                          className="w-[297mm] h-[207mm] max-w-[297mm] max-h-[207mm] bg-white px-5 py-3.5 box-border flex flex-col justify-center items-center shrink-0"
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "center center",
                          }}
                        >
                          {renderSinglePageProgressSheet()}
                        </div>
                      </div>
                    ) : (
                      /* LANDSCAPE BOOKLET (A4 297mm x 210mm SINGLE PAGE LANDSCAPE PDF) */
                      <div
                        className="pdf-page bg-white relative w-[297mm] max-w-[297mm] min-w-[297mm] h-[207mm] max-h-[207mm] min-h-[207mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none px-5 py-3.5 box-border border-2 border-orange-500 rounded-2xl flex flex-col justify-center items-center"
                        style={{
                          pageBreakAfter: isLastStudent ? "avoid" : "always",
                          breakAfter: isLastStudent ? "avoid" : "page",
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                          fontFamily: "'Noto Sans Devanagari', 'Nirmala UI', 'Mangal', 'Inter', sans-serif",
                        }}
                      >
                        {renderSinglePageProgressSheet()}
                      </div>
                    )}
                  </A4PageWrapper>
                )}
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgressSheet;
