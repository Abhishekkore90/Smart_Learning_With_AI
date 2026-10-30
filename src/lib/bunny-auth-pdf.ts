import { useEffect, useState } from "react";

export const BUNNY_STORAGE_API_KEY =
  import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "bc06a0c2-aad1-436c-b88a1c197eca-d74a-44e8";
export const BUNNY_STORAGE_ZONE =
  import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";

/**
 * Converts a Bunny CDN URL directly to the CORS-enabled direct Bunny Storage URL.
 * storage.bunnycdn.com natively supports CORS (Access-Control-Allow-Origin: *) with AccessKey.
 */
export function getDirectBunnyStorageUrl(publicUrl: string): { url: string; headers: Record<string, string> } | null {
  if (!publicUrl || publicUrl.startsWith("blob:") || publicUrl.startsWith("data:")) {
    return null;
  }
  try {
    const urlObj = new URL(publicUrl);
    if (!urlObj.hostname.includes("b-cdn.net") && !urlObj.hostname.includes("bunnycdn.com")) {
      return null;
    }
    const zone = BUNNY_STORAGE_ZONE;
    const rawPath = decodeURIComponent(urlObj.pathname).replace(/^\//, "");
    const cleanPath = rawPath.startsWith(zone + "/") ? rawPath.slice(zone.length + 1) : rawPath;

    return {
      url: `https://storage.bunnycdn.com/${zone}/${cleanPath.split("/").map(encodeURIComponent).join("/")}`,
      headers: {
        AccessKey: BUNNY_STORAGE_API_KEY,
      },
    };
  } catch (e) {
    return null;
  }
}

/**
 * Converts a Bunny CDN URL to the correct proxy fetch URL:
 * - In DEV: proxied via Vite dev server (/api/bunny-storage/...)
 * - In PROD: routed through our secure Vercel serverless proxy (/api/pdf-proxy?url=...)
 */
export function getBunnyStorageUrl(publicUrl: string): string {
  if (!publicUrl || publicUrl.startsWith("blob:") || publicUrl.startsWith("data:")) {
    return publicUrl;
  }

  try {
    const urlObj = new URL(publicUrl);
    if (!urlObj.hostname.includes("b-cdn.net") && !urlObj.hostname.includes("bunnycdn.com")) {
      return publicUrl;
    }
    const zone = BUNNY_STORAGE_ZONE;
    const rawPath = decodeURIComponent(urlObj.pathname).replace(/^\//, "");
    const cleanPath = rawPath.startsWith(zone + "/") ? rawPath.slice(zone.length + 1) : rawPath;
    const encodedSegments = cleanPath.split("/").map(encodeURIComponent).join("/");

    if (import.meta.env.DEV) {
      // DEV: use Vite dev proxy
      return `/api/bunny-storage/${zone}/${encodedSegments}`;
    } else {
      // PROD: use PHP proxy on Hostinger / Serverless proxy on Vercel
      return `/api/pdf-proxy?url=${encodeURIComponent(publicUrl)}`;
    }
  } catch (e) {
    console.warn("Failed to parse Bunny public URL:", publicUrl, e);
    return publicUrl;
  }
}

/**
 * Validates whether an ArrayBuffer is genuine binary data and not an HTML/PHP error or script file.
 */
export function isBufferValidBinary(
  ab: ArrayBuffer | null,
  isDocx: boolean = false,
  isPdf: boolean = false,
  isXlsx: boolean = false
): boolean {
  if (!ab || ab.byteLength < 16) return false;
  const bytes = new Uint8Array(ab);

  // If expected to be a Word .docx or Excel .xlsx, it MUST start with ZIP magic bytes 'PK\x03\x04' (0x50, 0x4B)
  if (isDocx || isXlsx) {
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
    const isOle = isXlsx && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    return isZip || isOle;
  }

  // If expected to be a PDF, it MUST start with '%PDF'
  if (isPdf) {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  // Otherwise, inspect beginning to reject HTML, PHP, JSON errors, or plain text
  const slice = bytes.slice(0, Math.min(bytes.length, 256));
  const text = new TextDecoder().decode(slice).trim().toLowerCase();
  if (
    text.startsWith("<?php") ||
    text.includes("<?php") ||
    text.startsWith("<!doctype") ||
    text.includes("<html") ||
    text.includes("<head") ||
    text.includes("<body") ||
    text.startsWith("{\"error\"") ||
    text.includes("\"error\":") ||
    text.includes("failed to fetch")
  ) {
    return false;
  }

  return true;
}

// In-memory binary cache to ensure zero-latency reuse across user actions
const binaryMemoryCache = new Map<string, ArrayBuffer>();

// Pending fetch promises map for automatic deduplication of concurrent requests
const activeFetchPromises = new Map<string, Promise<ArrayBuffer | null>>();

/**
 * Universal binary file fetcher with:
 * 1. In-memory fast cache (0ms return)
 * 2. Persistent IndexedDB cache (<15ms return)
 * 3. Smart candidate ranking & progressive parallel fetching (no 15s dead serial timeouts!)
 * 4. Automatic saving to IndexedDB on first download
 */
export async function fetchBinaryFile(url: string): Promise<ArrayBuffer | null> {
  if (!url) return null;

  if (url.startsWith("blob:") || url.startsWith("data:")) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.arrayBuffer();
    } catch (e) {
      console.warn("Blob/data URL fetch error:", e);
    }
    return null;
  }

  const lowerUrl = url.toLowerCase();
  const isDocx = lowerUrl.includes(".docx");
  const isPdf = lowerUrl.includes(".pdf");
  const isXlsx = lowerUrl.includes(".xlsx") || lowerUrl.includes(".xls");

  // 1. Check in-memory cache
  if (binaryMemoryCache.has(url)) {
    const memBuf = binaryMemoryCache.get(url)!;
    if (isBufferValidBinary(memBuf, isDocx, isPdf, isXlsx)) {
      return memBuf;
    }
    binaryMemoryCache.delete(url);
  }

  // 2. Check IndexedDB persistent cache
  try {
    const { getFileFromIndexedDB, deleteFileFromIndexedDB } = await import("@/lib/indexedDbStorage");
    const cachedBlob = await getFileFromIndexedDB(`doc_binary_${url}`);
    if (cachedBlob && cachedBlob.size > 100) {
      const cachedAb = await cachedBlob.arrayBuffer();
      if (isBufferValidBinary(cachedAb, isDocx, isPdf, isXlsx)) {
        binaryMemoryCache.set(url, cachedAb);
        return cachedAb;
      } else {
        // Corrupted cache entry (e.g. static PHP script mistakenly cached) — purge immediately!
        deleteFileFromIndexedDB(`doc_binary_${url}`).catch(() => {});
      }
    }
  } catch (idbErr) {
    // Ignore IndexedDB read error and proceed to network
  }

  // 3. Deduplicate active in-flight requests for the same URL
  if (activeFetchPromises.has(url)) {
    return activeFetchPromises.get(url)!;
  }

  const fetchPromise = (async () => {
    const isBunny = lowerUrl.includes("b-cdn.net") || lowerUrl.includes("bunnycdn.com");

    const candidates: Array<{ name: string; url: string; headers?: Record<string, string> }> = [];

    if (isBunny) {
      const directStorage = getDirectBunnyStorageUrl(url);

      // In DEV: use Vite dev proxy
      if (import.meta.env.DEV && directStorage) {
        const zone = BUNNY_STORAGE_ZONE;
        const rawPath = decodeURIComponent(new URL(url).pathname).replace(/^\//, "");
        const cleanPath = rawPath.startsWith(zone + "/") ? rawPath.slice(zone.length + 1) : rawPath;
        candidates.push({ name: "Vite dev proxy", url: `/api/bunny-storage/${zone}/${cleanPath}` });
      }

      // Primary on Vercel & Production: Unified serverless proxy with server-side AccessKey
      candidates.push({ name: "api/pdf-proxy", url: `/api/pdf-proxy?url=${encodeURIComponent(url)}` });

      // Secondary: Direct Bunny Storage with AccessKey (browser CORS preflight)
      if (directStorage) {
        candidates.push({ name: "Direct Bunny Storage", url: directStorage.url, headers: directStorage.headers });
      }

      // Tertiary: Only execute PHP proxy on actual PHP host (sgkbrainova.com)
      if (typeof window !== "undefined" && window.location.hostname === "sgkbrainova.com") {
        candidates.push({ name: "pdf-proxy.php", url: `/pdf-proxy.php?url=${encodeURIComponent(url)}` });
      } else if (
        typeof window !== "undefined" &&
        !window.location.hostname.includes("vercel.app") &&
        window.location.hostname !== "localhost" &&
        !window.location.hostname.includes("127.0.0.1")
      ) {
        candidates.push({ name: "Hosted PHP proxy", url: `https://sgkbrainova.com/pdf-proxy.php?url=${encodeURIComponent(url)}` });
      }
    }

    // Direct URL: only include if NOT direct storage.bunnycdn.com (which requires AccessKey and logs 401 in console)
    if (!lowerUrl.includes("storage.bunnycdn.com")) {
      candidates.push({ name: "Direct URL", url });
    }

    // Staggered parallel race: Start primary immediately (t=0ms).
    // If not completed within 600ms, start secondary concurrently.
    // The moment ANY candidate returns a valid binary buffer, it wins immediately
    // and aborts all pending/active candidates!
    const abortControllers: Array<{ abort: () => void }> = [];

    const successfulAb = await new Promise<ArrayBuffer | null>((resolve) => {
      let isDone = false;
      let activeOrPendingCount = candidates.length;

      const onWinner = (ab: ArrayBuffer) => {
        if (isDone) return;
        isDone = true;
        // Abort remaining running requests / cancel timers
        for (const ctrl of abortControllers) {
          try {
            ctrl.abort();
          } catch (_) {}
        }
        resolve(ab);
      };

      const onCandidateFail = () => {
        activeOrPendingCount--;
        if (activeOrPendingCount <= 0 && !isDone) {
          isDone = true;
          resolve(null);
        }
      };

      candidates.forEach((cand, index) => {
        // Stagger launching candidates: 0ms for primary, 600ms for secondary, 1200ms for 3rd...
        const delayMs = index === 0 ? 0 : index * 600;
        const startTimer = setTimeout(async () => {
          if (isDone) {
            onCandidateFail();
            return;
          }

          const controller = new AbortController();
          abortControllers.push(controller);
          // 25s max stream timeout per candidate
          const timeoutId = setTimeout(() => {
            try {
              controller.abort();
            } catch (_) {}
          }, 25000);

          try {
            const res = await fetch(cand.url, {
              headers: cand.headers || {},
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const cType = (res.headers.get("content-type") || "").toLowerCase();
            if (
              res.ok &&
              !cType.includes("text/html") &&
              !cType.includes("php") &&
              !cType.includes("x-httpd-php") &&
              !cType.includes("text/plain")
            ) {
              const ab = await res.arrayBuffer();
              if (isBufferValidBinary(ab, isDocx, isPdf, isXlsx)) {
                onWinner(ab);
                return;
              }
            }
          } catch (err) {
            clearTimeout(timeoutId);
          }

          onCandidateFail();
        }, delayMs);

        // Register timer cancellation
        abortControllers.push({ abort: () => clearTimeout(startTimer) });
      });
    });

    if (successfulAb) {
      // Store in memory cache
      binaryMemoryCache.set(url, successfulAb);

      // Store in persistent IndexedDB asynchronously (won't block UI)
      try {
        const { saveFileToIndexedDB } = await import("@/lib/indexedDbStorage");
        const blob = new Blob([successfulAb], {
          type: isDocx
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : isXlsx
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : isPdf
            ? "application/pdf"
            : "application/octet-stream"
        });
        saveFileToIndexedDB(`doc_binary_${url}`, blob).catch(() => {});
      } catch (saveErr) {
        // Ignore cache save error
      }
    }

    return successfulAb;
  })();

  activeFetchPromises.set(url, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    activeFetchPromises.delete(url);
  }
}

/**
 * A custom hook that fetches a PDF safely:
 * - On the uploader's PC (DEV/local): uses IndexedDB blob directly
 * - On any hosted PC (PROD): fetches via universal binary fetcher
 */
export function useAuthenticatedPdf(originalUrl: string | null) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let localUrl: string | null = null;

    const loadPdf = async () => {
      if (!originalUrl) {
        setPdfBlobUrl(null);
        setError(null);
        return;
      }

      // Already a local blob or data URL — use directly, no fetch needed
      if (originalUrl.startsWith("blob:") || originalUrl.startsWith("data:")) {
        setPdfBlobUrl(originalUrl);
        setError(null);
        return;
      }

      // Non-Bunny URLs (Firebase, etc.) — use directly
      if (!originalUrl.includes("b-cdn.net") && !originalUrl.includes("bunny")) {
        setPdfBlobUrl(originalUrl);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const ab = await fetchBinaryFile(originalUrl);
        if (ab && active) {
          const pdfBlob = new Blob([ab], { type: "application/pdf" });
          localUrl = URL.createObjectURL(pdfBlob);
          setPdfBlobUrl(localUrl);
          setLoading(false);
          return;
        }

        // Final direct fallback to originalUrl so native PDF browser viewer can load
        if (active) {
          setPdfBlobUrl(originalUrl);
          setError(null);
        }
      } catch (err: any) {
        console.warn("useAuthenticatedPdf fetch notice:", err);
        if (active) {
          setPdfBlobUrl(originalUrl);
          setError(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      active = false;
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [originalUrl]);

  return { pdfBlobUrl, loading, error };
}
