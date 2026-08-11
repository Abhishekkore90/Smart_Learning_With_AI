"use strict";
const STORAGE_ZONE_NAME = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
const ACCESS_KEY = import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "";
const PULL_ZONE_URL = import.meta.env.DEV ? "/api/bunny-cdn" : (import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME ? `https://${import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME}` : "https://sgkbrainova.b-cdn.net").replace(/\/$/, "");
const STORAGE_REGION_HOST = import.meta.env.VITE_BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
export async function uploadBlobToBunny(filePath, blob) {
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const uploadUrl = `https://${STORAGE_REGION_HOST}/${STORAGE_ZONE_NAME}/${cleanPath}`;
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "AccessKey": ACCESS_KEY,
      "Content-Type": blob.type || "application/octet-stream"
    },
    body: blob
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Bunny Storage upload failed with status ${response.status}: ${errText}`);
  }
  return `${PULL_ZONE_URL}/${cleanPath}`;
}
export async function saveJsonToBunny(filePath, data) {
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const jsonString = JSON.stringify(data);
  const blob = new Blob([jsonString], { type: "application/json" });
  try {
    const cacheKey = `bunny_cache_${cleanPath.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    localStorage.setItem(cacheKey, jsonString);
  } catch (e) {
  }
  return await uploadBlobToBunny(cleanPath, blob);
}
export async function fetchJsonFromBunny(filePath) {
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const cacheKey = `bunny_cache_${cleanPath.replace(/[^a-zA-Z0-9_]/g, "_")}`;
  try {
    const cdnUrl = `${PULL_ZONE_URL}/${cleanPath}?t=${Date.now()}`;
    const res = await fetch(cdnUrl);
    if (res.ok) {
      const data = await res.json();
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (e) {
      }
      return data;
    }
  } catch (err) {
    console.warn(`Could not fetch ${cleanPath} from Bunny CDN, trying cache...`, err);
  }
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
  }
  return null;
}
export async function convertElementToPdfBlob(element, filename = "document.pdf", orientation = "portrait") {
  if (typeof window === "undefined") {
    throw new Error("PDF generation is only supported in the browser environment.");
  }
  const html2pdf = (await import("html2pdf.js")).default;
  const opt = {
    margin: [10, 10, 10, 10],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation }
  };
  const worker = html2pdf().from(element).set(opt);
  const pdfBlob = await worker.output("blob");
  return pdfBlob;
}
export async function generateAndUploadPdfToBunny(element, folderPath, fileName) {
  const pdfBlob = await convertElementToPdfBlob(element, fileName);
  const cleanFolder = folderPath.replace(/\/$/, "");
  const fullPath = `${cleanFolder}/${fileName}`;
  return await uploadBlobToBunny(fullPath, pdfBlob);
}
export async function deleteFromBunny(filePath) {
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  const deleteUrl = `https://${STORAGE_REGION_HOST}/${STORAGE_ZONE_NAME}/${cleanPath}`;
  const response = await fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      "AccessKey": ACCESS_KEY
    }
  });
  return response.ok;
}
