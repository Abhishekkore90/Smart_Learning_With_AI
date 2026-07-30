import { PDFDocument } from "pdf-lib";
import { doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadFileWithProgress } from "@/lib/upload";
import { format } from "date-fns";

export interface DiaryJob {
  status: "uploading" | "splitting" | "processing" | "uploading_pages" | "completed" | "failed";
  totalPages: number;
  processedPages: number;
  masterPdfUrl: string;
  startDate: string;
  className: string;
  medium: string;
  failedPages?: number[];
  lastUpdatedAt: number;
}

// Helper to yield control to the main thread
const yieldThread = () => new Promise((resolve) => setTimeout(resolve, 100));

export async function processDiaryJob(jobId: string, jobData: DiaryJob) {
  if (jobData.status === "completed" || jobData.status === "failed") {
    return;
  }

  const jobRef = doc(db, "teacher_diary_jobs", jobId);

  try {
    // 1. Fetch the master PDF if we haven't started processing
    await updateDoc(jobRef, { status: "processing", lastUpdatedAt: Date.now() });
    
    console.log(`Fetching master PDF for job ${jobId} from ${jobData.masterPdfUrl}`);
    const response = await fetch(jobData.masterPdfUrl);
    if (!response.ok) throw new Error("Failed to download master PDF for processing.");
    const arrayBuffer = await response.arrayBuffer();

    await yieldThread();

    // 2. Load PDF into memory (This is the heaviest operation, but required)
    await updateDoc(jobRef, { status: "splitting", lastUpdatedAt: Date.now() });
    const originalDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = originalDoc.getPageCount();

    if (jobData.totalPages === 0 || jobData.totalPages !== totalPages) {
      await updateDoc(jobRef, { totalPages, lastUpdatedAt: Date.now() });
    }

    await updateDoc(jobRef, { status: "uploading_pages", lastUpdatedAt: Date.now() });

    const startDateObj = new Date(jobData.startDate);
    const BATCH_SIZE = 5;

    // 3. Process in batches to avoid freezing UI
    for (let i = jobData.processedPages; i < totalPages; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, totalPages);
      
      const batchPromises = [];
      for (let j = i; j < batchEnd; j++) {
        batchPromises.push(processSinglePage(j, originalDoc, jobData, startDateObj));
      }

      // Wait for the batch to finish
      await Promise.all(batchPromises);

      // Update progress in Firestore
      await updateDoc(jobRef, {
        processedPages: batchEnd,
        lastUpdatedAt: Date.now(),
      });

      // Yield strictly to keep the UI responsive
      await yieldThread();
    }

    // 4. Mark as completed
    await updateDoc(jobRef, {
      status: "completed",
      lastUpdatedAt: Date.now(),
    });
    console.log(`Job ${jobId} completed successfully!`);

  } catch (error) {
    console.error(`Error processing diary job ${jobId}:`, error);
    await updateDoc(jobRef, {
      status: "failed",
      lastUpdatedAt: Date.now(),
    });
  }
}

async function processSinglePage(
  pageIndex: number,
  originalDoc: PDFDocument,
  jobData: DiaryJob,
  startDateObj: Date
) {
  const pageNum = pageIndex + 1;
  const currentDate = new Date(startDateObj);
  currentDate.setDate(startDateObj.getDate() + pageIndex);
  const dateStr = format(currentDate, "yyyy-MM-dd");

  const docId = dateStr;
  const pageRef = doc(db, "teacher_diaries", jobData.className, jobData.medium, docId);

  // Skip if already exists (Resiliency)
  const existingDoc = await getDoc(pageRef);
  if (existingDoc.exists()) {
    console.log(`Page ${pageNum} for date ${dateStr} already exists. Skipping.`);
    return;
  }

  // Extract single page
  const subDoc = await PDFDocument.create();
  const [copiedPage] = await subDoc.copyPages(originalDoc, [pageIndex]);
  subDoc.addPage(copiedPage);
  const pdfBytes = await subDoc.save();
  const pageBlob = new Blob([pdfBytes as any], { type: "application/pdf" });

  // Create a File object for the upload utility
  const safeClassName = jobData.className.toLowerCase().replace(/\s+/g, "-");
  const safeMedium = jobData.medium.toLowerCase().replace(/\s+/g, "-");
  const fileName = `page_${pageNum}_${dateStr}.pdf`;
  const file = new File([pageBlob], fileName, { type: "application/pdf" });

  // Upload to Bunny
  const uploadResult = await uploadFileWithProgress(file, {
    folderPath: `teacher-diaries/${safeClassName}/${safeMedium}/pages`,
    preferredProvider: "bunny",
  });

  // Save mapping to Firestore
  await setDoc(pageRef, {
    diaryDate: dateStr,
    class: jobData.className,
    medium: jobData.medium,
    pageUrl: uploadResult.url,
    pageURL: uploadResult.url,
    masterPdfUrl: jobData.masterPdfUrl,
    pageNumber: pageNum,
    storagePath: `teacher-diaries/${safeClassName}/${safeMedium}/pages/${fileName}`,
    timestamp: Date.now(),
  });
}
