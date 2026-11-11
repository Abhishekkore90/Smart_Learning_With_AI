import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const TEACHING_DIARY_HOLIDAYS_COLLECTION = "teaching_diary_holidays";

export type HolidayScope = "ALL" | "SPECIFIC";

export interface TeachingDiaryHoliday {
  id: string;
  date: string; // ISO yyyy-MM-dd
  reason: string;
  scope: HolidayScope;
  className?: string;
  medium?: string;
  createdAt: number;
  updatedAt: number;
}

const MARATHI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toAsciiHolidayDigits(val?: string | null): string {
  if (!val) return "";
  let res = String(val).trim();
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(MARATHI_DIGITS[i], String(i));
  }
  return res;
}

/**
 * Normalizes dd/MM/yyyy, d-M-yyyy, yyyy/MM/dd, yyyy-MM-dd (including Marathi digits)
 * into canonical ISO "yyyy-MM-dd". Returns "" if unrecognized.
 */
export function normalizeHolidayDateToIso(dateStr?: string | null): string {
  const clean = toAsciiHolidayDigits(dateStr);
  if (!clean || clean === "-") return "";

  let m = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) {
    const y = m[1];
    const mo = String(parseInt(m[2], 10)).padStart(2, "0");
    const d = String(parseInt(m[3], 10)).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }

  m = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const d = String(parseInt(m[1], 10)).padStart(2, "0");
    const mo = String(parseInt(m[2], 10)).padStart(2, "0");
    let yNum = parseInt(m[3], 10);
    if (yNum < 100) yNum += 2000;
    return `${yNum}-${mo}-${d}`;
  }

  return "";
}

export function buildHolidayDocId(
  isoDate: string,
  scope: HolidayScope = "ALL",
  className?: string,
  medium?: string
): string {
  if (scope === "SPECIFIC" && className && medium) {
    const safeCls = className.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
    const safeMed = medium.trim().replace(/[^a-zA-Z0-9_-]+/g, "_");
    return `${safeCls}_${safeMed}_${isoDate}`;
  }
  return `ALL_${isoDate}`;
}

export async function saveTeachingDiaryHoliday(input: {
  date: string;
  reason: string;
  scope?: HolidayScope;
  className?: string;
  medium?: string;
  existingId?: string;
}): Promise<TeachingDiaryHoliday> {
  const isoDate = normalizeHolidayDateToIso(input.date);
  if (!isoDate) {
    throw new Error("कृपया वैध तारीख निवडा (Invalid date)");
  }

  const reason = (input.reason || "").trim();
  if (!reason) {
    throw new Error("कृपया सुट्टीचे कारण लिहा (Holiday reason is required)");
  }

  const scope: HolidayScope =
    input.scope === "SPECIFIC" && input.className && input.medium ? "SPECIFIC" : "ALL";
  const docId = buildHolidayDocId(isoDate, scope, input.className, input.medium);
  const now = Date.now();

  if (input.existingId && input.existingId !== docId) {
    await deleteDoc(doc(db, TEACHING_DIARY_HOLIDAYS_COLLECTION, input.existingId));
  }

  const payload: TeachingDiaryHoliday = {
    id: docId,
    date: isoDate,
    reason,
    scope,
    ...(scope === "SPECIFIC"
      ? { className: input.className, medium: input.medium }
      : { className: "", medium: "" }),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, TEACHING_DIARY_HOLIDAYS_COLLECTION, docId), payload, { merge: true });
  return payload;
}

export async function deleteTeachingDiaryHoliday(id: string): Promise<void> {
  if (!id) return;
  await deleteDoc(doc(db, TEACHING_DIARY_HOLIDAYS_COLLECTION, id));
}

export async function fetchTeachingDiaryHolidays(): Promise<TeachingDiaryHoliday[]> {
  const snap = await getDocs(collection(db, TEACHING_DIARY_HOLIDAYS_COLLECTION));
  return normalizeHolidaySnapshotDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() })));
}

export function subscribeTeachingDiaryHolidays(
  onChange: (holidays: TeachingDiaryHoliday[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, TEACHING_DIARY_HOLIDAYS_COLLECTION),
    (snap) => {
      onChange(normalizeHolidaySnapshotDocs(snap.docs.map((d) => ({ id: d.id, data: d.data() }))));
    },
    (err) => {
      console.error("Error subscribing to teaching_diary_holidays:", err);
      onError?.(err);
    }
  );
}

function normalizeHolidaySnapshotDocs(
  entries: Array<{ id: string; data: any }>
): TeachingDiaryHoliday[] {
  return entries
    .map(({ id, data }) => {
      const isoDate = normalizeHolidayDateToIso(data?.date || id);
      if (!isoDate) return null;
      const scope: HolidayScope =
        data?.scope === "SPECIFIC" && data?.className && data?.medium ? "SPECIFIC" : "ALL";
      return {
        id,
        date: isoDate,
        reason: String(data?.reason || "शासकीय सुट्टी").trim(),
        scope,
        className: scope === "SPECIFIC" ? String(data.className) : undefined,
        medium: scope === "SPECIFIC" ? String(data.medium) : undefined,
        createdAt: Number(data?.createdAt || 0),
        updatedAt: Number(data?.updatedAt || data?.createdAt || 0),
      } as TeachingDiaryHoliday;
    })
    .filter((item): item is TeachingDiaryHoliday => item !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Finds the applicable custom holiday for a given date, className, and medium.
 * Class+Medium specific holidays take priority over ALL-classes holidays.
 */
export function findHolidayForDate(
  holidays: TeachingDiaryHoliday[],
  dateStr?: string | null,
  className?: string | null,
  medium?: string | null
): TeachingDiaryHoliday | null {
  if (!holidays || holidays.length === 0 || !dateStr) return null;
  const isoDate = normalizeHolidayDateToIso(dateStr);
  if (!isoDate) return null;

  const normCls = (className || "").trim().toLowerCase();
  const normMed = (medium || "").trim().toLowerCase();

  if (normCls && normMed) {
    const specific = holidays.find(
      (h) =>
        h.date === isoDate &&
        h.scope === "SPECIFIC" &&
        (h.className || "").trim().toLowerCase() === normCls &&
        (h.medium || "").trim().toLowerCase() === normMed
    );
    if (specific) return specific;
  }

  const globalMatch = holidays.find((h) => h.date === isoDate && h.scope === "ALL");
  return globalMatch || null;
}

