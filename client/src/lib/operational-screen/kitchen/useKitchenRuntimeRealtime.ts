/**
 * REALTIME-KITCHEN-ADOPTION-1
 * Kitchen Runtime realtime adoption — platform API only (no EventSource).
 * Gated to kitchen_display — channel `kitchen` only.
 */

import { useEffect, useRef, useState } from "react";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import {
  buildRealtimeSseUrl,
  getRealtimePlatform,
  type RealtimeConnectionState,
} from "@/lib/realtime-platform";
import { scheduleKitchenQueueInvalidation } from "./kitchenQueueInvalidationCoordinator";
import { DEFAULT_CLIENT_CAPABILITIES } from "@shared/realtime-platform";

const KITCHEN_HINT_TYPES = new Set([
  "kitchen.queue_changed",
  "order.created",
  "order.status_changed",
  "order.cancelled",
]);

export type KitchenRuntimeRealtimeState = {
  connectionState: RealtimeConnectionState | "disabled";
  realtimePrimary: boolean;
};

/**
 * Subscribes to `kitchen` channel via Realtime Platform.
 * On hint → debounced queue refetch → existing notification rules run on new data.
 */
export function useKitchenRuntimeRealtime(input: {
  restaurantId: number | undefined;
  enabled: boolean;
  /** Must be kitchen_display for this adoption program. */
  role: string | undefined;
  onInvalidate: () => void;
}): KitchenRuntimeRealtimeState {
  const mintTicket =
    screenTrpc.operationalDevice.runtime.mintRealtimeTicket.useMutation();
  const [connectionState, setConnectionState] = useState<
    RealtimeConnectionState | "disabled"
  >("disabled");
  const mintRef = useRef(mintTicket.mutateAsync);
  mintRef.current = mintTicket.mutateAsync;
  const invalidateRef = useRef(input.onInvalidate);
  invalidateRef.current = input.onInvalidate;

  const kitchenOnly =
    input.enabled &&
    !!input.restaurantId &&
    input.restaurantId > 0 &&
    input.role === "kitchen_display";

  useEffect(() => {
    if (!kitchenOnly || !input.restaurantId) {
      setConnectionState("disabled");
      return;
    }

    const restaurantId = input.restaurantId;
    let cancelled = false;
    const platform = getRealtimePlatform();

    const invalidate = () => {
      invalidateRef.current();
    };

    async function start() {
      try {
        const ticket = await mintRef.current({
          channels: ["kitchen"],
          clientCapabilities: {
            ...DEFAULT_CLIENT_CAPABILITIES,
            protocolVersion: 1,
          },
        });
        if (cancelled) return;

        const sseUrl = buildRealtimeSseUrl({
          ssePath: ticket.ssePath,
          token: ticket.token,
          channels: ["kitchen"],
        });

        platform.connect({
          sseUrl,
          expiresAt: ticket.expiresAt,
          refreshCredential: async () => {
            const next = await mintRef.current({
              channels: ["kitchen"],
              clientCapabilities: {
                ...DEFAULT_CLIENT_CAPABILITIES,
                protocolVersion: 1,
              },
            });
            return {
              sseUrl: buildRealtimeSseUrl({
                ssePath: next.ssePath,
                token: next.token,
                channels: ["kitchen"],
              }),
              expiresAt: next.expiresAt,
            };
          },
          channels: ["kitchen"],
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
              if (hint.channel !== "kitchen") return;
              if (!KITCHEN_HINT_TYPES.has(hint.type)) return;
              scheduleKitchenQueueInvalidation({
                restaurantId,
                invalidate,
              });
            },
            onCatchUp: () => {
              scheduleKitchenQueueInvalidation({
                restaurantId,
                invalidate,
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
  }, [kitchenOnly, input.restaurantId, input.role]);

  return {
    connectionState,
    realtimePrimary: connectionState === "live",
  };
}
