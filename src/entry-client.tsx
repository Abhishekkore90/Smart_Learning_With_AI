import { hydrateRoot, createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

const router = getRouter();

if (typeof window !== "undefined") {
  window.addEventListener(
    "wheel",
    () => {
      const active = document.activeElement as HTMLInputElement | null;
      if (active && (active.tagName === "INPUT" || active.getAttribute("inputmode") === "numeric")) {
        if (active.type === "number" || active.type === "text") {
          active.blur();
        }
      }
    },
    { passive: true }
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, <RouterProvider router={router} />);
  } else {
    createRoot(rootElement).render(<RouterProvider router={router} />);
  }
}
