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
export const getUnifiedSchoolProfile = (targetUserId?: string): UnifiedSchoolProfile => {
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

  // 0. Check dedicated Question Paper / Unified School Profile keys for the specific user
  try {
    if (targetUserId && targetUserId !== "guest" && targetUserId !== "guest_teacher") {
      const qpRaw = localStorage.getItem(`qp_school_info_${targetUserId}`);
      if (qpRaw) {
        const parsed = JSON.parse(qpRaw);
        if (parsed && parsed.schoolName && !parsed.schoolName.includes("___")) {
          profile = { ...parsed };
        }
      }
    }
  } catch (e) {}

  // 1. Check user_planning_school_profile strictly for targetUserId
  try {
    if (targetUserId && targetUserId !== "guest" && targetUserId !== "guest_teacher") {
      const key = `user_planning_school_profile_${targetUserId}`;
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
  } catch (e) {}

  // 1b. Check homework v2 header keys strictly for targetUserId
  try {
    if (targetUserId && targetUserId !== "guest" && targetUserId !== "guest_teacher") {
      const hwSchool = localStorage.getItem(`hw_v2_school_${targetUserId}`) || localStorage.getItem(`user_school_name_${targetUserId}`);
      if (!profile.schoolName && hwSchool && !hwSchool.includes("___")) profile.schoolName = hwSchool;
      const hwTeacher = localStorage.getItem(`hw_v2_teacher_${targetUserId}`);
      if (!profile.teacherName && hwTeacher) profile.teacherName = hwTeacher;
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
        if (!profile.headmaster && parsed.headmaster) profile.headmaster = parsed.headmaster;
        if (!profile.teacherName && (parsed.teacherName || parsed.fullName || parsed.displayName)) {
          profile.teacherName = parsed.teacherName || parsed.fullName || parsed.displayName;
        }
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
  const current = getUnifiedSchoolProfile(userId);
  if (!userId || userId === "guest_teacher" || userId === "guest") return current;

  try {
    const { db } = await import("@/lib/firebase");
    const { doc, getDoc } = await import("firebase/firestore");

    // 0. Check qp_school_profiles (Dedicated Question Paper Profile in backend for this user)
    try {
      const qpRef = doc(db, "qp_school_profiles", userId);
      const qpSnap = await getDoc(qpRef);
      if (qpSnap.exists()) {
        const q = qpSnap.data();
        if (q && q.schoolName && !q.schoolName.includes("___")) {
          const updated: Partial<UnifiedSchoolProfile> = {
            schoolName: q.schoolName,
            kendra: q.kendraName || q.kendra || "",
            taluka: q.talukaName || q.taluka || "",
            jilha: q.districtName || q.district || q.jilha || "",
            udise: q.udiseNumber || q.udise || "",
            headmaster: q.headMasterName || q.headmaster || "",
            teacherName: q.teacherName || "",
          };
          saveUnifiedSchoolProfile(updated, userId);
          return getUnifiedSchoolProfile(userId);
        }
      }
    } catch (e) {}

    // 1. Check user_planning_school_profiles strictly for this user
    const planRef = doc(db, "user_planning_school_profiles", userId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      const d = planSnap.data();
      if (d && d.schoolName && !d.schoolName.includes("___")) {
        const updated: Partial<UnifiedSchoolProfile> = {
          schoolName: d.schoolName,
          kendra: d.kendraName || d.kendra || "",
          taluka: d.talukaName || d.taluka || "",
          jilha: d.districtName || d.district || d.jilha || "",
          udise: d.udiseNumber || d.udise || "",
          headmaster: d.headMasterName || d.headmaster || "",
          teacherName: d.teacherName || "",
        };
        saveUnifiedSchoolProfile(updated, userId);
        return getUnifiedSchoolProfile(userId);
      }
    }

    // 2. Check users collection strictly for this user
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const u = userSnap.data();
      if (u && u.schoolName && !u.schoolName.includes("___")) {
        const updated: Partial<UnifiedSchoolProfile> = {
          schoolName: u.schoolName,
          kendra: u.kendra || u.centerName || "",
          taluka: u.taluka || "",
          jilha: u.district || u.jilha || "",
          udise: u.udise || u.udiseNumber || "",
          headmaster: u.headmaster || "",
          teacherName: u.teacherName || u.fullName || u.displayName || "",
        };
        saveUnifiedSchoolProfile(updated, userId);
        return getUnifiedSchoolProfile(userId);
      }
    }
  } catch (err) {
    console.warn("fetchUnifiedSchoolProfile notice:", err);
  }

  return current;
};

/**
 * Saves school profile to storage keys strictly for the specified user.
 */
export const saveUnifiedSchoolProfile = (newProfile: Partial<UnifiedSchoolProfile>, userId?: string) => {
  if (typeof window === "undefined") return;

  const existing = getUnifiedSchoolProfile(userId);
  const merged: UnifiedSchoolProfile = {
    ...existing,
    ...newProfile,
    centerName: newProfile.kendra || newProfile.centerName || existing.kendra,
    district: newProfile.jilha || newProfile.district || existing.jilha,
  };

  // Sync strictly to this user's dedicated keys
  try {
    if (userId && userId !== "guest" && userId !== "guest_teacher") {
      localStorage.setItem(`qp_school_info_${userId}`, JSON.stringify(merged));
      localStorage.setItem(`user_school_name_${userId}`, merged.schoolName || "");
    }
  } catch (e) {}

  // Sync strictly to user_planning_school_profile_${userId}
  try {
    if (userId && userId !== "guest" && userId !== "guest_teacher") {
      const targetKey = `user_planning_school_profile_${userId}`;
      const raw = localStorage.getItem(targetKey);
      let planObj = raw ? JSON.parse(raw) : {};
      planObj = {
        ...planObj,
        schoolName: merged.schoolName,
        kendraName: merged.kendra,
        talukaName: merged.taluka,
        districtName: merged.jilha,
        teacherName: merged.teacherName,
        headMasterName: merged.headmaster,
        udiseNumber: merged.udise || planObj.udiseNumber,
      };
      localStorage.setItem(targetKey, JSON.stringify(planObj));
    }
  } catch (e) {}

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

  // Sync to hw_v2_*
  try {
    if (merged.schoolName) localStorage.setItem("hw_v2_school", merged.schoolName);
    if (merged.kendra) localStorage.setItem("hw_v2_kendra", merged.kendra);
    if (merged.taluka) localStorage.setItem("hw_v2_taluka", merged.taluka);
    if (merged.jilha) localStorage.setItem("hw_v2_district", merged.jilha);
    if (merged.teacherName) localStorage.setItem("hw_v2_teacher", merged.teacherName);
    if (merged.headmaster) localStorage.setItem("hw_v2_headmaster", merged.headmaster);
  } catch (e) {}

  // Sync to user_profile in localStorage
  try {
    const userRaw = localStorage.getItem("user_profile");
    if (userRaw) {
      const userObj = JSON.parse(userRaw);
      userObj.schoolName = merged.schoolName;
      userObj.kendra = merged.kendra;
      userObj.taluka = merged.taluka;
      userObj.district = merged.jilha;
      userObj.headmaster = merged.headmaster;
      userObj.teacherName = merged.teacherName;
      localStorage.setItem("user_profile", JSON.stringify(userObj));
    }
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

  // Sync basic keys strictly for this user
  if (merged.schoolName && userId && userId !== "guest" && userId !== "guest_teacher") {
    localStorage.setItem(`user_school_name_${userId}`, merged.schoolName);
  }

  // Dispatch custom window event
  window.dispatchEvent(new CustomEvent("schoolProfileUpdated", { detail: merged }));
};

/**
 * Saves school profile to both local storage AND Firebase Firestore backend
 * so that updates are permanent and persist across page refreshes and devices.
 */
export const saveUnifiedSchoolProfileToFirestore = async (
  newProfile: Partial<UnifiedSchoolProfile>,
  userId?: string
): Promise<boolean> => {
  saveUnifiedSchoolProfile(newProfile, userId);

  const targetUid = userId && userId !== "guest_teacher" && userId !== "guest" ? userId : null;
  if (!targetUid) return true;

  try {
    const { db } = await import("@/lib/firebase");
    const { doc, setDoc } = await import("firebase/firestore");

    const merged = getUnifiedSchoolProfile();
    const payload = {
      schoolName: merged.schoolName,
      kendraName: merged.kendra,
      kendra: merged.kendra,
      centerName: merged.kendra,
      talukaName: merged.taluka,
      taluka: merged.taluka,
      districtName: merged.jilha,
      district: merged.jilha,
      jilha: merged.jilha,
      udiseNumber: merged.udise,
      udise: merged.udise,
      headMasterName: merged.headmaster,
      headmaster: merged.headmaster,
      teacherName: merged.teacherName,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update user_planning_school_profiles in Firestore
    const planRef = doc(db, "user_planning_school_profiles", targetUid);
    await setDoc(planRef, payload, { merge: true });

    // 2. Update users collection in Firestore
    const userRef = doc(db, "users", targetUid);
    await setDoc(
      userRef,
      {
        schoolName: merged.schoolName,
        kendra: merged.kendra,
        centerName: merged.kendra,
        taluka: merged.taluka,
        district: merged.jilha,
        jilha: merged.jilha,
        headmaster: merged.headmaster,
        teacherName: merged.teacherName,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 3. Update dedicated qp_school_profiles in Firestore
    const qpRef = doc(db, "qp_school_profiles", targetUid);
    await setDoc(qpRef, payload, { merge: true });

    return true;
  } catch (err) {
    console.error("Failed to save unified school profile to Firestore:", err);
    return false;
  }
};
