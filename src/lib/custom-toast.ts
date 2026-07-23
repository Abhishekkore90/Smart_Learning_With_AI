/**
 * Custom toast notification utility.
 * Uses pure DOM manipulation for guaranteed visibility,
 * bypassing any CSS/SSR issues with sonner.
 */

type ToastType = "success" | "error" | "warning" | "info" | "loading";

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: "linear-gradient(135deg, #059669, #10b981)",
    border: "#34d399",
    text: "#ffffff",
    icon: "✓",
  },
  error: {
    bg: "linear-gradient(135deg, #dc2626, #ef4444)",
    border: "#f87171",
    text: "#ffffff",
    icon: "✕",
  },
  warning: {
    bg: "linear-gradient(135deg, #d97706, #f59e0b)",
    border: "#fbbf24",
    text: "#ffffff",
    icon: "⚠",
  },
  info: {
    bg: "linear-gradient(135deg, #2563eb, #3b82f6)",
    border: "#60a5fa",
    text: "#ffffff",
    icon: "ℹ",
  },
  loading: {
    bg: "linear-gradient(135deg, #475569, #64748b)",
    border: "#94a3b8",
    text: "#ffffff",
    icon: "⏳",
  },
};

function getOrCreateContainer(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;

  let container = document.getElementById("custom-toast-container") as HTMLDivElement | null;
  if (!container) {
    container = document.createElement("div");
    container.id = "custom-toast-container";
    container.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }
  return container;
}

function createDOMToast(message: string, type: ToastType = "success"): string {
  const container = getOrCreateContainer();
  if (!container) return "";

  const toastId = Math.random().toString(36).substring(2, 9);
  const colors = TOAST_COLORS[type];

  const toast = document.createElement("div");
  toast.id = `custom-toast-${toastId}`;
  toast.style.cssText = `
    background: ${colors.bg};
    color: ${colors.text};
    border: 1px solid ${colors.border};
    padding: 12px 20px;
    border-radius: 12px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(-12px) scale(0.95);
    transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    max-width: 420px;
    min-width: 220px;
    backdrop-filter: blur(8px);
    cursor: pointer;
    user-select: none;
  `;

  const iconEl = document.createElement("span");
  iconEl.textContent = colors.icon;
  iconEl.style.cssText = `
    font-size: 14px;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.25);
    border-radius: 50%;
    font-weight: bold;
  `;

  // Add spinning effect for loading type
  if (type === "loading") {
    iconEl.style.animation = "spin 1.5s linear infinite";
    
    // Inject keyframes if not present
    if (!document.getElementById("custom-toast-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "custom-toast-styles";
      styleEl.innerHTML = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  const textEl = document.createElement("span");
  textEl.textContent = message;
  textEl.style.cssText = `
    flex: 1;
    line-height: 1.4;
    letter-spacing: 0.01em;
  `;

  toast.appendChild(iconEl);
  toast.appendChild(textEl);
  container.appendChild(toast);

  // Click to dismiss
  toast.addEventListener("click", () => dismissToast(toastId));

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0) scale(1)";
    });
  });

  // Auto remove after 3.5s (except for loading type)
  if (type !== "loading") {
    setTimeout(() => dismissToast(toastId), 3500);
  }

  return toastId;
}

function dismissToast(toastId?: string) {
  if (typeof document === "undefined") return;

  if (toastId) {
    const toast = document.getElementById(`custom-toast-${toastId}`);
    if (toast) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-12px) scale(0.95)";
      setTimeout(() => {
        toast.remove();
        const container = document.getElementById("custom-toast-container");
        if (container && container.children.length === 0) {
          container.remove();
        }
      }, 350);
    }
  } else {
    // Dismiss all
    const container = document.getElementById("custom-toast-container");
    if (container) {
      Array.from(container.children).forEach((child: any) => {
        child.style.opacity = "0";
        child.style.transform = "translateY(-12px) scale(0.95)";
        setTimeout(() => child.remove(), 350);
      });
      setTimeout(() => container.remove(), 400);
    }
  }
}

/**
 * Show a toast notification using pure DOM manipulation.
 * Guaranteed to work regardless of CSS framework or SSR context.
 */
export const showToast = {
  success: (message: string) => createDOMToast(message, "success"),
  error: (message: string) => createDOMToast(message, "error"),
  warning: (message: string) => createDOMToast(message, "warning"),
  info: (message: string) => createDOMToast(message, "info"),
  loading: (message: string) => createDOMToast(message, "loading"),
  dismiss: (toastId?: string) => dismissToast(toastId),
};
