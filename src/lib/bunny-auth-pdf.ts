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
 * Validates whether an ArrayBuffer is genuine binary data and not an HTML error/SPA fallback page.
 */
export function isBufferValidBinary(ab: ArrayBuffer | null, isDocx: boolean = false, isPdf: boolean = false): boolean {
  if (!ab || ab.byteLength < 16) return false;
  const bytes = new Uint8Array(ab);

  // If expected to be a Word .docx, it MUST start with ZIP magic bytes 'PK\x03\x04' or 'PK'
  if (isDocx) {
    return bytes[0] === 0x50 && bytes[1] === 0x4B;
  }

  // If expected to be a PDF, it MUST start with '%PDF'
  if (isPdf) {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  // Otherwise, inspect beginning to reject HTML pages
  const slice = bytes.slice(0, Math.min(bytes.length, 120));
  const text = new TextDecoder().decode(slice).toLowerCase();
  if (text.includes("<!doctype") || text.includes("<html") || text.includes("<head") || text.includes("<body")) {
    return false;
  }

  return true;
}

/**
 * Universal binary file fetcher:
 * 1. Tries /api/pdf-proxy?url=... (Works on Vercel and Hostinger via .htaccess rewrite to pdf-proxy.php)
 * 2. Tries /pdf-proxy.php?url=... (Direct PHP proxy on Hostinger)
 * 3. Tries https://sgkbrainova.com/pdf-proxy.php?url=... (External fallback to hosted PHP proxy)
 * 4. Tries Vite dev proxy /api/bunny-storage/... when in DEV
 * 5. Tries Direct Bunny Storage with AccessKey
 * 6. Tries public URL directly (Firebase Storage, open CDNs)
 * Strictly verifies ArrayBuffer is valid binary and not an HTML SPA fallback.
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
  const isBunny = lowerUrl.includes("b-cdn.net") || lowerUrl.includes("bunnycdn.com");

  const candidates: Array<{ url: string; headers?: Record<string, string> }> = [];

  if (isBunny) {
    // 1. Primary: Unified /api/pdf-proxy
    candidates.push({ url: `/api/pdf-proxy?url=${encodeURIComponent(url)}` });

    // 2. Direct Hostinger PHP proxy script
    candidates.push({ url: `/pdf-proxy.php?url=${encodeURIComponent(url)}` });

    // 3. Absolute hosted proxy URL (if accessing from localhost or another origin)
    if (typeof window !== "undefined" && window.location.hostname !== "sgkbrainova.com") {
      candidates.push({ url: `https://sgkbrainova.com/pdf-proxy.php?url=${encodeURIComponent(url)}` });
    }

    // 4. Vite proxy during DEV
    if (import.meta.env.DEV) {
      const direct = getDirectBunnyStorageUrl(url);
      if (direct) {
        const zone = BUNNY_STORAGE_ZONE;
        const rawPath = decodeURIComponent(new URL(url).pathname).replace(/^\//, "");
        const cleanPath = rawPath.startsWith(zone + "/") ? rawPath.slice(zone.length + 1) : rawPath;
        candidates.push({ url: `/api/bunny-storage/${zone}/${cleanPath}` });
      }
    }

    // 5. Direct Bunny Storage URL with AccessKey
    const directStorage = getDirectBunnyStorageUrl(url);
    if (directStorage) {
      candidates.push({ url: directStorage.url, headers: directStorage.headers });
    }
  }

  // Always include direct URL as an attempt (e.g. Firebase Storage, or if CDN has CORS)
  candidates.push({ url });

  // Iterate candidates and return the first valid binary response
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(candidate.url, {
        headers: candidate.headers || {},
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const cType = res.headers.get("content-type") || "";
      if (res.ok && !cType.includes("text/html")) {
        const ab = await res.arrayBuffer();
        if (isBufferValidBinary(ab, isDocx, isPdf)) {
          return ab;
        }
      }
    } catch (err) {
      // Continue to next candidate
    }
  }

  return null;
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
