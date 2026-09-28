export const DEFAULT_MARATHI_SUBJECTS_MAP: Record<string, string[]> = {
  "1st": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "2nd": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "3rd": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "परिसर अभ्यास",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "4th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "परिसर अभ्यास",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "5th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "परिसर अभ्यास भाग १",
    "परिसर अभ्यास भाग २",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "6th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "परिसर अभ्यास भाग १",
    "परिसर अभ्यास भाग २",
    "सामान्य विज्ञान",
    "सामाजिक शास्त्रे",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "7th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "सामान्य विज्ञान",
    "सामाजिक शास्त्रे",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "8th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "सामान्य विज्ञान",
    "सामाजिक शास्त्रे",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
};

export const DEFAULT_SEMI_SUBJECTS_MAP: Record<string, string[]> = {
  "1st": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "2nd": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "3rd": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "परिसर अभ्यास",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "4th": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "परिसर अभ्यास",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "5th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "परिसर अभ्यास भाग १",
    "परिसर अभ्यास भाग २",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "6th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "परिसर अभ्यास भाग १",
    "परिसर अभ्यास भाग २",
    "General Science",
    "Social Sciences",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "7th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "General Science",
    "Social Sciences",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
  "8th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "General Science",
    "Social Sciences",
    "कला",
    "कार्यानुभव",
    "शारीरिक शिक्षण",
  ],
};

export function isRecordSemi(f: any): boolean {
  if (!f) return false;
  const m = (f.mediumId || f.medium || "").toString().trim().toLowerCase();
  if (m === "semi" || m.includes("semi") || m.includes("सेमी") || m === "english" || m === "en") return true;
  const idStr = (f.id || "").toString().toLowerCase();
  if (idStr.includes("_semi_") || idStr.startsWith("semi_") || idStr.includes("_semi")) return true;
  const fileStr = (f.fileName || "").toString().toLowerCase();
  if (fileStr.includes("semi") || fileStr.includes("सेमी")) return true;
  const urlStr = (f.fileUrl || "").toString().toLowerCase();
  if (urlStr.includes("/semi/") || urlStr.includes("_semi_") || urlStr.includes("-semi-")) return true;
  return false;
}

export function detectRecordMedium(f: any): "semi" | "marathi" {
  return isRecordSemi(f) ? "semi" : "marathi";
}

export function areSubjectsEquivalent(sub1: string, sub2: string): boolean {
  const s1 = (sub1 || "").trim().toLowerCase();
  const s2 = (sub2 || "").trim().toLowerCase();
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Math aliases
  const isMath1 = s1.includes("गणित") || s1.includes("math");
  const isMath2 = s2.includes("गणित") || s2.includes("math");
  if (isMath1 && isMath2) return true;

  // English aliases
  const isEng1 = s1.includes("इंग्रजी") || s1.includes("english");
  const isEng2 = s2.includes("इंग्रजी") || s2.includes("english");
  if (isEng1 && isEng2) return true;

  // Marathi aliases
  const isMr1 = s1.includes("मराठी") || s1.includes("marathi");
  const isMr2 = s2.includes("मराठी") || s2.includes("marathi");
  if (isMr1 && isMr2) return true;

  // Hindi aliases
  const isHi1 = s1.includes("हिंदी") || s1.includes("hindi");
  const isHi2 = s2.includes("हिंदी") || s2.includes("hindi");
  if (isHi1 && isHi2) return true;

  // Science aliases
  const isSci1 = s1.includes("विज्ञान") || s1.includes("science");
  const isSci2 = s2.includes("विज्ञान") || s2.includes("science");
  if (isSci1 && isSci2) return true;

  // Social Science aliases
  const isSS1 = s1.includes("सामाजिक") || s1.includes("इतिहास") || s1.includes("भूगोल") || s1.includes("social");
  const isSS2 = s2.includes("सामाजिक") || s2.includes("इतिहास") || s2.includes("भूगोल") || s2.includes("social");
  if (isSS1 && isSS2) return true;

  // Art aliases
  const isArt1 = s1.includes("कला") || s1.includes("art");
  const isArt2 = s2.includes("कला") || s2.includes("art");
  if (isArt1 && isArt2) return true;

  // Work Exp aliases
  const isWork1 = s1.includes("कार्य") || s1.includes("work");
  const isWork2 = s2.includes("कार्य") || s2.includes("work");
  if (isWork1 && isWork2) return true;

  // PE aliases
  const isPE1 = s1.includes("शारीरिक") || s1.includes("क्रीडा") || s1.includes("pe") || s1.includes("physical");
  const isPE2 = s2.includes("शारीरिक") || s2.includes("क्रीडा") || s2.includes("pe") || s2.includes("physical");
  if (isPE1 && isPE2) return true;

  return false;
}

export function getDefaultSubjectsForClass(selectedClass: string, medium?: string | any): string[] {
  let isSemi = false;
  if (medium && typeof medium === "string") {
    isSemi = medium.toLowerCase().includes("semi") || medium.toLowerCase().includes("सेमी") || medium.toLowerCase() === "english";
  } else if (medium && typeof medium === "object") {
    isSemi = isRecordSemi(medium);
  } else {
    try {
      const stored = localStorage.getItem("cce_selected_medium");
      if (stored) isSemi = stored === "semi";
    } catch (e) {}
  }
  const map = isSemi ? DEFAULT_SEMI_SUBJECTS_MAP : DEFAULT_MARATHI_SUBJECTS_MAP;
  return map[selectedClass] || map["1st"];
}

