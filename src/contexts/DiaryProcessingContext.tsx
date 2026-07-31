import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { collection, doc, onSnapshot, query, where, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { processDiaryJob, DiaryJob } from "@/lib/diary-processor";

interface DiaryProcessingContextType {
  activeJobs: Record<string, DiaryJob>;
  failedJobs: Record<string, DiaryJob>;
  isProcessing: boolean;
  retryJob: (jobId: string) => Promise<void>;
}

const DiaryProcessingContext = createContext<DiaryProcessingContextType>({
  activeJobs: {},
  failedJobs: {},
  isProcessing: false,
  retryJob: async () => {},
});

export const useDiaryProcessing = () => useContext(DiaryProcessingContext);

export const DiaryProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeJobs, setActiveJobs] = useState<Record<string, DiaryJob>>({});
  const [failedJobs, setFailedJobs] = useState<Record<string, DiaryJob>>({});
  const [processingCount, setProcessingCount] = useState(0);
  // Use a ref to avoid stale closure issues — the onSnapshot callback always
  // sees the latest set of IDs currently being processed.
  const processingIdsRef = useRef<Set<string>>(new Set());

  // Listen for active (non-terminal) jobs
  useEffect(() => {
    const q = query(
      collection(db, "teacher_diary_jobs"),
      where("status", "in", ["uploading", "splitting", "processing", "uploading_pages"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs: Record<string, DiaryJob> = {};

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as DiaryJob;
        jobs[docSnap.id] = data;

        // If we found a job that needs processing and we aren't already processing it
        if (!processingIdsRef.current.has(docSnap.id)) {
          processingIdsRef.current.add(docSnap.id);
          setProcessingCount((c) => c + 1);
          // Start background processor without awaiting, let it run independently
          processDiaryJob(docSnap.id, data).catch((err) => {
            console.error(`Background processing failed for job ${docSnap.id}:`, err);
            updateDoc(docSnap.ref, {
              status: "failed",
              lastUpdatedAt: Date.now(),
            }).catch(console.error);
          }).finally(() => {
            processingIdsRef.current.delete(docSnap.id);
            setProcessingCount((c) => Math.max(0, c - 1));
          });
        }
      });

      setActiveJobs(jobs);
    }, (error) => {
      console.error("Error listening to background jobs:", error);
    });

    return () => unsubscribe();
  }, []);

  // Listen for failed jobs so the admin UI can display a retry button
  useEffect(() => {
    const q = query(
      collection(db, "teacher_diary_jobs"),
      where("status", "==", "failed")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs: Record<string, DiaryJob> = {};
      snapshot.docs.forEach((docSnap) => {
        jobs[docSnap.id] = docSnap.data() as DiaryJob;
      });
      setFailedJobs(jobs);
    });

    return () => unsubscribe();
  }, []);

  // Retry a failed job by resetting its status so the active-jobs listener picks it up
  const retryJob = useCallback(async (jobId: string) => {
    const jobRef = doc(db, "teacher_diary_jobs", jobId);
    await updateDoc(jobRef, {
      status: "processing",
      processedPages: 0,
      lastUpdatedAt: Date.now(),
    });
    console.log(`Job ${jobId} reset for retry.`);
  }, []);

  return (
    <DiaryProcessingContext.Provider value={{ activeJobs, failedJobs, isProcessing: processingCount > 0, retryJob }}>
      {children}
    </DiaryProcessingContext.Provider>
  );
};
