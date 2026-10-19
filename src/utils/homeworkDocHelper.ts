/**
 * Helper to identify whether a homework item is a Word (.docx / .doc) document
 */
export const isWordHomework = (item: any): boolean => {
  if (!item) return false;
  if (item.wordFileUrl) return true;
  if (item.documentType === "docx" || item.documentType === "word") return true;
  const lowerUrl = (item.fileUrl || "").toLowerCase();
  const lowerName = (item.fileName || "").toLowerCase();
  const lowerWordName = (item.wordFileName || "").toLowerCase();
  return (
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc") ||
    lowerWordName.endsWith(".docx") ||
    lowerWordName.endsWith(".doc") ||
    lowerUrl.includes(".docx") ||
    lowerUrl.includes(".doc")
  );
};

export interface HomeworkHeaderProfile {
  schoolName: string;
  kendra: string;
  taluka: string;
  district: string;
  teacherName: string;
  headmasterName: string;
}

export const getHomeworkHeaderProfile = (userId?: string): HomeworkHeaderProfile => {
  const uKey = userId || "guest";
  if (typeof window === "undefined") {
    return {
      schoolName: "",
      kendra: "",
      taluka: "",
      district: "",
      teacherName: "",
      headmasterName: "",
    };
  }

  const getVal = (prefix: string): string => {
    const directUser = localStorage.getItem(`${prefix}_${uKey}`);
    if (directUser && directUser.trim()) return directUser.trim();

    const globalVal = localStorage.getItem(prefix);
    if (globalVal && globalVal.trim()) return globalVal.trim();

    const guestVal = localStorage.getItem(`${prefix}_guest`);
    if (guestVal && guestVal.trim()) return guestVal.trim();

    const guestTeacherVal = localStorage.getItem(`${prefix}_guest_teacher`);
    if (guestTeacherVal && guestTeacherVal.trim()) return guestTeacherVal.trim();

    return "";
  };

  let schoolName =
    getVal("hw_v2_school") ||
    getVal("user_school_name") ||
    "";
  let kendra = getVal("hw_v2_kendra");
  let taluka = getVal("hw_v2_taluka");
  let district = getVal("hw_v2_district");
  let teacherName = getVal("hw_v2_teacher");
  let headmasterName = getVal("hw_v2_headmaster");

  // If blank in hw_v2_*, fall back to sqaaf_teacher_profile
  if (!schoolName || !teacherName) {
    try {
      const sqaaf = localStorage.getItem("sqaaf_teacher_profile");
      if (sqaaf) {
        const p = JSON.parse(sqaaf);
        if (!schoolName && p.schoolName) schoolName = p.schoolName.trim();
        if (!kendra && p.kendra) kendra = p.kendra.trim();
        if (!taluka && p.taluka) taluka = p.taluka.trim();
        if (!district && p.district) district = p.district.trim();
        if (!teacherName && p.fullName) teacherName = p.fullName.trim();
        if (!headmasterName && p.headmasterName) headmasterName = p.headmasterName.trim();
      }
    } catch {}
  }

  return {
    schoolName,
    kendra,
    taluka,
    district,
    teacherName,
    headmasterName,
  };
};

export const saveHomeworkHeaderProfile = (
  userId: string | undefined,
  profile: Partial<HomeworkHeaderProfile>
) => {
  if (typeof window === "undefined") return;
  const uKey = userId || "guest";
  localStorage.setItem(`hw_profile_v2_saved_${uKey}`, "true");
  localStorage.setItem("hw_profile_v2_saved", "true");

  const saveMulti = (prefix: string, val?: string) => {
    const clean = val?.trim();
    if (clean) {
      localStorage.setItem(`${prefix}_${uKey}`, clean);
      localStorage.setItem(prefix, clean);
      localStorage.setItem(`${prefix}_guest`, clean);
      localStorage.setItem(`${prefix}_guest_teacher`, clean);
    } else {
      localStorage.removeItem(`${prefix}_${uKey}`);
    }
  };

  saveMulti("hw_v2_school", profile.schoolName);
  if (profile.schoolName?.trim()) {
    saveMulti("user_school_name", profile.schoolName);
  }

  saveMulti("hw_v2_kendra", profile.kendra);
  saveMulti("hw_v2_taluka", profile.taluka);
  saveMulti("hw_v2_district", profile.district);
  saveMulti("hw_v2_teacher", profile.teacherName);
  saveMulti("hw_v2_headmaster", profile.headmasterName);
};

