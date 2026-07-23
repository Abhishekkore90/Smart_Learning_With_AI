import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export interface UploadOptions {
  folderPath?: string;
  onProgress?: (percent: number) => void;
  maxSizeBytes?: number;
}

export interface UploadResult {
  url: string;
  storageProvider: "bunny" | "firebase";
  fileName: string;
  sizeBytes: number;
}

/**
 * Robust file uploader utility that uploads to Bunny Storage CDN if configured,
 * or falls back seamlessly to Firebase Storage.
 * Includes real-time progress callbacks and detects HTML SPA fallback responses.
 */
export async function uploadFileWithProgress(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folderPath = "documents",
    onProgress,
    maxSizeBytes = 10 * 1024 * 1024, // 10MB default limit
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
    import.meta.env.VITE_BUNNY_STORAGE_CDN_HOSTNAME || "vz-7a00d099-4a8.b-cdn.net"
  ).replace(/^https?:\/\//, "").replace(/\/$/, "");

  // Attempt Bunny Storage upload if API key is provided
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
      console.warn("Bunny Storage upload unavailable/failed. Falling back to Firebase Storage...", bunnyErr);
    }
  }

  // Fallback to Firebase Storage
  if (storage) {
    try {
      const firebaseUrl = await uploadToFirebase(file, relativeFilePath, onProgress);
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

    // Direct storage endpoint vs Proxy
    const directUrl = `https://storage.bunnycdn.com/${zone}/${path}`;
    const proxyUrl = `/api/bunny-storage/${zone}/${path}`;

    const executeRequest = (targetUrl: string) => {
      xhr.open("PUT", targetUrl);
      xhr.timeout = 15000; // 15 seconds timeout
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
        // Detect if SPA fallback intercepted request (returns HTML 200 OK)
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

/**
 * Uploads file to Firebase Storage with uploadBytesResumable for progress updates.
 */
function uploadToFirebase(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress(percent);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}
