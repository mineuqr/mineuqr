/**
 * REALTIME-EXPO-ADOPTION-1
 * Expo Runtime realtime adoption — platform API only (no EventSource).
 * Gated to expo_display — channel `expo` only.
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

const EXPO_HINT_TYPES = new Set([
  "expo.queue_changed",
  "order.ready",
  "order.served",
  "order.cancelled",
]);

export type ExpoRuntimeRealtimeState = {
  connectionState: RealtimeConnectionState | "disabled";
  realtimePrimary: boolean;
};

/**
 * Subscribes to `expo` channel via Realtime Platform.
 * On hint → debounced queue refetch (shared coordinator with kitchen BC path).
 */
export function useExpoRuntimeRealtime(input: {
  restaurantId: number | undefined;
  enabled: boolean;
  /** Must be expo_display for this adoption program. */
  role: string | undefined;
  onInvalidate: () => void;
}): ExpoRuntimeRealtimeState {
  const mintTicket =
    screenTrpc.operationalDevice.runtime.mintRealtimeTicket.useMutation();
  const [connectionState, setConnectionState] = useState<
    RealtimeConnectionState | "disabled"
  >("disabled");
  const mintRef = useRef(mintTicket.mutateAsync);
  mintRef.current = mintTicket.mutateAsync;
  const invalidateRef = useRef(input.onInvalidate);
  invalidateRef.current = input.onInvalidate;

  const expoOnly =
    input.enabled &&
    !!input.restaurantId &&
    input.restaurantId > 0 &&
    input.role === "expo_display";

  useEffect(() => {
    if (!expoOnly || !input.restaurantId) {
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
          channels: ["expo"],
          clientCapabilities: {
            ...DEFAULT_CLIENT_CAPABILITIES,
            protocolVersion: 1,
          },
        });
        if (cancelled) return;

        const sseUrl = buildRealtimeSseUrl({
          ssePath: ticket.ssePath,
          token: ticket.token,
          channels: ["expo"],
        });

        platform.connect({
          sseUrl,
          expiresAt: ticket.expiresAt,
          refreshCredential: async () => {
            const next = await mintRef.current({
              channels: ["expo"],
              clientCapabilities: {
                ...DEFAULT_CLIENT_CAPABILITIES,
                protocolVersion: 1,
              },
            });
            return {
              sseUrl: buildRealtimeSseUrl({
                ssePath: next.ssePath,
                token: next.token,
                channels: ["expo"],
              }),
              expiresAt: next.expiresAt,
            };
          },
          channels: ["expo"],
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
              if (hint.channel !== "expo") return;
              if (!EXPO_HINT_TYPES.has(hint.type)) return;
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
  }, [expoOnly, input.restaurantId, input.role]);

  return {
    connectionState,
    realtimePrimary: connectionState === "live",
  };
}
