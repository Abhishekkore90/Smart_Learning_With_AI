import React, { useState, useEffect } from "react";

interface SafePhotoProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback: React.ReactNode;
}

/**
 * SafePhoto verifies and converts image URLs to local base64 Data URLs.
 * If the image is cross-origin and fails CORS, it falls back gracefully to
 * the provided SVG/Emoji fallback, ensuring the DOM NEVER contains a tainted
 * image that would crash html2canvas or jsPDF.
 */
export function SafePhoto({ src, alt = "Student Photo", className = "w-full h-full object-cover", fallback }: SafePhotoProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(() => {
    if (src && src.startsWith("data:")) return src;
    return null;
  });
  const [failed, setFailed] = useState<boolean>(!src);

  useEffect(() => {
    if (!src) {
      setFailed(true);
      setDataUrl(null);
      return;
    }

    if (src.startsWith("data:")) {
      setDataUrl(src);
      setFailed(false);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 120;
        canvas.height = img.naturalHeight || 140;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL("image/jpeg", 0.9);
          setDataUrl(base64);
          setFailed(false);
          return;
        }
      } catch (err) {
        // Tainted by cross-origin server without CORS headers
        console.warn("Cross-origin photo tainted, using fallback:", err);
      }
      setFailed(true);
    };

    img.onerror = () => {
      if (!isMounted) return;
      setFailed(true);
    };

    img.src = src;

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (failed || !dataUrl) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      className={className}
    />
  );
}
