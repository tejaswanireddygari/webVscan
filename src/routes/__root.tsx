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
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-mono">
      <div className="max-w-md text-center">
        <p className="text-xs text-primary tracking-widest">ERR_ROUTE_NOT_FOUND</p>
        <h1 className="mt-2 text-7xl font-bold text-primary text-glow">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Target unreachable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested is not in the index.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
        >
          → Return to dashboard
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-mono">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-destructive">
          [SYS_ERROR] Page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Sentinel AI — Web Vulnerability Scanner" },
      { name: "description", content: "AI-powered web vulnerability scanner with intelligent threat detection." },
      { property: "og:title", content: "Sentinel AI — Web Vulnerability Scanner" },
      { name: "twitter:title", content: "Sentinel AI — Web Vulnerability Scanner" },
      { property: "og:description", content: "AI-powered web vulnerability scanner with intelligent threat detection." },
      { name: "twitter:description", content: "AI-powered web vulnerability scanner with intelligent threat detection." },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
