import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error: any) {
    console.error("[ERROR IN START MIDDLEWARE]:", error);
    (globalThis as any).__lastSsrError = error;
    const details = error?.stack || error?.message || (typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error));
    return new Response(`<!doctype html><html><body><h1>500 Internal Server Error</h1><pre>${details}</pre></body></html>`, {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  defaultSsr: false,
  requestMiddleware: [errorMiddleware],
}));
