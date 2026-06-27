/**
 * tRPC transport links (connectivity bridge B1).
 */
import { httpBatchLink, type TRPCLink } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";
import superjson from "superjson";
import { getClientCorrelationId } from "./correlation";

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

export function createTrpcLinks(): TRPCLink<AppRouter>[] {
  return [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: createFetchWithCredentials(),
    }),
  ];
}
