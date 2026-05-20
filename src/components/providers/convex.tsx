import { ConvexReactClient, ConvexProvider as ConvexReactProvider } from "convex/react";
import type { ReactNode } from "react";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3210";
export const convexClient = new ConvexReactClient(convexUrl);

export function ConvexProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ConvexReactProvider client={convexClient}>
      {children}
    </ConvexReactProvider>
  );
}
