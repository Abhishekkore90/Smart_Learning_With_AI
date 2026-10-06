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

  // 1. Check user_planning_school_profile keys (Academic planning saved profile)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("user_planning_school_profile_") || key.includes("planning_school_profile"))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.schoolName && !parsed.schoolName.includes("___")) {
            if (!profile.schoolName) profile.schoolName = parsed.schoolName;
            if (!profile.kendra && (parsed.kendraName || parsed.kendra)) profile.kendra = parsed.kendraName || parsed.kendra;
            if (!profile.taluka && (parsed.talukaName || parsed.taluka)) profile.taluka = parsed.talukaName || parsed.taluka;
            if (!profile.jilha && (parsed.districtName || parsed.district || parsed.jilha)) profile.jilha = parsed.districtName || parsed.district || parsed.jilha;
            if (!profile.headmaster && (parsed.headMasterName || parsed.headmaster)) profile.headmaster = parsed.headMasterName || parsed.headmaster;
            if (!profile.teacherName && parsed.teacherName) profile.teacherName = parsed.teacherName;
            if (!profile.udise && (parsed.udiseNumber || parsed.udise)) profile.udise = parsed.udiseNumber || parsed.udise;
          }
        }
      }
    }
  } catch (e) {}

  // 2. Check sqaaf_teacher_profile
  try {
    const sqaafRaw = localStorage.getItem("sqaaf_teacher_profile");
    if (sqaafRaw) {
      const parsed = JSON.parse(sqaafRaw);
      if (parsed) {
        if (!profile.schoolName && parsed.schoolName && !parsed.schoolName.includes("___")) profile.schoolName = parsed.schoolName;
        if (!profile.schoolName && parsed.infoSchoolName && !parsed.infoSchoolName.includes("___")) profile.schoolName = parsed.infoSchoolName;
        profile.udise = profile.udise || parsed.udise || parsed.infoUdise;
        profile.kendra = profile.kendra || parsed.kendra || parsed.centerName || parsed.infoCenterName;
        profile.taluka = profile.taluka || parsed.taluka || parsed.infoTaluka;
        profile.jilha = profile.jilha || parsed.jilha || parsed.district || parsed.infoDistrict;
        profile.headmaster = profile.headmaster || parsed.headmaster || parsed.infoHeadmaster;
        profile.teacherName = profile.teacherName || parsed.teacherName || parsed.fullName;
        profile.address = profile.address || parsed.address || parsed.infoAddress;
        profile.phone = profile.phone || parsed.phone || parsed.mobile;
      }
    }
  } catch (e) {}

  // 3. Check paripathSchoolInfo
  try {
    const paripathRaw = localStorage.getItem("paripathSchoolInfo");
    if (paripathRaw) {
      const parsed = JSON.parse(paripathRaw);
      if (parsed) {
        if (!profile.schoolName && parsed.schoolName && !parsed.schoolName.includes("___")) profile.schoolName = parsed.schoolName;
        if (!profile.udise && parsed.udise) profile.udise = parsed.udise;
        if (!profile.kendra && parsed.kendra) profile.kendra = parsed.kendra;
        if (!profile.taluka && parsed.taluka) profile.taluka = parsed.taluka;
        if (!profile.jilha && parsed.jilha) profile.jilha = parsed.jilha;
      }
    }
  } catch (e) {}

  // 4. Check sqaaf_school_info / sqaf_school_info
  try {
    const sqInfoRaw = localStorage.getItem("sqaaf_school_info") || localStorage.getItem("sqaf_school_info");
    if (sqInfoRaw) {
      const parsed = JSON.parse(sqInfoRaw);
      if (parsed) {
        if (!profile.schoolName && parsed.schoolName && !parsed.schoolName.includes("___")) profile.schoolName = parsed.schoolName;
        if (!profile.udise && parsed.udise) profile.udise = parsed.udise;
        if (!profile.kendra && (parsed.centerName || parsed.kendra)) profile.kendra = parsed.centerName || parsed.kendra;
        if (!profile.taluka && parsed.taluka) profile.taluka = parsed.taluka;
        if (!profile.jilha && (parsed.district || parsed.jilha)) profile.jilha = parsed.district || parsed.jilha;
        if (!profile.headmaster && parsed.headmaster) profile.headmaster = parsed.headmaster;
        if (!profile.address && parsed.address) profile.address = parsed.address;
      }
    }
  } catch (e) {}

  // 5. Check user_profile / auth_user
  try {
    const userRaw = localStorage.getItem("user_profile") || localStorage.getItem("auth_profile");
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      if (parsed) {
        if (!profile.schoolName && parsed.schoolName && !parsed.schoolName.includes("___")) profile.schoolName = parsed.schoolName;
        if (!profile.kendra && (parsed.kendra || parsed.centerName)) profile.kendra = parsed.kendra || parsed.centerName;
        if (!profile.taluka && parsed.taluka) profile.taluka = parsed.taluka;
        if (!profile.jilha && (parsed.district || parsed.jilha)) profile.jilha = parsed.district || parsed.jilha;
        if (!profile.teacherName && (parsed.fullName || parsed.displayName)) profile.teacherName = parsed.fullName || parsed.displayName;
      }
    }
  } catch (e) {}

  // 6. Check simple localStorage fallbacks
  const fallbackSchoolName = localStorage.getItem("teacher_school_name");
  if (!profile.schoolName && fallbackSchoolName && !fallbackSchoolName.includes("___")) profile.schoolName = fallbackSchoolName;

  const fallbackUdise = localStorage.getItem("teacher_udise");
  if (!profile.udise && fallbackUdise) profile.udise = fallbackUdise;

  // Clean placeholder dashes if any slipped through
  let schoolName = profile.schoolName || "";
  if (schoolName.includes("___") || /[-_.~=—–•\.]{4,}/.test(schoolName)) {
    schoolName = schoolName.replace(/[-_.~=—–•\.]{2,}/g, "").trim();
  }

  // Normalize aliases
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
 * Async helper to fetch user's school profile from Firestore and sync to local storage
 */
