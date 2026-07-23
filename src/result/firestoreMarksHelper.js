import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { fetchJsonFromBunny, saveJsonToBunny } from "../lib/bunnyStorage";

/**
 * Fetch marks for a class & academicYear & term from Bunny Storage CDN (with Firestore fallback)
 */
export const fetchFirestoreMarks = async (selectedClass, academicYear, term = "first") => {
  const filePath = `cce_results/${selectedClass}_${academicYear}_marks_${term}.json`;
  
  // 1. Fetch from Bunny Storage CDN / Local Cache first
  try {
    const bunnyData = await fetchJsonFromBunny(filePath);
    if (bunnyData && Object.keys(bunnyData).length > 0) {
      return bunnyData;
    }
  } catch (e) {}

  // 2. Firestore fallback
  try {
    const docId = `${selectedClass}_${academicYear}`;
    const marksRef = doc(db, "cce_marks_v2", docId);
    const snap = await getDoc(marksRef);
    if (snap.exists()) {
      const data = snap.data();
      const termData = term === "first" || term === "semester1"
        ? (data.semester1 || data.term1 || data.data?.semester1 || data)
        : (data.semester2 || data.term2 || data.data?.semester2 || data);
      
      // Auto-migrate to Bunny Storage
      saveJsonToBunny(filePath, termData).catch(() => {});
      return termData;
    }
  } catch (err) {
    console.error("Error fetching marks:", err);
  }
  return {};
};

/**
 * Merge marks into student marks format
 */
export const matchAndMergeMarks = (students = [], currentMarks = {}, firestoreMarks = {}, subjects = []) => {
  const merged = { ...(currentMarks || {}) };
  
  (students || []).forEach(std => {
    if (!std) return;
    const stdId = std.id || std.rollNo || std.name;
    const stdFsMarks = firestoreMarks[stdId] || firestoreMarks[std.name] || firestoreMarks[std.rollNo] || {};
    
    if (!merged[stdId]) {
      merged[stdId] = {};
    }
    
    (subjects || []).forEach(sub => {
      if (stdFsMarks[sub]) {
        merged[stdId][sub] = {
          ...(merged[stdId][sub] || {}),
          ...stdFsMarks[sub],
        };
      }
    });
  });
  
  return merged;
};
