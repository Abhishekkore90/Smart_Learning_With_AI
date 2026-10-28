import React, { useRef, useState, useEffect } from "react";

export interface A4DocumentMobileScaleWrapperProps {
  children: React.ReactNode;
  /**
   * Target width in pixels for the document at 100% scale.
   * Standard A4 portrait: 794 - 850px.
   * Standard A4 landscape: 1120px.
   * Wide tables (B-Form, Poshan Daily): 1600 - 1750px.
   */
  targetWidth?: number;
  className?: string;
}

export const A4DocumentMobileScaleWrapper: React.FC<A4DocumentMobileScaleWrapperProps> = ({
  children,
  targetWidth = 794,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const parentWidth = rect.width || containerRef.current.clientWidth || window.innerWidth;

      // Available width on mobile screen (with 2px margin for safe edge rendering)
      const availableWidth = Math.max(0, parentWidth - 2);

      if (availableWidth > 0 && availableWidth < targetWidth) {
        const s = Number((availableWidth / targetWidth).toFixed(4));
        setScale(s);
        if (contentRef.current) {
          setScaledHeight(Math.round(contentRef.current.offsetHeight * s));
        }
      } else {
        setScale(1);
        setScaledHeight(null);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateScale);
      if (containerRef.current) ro.observe(containerRef.current);
      if (contentRef.current) ro.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateScale);
      if (ro) ro.disconnect();
    };
  }, [targetWidth]);

  const supportsZoom = typeof document !== "undefined" && "zoom" in document.documentElement.style;

  return (
    <div
      ref={containerRef}
      className={`a4-document-mobile-scale-wrapper w-full max-w-full flex justify-center overflow-x-hidden ${className}`}
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        ...(scale < 1 && !supportsZoom && scaledHeight ? { height: `${scaledHeight}px` } : {}),
      }}
    >
      <div
        ref={contentRef}
        className="a4-document-mobile-scale-inner shrink-0"
        style={
          scale < 1
            ? supportsZoom
              ? {
                  zoom: scale,
                  width: `${targetWidth}px`,
                  minWidth: `${targetWidth}px`,
                  maxWidth: `${targetWidth}px`,
                }
              : {
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  width: `${targetWidth}px`,
                  minWidth: `${targetWidth}px`,
                  maxWidth: `${targetWidth}px`,
                }
            : {
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }
        }
      >
        {children}
      </div>
      <style>{`
        @media screen and (max-width: 768px) {
          .a4-document-mobile-scale-wrapper {
            overflow-x: hidden !important;
            max-width: 100% !important;
          }
          .a4-document-mobile-scale-wrapper .overflow-x-auto {
            overflow-x: hidden !important;
          }
        }
        @media print {
          .a4-document-mobile-scale-wrapper {
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
          }
          .a4-document-mobile-scale-inner {
            zoom: 1 !important;
            transform: none !important;
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default A4DocumentMobileScaleWrapper;
