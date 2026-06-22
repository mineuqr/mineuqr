/**
 * THERMAL-PRINTING-12E.1B — tRPC transport links (connectivity bridge B1).
 */
import { httpBatchLink, splitLink, type TRPCLink } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";
import superjson from "superjson";
import { getClientCorrelationId } from "./correlation";

function resolveTrpcUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/$/, "");
  return normalized.endsWith("/api/trpc") ? normalized : `${normalized}/api/trpc`;
}

function createFetchWithCredentials(): NonNullable<Parameters<typeof httpBatchLink>[0]["fetch"]> {
  return (input, init) => {
    const headers = new Headers((init as RequestInit | undefined)?.headers ?? undefined);
    if (!headers.has("x-correlation-id")) {
      headers.set("x-correlation-id", getClientCorrelationId());
    }
    return globalThis.fetch(input, {
      ...(init ?? {}),
      headers,
      credentials: "include",
    });
  };
}

function isPrintHostProcedure(path: string): boolean {
  return path === "printOps" || path.startsWith("printOps.") || path === "endpointOps" || path.startsWith("endpointOps.");
}

export function createTrpcLinks(): TRPCLink<AppRouter>[] {
  const printHostBaseUrl = import.meta.env.VITE_PRINT_OPS_API_URL?.trim();
  const defaultFetch = createFetchWithCredentials();

  const defaultLink = httpBatchLink({
    url: "/api/trpc",
    transformer: superjson,
    fetch: defaultFetch,
  });

  if (!printHostBaseUrl) {
    return [defaultLink];
  }

  const printHostLink = httpBatchLink({
    url: resolveTrpcUrl(printHostBaseUrl),
    transformer: superjson,
    fetch: defaultFetch,
  });

  return [
    splitLink({
      condition(op) {
        return isPrintHostProcedure(op.path);
      },
      true: printHostLink,
      false: defaultLink,
    }),
  ];
}
