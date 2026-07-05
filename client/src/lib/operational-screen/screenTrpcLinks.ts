/**
 * Device-authenticated tRPC transport for operational screen runtime.
 * Isolated from dashboard session cookies.
 */
import { httpBatchLink, type TRPCLink } from "@trpc/client";
import type { AppRouter } from "../../../../server/routers";
import superjson from "superjson";
import { formatDeviceAuthHeader } from "@/lib/operational-device/deviceLabels";
import { getClientCorrelationId } from "@/lib/correlation";
import type { OperationalScreenCredentials } from "./credentialStore";

export function createScreenRuntimeTrpcLinks(
  credentials: Pick<OperationalScreenCredentials, "deviceId" | "tokenId" | "secret">
): TRPCLink<AppRouter>[] {
  const authHeader = formatDeviceAuthHeader(credentials);

  return [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const headers = new Headers((init as RequestInit | undefined)?.headers ?? undefined);
        headers.set("Authorization", authHeader);
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
