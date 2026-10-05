import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from "firebase/firestore";
import type { MCQHomeworkSet, MCQQuestion, LocalMCQSubmission } from "@/types/mcqHomework";

const COLLECTION_NAME = "mcq_homework";

/**
 * Normalizes Firestore document data into MCQHomeworkSet
 */
export function normalizeMCQHomework(id: string, raw: any): MCQHomeworkSet {
  const questions: MCQQuestion[] = Array.isArray(raw.questions)
    ? raw.questions.map((q: any, idx: number) => ({
        id: q.id || `q_${idx + 1}`,
        question: q.question || "",
        options: Array.isArray(q.options) && q.options.length > 0 ? q.options : ["पर्याय अ", "पर्याय ब", "पर्याय क", "पर्याय ड"],
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        explanation: q.explanation || "",
        marks: typeof q.marks === "number" ? q.marks : 1,
      }))
    : [];

  const totalMarks =
    typeof raw.totalMarks === "number" && raw.totalMarks > 0
      ? raw.totalMarks
      : questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  return {
    id,
    title: raw.title || "MCQ दैनिक स्वाध्याय",
    classId: raw.classId || raw.class || "1st",
    subject: raw.subject || "मराठी",
    medium: raw.medium || "marathi",
    date: raw.date || raw.homeworkDate || new Date().toISOString().split("T")[0],
    instructions: raw.instructions || "सर्व प्रश्न सोडवणे आवश्यक आहे. प्रत्येक योग्य उत्तराला १ गुण मिळेल.",
    timeLimitMinutes: raw.timeLimitMinutes || 0,
    questions,
    totalMarks,
    createdBy: {
      uid: raw.createdBy?.uid || "",
      name: raw.createdBy?.name || "शिक्षक / प्रशासन",
      role: raw.createdBy?.role || "admin",
    },
    isCustom: Boolean(raw.isCustom),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || undefined,
  };
}

/**
 * Creates a new MCQ Homework Set in Firestore
 */
export async function createMCQHomework(
  data: Omit<MCQHomeworkSet, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    totalMarks: data.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
    createdAt: new Date().toISOString(),
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing MCQ Homework Set
 */
export async function updateMCQHomework(
  id: string,
  data: Partial<MCQHomeworkSet>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Deletes an MCQ Homework Set
 */
export async function deleteMCQHomework(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Fetches a single MCQ Homework Set by ID (supports public access without auth)
 */
export async function getMCQHomeworkById(id: string): Promise<MCQHomeworkSet | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return normalizeMCQHomework(snap.id, snap.data());
  } catch (err) {
    console.error("Error fetching MCQ homework by ID:", err);
    return null;
  }
}

/**
 * Real-time subscription to all MCQ Homework Sets
 */
export function subscribeToMCQHomework(
  callback: (items: MCQHomeworkSet[]) => void,
  onError?: (error: any) => void
): Unsubscribe {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) =>
          normalizeMCQHomework(docSnap.id, docSnap.data())
        );
        callback(items);
      },
      (err) => {
        console.warn("Ordered MCQ homework query failed, falling back to unordered:", err);
        const fallbackQ = collection(db, COLLECTION_NAME);
        return onSnapshot(
          fallbackQ,
          (snapshot) => {
            const items = snapshot.docs
              .map((docSnap) => normalizeMCQHomework(docSnap.id, docSnap.data()))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            callback(items);
          },
          onError
        );
      }
    );
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/* =========================================================
   LOCAL-ONLY USER STORAGE (ZERO BACKEND COST)
   Stores student answers in sessionStorage so it clears
   automatically on tab/browser exit and uses zero cloud space.
   ========================================================= */

const LOCAL_STORAGE_PREFIX = "mcq_ans_";
const LOCAL_SUBMISSION_PREFIX = "mcq_sub_";

export function saveLocalAnswers(quizId: string, answers: Record<string, number>): void {
  try {
    sessionStorage.setItem(`${LOCAL_STORAGE_PREFIX}${quizId}`, JSON.stringify(answers));
  } catch (e) {
    console.warn("Could not save answers to sessionStorage:", e);
  }
}

export function getLocalAnswers(quizId: string): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(`${LOCAL_STORAGE_PREFIX}${quizId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalSubmission(submission: LocalMCQSubmission): void {
  try {
    sessionStorage.setItem(
      `${LOCAL_SUBMISSION_PREFIX}${submission.quizId}`,
      JSON.stringify(submission)
    );
  } catch (e) {
    console.warn("Could not save submission to sessionStorage:", e);
  }
}

export function getLocalSubmission(quizId: string): LocalMCQSubmission | null {
  try {
    const raw = sessionStorage.getItem(`${LOCAL_SUBMISSION_PREFIX}${quizId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearLocalQuizData(quizId: string): void {
  try {
    sessionStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${quizId}`);
    sessionStorage.removeItem(`${LOCAL_SUBMISSION_PREFIX}${quizId}`);
  } catch (e) {
    console.warn("Could not clear sessionStorage:", e);
  }
}
