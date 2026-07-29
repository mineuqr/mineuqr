/**
 * REALTIME-ORDERS-ADOPTION-1
 * Orders Workspace realtime adoption — platform API only (no EventSource).
 */

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  buildRealtimeSseUrl,
  getRealtimePlatform,
  type RealtimeConnectionState,
} from "@/lib/realtime-platform";
import { scheduleOrdersListActiveInvalidation } from "./ordersListActiveInvalidationCoordinator";
import { DEFAULT_CLIENT_CAPABILITIES } from "@shared/realtime-platform";

const ORDERS_HINT_TYPES = new Set([
  "order.created",
  "order.status_changed",
  "order.cancelled",
  "order.served",
]);

export type OrdersWorkspaceRealtimeState = {
  connectionState: RealtimeConnectionState | "disabled";
  /** When true, polling may use recovery cadence (longer interval). */
  realtimePrimary: boolean;
};

/**
 * Subscribes to `orders` channel via Realtime Platform.
 * On hint / catch-up → debounced listActive invalidate (Read Freshness on refetch).
 */
export function useOrdersWorkspaceRealtime(
  restaurantId: number,
  enabled: boolean
): OrdersWorkspaceRealtimeState {
  const utils = trpc.useUtils();
  const mintTicket = trpc.realtime.mintTicket.useMutation();
  const [connectionState, setConnectionState] = useState<
    RealtimeConnectionState | "disabled"
  >("disabled");
  const mintRef = useRef(mintTicket.mutateAsync);
  mintRef.current = mintTicket.mutateAsync;

  useEffect(() => {
    if (!enabled || restaurantId <= 0) {
      setConnectionState("disabled");
      return;
    }

    let cancelled = false;
    const platform = getRealtimePlatform();

    const invalidate = () => {
      void utils.order.read.listActive.invalidate({ restaurantId });
    };

    async function start() {
      try {
        const ticket = await mintRef.current({
          restaurantId,
          channels: ["orders"],
          clientCapabilities: {
            ...DEFAULT_CLIENT_CAPABILITIES,
            protocolVersion: 1,
          },
        });
        if (cancelled) return;

        const sseUrl = buildRealtimeSseUrl({
          ssePath: ticket.ssePath,
          token: ticket.token,
          channels: ["orders"],
        });

        platform.connect({
          sseUrl,
          channels: ["orders"],
          clientCapabilities: DEFAULT_CLIENT_CAPABILITIES,
          handlers: {
            onStateChange: (state) => {
              if (!cancelled) setConnectionState(state);
            },
            onFallback: () => {
              if (!cancelled) setConnectionState("poll_only");
            },
            onHint: (hint) => {
              if (hint.restaurantId !== restaurantId) return;
              if (hint.channel !== "orders") return;
              if (!ORDERS_HINT_TYPES.has(hint.type)) return;
              scheduleOrdersListActiveInvalidation({
                restaurantId,
                invalidate,
                dedupeKey: `${hint.aggregateId ?? ""}:${hint.seq}`,
              });
            },
            onCatchUp: () => {
              scheduleOrdersListActiveInvalidation({
                restaurantId,
                invalidate,
                dedupeKey: `catch_up:${Date.now()}`,
                debounceMs: 0,
              });
            },
          },
        });
      } catch {
        if (!cancelled) setConnectionState("poll_only");
      }
    }

    void start();

    return () => {
      cancelled = true;
      platform.disconnect();
      setConnectionState("disabled");
    };
  }, [enabled, restaurantId, utils.order.read.listActive]);

  const realtimePrimary = connectionState === "live";

  return { connectionState, realtimePrimary };
}
