import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import type { HomeworkItem } from "@/types/documentEditor";

/**
 * Normalizes a homework record from admin_homework or legacy homework collection
 */
export function normalizeHomeworkItem(raw: any, id: string): HomeworkItem {
  // Normalize date to YYYY-MM-DD
  let homeworkDate = raw.homeworkDate;
  if (!homeworkDate) {
    const fallbackDateStr = raw.uploadedAt || raw.createdAt || raw.postedAt || raw.dueDate;
    if (fallbackDateStr) {
      try {
        const d = new Date(fallbackDateStr);
        if (!isNaN(d.getTime())) {
          homeworkDate = d.toISOString().split("T")[0];
        }
      } catch (e) {
        // keep undefined
      }
    }
  }
  if (!homeworkDate) {
    homeworkDate = new Date().toISOString().split("T")[0];
  }

  return {
    id,
    medium: raw.medium || "marathi",
    class: raw.class || "1st",
    subject: raw.subject || raw.subjectName || "मराठी",
    homeworkDate,
    dueDate: raw.dueDate || undefined,
    title: raw.title || raw.text || raw.subjectName || "दैनिक गृहपाठ",
    description: raw.description || raw.text || raw.content || "",
    content: raw.content || raw.description || raw.text || "",
    fileUrl: raw.fileUrl || raw.file || undefined,
    fileName: raw.fileName || undefined,
    fileType: raw.fileType || (raw.fileUrl?.includes(".pdf") ? "application/pdf" : undefined),
    fileSize: raw.fileSize || undefined,
    templateId: raw.templateId || (raw.variables ? "daily-template" : undefined),
    documentType: raw.documentType || (raw.fileUrl ? (raw.fileUrl.includes(".pdf") ? "pdf" : "image") : raw.variables ? "template" : "text"),
    variables: raw.variables || undefined,
    uploadedAt: raw.uploadedAt || raw.postedAt || raw.createdAt || new Date().toISOString(),
    createdAt: raw.createdAt || raw.uploadedAt || undefined,
    updatedAt: raw.updatedAt || undefined,
    uploadedBy: raw.uploadedBy || "admin",
  };
}

/**
 * Subscribes to canonical admin_homework with safe fallback to legacy homework collection
 */
export function subscribeToHomework(
  callback: (items: HomeworkItem[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  let adminItems: HomeworkItem[] = [];
  let legacyItems: HomeworkItem[] = [];

  const mergeAndNotify = () => {
    const map = new Map<string, HomeworkItem>();
    // Legacy items first
    for (const item of legacyItems) {
      map.set(item.id, item);
    }
    // Admin items override legacy
    for (const item of adminItems) {
      map.set(item.id, item);
    }
    const combined = Array.from(map.values()).sort((a, b) => {
      const dateA = a.homeworkDate || a.uploadedAt;
      const dateB = b.homeworkDate || b.uploadedAt;
      return dateB.localeCompare(dateA);
    });
    callback(combined);
  };

  // 1. Canonical query: admin_homework
  const qAdmin = query(collection(db, "admin_homework"), orderBy("uploadedAt", "desc"));
  const unsubAdmin = onSnapshot(
    qAdmin,
    (snapshot) => {
      adminItems = snapshot.docs.map((docSnap) =>
        normalizeHomeworkItem(docSnap.data(), docSnap.id)
      );
      mergeAndNotify();
    },
    (err) => {
      console.warn("admin_homework listener warning:", err);
      // Try un-ordered fallback if index is missing
      const qFallback = collection(db, "admin_homework");
      onSnapshot(qFallback, (s) => {
        adminItems = s.docs.map((docSnap) =>
          normalizeHomeworkItem(docSnap.data(), docSnap.id)
        );
        mergeAndNotify();
      });
      if (onError) onError(err);
    }
  );

  // 2. Legacy query: homework (fallback compatibility)
  let unsubLegacy: Unsubscribe = () => {};
  try {
    const qLegacy = query(collection(db, "homework"));
    unsubLegacy = onSnapshot(
      qLegacy,
      (snapshot) => {
        legacyItems = snapshot.docs.map((docSnap) =>
          normalizeHomeworkItem(docSnap.data(), docSnap.id)
        );
        mergeAndNotify();
      },
      (err) => {
        console.info("Legacy homework collection not accessible or empty.");
      }
    );
  } catch (e) {
    // Ignore legacy query errors
  }

  return () => {
    unsubAdmin();
    unsubLegacy();
  };
}
