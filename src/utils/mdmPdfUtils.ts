/**
 * MDM Centralized Calculations & PDF Utilities
 * Single Source of Truth for MDM Data, Calculations, Cook/Helper counts, Rates, and PDF Layout parameters.
 */

// Government Norms for Cook & Helper Count based on Enrolled Student Count (पटसंख्या)
export const calculateCookHelperCount = (patSankhya: number): number => {
  const pat = Math.max(0, Math.floor(Number(patSankhya) || 0));
  if (pat === 0) return 0;
  if (pat <= 25) return 1;
  if (pat <= 100) return 2;
  if (pat <= 200) return 3;
  return 3 + Math.ceil((pat - 200) / 100);
};

// Honorarium Calculations:
// Total Honorarium = Cook/Helper Count * Per Person Rate (default ₹2500)
export interface HonorariumDetails {
  cookHelperCount: number;
  perPersonRate: number;
  totalHonorarium: number;
  centerShare: number; // Center share amount (60%)
  stateShare: number;  // State share amount (40%)
}

export const calculateHonorariumDetails = (
  patSankhya: number,
  perPersonRate: number = 2500,
  centerRatio: number = 0.60
): HonorariumDetails => {
  const cookHelperCount = calculateCookHelperCount(patSankhya);
  const rate = Math.max(0, Number(perPersonRate) || 2500);
  const totalHonorarium = cookHelperCount * rate;
  const centerShare = Math.round(totalHonorarium * centerRatio * 100) / 100;
  const stateShare = Math.round((totalHonorarium - centerShare) * 100) / 100;

  return {
    cookHelperCount,
    perPersonRate: rate,
    totalHonorarium,
    centerShare,
    stateShare,
  };
};

// Food Cooking Cost Grant Rates (per student per day)
// Primary (1-5): Total ₹5.45 (Center: ₹3.27, State: ₹2.18)
// Upper Primary (6-8): Total ₹8.17 (Center: ₹4.90, State: ₹3.27)
export interface FoodGrantRates {
  totalRate: number;
  centerRate: number;
  stateRate: number;
}

export const getFoodGrantRates = (
  section: "1-5" | "6-8" | "1 To 5" | "6 To 8" = "1-5",
  customPrimaryRate?: number,
  customUpperRate?: number
): FoodGrantRates => {
  const isPrimary = section === "1-5" || section === "1 To 5";
  const defaultTotal = isPrimary ? 5.45 : 8.17;
  const totalRate = isPrimary
    ? (customPrimaryRate !== undefined && customPrimaryRate > 0 ? customPrimaryRate : defaultTotal)
    : (customUpperRate !== undefined && customUpperRate > 0 ? customUpperRate : defaultTotal);

  // 60:40 Split between Center and State
  const centerRate = Math.round(totalRate * 0.60 * 100) / 100;
  const stateRate = Math.round((totalRate - centerRate) * 100) / 100;

  return {
    totalRate,
    centerRate,
    stateRate,
  };
};

// Get Dynamic Student Enrollment (Pat Sankhya) from Profile or Saved Data
export const getDynamicPatSankhya = (
  profile: any,
  section: "1-5" | "6-8" | "1-8" | "1 To 5" | "6 To 8" = "1-8"
): number => {
  const primary = Number(profile?.patPrimary || profile?.primaryStudents || profile?.pat_primary || 0);
  const upper = Number(profile?.patUpper || profile?.upperPrimaryStudents || profile?.pat_upper || 0);
  const total = Number(profile?.patTotal || profile?.totalStudents || profile?.pat || (primary + upper));

  if (section === "1-5" || section === "1 To 5") {
    return primary > 0 ? primary : (total > 0 ? total : 0);
  }
  if (section === "6-8" || section === "6 To 8") {
    return upper > 0 ? upper : 0;
  }
  return total > 0 ? total : (primary + upper);
};

// Determine PDF Orientation based on Report Type
export const getReportOrientation = (reportType: string): "portrait" | "landscape" => {
  const type = String(reportType || "").toLowerCase();
  const portraitReports = [
    "masik_goshwara",
    "masik_tandul_bill",
    "demand_report",
    "certificate",
    "swayampaki_kararnama",
    "anudan_report",
    "purak_ahar_report",
  ];
  if (portraitReports.some((p) => type.includes(p))) {
    return "portrait";
  }
  return "landscape";
};
