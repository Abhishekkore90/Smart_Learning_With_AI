import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export interface UploadOptions {
  folderPath?: string;
  onProgress?: (percent: number) => void;
  maxSizeBytes?: number;
  preferredProvider?: "firebase" | "bunny";
}

export interface UploadResult {
  url: string;
  storageProvider: "bunny" | "firebase";
  fileName: string;
  sizeBytes: number;
}

/**
 * Robust file uploader utility that uploads to Firebase Storage or Bunny Storage CDN.
 * Prefers fast direct binary upload to Firebase Storage by default.
 */
export async function uploadCardImage(file: File): Promise<string> {
  if (!storage) throw new Error("Storage not initialized");
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storageRef = ref(storage, `cards/${timestamp}_${safeName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function uploadFileWithProgress(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folderPath = "documents",
    onProgress,
    maxSizeBytes = 50 * 1024 * 1024, // 50MB default limit
    preferredProvider = "firebase",
  } = options;

  if (file.size > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`File size exceeds maximum allowed limit of ${sizeMb}MB.`);
  }

  const cleanFolder = folderPath.replace(/^\/+|\/+$/g, "");
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 9) + "_" + timestamp;
  const cleanFileName = `${uniqueId}_${file.name.replace(/[^\u0900-\u097Fa-zA-Z0-9.\-_]/g, "_").replace(/_+/g, "_")}`;
  const relativeFilePath = `${cleanFolder}/${cleanFileName}`;

  const storageApiKey = import.meta.env.VITE_BUNNY_STORAGE_API_KEY;
  const storageZone = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
  const cdnHostname = (
    import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME || "sgkbrainova.b-cdn.net"
  ).replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Strategy 1: Attempt ultra-fast Firebase Storage direct binary upload
  if (preferredProvider === "firebase" && storage) {
    try {
      const firebaseUrl = await uploadToFirebaseFast(file, relativeFilePath, onProgress);
      return {
        url: firebaseUrl,
        storageProvider: "firebase",
        fileName: file.name,
        sizeBytes: file.size,
      };
    } catch (fbErr) {
      console.warn("Firebase Storage upload failed. Falling back to Bunny Storage...", fbErr);
    }
  }

  // Strategy 2: Attempt Bunny Storage upload if API key is provided
  if (storageApiKey && storageZone) {
    try {
      const bunnyUrl = await uploadToBunny(
        file,
        storageZone,
        storageApiKey,
        cdnHostname,
        relativeFilePath,
        onProgress
      );

      return {
        url: bunnyUrl,
        storageProvider: "bunny",
        fileName: file.name,
        sizeBytes: file.size,
      };
    } catch (bunnyErr) {
      console.warn("Bunny Storage upload unavailable/failed...", bunnyErr);
    }
  }

  // Strategy 3: Fallback to Firebase Storage if not tried already
  if (storage) {
    try {
      const firebaseUrl = await uploadToFirebaseFast(file, relativeFilePath, onProgress);
      return {
        url: firebaseUrl,
        storageProvider: "firebase",
        fileName: file.name,
        sizeBytes: file.size,
      };
    } catch (fbErr: any) {
      console.error("Firebase Storage upload error:", fbErr);
      throw new Error(fbErr?.message || "Failed to upload file to storage server.");
    }
  }

  throw new Error("No storage provider is currently configured or available.");
}

/**
 * Ultra-fast single payload binary upload using uploadBytes (bypasses resumable slice chunking).
 */
async function uploadToFirebaseFast(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const storageRef = ref(storage, path);
  if (onProgress) onProgress(10);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);
    let lastPercent = 0;

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          if (percent !== lastPercent) {
            lastPercent = percent;
            if (onProgress) onProgress(percent);
          }
        }
      },
      (error) => {
        console.error("Firebase upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve(downloadUrl);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Uploads file to Bunny Storage using XMLHttpRequest to track progress and verify response header.
 */
function uploadToBunny(
  file: File,
  zone: string,
  apiKey: string,
  cdnHostname: string,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const directUrl = `https://storage.bunnycdn.com/${zone}/${path}`;
    const proxyUrl = `/api/bunny-storage/${zone}/${path}`;

    const executeRequest = (targetUrl: string) => {
      xhr.open("PUT", targetUrl);
      xhr.timeout = 15000;
      xhr.setRequestHeader("AccessKey", apiKey);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        const contentType = xhr.getResponseHeader("content-type") || "";
        if (contentType.includes("text/html") || xhr.responseText.trim().startsWith("<!DOCTYPE")) {
          if (targetUrl === proxyUrl) {
            reject(new Error("SPA router intercepted request returning index.html"));
          } else {
            executeRequest(proxyUrl);
          }
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          const publicCdnUrl = `https://${cdnHostname}/${path}`;
          resolve(publicCdnUrl);
        } else {
          if (targetUrl === directUrl) {
            executeRequest(proxyUrl);
          } else {
            reject(new Error(`Bunny Storage upload failed (Status: ${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        if (targetUrl === directUrl) {
          executeRequest(proxyUrl);
        } else {
          reject(new Error("Network error during Bunny Storage upload."));
        }
      };

      xhr.ontimeout = () => {
        if (targetUrl === directUrl) {
          executeRequest(proxyUrl);
        } else {
          reject(new Error("Upload request timed out."));
        }
      };

      xhr.send(file);
    };

    executeRequest(directUrl);
  });
}