export const fetchUnifiedSchoolProfile = async (userId?: string): Promise<UnifiedSchoolProfile> => {
  const current = getUnifiedSchoolProfile();
  if (!userId || userId === "guest_teacher") return current;

  try {
    const { db } = await import("@/lib/firebase");
    const { doc, getDoc } = await import("firebase/firestore");

    // 1. Check user_planning_school_profiles
    const planRef = doc(db, "user_planning_school_profiles", userId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      const d = planSnap.data();
      if (d && d.schoolName && !d.schoolName.includes("___")) {
        const updated: Partial<UnifiedSchoolProfile> = {
          schoolName: d.schoolName,
          kendra: d.kendraName || d.kendra || current.kendra,
          taluka: d.talukaName || d.taluka || current.taluka,
          jilha: d.districtName || d.district || d.jilha || current.jilha,
          udise: d.udiseNumber || d.udise || current.udise,
          headmaster: d.headMasterName || d.headmaster || current.headmaster,
          teacherName: d.teacherName || current.teacherName,
        };
        saveUnifiedSchoolProfile(updated);
        return getUnifiedSchoolProfile();
      }
    }

    // 2. Check users collection
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const u = userSnap.data();
      if (u && u.schoolName && !u.schoolName.includes("___")) {
        const updated: Partial<UnifiedSchoolProfile> = {
          schoolName: u.schoolName,
          kendra: u.kendra || u.centerName || current.kendra,
          taluka: u.taluka || current.taluka,
          jilha: u.district || u.jilha || current.jilha,
          udise: u.udise || u.udiseNumber || current.udise,
          headmaster: u.headmaster || current.headmaster,
          teacherName: u.fullName || u.displayName || current.teacherName,
        };
        saveUnifiedSchoolProfile(updated);
        return getUnifiedSchoolProfile();
      }
    }
  } catch (err) {
    console.warn("fetchUnifiedSchoolProfile notice:", err);
  }

  return current;
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
