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
    
    // Convert CDN URL to storage API URL to fetch it using AccessKey authenticated download.
    // This avoids CDN Pull Zone misconfigurations (like returning Vercel index.html fallback)
    // and bypasses CORS and hotlinking restrictions.
    let fetchUrl = jobData.masterPdfUrl;
    const headers: Record<string, string> = {};
    
    if (fetchUrl.includes("b-cdn.net") || fetchUrl.includes("bunny")) {
      try {
        const urlObj = new URL(fetchUrl);
        const path = urlObj.pathname.replace(/^\//, "");
        const zone = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
        const apiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "";
        
        if (import.meta.env.DEV) {
          fetchUrl = `/api/bunny-storage/${zone}/${path}`;
        } else {
          const host = import.meta.env.VITE_BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
          fetchUrl = `https://${host}/${zone}/${path}`;
        }
        
        if (apiKey) {
          headers["AccessKey"] = apiKey;
        }
      } catch (err) {
        console.warn("Failed to parse master PDF URL for storage proxy, fetching direct:", err);
      }
    }

    console.log(`Fetching master PDF for job ${jobId} from ${fetchUrl}`);
    const response = await fetch(fetchUrl, { headers });
    if (!response.ok) throw new Error("Failed to download master PDF for processing.");
    const arrayBuffer = await response.arrayBuffer();

    // Check file type
    const firstFewBytes = new Uint8Array(arrayBuffer.slice(0, 5));
    const headerStr = String.fromCharCode(...firstFewBytes);
    const isPdf = headerStr === "%PDF-";
    
    if (!isPdf) {
      const fileUrlLower = jobData.masterPdfUrl.toLowerCase();
      const isWord = fileUrlLower.endsWith(".docx") || fileUrlLower.endsWith(".doc");
      const isExcel = fileUrlLower.endsWith(".xlsx") || fileUrlLower.endsWith(".xls");
      
      if (isWord || isExcel) {
        console.log(`Document job detected for ${jobId}. Parsing Word/Excel file...`);
        await updateDoc(jobRef, { status: "splitting", lastUpdatedAt: Date.now() });
        
        // Import our parser dynamically to preserve code splitting
        const { parseDiaryFileFromArrayBuffer } = await import("@/lib/parse-diary-file");
        
        const fileType = fileUrlLower.endsWith(".docx") ? "docx" : fileUrlLower.endsWith(".doc") ? "doc" : fileUrlLower.endsWith(".xlsx") ? "xlsx" : "xls";
        const parsedEntries = await parseDiaryFileFromArrayBuffer(arrayBuffer, fileType, jobData.className);
        
        if (!parsedEntries || parsedEntries.length === 0) {
          throw new Error("Failed to parse any entries from the uploaded Word/Excel document.");
        }
        
        console.log(`Parsed ${parsedEntries.length} entries from document. Writing to Firestore...`);
        await updateDoc(jobRef, { totalPages: parsedEntries.length, lastUpdatedAt: Date.now() });
        await updateDoc(jobRef, { status: "uploading_pages", lastUpdatedAt: Date.now() });
        
        const startDateObj = new Date(jobData.startDate);
        
        // Write each parsed entry to Firestore
        for (let idx = 0; idx < parsedEntries.length; idx++) {
          const entry = parsedEntries[idx];
          
          let targetDateStr = entry.date;
          if (!targetDateStr) {
            const nextDate = new Date(startDateObj);
            nextDate.setDate(startDateObj.getDate() + idx);
            targetDateStr = format(nextDate, "yyyy-MM-dd");
          }
          
          const daysOfWeek = ["रविवार", "सोमवार", "मंगळवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
          const entryDateObj = new Date(targetDateStr);
          const marathiDay = daysOfWeek[entryDateObj.getDay()];
          
          // Save mapping to Firestore under teacher_diaries/{class}/{medium}/{date}
          const pageRef = doc(db, "teacher_diaries", jobData.className, jobData.medium, targetDateStr);
          await setDoc(pageRef, {
            diaryDate: targetDateStr,
            class: jobData.className,
            medium: jobData.medium,
            pageUrl: jobData.masterPdfUrl, // original file URL (Word/Excel)
            pageURL: jobData.masterPdfUrl,
            masterPdfUrl: jobData.masterPdfUrl,
            pageNumber: idx + 1,
            timestamp: Date.now(),
            parsedContent: {
              ...entry,
              date: targetDateStr,
              day: entry.day || marathiDay,
            }
          });
          
          // Update progress
          await updateDoc(jobRef, {
            processedPages: idx + 1,
            lastUpdatedAt: Date.now(),
          });
        }
        
        // Update job status to completed!
        await updateDoc(jobRef, {
          status: "completed",
          lastUpdatedAt: Date.now(),
        });
        
        return; // Finished Word/Excel processing!
      } else {
        throw new Error("Downloaded file is not a valid PDF document (missing %PDF- header) and not a recognized Word/Excel file.");
      }
    }

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
