import { useEffect, useState } from "react";

/**
 * Converts a Bunny CDN URL to the correct fetch URL:
 * - In DEV: proxied via Vite dev server (/api/bunny-storage/...)
 * - In PROD: routed through our secure Vercel serverless proxy (/api/pdf-proxy?url=...)
 */
export function getBunnyStorageUrl(publicUrl: string): string {
  if (!publicUrl || publicUrl.startsWith("blob:") || publicUrl.startsWith("data:")) {
    return publicUrl;
  }

  try {
    if (import.meta.env.DEV) {
      // DEV: use Vite proxy (vite.config.ts /api/bunny-storage → storage.bunnycdn.com)
      const urlObj = new URL(publicUrl);
      const path = urlObj.pathname.replace(/^\//, "");
      const zone = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";
      return `/api/bunny-storage/${zone}/${path}`;
    } else {
      // PROD: use our secure Vercel serverless proxy function
      // The API key stays on the server — never exposed to the browser
      return `/api/pdf-proxy?url=${encodeURIComponent(publicUrl)}`;
    }
  } catch (e) {
    console.warn("Failed to parse Bunny public URL:", publicUrl, e);
    return publicUrl;
  }
}

/**
 * A custom hook that fetches a Bunny Storage PDF via our secure proxy,
 * returning a local Blob URL that can be safely embedded in an <iframe>.
 *
 * - On the uploader's PC (DEV/local): uses IndexedDB blob directly
 * - On any other PC (PROD): fetches via /api/pdf-proxy (server-side AccessKey)
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
        // Get the correct proxy URL (DEV: vite proxy, PROD: /api/pdf-proxy)
        const proxyUrl = getBunnyStorageUrl(originalUrl);

        // In DEV mode we still need AccessKey header (Vite proxy just forwards it)
        const headers: Record<string, string> = {};
        if (import.meta.env.DEV) {
          headers["AccessKey"] = import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "";
        }
        // In PROD: no header needed — the Vercel function adds AccessKey server-side

        const response = await fetch(proxyUrl, { headers });

        if (!response.ok) {
          throw new Error(`Failed to download PDF (Status ${response.status})`);
        }

        const blob = await response.blob();

        // Safety check: Make sure we got a PDF, not an HTML error page
        if (blob.type.includes("text/html")) {
          const text = await blob.text();
          if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
            throw new Error("Received HTML instead of PDF from proxy.");
          }
        }

        if (active) {
          const pdfBlob = new Blob([blob], { type: "application/pdf" });
          localUrl = URL.createObjectURL(pdfBlob);
          setPdfBlobUrl(localUrl);
        }
      } catch (err: any) {
        console.error("PDF proxy fetch error:", err);
        if (active) {
          setError(err.message || "Failed to load PDF");
          // Last resort fallback: try Google Docs Viewer with the original CDN URL
          setPdfBlobUrl(null);
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
