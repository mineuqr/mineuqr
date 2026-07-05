import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import { getClientCorrelationId } from "@/lib/correlation";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";

/** Public tRPC client for pairing authenticate — no device header, no dashboard cookies. */
export function ScreenPairingProvider({ children }: { children: ReactNode }) {
  const [clients] = useState(() => {
    const queryClient = new QueryClient();
    const trpcClient = screenTrpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
          fetch(input, init) {
            const headers = new Headers((init as RequestInit | undefined)?.headers ?? undefined);
            if (!headers.has("x-correlation-id")) {
              headers.set("x-correlation-id", getClientCorrelationId());
            }
            return globalThis.fetch(input, {
              ...(init ?? {}),
              headers,
              credentials: "omit",
            });
          },
        }),
      ] as Parameters<typeof screenTrpc.createClient>[0]["links"],
    });
    return { queryClient, trpcClient };
  });

  return (
    <screenTrpc.Provider client={clients.trpcClient} queryClient={clients.queryClient}>
      <QueryClientProvider client={clients.queryClient}>{children}</QueryClientProvider>
    </screenTrpc.Provider>
  );
}
