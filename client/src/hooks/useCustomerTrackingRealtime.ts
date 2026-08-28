/**
 * REALTIME-CUSTOMER-TRACKING-ADOPTION-1
 * Customer Tracking realtime — platform API only (no EventSource).
 * Public auth via tracking token + slug; channel `customer` only.
 */

import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  buildRealtimeSseUrl,
  getRealtimePlatform,
  type RealtimeConnectionState,
} from "@/lib/realtime-platform";
import { DEFAULT_CLIENT_CAPABILITIES } from "@shared/realtime-platform";

const CUSTOMER_HINT_TYPES = new Set([
  "customer.status_changed",
  "order.ready",
  "order.served",
  "order.cancelled",
]);

export type CustomerTrackingRealtimeState = {
  connectionState: RealtimeConnectionState | "disabled";
  /** When true, polling may use recovery cadence (longer interval). */
  realtimePrimary: boolean;
};

/**
 * Subscribes to `customer` channel via Realtime Platform.
 * On hint / catch-up → invalidate getPublicStatus (read freshness on refetch).
 */
export function useCustomerTrackingRealtime(
  trackingToken: string,
  slug: string,
  enabled: boolean
): CustomerTrackingRealtimeState {
  const utils = trpc.useUtils();
  const mintTicket = trpc.realtime.mintCustomerTicket.useMutation();
  const [connectionState, setConnectionState] = useState<
    RealtimeConnectionState | "disabled"
  >("disabled");
  const mintRef = useRef(mintTicket.mutateAsync);
  mintRef.current = mintTicket.mutateAsync;

  useEffect(() => {
    if (!enabled || !trackingToken || !slug) {
      setConnectionState("disabled");
      return;
    }

    let cancelled = false;
    const platform = getRealtimePlatform();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const recentKeys = new Set<string>();

    const invalidate = () => {
      void utils.order.getPublicStatus.invalidate({ trackingToken, slug });
    };

    const scheduleInvalidate = (dedupeKey: string) => {
      if (recentKeys.has(dedupeKey)) return;
      recentKeys.add(dedupeKey);
      if (recentKeys.size > 64) {
        const first = recentKeys.values().next().value;
        if (first) recentKeys.delete(first);
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        invalidate();
      }, 50);
    };

    async function start() {
      try {
        const ticket = await mintRef.current({
          trackingToken,
          slug,
          clientCapabilities: {
            ...DEFAULT_CLIENT_CAPABILITIES,
            protocolVersion: 1,
          },
        });
        if (cancelled) return;

        const sseUrl = buildRealtimeSseUrl({
          ssePath: ticket.ssePath,
          token: ticket.token,
          channels: ["customer"],
        });

        platform.connect({
          sseUrl,
          expiresAt: ticket.expiresAt,
          refreshCredential: async () => {
            const next = await mintRef.current({
              trackingToken,
              slug,
              clientCapabilities: {
                ...DEFAULT_CLIENT_CAPABILITIES,
                protocolVersion: 1,
              },
            });
            return {
              sseUrl: buildRealtimeSseUrl({
                ssePath: next.ssePath,
                token: next.token,
                channels: ["customer"],
              }),
              expiresAt: next.expiresAt,
            };
          },
          channels: ["customer"],
          clientCapabilities: DEFAULT_CLIENT_CAPABILITIES,
          handlers: {
            onStateChange: (state) => {
              if (!cancelled) setConnectionState(state);
            },
            onFallback: () => {
              if (!cancelled) setConnectionState("poll_only");
            },
            onHint: (hint) => {
              if (!CUSTOMER_HINT_TYPES.has(hint.type)) return;
              const publicHint = hint as unknown as {
                trackingRef?: string;
                type: string;
                ts?: string;
                correlationId?: string;
              };
              // Reject any accidental fat / internal payload on the client.
              if (
                "restaurantId" in (hint as object) ||
                "aggregateId" in (hint as object) ||
                "orderId" in (hint as object)
              ) {
                return;
              }
              scheduleInvalidate(
                `${publicHint.trackingRef ?? ""}:${publicHint.type}:${publicHint.ts ?? ""}:${publicHint.correlationId ?? ""}`
              );
            },
            onCatchUp: () => {
              scheduleInvalidate(`catch_up:${Date.now()}`);
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
      if (debounceTimer) clearTimeout(debounceTimer);
      platform.disconnect();
      setConnectionState("disabled");
    };
  }, [enabled, trackingToken, slug, utils.order.getPublicStatus]);

  const realtimePrimary = connectionState === "live";

  return { connectionState, realtimePrimary };
}
