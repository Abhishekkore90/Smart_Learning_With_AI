import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Download, ArrowLeft, Loader2, AlertCircle, Copy, FileText, User } from "lucide-react";
import { toast } from "sonner";
import "./result.css";

import { matchStudentClassAndMedium, fetchStudentsForClass } from "./firestoreMarksHelper";
import { getDefaultSubjectsForClass } from "../data/cceSubjects";
import { getTeacherId } from "../lib/teacherIsolationHelper";

const DEFAULT_SUBJECTS = [
  "प्रथम भाषा : मराठी",
  "द्वितीय भाषा : इंग्रजी",
  "गणित",
  "कला",
  "कार्यानुभव",
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

const ProgressSheet = ({ initialClass = "1st", initialYear = "2025-26", initialSemester = "sem2", onBack }) => {
  const [selectedClass, setSelectedClass] = useState(initialClass || "1st");
  const [academicYear, setAcademicYear] = useState(initialYear || "2025-26");
  const [selectedSemester, setSelectedSemester] = useState(initialSemester || "sem2"); // sem1 = प्रथम सत्र | sem2 = द्वितीय सत्र
  const [division, setDivision] = useState("1");
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedMedium, setSelectedMedium] = useState("marathi");
  const [layoutMode, setLayoutMode] = useState("landscape"); // "portrait" (उभा) | "landscape" (फोल्डिंग)
  const [showLayoutModal, setShowLayoutModal] = useState(true);
  const [pageMode, setPageMode] = useState("1page"); // "1page" | "2pages"
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [schoolData, setSchoolData] = useState({
    schoolName: "",
    udise: "",
    teacherName: "",
    headmasterName: "",
    address: "",
    slogan: "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦",
  });

  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({});
  const [remarksData, setRemarksData] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [workingDaysData, setWorkingDaysData] = useState({});

  const printRef = useRef(null);

  useEffect(() => {
    // 0. Check Instant LocalStorage Cache first for 0ms initial render
    const cacheKey = `cce_progress_cache_${selectedClass}_${academicYear}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.students && parsed.students.length > 0) {
          if (parsed.schoolData) setSchoolData(parsed.schoolData);
          if (parsed.students) setStudents(parsed.students);
          if (parsed.marksData) setMarksData(parsed.marksData);
          if (parsed.remarksData) setRemarksData(parsed.remarksData);
          if (parsed.attendanceData) setAttendanceData(parsed.attendanceData);
          if (parsed.workingDaysData) setWorkingDaysData(parsed.workingDaysData);
          setLoading(false);
        }
      }
    } catch (e) { }

    loadUserFirestoreData();
  }, [selectedClass, academicYear, selectedMedium, selectedSemester]);

  // Helper function to format Date of Birth cleanly (e.g. 02052004 -> 02-05-2004)
  const formatDob = (dobStr) => {
    if (!dobStr) return "-";
    const str = String(dobStr).trim();
    if (str.length === 0 || str === "-") return "-";

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
          let slogan = "✦ ज्ञान, संस्कार आणि प्रगतीसाठी ✦";

          // 1. Check school_settings collection (Where CCESettings saves!)
          try {
            const uid = currentTeacherId;
            const settingsDocIds = [
              uid ? `${uid}_general` : null,
              uid ? uid : null,
              "general",
              "school_info",
              "school_settings",
            ].filter(Boolean);

            for (const dId of settingsDocIds) {
              const sRef = doc(db, "school_settings", dId);
              const sSnap = await getDoc(sRef);
              if (sSnap.exists()) {
                const data = sSnap.data();
                if (!schoolName) schoolName = data.schoolName || data.school_name || data.school || "";
                if (!udise) udise = data.udiseCode || data.udise || data.udiseNo || "";
                if (!teacherName) teacherName = data.teacherName || data.fullName || "";
                if (!headmasterName) headmasterName = data.principalName || data.headmasterName || "";
                if (!address) address = data.address || "";
                if (data.slogan) slogan = data.slogan;
              }
            }
          } catch (e) { }

          // 2. Check cce_settings collection
          try {
            const cceDocIds = [
              docId,
              `${selectedClass}_${currentMedium}_${academicYear}`,
              "global",
            ];
            for (const cId of cceDocIds) {
              const cRef = doc(db, "cce_settings", cId);
              const cSnap = await getDoc(cRef);
              if (cSnap.exists()) {
                const data = cSnap.data();
                if (!schoolName) schoolName = data.schoolName || data.school_name || "";
                if (!udise) udise = data.udiseCode || data.udise || "";
                if (!teacherName) teacherName = data.teacherName || "";
                if (!headmasterName) headmasterName = data.principalName || data.headmasterName || "";
                if (!address) address = data.address || "";
                if (data.slogan) slogan = data.slogan;
              }
            }
          } catch (e) { }

          // 3. Check teachers / users collection fallback
          try {
            const uid = currentTeacherId;
            if (uid) {
              const tSnap = await getDoc(doc(db, "teachers", uid));
              if (tSnap.exists()) {
                const data = tSnap.data();
                if (!schoolName) schoolName = data.schoolName || "";
                if (!udise) udise = data.udise || "";
                if (!teacherName) teacherName = data.fullName || "";
              }
              const uSnap = await getDoc(doc(db, "users", uid));
              if (uSnap.exists()) {
                const data = uSnap.data();
                if (!schoolName) schoolName = data.schoolName || data.school_name || "";
                if (!udise) udise = data.udise || data.udiseCode || "";
              }
            }
          } catch (e) { }

          // 4. Check LocalStorage (cce_general_school_settings & CCESettings caches)
          if (!schoolName || !udise) {
            const cacheKeys = [
              currentTeacherId ? `cce_general_school_settings_${currentTeacherId}` : null,
              "cce_general_school_settings",
              "sqaaf_teacher_profile",
              "teacher_profile",
              "school_profile",
            ].filter(Boolean);

            cacheKeys.forEach(k => {
              try {
                const val = localStorage.getItem(k);
                if (val) {
                  const p = JSON.parse(val);
                  if (!schoolName && (p.schoolName || p.school_name)) schoolName = p.schoolName || p.school_name;
                  if (!udise && (p.udiseCode || p.udise)) udise = p.udiseCode || p.udise;
                  if (!teacherName && (p.fullName || p.teacherName)) teacherName = p.fullName || p.teacherName;
                  if (!headmasterName && (p.principalName || p.headmasterName)) headmasterName = p.principalName || p.headmasterName;
                }
              } catch (e) { }
            });
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
            // Enforce strict logged-in teacher filtering on loaded students
            if (currentTeacherId && currentTeacherId !== "admin" && currentTeacherId !== "super_admin") {
              loadedStudents = loadedStudents.filter((s) => {
                const sTeacher = s.teacherId || s.createdById || s.userId;
                return !sTeacher || sTeacher === currentTeacherId || sTeacher === "global";
              });
            }

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
                const dRoll = String(dItem.rollNo || dItem.srNo || "").trim();
                const dName = String(dItem.fullName || dItem.name || dItem.studentName || "").toLowerCase().trim();

                if (sIdStr && dId && sIdStr === dId) return true;
                if (sRollStr && dRoll && sRollStr === dRoll) return true;
                if (sNameLower && dName && (sNameLower.includes(dName) || dName.includes(sNameLower))) return true;
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
                rollNo: det.rollNo || s.rollNo || info.rollNo || "",
                name: det.name || s.name || s.fullName || info.studentName || "",
                fullName: det.fullName || det.name || s.fullName || s.name || info.studentName || "",
                fatherName: det.fatherName || s.fatherName || info.fatherName || "",
                fatherOccupation: det.fatherOccupation || s.fatherOccupation || info.fatherOccupation || "",
                motherName: det.motherName || s.motherName || info.motherName || "",
                motherOccupation: det.motherOccupation || s.motherOccupation || info.motherOccupation || "",
                dob: det.dob || s.dob || info.dob || "",
                aadhar: det.aadhar || det.aadharNo || det.aadhaarNo || s.aadhar || info.aadhaarNo || "",
                generalRegNo: det.generalRegNo || det.registrationNo || det.grNo || s.generalRegNo || s.grNo || info.grNo || "",
                motherTongue: det.motherTongue || s.motherTongue || info.motherTongue || "मराठी",
                religion: det.religion || s.religion || info.religion || "हिंदू",
                caste: det.casteCategory || det.caste || s.casteCategory || s.caste || info.casteCategory || "ओपन",
                medium: det.medium || s.medium || currentMedium || "मराठी",
                address: det.address || s.address || info.address || "",
                mobile: det.mobile || det.phone || det.parentMobile || s.mobile || s.phone || s.parentMobile || info.mobile || "",
                weight: det.weight || s.weight || info.weight || "",
                height: det.height || s.height || info.height || "",
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
            if (cached) mergedMarks = JSON.parse(cached) || {};
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
      const cacheKey = `cce_progress_cache_${selectedClass}_${academicYear}`;
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
      container.classList.add("cce-pdf-generating");

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

      const pageElements = Array.from(container.querySelectorAll(".pdf-page"));

      if (pageElements.length === 0) {
        toast.error("काहीही डेटा सापडला नाही!");
        container.classList.remove("cce-pdf-generating");
        return;
      }

      const isPortrait = layoutMode === "portrait";
      const orientation = isPortrait ? "portrait" : "landscape";
      const pdfWidth = isPortrait ? 210 : 297;
      const pdfHeight = isPortrait ? 297 : 210;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "mm",
        format: "a4",
        compress: true,
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: isPortrait ? 794 : 1123,
          onclone: (clonedDoc, clonedElement) => {
            try {
              const styleTags = Array.from(document.querySelectorAll("style"));
              styleTags.forEach((st) => {
                clonedDoc.head.appendChild(st.cloneNode(true));
              });

              let cssText = "";
              Array.from(document.styleSheets).forEach((sheet) => {
                try {
                  const rules = Array.from(sheet.cssRules || sheet.rules || []);
                  rules.forEach((rule) => {
                    cssText += rule.cssText + "\n";
                  });
                } catch (e) {}
              });

              if (cssText) {
                const inlineStyle = clonedDoc.createElement("style");
                inlineStyle.textContent = cssText;
                clonedDoc.head.appendChild(inlineStyle);
              }

              const imgs = Array.from(clonedElement.querySelectorAll("img"));
              imgs.forEach((img) => {
                try {
                  if (img.src && !img.src.startsWith("data:")) {
                    const c = document.createElement("canvas");
                    c.width = img.naturalWidth || img.width || 100;
                    c.height = img.naturalHeight || img.height || 100;
                    const ctx = c.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(img, 0, 0, c.width, c.height);
                      img.src = c.toDataURL("image/png");
                    }
                  }
                } catch (e) {}
              });
            } catch (e) {}

            clonedElement.style.margin = "0";
            clonedElement.style.padding = "14px";
            clonedElement.style.display = "block";
            clonedElement.style.visibility = "visible";
          },
        });

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          pdf.addPage("a4", orientation);
        }

        const pdfMarginX = 2.5;
        const pdfMarginY = 2.5;
        const imgWidth = pdfWidth - 2 * pdfMarginX;
        const imgHeight = pdfHeight - 2 * pdfMarginY;

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
      container.classList.remove("cce-pdf-generating");
      toast.success(`प्रगती पत्रक PDF यशस्वीरित्या डाऊनलोड झाली! (एकूण ${pageElements.length} पाने)`);
    } catch (err) {
      if (printRef.current) printRef.current.classList.remove("cce-pdf-generating");
      console.error("PDF generation error:", err);
      toast.error("PDF तयार करताना एरर आली. कृपया प्रिंन्ट पर्याय वापरा.");
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
    if (!student) return "अ-1";

    const schemaTerm = term === "sem2" ? (student.term2 || student.sem2) : (student.term1 || student.sem1);
    if (schemaTerm && schemaTerm.grades) {
      const lower = String(subjectName).toLowerCase();
      const g = schemaTerm.grades;
      if (lower.includes("मराठी") && g.firstLanguage) return g.firstLanguage;
      if (lower.includes("इंग्रजी") && g.secondLanguage) return g.secondLanguage;
      if (lower.includes("गणित") && (g.maths || g.math)) return g.maths || g.math;
      if (lower.includes("कला") && g.art) return g.art;
      if (lower.includes("कार्यानुभव") && g.workExperience) return g.workExperience;
      if (lower.includes("शारीरिक") && g.physicalEdu) return g.physicalEdu;
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
          else if (lower.includes("कला")) subData = termMap["kala"] || termMap["art"] || termMap["कला"];
          else if (lower.includes("कार्यानुभव")) subData = termMap["karyanubhav"] || termMap["workExperience"] || termMap["कार्यानुभव"];
          else if (lower.includes("शारीरिक")) subData = termMap["sharirik"] || termMap["physicalEdu"] || termMap["शारीरिक शिक्षण"];
        }

        if (subData) {
          if (typeof subData === "string" && subData.trim().length > 0) return subData.trim();
          if (typeof subData === "object") {
            if (subData.grade) return String(subData.grade).trim();
            if (subData.finalGrade) return String(subData.finalGrade).trim();
            if (subData.shreni) return String(subData.shreni).trim();
          }
          if (typeof subData === "number") {
            return getGrade(subData);
          }
        }
      }
    }

    const defaultGrades = {
      "प्रथम भाषा : मराठी": "अ-1",
      "द्वितीय भाषा : इंग्रजी": "अ-2",
      "गणित": "अ-1",
      "कला": "अ-1",
      "कार्यानुभव": "अ-2",
      "शारीरिक शिक्षण": "अ-1"
    };
    return defaultGrades[subjectName] || "अ-1";
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
    if (!student) return m.defaultDays;
    if (student.attendance && Array.isArray(student.attendance)) {
      const match = student.attendance.find((a) => {
        const mLabel = String(a.month || "").toLowerCase();
        const targetLabel = m.label.toLowerCase();
        return mLabel.includes(targetLabel) || targetLabel.includes(mLabel);
      });
      if (match && match.presentDays !== undefined) return Number(match.presentDays);
    }
    if (attendanceData) {
      const stdKeys = [student.id, student.studentId, student.rollNo, student.name, student.fullName, String(student.rollNo)].filter(Boolean);
      let stdAttMap = null;
      for (const k of stdKeys) {
        if (attendanceData[k]) { stdAttMap = attendanceData[k]; break; }
      }
      if (stdAttMap && typeof stdAttMap === "object") {
        const val = stdAttMap[m.key.toLowerCase()] || stdAttMap[m.label];
        if (val !== undefined && val !== null && val !== "") {
          const parsed = Number(val);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
      }
    }
    const working = getWorkingDaysForMonth(student, m);
    return working > 0 ? working : m.defaultDays;
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

  const displayedStudents = selectedStudentId === "all"
    ? students
    : students.filter((s) => String(s.id) === String(selectedStudentId) || String(s.rollNo) === String(selectedStudentId));

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
                className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98] ${
                  pageMode === "1page"
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
                className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-3.5 cursor-pointer group active:scale-[0.98] ${
                  pageMode === "2pages"
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

        {/* PDF Format Selector Button (Opens Modal) */}
        <button
          onClick={() => setShowLayoutModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <FileText className="size-4 text-orange-600" />
          <span>स्वरूप: {pageMode === "1page" ? "१ पान (Single Page)" : "२ पाने (Two Pages)"}</span>
        </button>

        {/* Layout Switcher (Portrait vs Landscape Booklet) - for both 1page and 2pages modes */}
        <div className="flex items-center bg-orange-50/80 p-1 rounded-xl border border-orange-200 gap-1 shadow-xs">
          <button
            onClick={() => setLayoutMode("portrait")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              layoutMode === "portrait"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-700 hover:text-orange-950 hover:bg-orange-100/60"
            }`}
          >
            <span>📄</span>
            <span>उभा लेआउट (Portrait)</span>
          </button>
          <button
            onClick={() => setLayoutMode("landscape")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              layoutMode === "landscape"
                ? "bg-orange-600 text-white shadow-sm"
                : "text-slate-700 hover:text-orange-950 hover:bg-orange-100/60"
            }`}
          >
            <span>📖</span>
            <span>फोल्डिंग लेआउट (Landscape)</span>
          </button>
        </div>

        {/* Student Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-orange-950 whitespace-nowrap">विद्यार्थी निवडा:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3.5 py-2 bg-orange-50 border border-orange-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer shadow-xs"
          >
            <option value="all">सर्व विद्यार्थी ({students.length})</option>
            {students.map((st, idx) => (
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
          .cce-pdf-generating .pdf-page {
            margin: 0 !important;
            padding: 14px !important;
            box-shadow: none !important;
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
              padding: 4px !important;
              page-break-before: auto !important;
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              background-color: #ffffff !important;
            }
              margin: 0 !important;
              padding: 4px !important;
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
              <div className="grid grid-cols-12 gap-2 h-full w-full">
                {/* LEFT SIDE: Attendance, Shreni Takta, Student Profile & Photo */}
                <div className="col-span-6 border-r-2 border-orange-400 border-dashed pr-2 flex flex-col justify-between h-full">
                  <div className="space-y-1">
                    {/* Header, Photo & Student Info */}
                    <div>
                      <div className="flex items-center justify-between border-b-2 border-orange-400 pb-0.5 mb-1">
                        <div className="flex items-center gap-1">
                          <div className="w-5 h-5 bg-orange-600 text-white rounded-lg flex items-center justify-center font-black text-[8px] shadow-sm shrink-0">
                            SS
                          </div>
                          <div>
                            <h3 className="text-[9px] font-black text-orange-700 tracking-wider uppercase">समग्र शिक्षा</h3>
                            <p className="text-[6.5px] text-slate-500 font-bold">Samagra Shiksha</p>
                          </div>
                        </div>
                        <div className="text-center bg-amber-50 px-2 py-0.5 rounded-xl border border-orange-300">
                          <h2 className="text-[10px] font-black text-amber-950 tracking-tight">
                            विद्यार्थी प्रगतीपत्रक सन {academicYear}
                          </h2>
                        </div>
                        {/* Student Photo */}
                        <div className="w-[52px] h-[62px] rounded-xl overflow-hidden border-2 border-orange-500 bg-white flex items-center justify-center shrink-0 shadow-sm p-0.5">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.fullName || student.name}
                              className="w-full h-full object-cover rounded-lg"
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
                            <User className="size-4 text-orange-400 mb-0.5" />
                            <span className="text-[8px] font-extrabold text-orange-950 leading-tight">फोटो</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white text-[10px]">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="border-b border-orange-200">
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 border-r border-orange-200 text-[10px]">
                                हजेरी क्र. : <b className="text-black font-black text-[11.5px]">{student.rollNo || idx + 1}</b>
                              </td>
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                यु-डायस: <b className="text-black font-black text-[10.5px]">{schoolData.udise || student.udise || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200 bg-orange-50/20">
                              <td colSpan={2} className="py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                शाळेचे नाव: <b className="text-amber-950 font-black text-[10.5px]">{schoolData.schoolName || student.schoolName || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200 bg-amber-100/60">
                              <td colSpan={2} className="py-0.2 px-1 font-black text-slate-900 text-[10.5px]">
                                विद्यार्थ्याचे नाव: <b className="text-blue-950 font-black text-[12px]">{student.fullName || student.name || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200">
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 border-r border-orange-200 text-[10px]">
                                जन्म दिनांक: <b className="text-black font-black text-[10px]">{formatDob(student.dob)}</b>
                              </td>
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                आधार: <b className="text-black font-black text-[10px]">{student.aadhar || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200 bg-orange-50/20">
                              <td colSpan={2} className="py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                इयत्ता: <b className="text-black font-black text-[10.5px]">{getMarathiClassName(selectedClass)}</b> &nbsp;&nbsp;&nbsp;&nbsp;
                                तुकडी: <b className="text-black font-black text-[10.5px]">{division}</b> &nbsp;&nbsp;&nbsp;&nbsp;
                                रजि. नं. : <b className="text-black font-black text-[10.5px]">{student.generalRegNo || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200">
                              <td colSpan={2} className="py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                पेन नं. : <b className="text-black font-black text-[10.5px]">{student.penNo || student.studentId || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200 bg-orange-50/20">
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 border-r border-orange-200 text-[10px]">
                                वडिलांचे नाव: <b className="text-black font-black text-[10px]">{student.fatherName || "-"}</b>
                              </td>
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                व्यवसाय: <b className="text-black font-black text-[10px]">{student.fatherOccupation || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200">
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 border-r border-orange-200 text-[10px]">
                                आईचे नाव: <b className="text-black font-black text-[10px]">{student.motherName || "-"}</b>
                              </td>
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                व्यवसाय: <b className="text-black font-black text-[10px]">{student.motherOccupation || "-"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200 bg-orange-50/20">
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 border-r border-orange-200 text-[10px]">
                                मातृभाषा: <b className="text-black font-black text-[10px]">{student.motherTongue || "मराठी"}</b>
                              </td>
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                माध्यम: <b className="text-black font-black text-[10px]">{student.medium || "मराठी"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200">
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 border-r border-orange-200 text-[10px]">
                                धर्म: <b className="text-black font-black text-[10px]">{student.religion || "हिंदू"}</b>
                              </td>
                              <td className="w-[50%] py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                संवर्ग: <b className="text-black font-black text-[10px]">{student.caste || "ओपन"}</b>
                              </td>
                            </tr>
                            <tr className="border-b border-orange-200 bg-orange-50/20">
                              <td colSpan={2} className="py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                पत्ता: <b className="text-black font-black text-[10px]">{student.address || schoolData.address || "-"}</b>
                              </td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="py-0.2 px-1 font-black text-slate-800 text-[10px]">
                                संपर्क: <b className="text-black font-black text-[10px]">{student.mobile || "-"}</b>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Attendance Table & Shreni Takta Side-by-Side */}
                    <div className="grid grid-cols-12 gap-2 my-0.5">
                      {/* Attendance Table */}
                      <div className="col-span-7 border border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[10.5px] font-black text-orange-950 text-center bg-orange-100/90 py-0.2 border-b border-orange-400">
                          उपस्थिती
                        </h4>
                        <table className="w-full text-center text-[10px] border-collapse border border-orange-300">
                          <thead>
                            <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-300 text-[10px] h-[15px]">
                              <th className="border border-orange-300 px-0.5 py-0 w-[34%]">महिना</th>
                              <th className="border border-orange-300 px-0.5 py-0 w-[33%]">कामाचे दिवस</th>
                              <th className="border border-orange-300 px-0.5 py-0 w-[33%]">हजर दिवस</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthsList.map((m) => {
                              const workingDays = getWorkingDaysForMonth(student, m);
                              const pres = getStudentPresentDays(student, m);
                              return (
                                <tr key={m.key} className="border-b border-orange-200 h-[12.5px]">
                                  <td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900 bg-orange-50/40 text-[10px]">{m.label}</td>
                                  <td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900 text-[10px]">{workingDays}</td>
                                  <td className="border border-orange-300 px-0.5 py-0 font-black text-blue-950 text-[10.5px]">{pres}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Shreni Takta Table */}
                      <div className="col-span-5 border border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[10.5px] font-black text-orange-950 text-center bg-orange-100/90 py-0.2 border-b border-orange-400">
                          श्रेणी तक्ता
                        </h4>
                        <table className="w-full text-center text-[10px] border-collapse border border-orange-300">
                          <thead>
                            <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-300 text-[10px] h-[15px]">
                              <th className="border border-orange-300 px-0.5 py-0 w-[65%]">गुणांचे वर्गीकरण</th>
                              <th className="border border-orange-300 px-0.5 py-0 w-[35%]">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">91% ते 100%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">अ-1</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">81% ते 90%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">अ-2</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">71% ते 80%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">ब-1</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">61% ते 70%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">ब-2</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">51% ते 60%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">क-1</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">41% ते 50%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">क-2</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">33% ते 40%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">ड</td></tr>
                            <tr className="border-b border-orange-200 h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">21% ते 32%</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">इ-1</td></tr>
                            <tr className="h-[12.5px]"><td className="border border-orange-300 px-0.5 py-0 font-black text-slate-900">20% व कमी</td><td className="border border-orange-300 px-0.5 py-0 font-black text-blue-900 text-[10.5px]">इ-2</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: First Semester & Second Semester Subject Grades & Remarks */}
                <div className="col-span-6 pl-2 flex flex-col justify-between h-full space-y-1">
                  {/* Student Header Bar */}
                  <div className="flex items-center justify-between border-b-2 border-orange-400 pb-0.5 text-[10.5px] font-black text-slate-900 bg-amber-50/80 py-0.3 px-1.5 rounded-xl border border-orange-300 shrink-0">
                    <div>
                      विद्यार्थ्याचे नाव: <span className="font-black text-blue-950 text-[12.5px]">{student.fullName || student.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10.5px]">
                      <span>इयत्ता: <b className="font-black">{getMarathiClassName(selectedClass)}</b></span>
                      <span>तुकडी: <b className="font-black">{division}</b></span>
                      <span>हजेरी क्र.: <b className="font-black">{student.rollNo || idx + 1}</b></span>
                    </div>
                  </div>

                  {/* Stacked Term 1 & Term 2 Vertically */}
                  <div className="flex flex-col justify-between space-y-1 flex-1">
                    {/* Term 1 - TOP */}
                    <div className="flex flex-col border border-orange-400 rounded-lg overflow-hidden bg-white">
                      <h3 className="text-[11px] font-black text-orange-950 text-center py-0.1 border-b border-orange-400 bg-orange-100/90 shrink-0">
                        प्रथम सत्र
                      </h3>
                      <table className="w-full border-collapse text-[10px] text-center font-medium">
                        <thead>
                          <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-400 text-[10.5px] h-[15px]">
                            <th className="border border-orange-300 p-0.1 text-left w-[35%]">विषय</th>
                            <th className="border border-orange-300 p-0.1 w-[15%]">श्रेणी</th>
                            <th className="border border-orange-300 p-0.1 w-[50%]">वर्णनात्मक नोंदी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((subName, sIdx) => {
                            const sem1Grade = getSubjectGradeForTerm(student, subName, "sem1");
                            return (
                              <tr key={subName} className="border-b border-orange-200 h-[13.5px]">
                                <td className="border border-orange-300 p-0.1 text-left font-black text-slate-950 bg-orange-50/20 text-[10px] pl-0.5">
                                  {subName}
                                </td>
                                <td className="border border-orange-300 p-0.1 font-black text-blue-950 text-[11.5px]">
                                  {sem1Grade}
                                </td>
                                {sIdx === 0 && (
                                  <td rowSpan={2} className="border border-orange-300 p-0.1 text-left align-top bg-orange-50/10 w-[50%]">
                                    <span className="font-black text-orange-950 block text-center mb-0.1 border-b border-orange-200 text-[9.5px]">विशेष प्रगती</span>
                                    <p className="text-slate-950 leading-tight font-black px-0.5 text-[8.5px]">
                                      {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                    </p>
                                  </td>
                                )}
                                {sIdx === 2 && (
                                  <td rowSpan={2} className="border border-orange-300 p-0.1 text-left align-top bg-orange-50/10 w-[50%]">
                                    <span className="font-black text-orange-950 block text-center mb-0.1 border-b border-orange-200 text-[9.5px]">आवड / छंद</span>
                                    <p className="text-slate-950 leading-tight font-black px-0.5 text-[8.5px]">
                                      {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                    </p>
                                  </td>
                                )}
                                {sIdx === 4 && (
                                  <td rowSpan={2} className="border border-orange-300 p-0.1 text-left align-top bg-orange-50/10 w-[50%]">
                                    <span className="font-black text-orange-950 block text-center mb-0.1 border-b border-orange-200 text-[9.5px]">सुधारणा आवश्यक</span>
                                    <p className="text-slate-950 leading-tight font-black px-0.5 text-[8.5px]">
                                      {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                    </p>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Term 2 - BOTTOM */}
                    <div className="flex flex-col border border-orange-400 rounded-lg overflow-hidden bg-white">
                      <h3 className="text-[11px] font-black text-orange-950 text-center py-0.1 border-b border-orange-400 bg-orange-100/90 shrink-0">
                        द्वितीय सत्र
                      </h3>
                      <table className="w-full border-collapse text-[10px] text-center font-medium">
                        <thead>
                          <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-400 text-[10.5px] h-[15px]">
                            <th className="border border-orange-300 p-0.1 text-left w-[35%]">विषय</th>
                            <th className="border border-orange-300 p-0.1 w-[15%]">श्रेणी</th>
                            <th className="border border-orange-300 p-0.1 w-[50%]">वर्णनात्मक नोंदी</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.map((subName, sIdx) => {
                            const sem2Grade = getSubjectGradeForTerm(student, subName, "sem2");
                            return (
                              <tr key={subName} className="border-b border-orange-200 h-[13.5px]">
                                <td className="border border-orange-300 p-0.1 text-left font-black text-slate-950 bg-orange-50/20 text-[10px] pl-0.5">
                                  {subName}
                                </td>
                                <td className="border border-orange-300 p-0.1 font-black text-blue-950 text-[11.5px]">
                                  {sem2Grade}
                                </td>
                                {sIdx === 0 && (
                                  <td rowSpan={2} className="border border-orange-300 p-0.1 text-left align-top bg-orange-50/10 w-[50%]">
                                    <span className="font-black text-orange-950 block text-center mb-0.1 border-b border-orange-200 text-[9.5px]">विशेष प्रगती</span>
                                    <p className="text-slate-950 leading-tight font-black px-0.5 text-[8.5px]">
                                      {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                    </p>
                                  </td>
                                )}
                                {sIdx === 2 && (
                                  <td rowSpan={2} className="border border-orange-300 p-0.1 text-left align-top bg-orange-50/10 w-[50%]">
                                    <span className="font-black text-orange-950 block text-center mb-0.1 border-b border-orange-200 text-[9.5px]">आवड / छंद</span>
                                    <p className="text-slate-950 leading-tight font-black px-0.5 text-[8.5px]">
                                      {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                    </p>
                                  </td>
                                )}
                                {sIdx === 4 && (
                                  <td rowSpan={2} className="border border-orange-300 p-0.1 text-left align-top bg-orange-50/10 w-[50%]">
                                    <span className="font-black text-orange-950 block text-center mb-0.1 border-b border-orange-200 text-[9.5px]">सुधारणा आवश्यक</span>
                                    <p className="text-slate-950 leading-tight font-black px-0.5 text-[8.5px]">
                                      {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                    </p>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Signatures Footer */}
                    <div className="flex items-center justify-between border border-orange-400 py-1 text-[9px] font-bold text-slate-900 shrink-0 bg-orange-50/40 px-3 rounded-lg mt-auto">
                      <div className="text-center min-w-[95px]">
                        <div className="h-[28px] flex items-end justify-center pb-0.5 font-black text-slate-950 text-[10px]">
                          {schoolData.teacherName || ""}
                        </div>
                        <p className="text-[8.5px] text-slate-900 font-black border-t border-slate-400 pt-0.5">वर्गशिक्षक स्वाक्षरी</p>
                      </div>
                      <div className="text-center min-w-[95px]">
                        <div className="h-[28px] flex items-end justify-center pb-0.5 font-black text-slate-950 text-[10px]">
                          {schoolData.headmasterName || ""}
                        </div>
                        <p className="text-[8.5px] text-slate-900 font-black border-t border-slate-400 pt-0.5">मुख्याध्यापक स्वाक्षरी</p>
                      </div>
                      <div className="text-center min-w-[95px]">
                        <div className="h-[28px]"></div>
                        <p className="text-[8.5px] text-slate-900 font-black border-t border-slate-400 pt-0.5">पालक स्वाक्षरी</p>
                      </div>
                    </div>
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
                        <h4 className="text-[11px] font-black text-orange-950 text-center bg-orange-100/90 py-0.5 border-b border-orange-400">
                          उपस्थिती
                        </h4>
                        <table className="w-full text-center text-[11px] border-collapse border border-orange-300">
                          <thead>
                            <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-300 text-[11px] h-[18px]">
                              <th className="border border-orange-300 px-1 py-0.5 w-[34%]">महिना</th>
                              <th className="border border-orange-300 px-1 py-0.5 w-[33%]">कामाचे दिवस</th>
                              <th className="border border-orange-300 px-1 py-0.5 w-[33%]">हजर दिवस</th>
                            </tr>
                          </thead>
                          <tbody>
                            {monthsList.map((m) => {
                              const workingDays = getWorkingDaysForMonth(student, m);
                              const pres = getStudentPresentDays(student, m);
                              return (
                                <tr key={m.key} className="border-b border-orange-200 h-[14px]">
                                  <td className="border border-orange-300 px-1 py-0 font-bold text-slate-900 bg-orange-50/40 text-[11px]">{m.label}</td>
                                  <td className="border border-orange-300 px-1 py-0 font-bold text-slate-900 text-[11px]">{workingDays}</td>
                                  <td className="border border-orange-300 px-1 py-0 font-bold text-blue-950 text-[11.5px]">{pres}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="border-2 border-orange-400 rounded-xl overflow-hidden bg-white">
                        <h4 className="text-[11.5px] font-black text-orange-950 text-center bg-orange-100/90 py-0.5 border-b border-orange-400">
                          श्रेणी तक्ता
                        </h4>
                        <table className="w-full text-center text-[11px] border-collapse border border-orange-300">
                          <thead>
                            <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-300 text-[11px] h-[17px]">
                              <th className="border border-orange-300 px-1 py-0.5 w-[65%]">गुणांचे वर्गीकरण</th>
                              <th className="border border-orange-300 px-1 py-0.5 w-[35%]">श्रेणी</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">91% ते 100%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">अ-1</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">81% ते 90%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">अ-2</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">71% ते 80%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">ब-1</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">61% ते 70%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">ब-2</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">51% ते 60%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">क-1</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">41% ते 50%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">क-2</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">33% ते 40%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">ड</td></tr>
                            <tr className="border-b border-orange-200 h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">21% ते 32%</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">इ-1</td></tr>
                            <tr className="h-[13px]"><td className="border border-orange-300 px-1 py-0 font-bold text-slate-900">20% व त्यापेक्षा कमी</td><td className="border border-orange-300 px-1 py-0 font-bold text-blue-900 text-[11.5px]">इ-2</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="border border-orange-400 bg-amber-50/70 rounded-lg p-1 text-[11px] flex items-center justify-between font-black text-slate-900">
                        <span>शाळा भरण्याचा दिनांक: <b className="text-blue-950 font-black">15 Jun 2026</b></span>
                        <span>पुढील वर्षाची इयत्ता: <b className="text-emerald-700 font-black">{getNextClassName(selectedClass)}</b></span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-6 pl-1 flex flex-col justify-between h-full space-y-1.5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b-2 border-orange-400 pb-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 bg-orange-600 text-white rounded-lg flex items-center justify-center font-black text-[9px] shadow-sm shrink-0">
                            SS
                          </div>
                          <div>
                            <h3 className="text-[10.5px] font-black text-orange-700 tracking-wider uppercase">समग्र शिक्षा</h3>
                            <p className="text-[7.5px] text-slate-500 font-bold">Samagra Shiksha</p>
                          </div>
                        </div>
                        <div className="text-center bg-amber-50 px-2.5 py-0.5 rounded-xl border border-orange-300">
                          <h2 className="text-[12px] font-black text-amber-950 tracking-tight">
                            विद्यार्थी प्रगतीपत्रक सन {academicYear}
                          </h2>
                        </div>
                        <div className="w-9 h-9 rounded-full border-2 border-orange-500 overflow-hidden bg-orange-50 shrink-0 shadow-xs flex items-center justify-center">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="size-5 text-orange-400" />
                          )}
                        </div>
                      </div>
                      <div className="border-2 border-orange-400 rounded-xl p-2 bg-white space-y-1 text-[13px]">
                        <div className="flex items-center justify-between font-black text-slate-950 border-b border-orange-200 pb-1 text-[13.5px]">
                          <span>हजेरी क्र. : <b className="text-blue-950 font-black text-[14px]">{student.rollNo || idx + 1}</b></span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">शाळेचे नाव :</span>
                            <span className="font-black text-slate-900 text-[13px] truncate">{schoolData.schoolName || "-"}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5 bg-amber-50/60 px-1 py-0.5 rounded">
                            <span className="w-28 text-slate-700 font-extrabold shrink-0 text-[13px]">विद्यार्थ्याचे नाव:</span>
                            <span className="font-black text-blue-950 text-[15px] truncate">{student.fullName || student.name || "-"}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">जन्म दिनांक :</span>
                            <span className="font-black text-slate-900 text-[13px]">{formatDob(student.dob)}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">इयत्ता:</span>
                            <span className="font-black text-slate-950 text-[13px]">{getMarathiClassName(selectedClass)} | तुकडी: {division} | रजि. क्र. : {student.grNo || student.rollNo || "-"}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">पेन नं. :</span>
                            <span className="font-black text-blue-950 text-[13px]">{student.penNo || student.id || "-"}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">वडिलांचे नाव :</span>
                            <span className="font-bold text-slate-900 text-[13px] truncate">{student.fatherName || "-"}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">आईचे नाव :</span>
                            <span className="font-bold text-slate-900 text-[13px] truncate">{student.motherName || "-"}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">मातृभाषा:</span>
                            <span className="font-black text-slate-900 text-[13px]">{student.motherTongue || "मराठी"}</span>
                            <span className="ml-4 text-slate-600 font-extrabold text-[12.5px]">माध्यम:</span>
                            <span className="font-black text-slate-900 text-[13px] ml-1">{selectedMedium}</span>
                          </div>
                          <div className="flex border-b border-slate-100 pb-0.5">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">धर्म/ जात:</span>
                            <span className="font-black text-slate-900 text-[13px]">{student.religion || "हिंदू"}</span>
                          </div>
                          <div className="flex">
                            <span className="w-28 text-slate-600 font-extrabold shrink-0 text-[12.5px]">पत्ता:</span>
                            <span className="font-bold text-slate-900 text-[13px] truncate">{student.address || schoolData.address || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border border-orange-300 bg-orange-50/30 rounded-lg p-1 text-[11.5px] font-bold text-slate-800 flex items-center justify-between">
                        <span>संपर्क: <b className="text-slate-950 font-black">{student.mobile || student.phone || "-"}</b></span>
                      </div>
                      <div className="border border-orange-400 bg-orange-50/40 rounded-lg p-1 text-[11.5px] flex items-center justify-between font-black text-slate-900">
                        <span>वजन: <b className="text-blue-950 font-black">- किलो</b></span>
                        <span className="text-orange-950 font-black">आरोग्य विषयक माहिती</span>
                        <span>उंची: <b className="text-blue-950 font-black">- सेमी</b></span>
                      </div>
                    </div>
                  </div>
                </div>
              );

              const page2Inner = (
                <>
                  <div className="flex items-center justify-between border-b-2 border-orange-400 pb-1 mb-2 text-[11.5px] font-black text-slate-900 bg-amber-50/80 py-1 px-3 rounded-xl border border-orange-300 shrink-0">
                    <div>
                      विद्यार्थ्याचे नाव: <span className="font-black text-blue-950 text-[14px]">{student.fullName || student.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11.5px]">
                      <span>इयत्ता: <b className="font-black">{getMarathiClassName(selectedClass)}</b></span>
                      <span>तुकडी: <b className="font-black">{division}</b></span>
                      <span>हजेरी क्र.: <b className="font-black">{student.rollNo || idx + 1}</b></span>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-3 flex-1 h-full w-full overflow-hidden">
                    <div className="col-span-6 border-r-2 border-orange-400 border-dashed pr-3 flex flex-col justify-between h-full space-y-1.5 overflow-hidden">
                      <div className="flex flex-col border-2 border-orange-400 rounded-xl overflow-hidden bg-white flex-1 h-full">
                        <h3 className="text-[13px] font-black text-orange-950 text-center py-1 border-b-2 border-orange-400 bg-orange-100/90 shrink-0">
                          प्रथम सत्र
                        </h3>
                        <table className="w-full h-full border-collapse text-[11.5px] text-center font-medium flex-1">
                          <thead>
                            <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-400 text-[12px] h-[22px]">
                              <th className="border border-orange-300 p-0.5 text-left w-[35%] pl-1.5">विषय</th>
                              <th className="border border-orange-300 p-0.5 w-[15%]">श्रेणी</th>
                              <th className="border border-orange-300 p-0.5 w-[50%]">वर्णनात्मक नोंदी</th>
                            </tr>
                          </thead>
                          <tbody className="h-full">
                            {subjects.map((subName, sIdx) => {
                              const sem1Grade = getSubjectGradeForTerm(student, subName, "sem1");
                              return (
                                <tr key={subName} className="border-b border-orange-200">
                                  <td className="border border-orange-300 p-1 text-left font-black text-slate-950 bg-orange-50/20 text-[12px] pl-1.5 align-middle">
                                    {subName}
                                  </td>
                                  <td className="border border-orange-300 p-1 font-black text-blue-950 text-[13.5px] align-middle">
                                    {sem1Grade}
                                  </td>
                                  {sIdx === 0 && (
                                    <td rowSpan={2} className="border border-orange-300 p-1 text-left align-top bg-orange-50/10 w-[50%]">
                                      <span className="font-black text-orange-950 block text-center mb-0.5 border-b border-orange-200 text-[11.5px]">विशेष प्रगती</span>
                                      <p className="text-slate-950 leading-snug font-black px-1 text-[10.5px]">
                                        {getFormattedRemark(student, "विशेष प्रगती", "sem1")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === 2 && (
                                    <td rowSpan={2} className="border border-orange-300 p-1 text-left align-top bg-orange-50/10 w-[50%]">
                                      <span className="font-black text-orange-950 block text-center mb-0.5 border-b border-orange-200 text-[11.5px]">आवड / छंद</span>
                                      <p className="text-slate-950 leading-snug font-black px-1 text-[10.5px]">
                                        {getFormattedRemark(student, "आवड / छंद", "sem1")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === 4 && (
                                    <td rowSpan={2} className="border border-orange-300 p-1 text-left align-top bg-orange-50/10 w-[50%]">
                                      <span className="font-black text-orange-950 block text-center mb-0.5 border-b border-orange-200 text-[11.5px]">सुधारणा आवश्यक</span>
                                      <p className="text-slate-950 leading-snug font-black px-1 text-[10.5px]">
                                        {getFormattedRemark(student, "सुधारणा आवश्यक", "sem1")}
                                      </p>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-end justify-between border border-orange-400 pt-2 pb-1 text-[9.5px] font-bold text-slate-900 shrink-0 bg-orange-50/30 px-3 rounded-lg">
                        <div className="text-center min-w-[90px]">
                          <div className="h-[34px] flex items-end justify-center font-black text-slate-950 text-[11px] pb-1">
                            {schoolData.teacherName || ""}
                          </div>
                          <p className="text-[9.5px] text-slate-900 font-black border-t border-slate-500 pt-0.5">वर्गशिक्षक स्वाक्षरी</p>
                        </div>
                        <div className="text-center min-w-[90px]">
                          <div className="h-[34px] flex items-end justify-center font-black text-slate-950 text-[11px] pb-1">
                            {schoolData.headmasterName || ""}
                          </div>
                          <p className="text-[9.5px] text-slate-900 font-black border-t border-slate-500 pt-0.5">मुख्याध्यापक स्वाक्षरी</p>
                        </div>
                        <div className="text-center min-w-[90px]">
                          <div className="h-[34px]"></div>
                          <p className="text-[9.5px] text-slate-900 font-black border-t border-slate-500 pt-0.5">पालक स्वाक्षरी</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-6 pl-1 flex flex-col justify-between h-full space-y-1.5 overflow-hidden">
                      <div className="flex flex-col border-2 border-orange-400 rounded-xl overflow-hidden bg-white flex-1 h-full">
                        <h3 className="text-[13px] font-black text-orange-950 text-center py-1 border-b-2 border-orange-400 bg-orange-100/90 shrink-0">
                          द्वितीय सत्र
                        </h3>
                        <table className="w-full h-full border-collapse text-[11.5px] text-center font-medium flex-1">
                          <thead>
                            <tr className="bg-amber-100/90 font-black text-amber-950 border-b border-orange-400 text-[12px] h-[22px]">
                              <th className="border border-orange-300 p-0.5 text-left w-[35%] pl-1.5">विषय</th>
                              <th className="border border-orange-300 p-0.5 w-[15%]">श्रेणी</th>
                              <th className="border border-orange-300 p-0.5 w-[50%]">वर्णनात्मक नोंदी</th>
                            </tr>
                          </thead>
                          <tbody className="h-full">
                            {subjects.map((subName, sIdx) => {
                              const sem2Grade = getSubjectGradeForTerm(student, subName, "sem2");
                              return (
                                <tr key={subName} className="border-b border-orange-200">
                                  <td className="border border-orange-300 p-1 text-left font-black text-slate-950 bg-orange-50/20 text-[12px] pl-1.5 align-middle">
                                    {subName}
                                  </td>
                                  <td className="border border-orange-300 p-1 font-black text-blue-950 text-[13.5px] align-middle">
                                    {sem2Grade}
                                  </td>
                                  {sIdx === 0 && (
                                    <td rowSpan={2} className="border border-orange-300 p-1 text-left align-top bg-orange-50/10 w-[50%]">
                                      <span className="font-black text-orange-950 block text-center mb-0.5 border-b border-orange-200 text-[11.5px]">विशेष प्रगती</span>
                                      <p className="text-slate-950 leading-snug font-black px-1 text-[10.5px]">
                                        {getFormattedRemark(student, "विशेष प्रगती", "sem2")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === 2 && (
                                    <td rowSpan={2} className="border border-orange-300 p-1 text-left align-top bg-orange-50/10 w-[50%]">
                                      <span className="font-black text-orange-950 block text-center mb-0.5 border-b border-orange-200 text-[11.5px]">आवड / छंद</span>
                                      <p className="text-slate-950 leading-snug font-black px-1 text-[10.5px]">
                                        {getFormattedRemark(student, "आवड / छंद", "sem2")}
                                      </p>
                                    </td>
                                  )}
                                  {sIdx === 4 && (
                                    <td rowSpan={2} className="border border-orange-300 p-1 text-left align-top bg-orange-50/10 w-[50%]">
                                      <span className="font-black text-orange-950 block text-center mb-0.5 border-b border-orange-200 text-[11.5px]">सुधारणा आवश्यक</span>
                                      <p className="text-slate-950 leading-snug font-black px-1 text-[10.5px]">
                                        {getFormattedRemark(student, "सुधारणा आवश्यक", "sem2")}
                                      </p>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Second Term Signatures Footer */}
                      <div className="flex items-end justify-between border border-orange-400 pt-2 pb-1 text-[9.5px] font-bold text-slate-900 shrink-0 bg-orange-50/30 px-3 rounded-lg">
                        <div className="text-center min-w-[90px]">
                          <div className="h-[34px] flex items-end justify-center font-black text-slate-950 text-[10.5px] pb-1">
                            {schoolData.teacherName || ""}
                          </div>
                          <p className="text-[9px] text-slate-900 font-black border-t border-slate-500 pt-0.5">वर्गशिक्षक स्वाक्षरी</p>
                        </div>
                        <div className="text-center min-w-[90px]">
                          <div className="h-[34px] flex items-end justify-center font-black text-slate-950 text-[10.5px] pb-1">
                            {schoolData.headmasterName || ""}
                          </div>
                          <p className="text-[9px] text-slate-900 font-black border-t border-slate-500 pt-0.5">मुख्याध्यापक स्वाक्षरी</p>
                        </div>
                        <div className="text-center min-w-[90px]">
                          <div className="h-[34px]"></div>
                          <p className="text-[9px] text-slate-900 font-black border-t border-slate-500 pt-0.5">पालक स्वाक्षरी</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );

              return (
                <>
                  {/* PAGE 1 */}
                  {layoutMode === "portrait" ? (
                    <div
                      className="pdf-page bg-white relative w-[210mm] max-w-[210mm] min-w-[210mm] h-[297mm] max-h-[297mm] min-h-[297mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none box-border border-2 border-orange-500 rounded-xl flex items-center justify-center p-0"
                      style={{
                        pageBreakAfter: "always",
                        breakAfter: "page",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                        fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
                      }}
                    >
                      <div
                        className="w-[297mm] h-[207mm] max-w-[297mm] max-h-[207mm] bg-white p-2 box-border flex flex-col justify-between shrink-0"
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
                      className="pdf-page bg-white relative w-[297mm] max-w-[297mm] min-w-[297mm] h-[207mm] max-h-[207mm] min-h-[207mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none p-4 box-border border-2 border-orange-500 rounded-xl"
                      style={{
                        pageBreakAfter: "always",
                        breakAfter: "page",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                        fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
                      }}
                    >
                      {page1Inner}
                    </div>
                  )}

                  {/* PAGE 2 */}
                  {layoutMode === "portrait" ? (
                    <div
                      className="pdf-page bg-white relative w-[210mm] max-w-[210mm] min-w-[210mm] h-[297mm] max-h-[297mm] min-h-[297mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none box-border border-2 border-orange-500 rounded-xl flex items-center justify-center p-0"
                      style={{
                        pageBreakAfter: isLastStudent ? "avoid" : "always",
                        breakAfter: isLastStudent ? "avoid" : "page",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                        fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
                      }}
                    >
                      <div
                        className="w-[297mm] h-[207mm] max-w-[297mm] max-h-[207mm] bg-white p-2 box-border flex flex-col justify-between shrink-0"
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
                      className="pdf-page bg-white relative w-[297mm] max-w-[297mm] min-w-[297mm] h-[207mm] max-h-[207mm] min-h-[207mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none p-4 box-border border-2 border-orange-500 rounded-xl flex flex-col justify-between"
                      style={{
                        pageBreakAfter: isLastStudent ? "avoid" : "always",
                        breakAfter: isLastStudent ? "avoid" : "page",
                        pageBreakInside: "avoid",
                        breakInside: "avoid",
                        fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
                      }}
                    >
                      {page2Inner}
                    </div>
                  )}
                </>
              );
            };

            return (
              <React.Fragment key={student.id || idx}>
                {pageMode === "2pages" ? (
                  renderTwoPageProgressSheet()
                ) : layoutMode === "portrait" ? (
                  /* ROTATED PORTRAIT BOOKLET (A4 210mm x 297mm ROTATED FOR PORTRAIT PDF) */
                  <div
                    className="pdf-page bg-white relative w-[210mm] max-w-[210mm] min-w-[210mm] h-[297mm] max-h-[297mm] min-h-[297mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none box-border border-2 border-orange-500 rounded-xl flex items-center justify-center p-0"
                    style={{
                      pageBreakAfter: isLastStudent ? "avoid" : "always",
                      breakAfter: isLastStudent ? "avoid" : "page",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                      fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
                    }}
                  >
                    <div
                      className="w-[297mm] h-[207mm] max-w-[297mm] max-h-[207mm] bg-white p-2 box-border flex flex-col justify-between shrink-0"
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
                    className="pdf-page bg-white relative w-[297mm] max-w-[297mm] min-w-[297mm] h-[207mm] max-h-[207mm] min-h-[207mm] mx-auto overflow-hidden mb-8 print:mb-0 shadow-md print:shadow-none p-2 box-border border-2 border-orange-500 rounded-xl flex flex-col justify-between"
                    style={{
                      pageBreakAfter: isLastStudent ? "avoid" : "always",
                      breakAfter: isLastStudent ? "avoid" : "page",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                      fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif",
                    }}
                  >
                    {renderSinglePageProgressSheet()}
                  </div>
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
