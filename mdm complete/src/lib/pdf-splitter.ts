import { PDFDocument } from "pdf-lib";

/**
 * Splits a multi-page PDF file into individual single-page PDF Blobs.
 * 
 * @param arrayBuffer The ArrayBuffer of the uploaded multi-page PDF file.
 * @param onPageProcessed Callback function triggered after each page is processed.
 * @returns A promise resolving to an array of Blobs, each containing a single-page PDF.
 */
export async function splitPdf(
  arrayBuffer: ArrayBuffer,
  onPageProcessed?: (currentPage: number, totalPages: number) => void
): Promise<Blob[]> {
  const originalDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = originalDoc.getPageCount();
  const splitBlobs: Blob[] = [];

  for (let i = 0; i < totalPages; i++) {
    // Create a new PDF document for this single page
    const subDoc = await PDFDocument.create();
    
    // Copy the current page from the original document
    const [copiedPage] = await subDoc.copyPages(originalDoc, [i]);
    subDoc.addPage(copiedPage);

    // Save the single-page document to bytes
    const pdfBytes = await subDoc.save();

    // Create a Blob from the bytes
    const pageBlob = new Blob([pdfBytes as any], { type: "application/pdf" });
    splitBlobs.push(pageBlob);

    // Trigger callback if provided
    if (onPageProcessed) {
      onPageProcessed(i + 1, totalPages);
    }
  }

  return splitBlobs;
}
