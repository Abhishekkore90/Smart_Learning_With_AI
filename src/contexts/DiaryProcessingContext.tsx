import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, where, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { processDiaryJob, DiaryJob } from "@/lib/diary-processor";

interface DiaryProcessingContextType {
  activeJobs: Record<string, DiaryJob>;
  isProcessing: boolean;
}

const DiaryProcessingContext = createContext<DiaryProcessingContextType>({
  activeJobs: {},
  isProcessing: false,
});

export const useDiaryProcessing = () => useContext(DiaryProcessingContext);

export const DiaryProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeJobs, setActiveJobs] = useState<Record<string, DiaryJob>>({});
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Listen for any jobs that are not completed or failed
    const q = query(
      collection(db, "teacher_diary_jobs"),
      where("status", "in", ["uploading", "splitting", "processing", "uploading_pages"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs: Record<string, DiaryJob> = {};
      const newProcessingIds = new Set(processingIds);

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as DiaryJob;
        jobs[docSnap.id] = data;

        // If we found a job that needs processing and we aren't already processing it
        if (!newProcessingIds.has(docSnap.id)) {
          newProcessingIds.add(docSnap.id);
          // Start background processor without awaiting, let it run independently
          processDiaryJob(docSnap.id, data).catch((err) => {
            console.error(`Background processing failed for job ${docSnap.id}:`, err);
            updateDoc(docSnap.ref, {
              status: "failed",
              lastUpdatedAt: Date.now(),
            }).catch(console.error);
          }).finally(() => {
            setProcessingIds((prev) => {
              const next = new Set(prev);
              next.delete(docSnap.id);
              return next;
            });
          });
        }
      });

      setActiveJobs(jobs);
      setProcessingIds(newProcessingIds);
    }, (error) => {
      console.error("Error listening to background jobs:", error);
    });

    return () => unsubscribe();
    // We intentionally don't add processingIds to dependencies to avoid re-triggering processor starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DiaryProcessingContext.Provider value={{ activeJobs, isProcessing: processingIds.size > 0 }}>
      {children}
    </DiaryProcessingContext.Provider>
  );
};
