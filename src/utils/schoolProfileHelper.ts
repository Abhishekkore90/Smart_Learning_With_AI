export interface UnifiedSchoolProfile {
  schoolName: string;
  udise: string;
  kendra: string;
  centerName: string;
  taluka: string;
  jilha: string;
  district: string;
  headmaster: string;
  teacherName: string;
  address: string;
  phone: string;
  logoUrl?: string;
}

/**
 * Reads unified school profile across MDM, SQAAF, Paripath and Profile keys.
 */
export const getUnifiedSchoolProfile = (): UnifiedSchoolProfile => {
  let profile: Partial<UnifiedSchoolProfile> = {};

  if (typeof window === "undefined") {
    return {
      schoolName: "",
      udise: "",
      kendra: "",
      centerName: "",
      taluka: "",
      jilha: "",
      district: "",
      headmaster: "",
      teacherName: "",
      address: "",
      phone: "",
    };
  }

  // 1. Check sqaaf_teacher_profile
  try {
    const sqaafRaw = localStorage.getItem("sqaaf_teacher_profile");
    if (sqaafRaw) {
      const parsed = JSON.parse(sqaafRaw);
      if (parsed) {
        profile.schoolName = parsed.schoolName || parsed.infoSchoolName || profile.schoolName;
        profile.udise = parsed.udise || parsed.infoUdise || profile.udise;
        profile.kendra = parsed.kendra || parsed.centerName || parsed.infoCenterName || profile.kendra;
        profile.taluka = parsed.taluka || parsed.infoTaluka || profile.taluka;
        profile.jilha = parsed.jilha || parsed.district || parsed.infoDistrict || profile.jilha;
        profile.headmaster = parsed.headmaster || parsed.infoHeadmaster || profile.headmaster;
        profile.teacherName = parsed.teacherName || parsed.fullName || profile.teacherName;
        profile.address = parsed.address || parsed.infoAddress || profile.address;
        profile.phone = parsed.phone || parsed.mobile || profile.phone;
      }
    }
  } catch (e) {}

  // 2. Check paripathSchoolInfo
  try {
    const paripathRaw = localStorage.getItem("paripathSchoolInfo");
    if (paripathRaw) {
      const parsed = JSON.parse(paripathRaw);
      if (parsed) {
        if (!profile.schoolName && parsed.schoolName) profile.schoolName = parsed.schoolName;
        if (!profile.udise && parsed.udise) profile.udise = parsed.udise;
        if (!profile.kendra && parsed.kendra) profile.kendra = parsed.kendra;
        if (!profile.taluka && parsed.taluka) profile.taluka = parsed.taluka;
        if (!profile.jilha && parsed.jilha) profile.jilha = parsed.jilha;
      }
    }
  } catch (e) {}

  // 3. Check simple localStorage fallbacks
  const fallbackSchoolName = localStorage.getItem("teacher_school_name");
  if (!profile.schoolName && fallbackSchoolName) profile.schoolName = fallbackSchoolName;

  const fallbackUdise = localStorage.getItem("teacher_udise");
  if (!profile.udise && fallbackUdise) profile.udise = fallbackUdise;

  // Normalize aliases
  const schoolName = profile.schoolName || "";
  const udise = profile.udise || "";
  const kendra = profile.kendra || profile.centerName || "";
  const taluka = profile.taluka || "";
  const jilha = profile.jilha || profile.district || "";
  const headmaster = profile.headmaster || "";
  const teacherName = profile.teacherName || "";
  const address = profile.address || "";
  const phone = profile.phone || "";

  return {
    schoolName,
    udise,
    kendra,
    centerName: kendra,
    taluka,
    jilha,
    district: jilha,
    headmaster,
    teacherName,
    address,
    phone,
  };
};

/**
 * Saves school profile to all storage keys simultaneously so MDM, Profile & Reports stay in sync.
 */
export const saveUnifiedSchoolProfile = (newProfile: Partial<UnifiedSchoolProfile>) => {
  if (typeof window === "undefined") return;

  const existing = getUnifiedSchoolProfile();
  const merged: UnifiedSchoolProfile = {
    ...existing,
    ...newProfile,
    centerName: newProfile.kendra || newProfile.centerName || existing.kendra,
    district: newProfile.jilha || newProfile.district || existing.jilha,
  };

  // Sync to sqaaf_teacher_profile
  try {
    const sqaafRaw = localStorage.getItem("sqaaf_teacher_profile");
    let sqaafObj = sqaafRaw ? JSON.parse(sqaafRaw) : {};
    sqaafObj = {
      ...sqaafObj,
      schoolName: merged.schoolName,
      udise: merged.udise,
      kendra: merged.kendra,
      centerName: merged.kendra,
      taluka: merged.taluka,
      jilha: merged.jilha,
      district: merged.jilha,
      headmaster: merged.headmaster,
      teacherName: merged.teacherName,
      address: merged.address,
      phone: merged.phone,
    };
    localStorage.setItem("sqaaf_teacher_profile", JSON.stringify(sqaafObj));
  } catch (e) {}

  // Sync to paripathSchoolInfo
  try {
    const paripathObj = {
      schoolName: merged.schoolName,
      udise: merged.udise,
      kendra: merged.kendra,
      taluka: merged.taluka,
      jilha: merged.jilha,
    };
    localStorage.setItem("paripathSchoolInfo", JSON.stringify(paripathObj));
  } catch (e) {}

  // Sync basic keys
  if (merged.schoolName) localStorage.setItem("teacher_school_name", merged.schoolName);
  if (merged.udise) localStorage.setItem("teacher_udise", merged.udise);

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent("schoolProfileUpdated", { detail: merged }));
};
