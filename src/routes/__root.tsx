// Trigger build for reverted state
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "SGK Brainova Smart Learning With AI — Engineer Your Future" },
        {
          name: "description",
          content:
            "Master next-generation skills through SGK Brainova Smart Learning With AI's immersive, industry-led digital learning ecosystem.",
        },
        { name: "author", content: "SGK Brainova Smart Learning With AI" },
        {
          property: "og:title",
          content: "SGK Brainova Smart Learning With AI — Engineer Your Future",
        },
        {
          property: "og:description",
          content:
            "Master next-generation skills through SGK Brainova Smart Learning With AI's immersive, industry-led digital learning ecosystem.",
        },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://sgkbrainova.com/logo.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:site", content: "@sgkbrainova" },
        { name: "twitter:image", content: "https://sgkbrainova.com/logo.png" },
      ],
      links: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap",
          crossOrigin: "anonymous",
        },
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon-48x48.png" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "shortcut icon", href: "/favicon.ico" },
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";
import { DiaryProcessingProvider } from "@/contexts/DiaryProcessingContext";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DiaryProcessingProvider>
          {/* Global Corner Glowing Ambient Orbs - Green-Yellow Nature Theme */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
            {/* Top Left - Deep Dark Green (#063B00) */}
            <div className="absolute -top-48 -left-48 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#063B00]/20 dark:bg-[#063B00]/40 blur-[100px] sm:blur-[130px]" />
            {/* Top Right - Forest Green (#266210) */}
            <div className="absolute -top-48 -right-48 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#266210]/20 dark:bg-[#266210]/30 blur-[100px] sm:blur-[130px]" />
            {/* Bottom Left - Lime Green (#90B800) */}
            <div className="absolute -bottom-48 -left-48 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#90B800]/15 dark:bg-[#90B800]/20 blur-[100px] sm:blur-[130px]" />
            {/* Bottom Right - Yellow (#E1E100) */}
            <div className="absolute -bottom-48 -right-48 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full bg-[#E1E100]/10 dark:bg-[#E1E100]/15 blur-[100px] sm:blur-[130px]" />
          </div>

          <Header />
          <Outlet />
          <Toaster position="top-center" richColors />
        </DiaryProcessingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
