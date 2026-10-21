import { toast } from "sonner";

/**
 * Notifies native Android / WebView interfaces if present in the mobile application wrapper
 */
export const notifyAndroidNativeApp = (message: string) => {
  try {
    const win = typeof window !== "undefined" ? (window as any) : null;
    if (!win) return;

    if (typeof win.Android?.showToast === "function") {
      win.Android.showToast(message);
    } else if (typeof win.AndroidBridge?.showToast === "function") {
      win.AndroidBridge.showToast(message);
    } else if (typeof win.AndroidInterface?.showToast === "function") {
      win.AndroidInterface.showToast(message);
    } else if (typeof win.AndroidGoogleAuth?.showToast === "function") {
      win.AndroidGoogleAuth.showToast(message);
    } else if (typeof win.Android?.showLoading === "function") {
      win.Android.showLoading(message);
    }
  } catch (err) {
    console.debug("Native Android notification notice:", err);
  }
};

let lastDownloadToastTime = 0;

/**
 * Shows a high-priority "PDF is downloading, please wait..." message on mobile and WebView
 */
export const showMobilePdfDownloadingMessage = (customMsg?: string): string | number => {
  const msg = customMsg || "⏳ PDF डाऊनलोड होत आहे, कृपया थांबा... (PDF is downloading, please wait...)";

  // Notify Android Native bridge if the mobile app has one
  notifyAndroidNativeApp("PDF डाऊनलोड होत आहे, कृपया थांबा... (PDF is downloading, please wait...)");

  lastDownloadToastTime = Date.now();

  // Display high-priority loading toast on mobile screen
  const toastId = toast.loading(msg, {
    id: "global-pdf-download-toast",
    duration: 12000,
  });

  return toastId;
};

/**
 * Dismisses the loading message and shows completion
 */
export const showMobilePdfDownloadComplete = (toastId?: string | number, successMsg?: string) => {
  const msg = successMsg || "🎉 PDF यशस्वीरित्या डाऊनलोड झाली! (PDF Download Complete)";

  notifyAndroidNativeApp(msg);

  toast.success(msg, {
    id: toastId || "global-pdf-download-toast",
    duration: 3500,
  });
};

/**
 * Shows error if download fails
 */
export const showMobilePdfDownloadError = (toastId?: string | number, errorMsg?: string) => {
  const msg = errorMsg || "❌ PDF डाऊनलोड करताना त्रुटी आली. कृपया पुन्हा प्रयत्न करा.";

  notifyAndroidNativeApp(msg);

  toast.error(msg, {
    id: toastId || "global-pdf-download-toast",
    duration: 4000,
  });
};

/**
 * Global click interceptor to catch any download button click across the web view application
 */
export const setupGlobalDownloadClickListener = () => {
  if (typeof window === "undefined") return;

  const handleGlobalClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Check if the clicked element or any parent is a download trigger
    const downloadEl = target.closest("button, a, [role='button'], [data-download]");
    if (!downloadEl) return;

    const text = (downloadEl.textContent || "").toLowerCase();
    const title = (downloadEl.getAttribute("title") || "").toLowerCase();
    const ariaLabel = (downloadEl.getAttribute("aria-label") || "").toLowerCase();
    const href = (downloadEl.getAttribute("href") || "").toLowerCase();
    const hasDownloadAttr = downloadEl.hasAttribute("download");
    const isDownloadIcon = !!downloadEl.querySelector("svg.lucide-download, .lucide-download");

    const isDownloadAction =
      hasDownloadAttr ||
      isDownloadIcon ||
      text.includes("download") ||
      text.includes("डाऊनलोड") ||
      title.includes("download") ||
      title.includes("डाऊनलोड") ||
      ariaLabel.includes("download") ||
      ariaLabel.includes("डाऊनलोड") ||
      href.includes(".pdf");

    if (isDownloadAction) {
      // Debounce so rapid clicks don't re-trigger within 1.5 seconds
      if (Date.now() - lastDownloadToastTime > 1500) {
        showMobilePdfDownloadingMessage();
      }
    }
  };

  document.addEventListener("click", handleGlobalClick, { capture: true });
  return () => {
    document.removeEventListener("click", handleGlobalClick, { capture: true });
  };
};
