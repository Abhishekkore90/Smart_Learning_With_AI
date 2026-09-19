import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";

export interface OfflineSchoolInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  schoolName: string;
  udiseNo: string;
  schoolAddress: string;
  selectedPlan?: {
    id: string;
    title: string;
    price: string;
    period: string;
    badge: string;
    studentsCount?: string;
  };
  status: "pending" | "contacted";
  contactedAt?: string;
  createdAt: string;
}

const LOCAL_STORAGE_BACKUP_KEY = "digital_school_all_inquiries_backup";

/**
 * Helper to get inquiries stored in browser cache
 */
function getLocalBackup(): OfflineSchoolInquiry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading inquiry local cache:", e);
  }
  return [];
}

/**
 * Helper to save inquiries array to browser cache
 */
function saveLocalBackup(list: OfflineSchoolInquiry[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed saving inquiry local cache:", e);
  }
}

/**
 * Create a canonical deduplication key for an inquiry
 */
export function getInquiryDedupeKey(item: Partial<OfflineSchoolInquiry>): string {
  const cleanUdise = (item.udiseNo || "").trim().toLowerCase();
  const cleanSchool = (item.schoolName || "").trim().toLowerCase();
  const cleanPhone = (item.phone || "").trim().replace(/\D/g, "");

  if (cleanUdise && cleanUdise.length >= 5) {
    return `udise_${cleanUdise}`;
  }
  if (cleanSchool && cleanPhone) {
    return `school_${cleanSchool}_${cleanPhone}`;
  }
  if (cleanSchool) {
    return `school_${cleanSchool}`;
  }
  return item.id || `inq_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Deduplicate and sort inquiries newest first
 */
function mergeAndDeduplicate(lists: OfflineSchoolInquiry[][]): OfflineSchoolInquiry[] {
  const map = new Map<string, OfflineSchoolInquiry>();

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.schoolName) continue;
      const key = getInquiryDedupeKey(item);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
      } else {
        const isContacted = item.status === "contacted" || existing.status === "contacted";
        const contactedAt = item.contactedAt || existing.contactedAt;
        const createdAt = existing.createdAt || item.createdAt;
        const stableId = existing.id || item.id;

        map.set(key, {
          ...existing,
          ...item,
          id: stableId,
          status: isContacted ? "contacted" : "pending",
          contactedAt: isContacted ? contactedAt : undefined,
          createdAt,
        });
      }
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return result;
}

/**
 * Save new inquiry to Backend Database (Firebase Firestore) only
 */
export async function saveInquiry(data: Omit<OfflineSchoolInquiry, "id"> & { id?: string }): Promise<OfflineSchoolInquiry> {
  const generatedId = data.id || `inq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inquiry: OfflineSchoolInquiry = {
    ...data,
    id: generatedId,
    status: data.status || "pending",
    createdAt: data.createdAt || new Date().toISOString(),
  };

  // 1. Update browser cache immediately for responsive UI
  const localList = getLocalBackup();
  const inquiryKey = getInquiryDedupeKey(inquiry);
  const updatedLocal = [
    inquiry,
    ...localList.filter((i) => getInquiryDedupeKey(i) !== inquiryKey),
  ];
  saveLocalBackup(updatedLocal);

  // Set active user submitted state for returning-user check
  try {
    localStorage.setItem("digital_school_inquiry_submitted", "true");
    localStorage.setItem("digital_school_inquiry_data", JSON.stringify(inquiry));
  } catch (e) {
    console.warn("Failed setting current user inquiry data:", e);
  }

  // 2. Save directly to Backend Database (Firestore "digital_school_offline_inquiries")
  try {
    if (db) {
      await setDoc(doc(db, "digital_school_offline_inquiries", inquiry.id), inquiry, { merge: true });
    }
  } catch (fsErr) {
    console.error("Firestore backend save error:", fsErr);
  }

  return inquiry;
}

/**
 * Fetch all inquiries from Backend Database (Firebase Firestore)
 */
export async function fetchAllInquiries(): Promise<OfflineSchoolInquiry[]> {
  const sources: OfflineSchoolInquiry[][] = [];

  // 1. Fetch from Backend Database (Firebase Firestore)
  try {
    if (db) {
      const snap = await getDocs(collection(db, "digital_school_offline_inquiries"));
      if (!snap.empty) {
        const firestoreList = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as OfflineSchoolInquiry[];
        sources.push(firestoreList);
      }
    }
  } catch (fsErr) {
    console.error("Firestore backend fetch error:", fsErr);
  }

  // 2. Fallback to client cache if offline
  const localList = getLocalBackup();
  if (localList.length > 0) {
    sources.push(localList);
  }

  // Also check active user inquiry cache
  try {
    const userInqRaw = localStorage.getItem("digital_school_inquiry_data");
    if (userInqRaw) {
      const userInq = JSON.parse(userInqRaw);
      if (userInq && userInq.schoolName) {
        sources.push([userInq]);
      }
    }
  } catch (e) {}

  // Merge & Deduplicate all sources
  const merged = mergeAndDeduplicate(sources);

  // Update browser cache with latest backend state
  if (merged.length > 0) {
    saveLocalBackup(merged);
  }

  return merged;
}

/**
 * Update inquiry status in Backend Database (Firebase Firestore)
 */
export async function updateInquiryStatus(
  id: string,
  newStatus: "pending" | "contacted",
  contactedAt?: string
): Promise<void> {
  const timestamp = contactedAt || (newStatus === "contacted" ? new Date().toISOString() : undefined);

  // 1. Update browser cache immediately for optimistic UI update
  const localList = getLocalBackup();
  const updatedLocal = localList.map((item) =>
    item.id === id ? { ...item, status: newStatus, contactedAt: timestamp } : item
  );
  saveLocalBackup(updatedLocal);

  // 2. Update Backend Database (Firebase Firestore)
  try {
    if (db) {
      await updateDoc(doc(db, "digital_school_offline_inquiries", id), {
        status: newStatus,
        contactedAt: timestamp || null,
      });
    }
  } catch (fsErr) {
    console.error("Firestore backend status update error:", fsErr);
  }
}

/**
 * Delete inquiry from Backend Database (Firebase Firestore)
 */
export async function deleteInquiryItem(id: string): Promise<void> {
  // 1. Update browser cache
  const localList = getLocalBackup();
  const filtered = localList.filter((item) => item.id !== id);
  saveLocalBackup(filtered);

  // 2. Delete from Backend Database (Firebase Firestore)
  try {
    if (db) {
      await deleteDoc(doc(db, "digital_school_offline_inquiries", id));
    }
  } catch (fsErr) {
    console.error("Firestore backend delete error:", fsErr);
  }
}
