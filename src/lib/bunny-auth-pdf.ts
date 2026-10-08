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
      // DEV: use Vite proxy (vite.config.ts /api/bunny-storage → storage.bunnycdn.com)
      return `/api/bunny-storage/${zone}/${encodedSegments}`;
    } else {
      // PROD: use our secure Vercel serverless proxy function
      return `/api/pdf-proxy?url=${encodeURIComponent(publicUrl)}`;
    }
  } catch (e) {
    console.warn("Failed to parse Bunny public URL:", publicUrl, e);
    return publicUrl;
  }
}

/**
 * Universal binary file fetcher:
 * 1. Tries serverless proxy / Vite dev proxy for Bunny CDN files (Zero CORS issues).
 * 2. Tries public URL directly (for Firebase Storage, public CDNs, etc.).
 * Rejects HTML error / SPA fallback pages.
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

  // 1. Primary: Serverless Proxy / Vite Dev Proxy for Bunny CDN files
  const proxyUrl = getBunnyStorageUrl(url);
  if (proxyUrl && proxyUrl !== url) {
    try {
      const res = await fetch(proxyUrl);
      const cType = res.headers.get("content-type") || "";
      if (res.ok && !cType.includes("text/html")) {
        const ab = await res.arrayBuffer();
        const header = new TextDecoder().decode(new Uint8Array(ab.slice(0, 50))).toLowerCase();
        if (!header.includes("<!doctype") && !header.includes("<html")) {
          return ab;
        }
      }
    } catch (e) {
      console.warn("Proxy fetch notice:", e);
    }
  }

  // 2. Secondary: Direct public CDN URL / Firebase Storage without custom preflight headers
  try {
    const res = await fetch(url);
    const cType = res.headers.get("content-type") || "";
    if (res.ok && !cType.includes("text/html")) {
      const ab = await res.arrayBuffer();
      const header = new TextDecoder().decode(new Uint8Array(ab.slice(0, 50))).toLowerCase();
      if (!header.includes("<!doctype") && !header.includes("<html")) {
        return ab;
      }
    }
  } catch (e) {
    console.warn("Direct URL fetch notice:", e);
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
