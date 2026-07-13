// Trigger build for reverted state
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
        { name: "twitter:card", content: "summary" },
        { name: "twitter:site", content: "@Lovable" },
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
        },
        { rel: "stylesheet", href: appCss },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%234f46e5'/><stop offset='100%' stop-color='%2306b6d4'/></linearGradient></defs><rect width='100' height='100' rx='28' fill='url(%23g)'/><path d='M50 25 L82 38 L50 51 L18 38 Z' fill='white'/><path d='M35 44.5 L35 55 C35 63 65 63 65 55 L65 44.5' fill='white'/><path d='M32 14 Q32 24 22 24 Q32 24 32 34 Q32 24 42 24 Q32 24 32 14' fill='%23fbbf24'/><path d='M72 52 Q72 60 64 60 Q72 60 72 68 Q72 60 80 60 Q72 60 72 52' fill='%2338bdf8'/><circle cx='50' cy='72' r='4' fill='white'/><circle cx='32' cy='66' r='3' fill='white' opacity='0.7'/><circle cx='68' cy='66' r='3' fill='white' opacity='0.7'/><path d='M32 66 L50 72 L68 66' stroke='white' stroke-width='2' fill='none' opacity='0.5'/></svg>",
        },
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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/Header";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Header />
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
