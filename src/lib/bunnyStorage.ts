/**
 * Bunny Storage REST API & HTML-to-PDF Conversion Utility
 *
 * Facilitates storing large files, PDFs, and assets on Bunny Storage (CDN)
 * to keep Firebase usage 100% within the free Spark plan limits.
 */

// Configuration defaults (Overridden by environment variables)
const STORAGE_ZONE_NAME = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
const ACCESS_KEY = import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "";
const PULL_ZONE_URL = (import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME 
  ? `https://${import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME}`
  : "https://SGKBRAINOVA.b-cdn.net").replace(/\/$/, "");
const STORAGE_REGION_HOST = import.meta.env.VITE_BUNNY_STORAGE_HOST || "storage.bunnycdn.com";

/**
 * Uploads a Blob or File directly to Bunny Storage Zone via REST API.
 *
 * @param filePath - The path within the storage zone (e.g., "meetings/invitations/invitation_123.pdf")
 * @param blob - The file content as a Blob or File
 * @returns The public CDN URL for accessing the uploaded file
 */
export async function uploadBlobToBunny(filePath: string, blob: Blob): Promise<string> {
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const uploadUrl = `https://${STORAGE_REGION_HOST}/${STORAGE_ZONE_NAME}/${cleanPath}`;

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "AccessKey": ACCESS_KEY,
      "Content-Type": blob.type || "application/octet-stream",
    },
    body: blob,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Bunny Storage upload failed with status ${response.status}: ${errText}`);
  }

  // Return the public CDN Pull Zone URL
  return `${PULL_ZONE_URL}/${cleanPath}`;
}

/**
 * Converts an HTML element or HTML container into a PDF Blob in memory using html2pdf.js.
 *
 * @param element - The DOM HTMLElement to render as PDF
 * @param pdfOptions - Optional html2pdf configuration options
 * @returns A promise that resolves to the PDF Blob
 */
export async function convertElementToPdfBlob(
  element: HTMLElement,
  filename: string = "document.pdf"
): Promise<Blob> {
  // Dynamically import html2pdf.js to preserve bundle splitting
  const html2pdf = (await import("html2pdf.js")).default;

  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  const worker = html2pdf().from(element).set(opt);
  const pdfBlob = (await worker.output("blob")) as Blob;
  return pdfBlob;
}

/**
 * Converts text/HTML content into a PDF document and uploads it directly to Bunny Storage.
 *
 * @param element - The DOM element containing the text/layout to convert
 * @param folderPath - Destination folder on Bunny Storage (e.g. "meetings/notices")
 * @param fileName - File name for the PDF (e.g. "meeting_invitation_07_2026.pdf")
 * @returns The public Bunny CDN URL of the uploaded PDF
 */
export async function generateAndUploadPdfToBunny(
  element: HTMLElement,
  folderPath: string,
  fileName: string
): Promise<string> {
  const pdfBlob = await convertElementToPdfBlob(element, fileName);
  const cleanFolder = folderPath.replace(/\/$/, "");
  const fullPath = `${cleanFolder}/${fileName}`;

  return await uploadBlobToBunny(fullPath, pdfBlob);
}

/**
 * Deletes a file from Bunny Storage Zone via REST API.
 *
 * @param filePath - Path of the file to delete (e.g. "meetings/invitations/notice_123.pdf")
 * @returns Boolean indicating whether deletion succeeded
 */
export async function deleteFromBunny(filePath: string): Promise<boolean> {
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const deleteUrl = `https://${STORAGE_REGION_HOST}/${STORAGE_ZONE_NAME}/${cleanPath}`;

  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      "AccessKey": ACCESS_KEY,
    },
  });

  return response.ok;
}
