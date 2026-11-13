export const DEFAULT_MARATHI_SUBJECTS_MAP: Record<string, string[]> = {
  "1st": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "2nd": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "3rd": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "आपले संभोवतालचे जग",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "4th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "गणित",
    "आपले संभोवतालचे जग",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "5th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "परिसर अभ्यास",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "6th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "सामान्य विज्ञान",
    "सामाजिक शास्त्रे",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "7th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "सामान्य विज्ञान",
    "सामाजिक शास्त्रे",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "8th": [
    "प्रथम भाषा : मराठी",
    "द्वितीय भाषा : इंग्रजी",
    "तृतीय भाषा : हिंदी",
    "गणित",
    "सामान्य विज्ञान",
    "सामाजिक शास्त्रे",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
};

export const DEFAULT_SEMI_SUBJECTS_MAP: Record<string, string[]> = {
  "1st": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "2nd": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "3rd": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "आपले संभोवतालचे जग",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "4th": [
    "प्रथम भाषा : मराठी",
    "English",
    "Mathematics",
    "आपले संभोवतालचे जग",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "5th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "परिसर अभ्यास",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "6th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "General Science",
    "Social Sciences",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "7th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "General Science",
    "Social Sciences",
    "कलाशिक्षण",
    "कार्यशिक्षण",
    "शारीरिक शिक्षण",
  ],
  "8th": [
    "प्रथम भाषा : मराठी",
    "English",
    "हिंदी",
    "Mathematics",
    "General Science",
    "Social Sciences",
    "कलाशिक्षण",
    "कार्यशिक्षण",
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

  // Art aliases (कला, कलाशिक्षण, art)
  const isArt1 = s1.includes("कला") || s1.includes("art");
  const isArt2 = s2.includes("कला") || s2.includes("art");
  if (isArt1 && isArt2) return true;

  // Work Exp aliases (कार्यानुभव, कार्यशिक्षण, कार्य, work)
  const isWork1 = s1.includes("कार्य") || s1.includes("work");
  const isWork2 = s2.includes("कार्य") || s2.includes("work");
  if (isWork1 && isWork2) return true;

  // PE aliases
  const isPE1 = s1.includes("शारीरिक") || s1.includes("क्रीडा") || s1.includes("pe") || s1.includes("physical");
  const isPE2 = s2.includes("शारीरिक") || s2.includes("क्रीडा") || s2.includes("pe") || s2.includes("physical");
  if (isPE1 && isPE2) return true;

  // EVS aliases (परिसर अभ्यास, आपले संभोवतालचे जग, evs)
  const isEvs1 = s1.includes("परिसर") || s1.includes("संभोवतालचे") || s1.includes("evs") || s1.includes("environmental");
  const isEvs2 = s2.includes("परिसर") || s2.includes("संभोवतालचे") || s2.includes("evs") || s2.includes("environmental");
  if (isEvs1 && isEvs2) {
    const isP1_1 = s1.includes("१") || s1.includes("1") || s1.includes("भाग 1") || s1.includes("भाग १");
    const isP1_2 = s2.includes("१") || s2.includes("1") || s2.includes("भाग 1") || s2.includes("भाग १");
    const isP2_1 = s1.includes("२") || s1.includes("2") || s1.includes("भाग 2") || s1.includes("भाग २");
    const isP2_2 = s2.includes("२") || s2.includes("2") || s2.includes("भाग 2") || s2.includes("भाग २");
    if (isP1_1 || isP1_2 || isP2_1 || isP2_2) {
      return (isP1_1 && isP1_2) || (isP2_1 && isP2_2);
    }
    return true;
  }

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

export interface ClassSubjectConfigItem {
  key: string;
  label: string;
  icon: string;
  isCustom?: boolean;
}

const CO_CURRICULAR_SUBJECTS: ClassSubjectConfigItem[] = [
  { key: "visheshpragati", label: "विशेष प्रगती", icon: "🌟" },
  { key: "aavad", label: "आवडी-निवडी", icon: "💖" },
  { key: "sudharna", label: "सुधारणा आवश्यक", icon: "⚠️" },
  { key: "vyaktimatva", label: "व्यक्तिमत्त्व गुण", icon: "👤" },
];

/**
 * Map a CCE subject display name from cceSubjects.ts to its exact remark store key, label, and icon
 * matching CCERemarks.tsx (CCE Dashboard).
 */
function mapDefaultSubjectToConfig(subName: string, isSemi: boolean): ClassSubjectConfigItem | null {
  const s = subName.toLowerCase().trim();
  if (s.includes("प्रथम") || s.includes("मराठी")) {
    return { key: "prathambhasha", label: "प्रथम भाषा (मराठी)", icon: "📘" };
  }
  if (s.includes("द्वितीय") || s.includes("इंग्रजी") || s.includes("english")) {
    return {
      key: "dvitiybhasha",
      label: isSemi ? "English (द्वितीय भाषा)" : "द्वितीय भाषा (इंग्रजी)",
      icon: "🌐",
    };
  }
  if (s.includes("तृतीय") || s.includes("हिंदी") || s.includes("hindi")) {
    return {
      key: "tritiyabhasha",
      label: isSemi ? "हिंदी (तृतीय भाषा)" : "तृतीय भाषा (हिंदी)",
      icon: "🪔",
    };
  }
  if (s.includes("गणित") || s.includes("math") || s.includes("mathematics")) {
    return {
      key: "ganit",
      label: isSemi ? "Mathematics (गणित)" : "गणित",
      icon: "📐",
    };
  }
  if ((s.includes("परिसर") || s.includes("evs")) && (s.includes("१") || s.includes("1") || s.includes("भाग १") || s.includes("भाग 1"))) {
    return { key: "parisar1", label: "परिसर अभ्यास भाग १", icon: "🌱" };
  }
  if ((s.includes("परिसर") || s.includes("evs")) && (s.includes("२") || s.includes("2") || s.includes("भाग २") || s.includes("भाग 2"))) {
    return { key: "parisar2", label: "परिसर अभ्यास भाग २", icon: "🏛️" };
  }
  if (s.includes("परिसर") || s.includes("संभोवतालचे")) {
    return { key: "parisar", label: "परिसर अभ्यास", icon: "🌿" };
  }
  if (s.includes("सामान्य विज्ञान") || s.includes("विज्ञान") || s.includes("general science") || s.includes("science")) {
    return {
      key: "vijnan",
      label: isSemi ? "General Science (सामान्य विज्ञान)" : "सामान्य विज्ञान",
      icon: "🔬",
    };
  }
  if (s.includes("सामाजिक") || s.includes("social")) {
    return {
      key: "samajik_shastra",
      label: isSemi ? "Social Sciences (सामाजिक शास्त्रे)" : "सामाजिक शास्त्रे",
      icon: "🗺️",
    };
  }
  if (s.includes("कला") || s.includes("art")) {
    return { key: "kala", label: "कलाशिक्षण", icon: "🎨" };
  }
  if (s.includes("कार्य") || s.includes("work")) {
    return { key: "karyanubhav", label: "कार्यशिक्षण", icon: "🛠️" };
  }
  if (s.includes("शारीरिक") || s.includes("physical")) {
    return { key: "sharirik", label: "शारीरिक शिक्षण व आरोग्य", icon: "⚽" };
  }
  return null;
}

/**
 * Returns the exact list of CCE subject keys & labels for the given class and medium,
 * matching the CCE Dashboard (CCERemarks.tsx) class-by-class.
 */
export function getClassSpecificCCESubjects(
  selectedClass: string,
  medium: string = "marathi"
): ClassSubjectConfigItem[] {
  const isSemi =
    medium.toLowerCase().includes("semi") ||
    medium.toLowerCase().includes("सेमी") ||
    medium.toLowerCase() === "english";
  const map = isSemi ? DEFAULT_SEMI_SUBJECTS_MAP : DEFAULT_MARATHI_SUBJECTS_MAP;
  const effectiveClass = map[selectedClass] ? selectedClass : selectedClass === "9th" || selectedClass === "10th" ? "8th" : "1st";
  const rawNames = map[effectiveClass] || map["1st"];

  const result: ClassSubjectConfigItem[] = [];
  const seenKeys = new Set<string>();

  for (const name of rawNames) {
    const item = mapDefaultSubjectToConfig(name, isSemi);
    if (item && !seenKeys.has(item.key)) {
      seenKeys.add(item.key);
      result.push(item);
    }
  }

  for (const extra of CO_CURRICULAR_SUBJECTS) {
    if (!seenKeys.has(extra.key)) {
      seenKeys.add(extra.key);
      result.push(extra);
    }
  }

  return result;
}

