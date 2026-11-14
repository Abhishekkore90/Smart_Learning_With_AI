export const toMarathiDigits = (num: number | string): string => {
  const marathiDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
  return String(num).replace(/[0-9]/g, (d) => marathiDigits[parseInt(d, 10)]);
};

/**
 * Calculates current academic year based on school calendar (June to May).
 * e.g., Month >= June (index 5) => currentYear - (currentYear + 1)
 *       Month < June (index 0..4) => (currentYear - 1) - currentYear
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 is January, 5 is June
  const referenceYear = currentMonth >= 5 ? currentYear : currentYear - 1;
  return `${referenceYear}-${referenceYear + 1}`;
}

export interface AcademicYearOption {
  value: string; // e.g. "2024-2025", "2025-2026"
  label: string; // e.g. "२०२४-२५ (चालू वर्ष)"
  shortLabel: string; // "२०२४-२५"
  isCurrent: boolean;
  isNext: boolean;
  isPrevious: boolean;
}

/**
 * Dynamically generates academic years showing Next year, Current year (auto-selected),
 * and Previous years.
 */
export function getAcademicYearOptions(): AcademicYearOption[] {
  const currentAcademicYear = getCurrentAcademicYear();
  const [currentStartStr] = currentAcademicYear.split("-");
  const currentStart = parseInt(currentStartStr, 10);

  const options: AcademicYearOption[] = [];

  // 1. Next Year (पुढील शैक्षणिक वर्ष: चालू वर्ष + १)
  const nextStart = currentStart + 1;
  const nextEnd = nextStart + 1;
  const nextVal = `${nextStart}-${nextEnd}`;
  options.push({
    value: nextVal,
    label: `${toMarathiDigits(nextStart)}-${toMarathiDigits(String(nextEnd).slice(-2))} (पुढील वर्ष)`,
    shortLabel: `${toMarathiDigits(nextStart)}-${toMarathiDigits(String(nextEnd).slice(-2))}`,
    isCurrent: false,
    isNext: true,
    isPrevious: false,
  });

  // 2. Current Year (चालू शैक्षणिक वर्ष) - automatically selected by default
  const curEnd = currentStart + 1;
  const curVal = `${currentStart}-${curEnd}`;
  options.push({
    value: curVal,
    label: `${toMarathiDigits(currentStart)}-${toMarathiDigits(String(curEnd).slice(-2))} (चालू वर्ष)`,
    shortLabel: `${toMarathiDigits(currentStart)}-${toMarathiDigits(String(curEnd).slice(-2))}`,
    isCurrent: true,
    isNext: false,
    isPrevious: false,
  });

  // 3. Previous Years (मागील ३ वर्षे: चालू वर्ष - १, चालू वर्ष - २, ...)
  for (let i = 1; i <= 3; i++) {
    const prevStart = currentStart - i;
    const prevEnd = prevStart + 1;
    const prevVal = `${prevStart}-${prevEnd}`;
    options.push({
      value: prevVal,
      label: `${toMarathiDigits(prevStart)}-${toMarathiDigits(String(prevEnd).slice(-2))} (मागील वर्ष)`,
      shortLabel: `${toMarathiDigits(prevStart)}-${toMarathiDigits(String(prevEnd).slice(-2))}`,
      isCurrent: false,
      isNext: false,
      isPrevious: true,
    });
  }

  return options;
}

/**
 * Returns initial academic year for state initialization.
 * Defaults to current academic year if none selected or if previously hardcoded stale value.
 */
export function getInitialAcademicYear(): string {
  const current = getCurrentAcademicYear();
  const stored = localStorage.getItem("cce_academic_year");

  // Validate that stored year is valid format (YYYY-YYYY)
  if (stored && /^\d{4}-\d{4}$/.test(stored)) {
    return stored;
  }

  localStorage.setItem("cce_academic_year", current);
  return current;
}
