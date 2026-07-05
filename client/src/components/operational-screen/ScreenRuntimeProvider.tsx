import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { OperationalScreenCredentials } from "@/lib/operational-screen/credentialStore";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { createScreenRuntimeTrpcLinks } from "@/lib/operational-screen/screenTrpcLinks";

export function ScreenRuntimeProvider({
  credentials,
  children,
}: {
  credentials: OperationalScreenCredentials;
  children: ReactNode;
}) {
  const [clients] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: (failureCount, error) => {
            const message =
              error && typeof error === "object" && "message" in error
                ? String((error as { message: unknown }).message)
                : "";
            if (message.toLowerCase().includes("valid operational device credentials")) {
              return false;
            }
            return failureCount < 3;
          },
        },
      },
    });
    const trpcClient = screenTrpc.createClient({
      links: createScreenRuntimeTrpcLinks(credentials),
    });
    return { queryClient, trpcClient };
  });

  return (
    <screenTrpc.Provider client={clients.trpcClient} queryClient={clients.queryClient}>
      <QueryClientProvider client={clients.queryClient}>{children}</QueryClientProvider>
    </screenTrpc.Provider>
  );
}