export const formatHomeworkDateToMarathi = (
  dateInput?: string
): { dayOfWeek: string; dateStr: string } => {
  const marathiDays = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
  const marathiMonths = [
    "जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून",
    "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"
  ];

  let d = new Date();
  if (dateInput) {
    const clean = dateInput.trim();
    if (clean.includes("-") || clean.includes("/")) {
      const parts = clean.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          d = new Date(y, m, day);
        } else {
          // DD-MM-YYYY
          const day = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          d = new Date(y, m, day);
        }
      }
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    }
  }

  const dayOfWeek = marathiDays[d.getDay()] || "शुक्रवार";
  const dateStr = `${d.getDate()} ${marathiMonths[d.getMonth()] || "ऑक्टोबर"} ${d.getFullYear()}`;
  return { dayOfWeek, dateStr };
};

export const getMarathiClassLabel = (cls?: string): string => {
  if (!cls) return "१ ली";
  const c = cls.trim().toLowerCase();
  if (c.includes("1st") || c.includes("1 ली") || c === "1" || c.includes("पहिली") || c.includes("first")) return "१ ली";
  if (c.includes("2nd") || c.includes("2 री") || c === "2" || c.includes("दुसरी") || c.includes("second")) return "२ री";
  if (c.includes("3rd") || c.includes("3 री") || c === "3" || c.includes("तिसरी") || c.includes("third")) return "३ री";
  if (c.includes("4th") || c.includes("4 थी") || c === "4" || c.includes("चौथी") || c.includes("fourth")) return "४ थी";
  if (c.includes("5th") || c.includes("5 वी") || c === "5" || c.includes("पाचवी") || c.includes("fifth")) return "५ वी";
  if (c.includes("6th") || c.includes("6 वी") || c === "6" || c.includes("सहावी") || c.includes("sixth")) return "६ वी";
  if (c.includes("7th") || c.includes("7 वी") || c === "7" || c.includes("सातवी") || c.includes("seventh")) return "७ वी";
  if (c.includes("8th") || c.includes("8 वी") || c === "8" || c.includes("आठवी") || c.includes("eighth")) return "८ वी";
  return cls;
};

/**
 * Generates a clean, WhatsApp-compatible ASCII filename in the exact requested format:
 * "Class [X] Homework.pdf" (e.g. "Class 1st Homework.pdf")
 * This eliminates Unicode / Devanagari mojibake in WhatsApp and all OS file receivers.
 */
export const formatHomeworkFileName = (cls?: string): string => {
  let classLabel = "1st";
  if (cls) {
    const c = cls.trim().toLowerCase();
    if (c.includes("1st") || c.includes("1 ली") || c.includes("पहिली") || c.includes("first") || c === "1") {
      classLabel = "1st";
    } else if (c.includes("2nd") || c.includes("2 री") || c.includes("दुसरी") || c.includes("second") || c === "2") {
      classLabel = "2nd";
    } else if (c.includes("3rd") || c.includes("3 री") || c.includes("तिसरी") || c.includes("third") || c === "3") {
      classLabel = "3rd";
    } else if (c.includes("4th") || c.includes("4 थी") || c.includes("चौथी") || c.includes("fourth") || c === "4") {
      classLabel = "4th";
    } else if (c.includes("5th") || c.includes("5 वी") || c.includes("पाचवी") || c.includes("fifth") || c === "5") {
      classLabel = "5th";
    } else if (c.includes("6th") || c.includes("6 वी") || c.includes("सहावी") || c.includes("sixth") || c === "6") {
      classLabel = "6th";
    } else if (c.includes("7th") || c.includes("7 वी") || c.includes("सातवी") || c.includes("seventh") || c === "7") {
      classLabel = "7th";
    } else if (c.includes("8th") || c.includes("8 वी") || c.includes("आठवी") || c.includes("eighth") || c === "8") {
      classLabel = "8th";
    } else {
      const sanitized = cls.replace(/[^a-zA-Z0-9]/g, "");
      classLabel = sanitized || "1st";
    }
  }

  return `Class ${classLabel} Homework.pdf`;
};


