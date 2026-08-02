import { useEffect, useState } from "react";

/**
 * Converts a Bunny CDN URL to a direct Bunny Storage REST API URL (proxied in DEV).
 */
export function getBunnyStorageUrl(publicUrl: string): string {
  if (!publicUrl || publicUrl.startsWith("blob:") || publicUrl.startsWith("data:")) {
    return publicUrl;
  }

  try {
    const urlObj = new URL(publicUrl);
    // Extract path after hostname
    const path = urlObj.pathname.replace(/^\//, "");
    const zone = import.meta.env.VITE_BUNNY_STORAGE_ZONE || "sgkbrainova";

    if (import.meta.env.DEV) {
      return `/api/bunny-storage/${zone}/${path}`;
    } else {
      const host = import.meta.env.VITE_BUNNY_STORAGE_HOST || "storage.bunnycdn.com";
      return `https://${host}/${zone}/${path}`;
    }
  } catch (e) {
    console.warn("Failed to parse Bunny public URL:", publicUrl, e);
    return publicUrl;
  }
}

/**
 * A custom hook to fetch a Bunny Storage PDF using the AccessKey header,
 * returning a local Blob URL that can be safely loaded in an iframe.
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

      // If it's a firebase URL or local URL, use it directly
      if (!originalUrl.includes("b-cdn.net") && !originalUrl.includes("bunny")) {
        setPdfBlobUrl(originalUrl);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const storageUrl = getBunnyStorageUrl(originalUrl);
        const headers: Record<string, string> = {
          AccessKey: import.meta.env.VITE_BUNNY_STORAGE_API_KEY || "",
        };

        const response = await fetch(storageUrl, { headers });
        if (!response.ok) {
          throw new Error(`Failed to download PDF (Status ${response.status})`);
        }

        const blob = await response.blob();
        
        // Double check response content type is actually PDF, not SPA index.html
        if (blob.type.includes("text/html") || blob.size < 15000) {
          const text = await blob.text();
          if (text.trim().startsWith("<!DOCTYPE")) {
            throw new Error("Received HTML content instead of PDF. CDN fallback returned SPA index.");
          }
        }

        if (active) {
          const pdfBlob = new Blob([blob], { type: "application/pdf" });
          localUrl = URL.createObjectURL(pdfBlob);
          setPdfBlobUrl(localUrl);
        }
      } catch (err: any) {
        console.error("Error loading Bunny Storage PDF via authenticated request:", err);
        if (active) {
          setError(err.message || "Failed to load PDF");
          // Fallback to original URL so there's still a chance it works if the CDN gets fixed
          setPdfBlobUrl(originalUrl);
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
