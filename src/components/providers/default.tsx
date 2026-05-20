import { AuthProvider } from "./auth.tsx";
import { ConvexProviderWrapper } from "./convex.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { ErrorBoundary } from "../error-boundary.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ConvexProviderWrapper>
          <QueryClientProvider>
            <TooltipProvider>
              <ThemeProvider>
                <Toaster />
                {children}
              </ThemeProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </ConvexProviderWrapper>
      </AuthProvider>
    </ErrorBoundary>
  );
}
