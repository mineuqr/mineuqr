/**
 * Device-authenticated tRPC transport for operational screen runtime.
 * Isolated from dashboard session cookies.
 * ORDER-LIFECYCLE-LATENCY-INSTRUMENTATION-1 — prefer per-mutation lifecycleTraceId.
 */
import { httpBatchLink, type TRPCLink } from "@trpc/client";
import type { AppRouter } from "../../../../server/routers";
import superjson from "superjson";
import { formatDeviceAuthHeader } from "@/lib/operational-device/deviceLabels";
import { getClientCorrelationId } from "@/lib/correlation";
import type { OperationalScreenCredentials } from "./credentialStore";

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

export function createScreenRuntimeTrpcLinks(
  credentials: Pick<OperationalScreenCredentials, "deviceId" | "tokenId" | "secret">
): TRPCLink<AppRouter>[] {
  const authHeader = formatDeviceAuthHeader(credentials);

  return [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers(opts) {
        const lifecycleTraceId = resolveLifecycleTraceId(
          opts.opList as ReadonlyArray<{ context?: unknown }> | undefined
        );
        return {
          Authorization: authHeader,
          "x-correlation-id": lifecycleTraceId ?? getClientCorrelationId(),
        };
      },
      fetch(input, init) {
        const headers = new Headers((init as RequestInit | undefined)?.headers ?? undefined);
        if (!headers.has("Authorization")) {
          headers.set("Authorization", authHeader);
        }
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
  ];
}
