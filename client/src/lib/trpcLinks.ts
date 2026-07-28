/**
 * tRPC transport links (connectivity bridge B1).
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1 — prefer per-mutation lifecycleTraceId.
 */
import { httpBatchLink, type TRPCLink } from "@trpc/client";
import type { AppRouter } from "../../../server/routers";
import superjson from "superjson";
import { getClientCorrelationId } from "./correlation";

type LifecycleContext = {
  lifecycleTraceId?: string;
};

function resolveLifecycleTraceId(
  opList: ReadonlyArray<{ context?: unknown }> | undefined
): string | undefined {
  if (!opList) return undefined;
  for (const op of opList) {
    const ctx = op.context as LifecycleContext | undefined;
    if (typeof ctx?.lifecycleTraceId === "string" && ctx.lifecycleTraceId.length >= 8) {
      return ctx.lifecycleTraceId;
    }
  }
  return undefined;
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

export function createTrpcLinks(): TRPCLink<AppRouter>[] {
  return [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers(opts) {
        const lifecycleTraceId = resolveLifecycleTraceId(
          opts.opList as ReadonlyArray<{ context?: unknown }> | undefined
        );
        return {
          "x-correlation-id": lifecycleTraceId ?? getClientCorrelationId(),
        };
      },
      fetch: createFetchWithCredentials(),
    }),
  ];
}
