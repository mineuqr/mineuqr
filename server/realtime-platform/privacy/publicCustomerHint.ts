/**
 * REALTIME-CUSTOMER-TRACKING-ADOPTION-1
 * Public-safe customer hint envelope — no restaurant/order/internal ids.
 */

import { createHash } from "node:crypto";
import type { RealtimeHint } from "@shared/realtime-platform";

export type PublicCustomerRealtimeHint = {
  type: string;
  /** SHA-256 prefix of tracking token — opaque public reference. */
  trackingRef: string;
  ts: string;
  correlationId?: string;
};

export function hashTrackingToken(trackingToken: string): string {
  return createHash("sha256").update(trackingToken, "utf8").digest("hex").slice(0, 32);
}

/**
 * Sanitize an internal hint for customer_tracking SSE delivery.
 * Strips restaurantId, aggregateId, seq, version, and any other internal fields.
 */
export function toPublicCustomerRealtimeHint(
  hint: RealtimeHint,
  trackingRef: string
): PublicCustomerRealtimeHint {
  const out: PublicCustomerRealtimeHint = {
    type: hint.type,
    trackingRef,
    ts: hint.ts,
  };
  if (hint.correlationId) out.correlationId = hint.correlationId;
  return out;
}

export function assertPublicCustomerHintPrivacy(
  payload: Record<string, unknown>
): void {
  const forbidden = [
    "restaurantId",
    "orderId",
    "sessionId",
    "checkId",
    "aggregateId",
    "version",
    "seq",
    "status",
    "lineItems",
    "totalAmount",
    "tableNumber",
  ];
  for (const key of forbidden) {
    if (key in payload) {
      throw new Error(`Public customer hint forbids field: ${key}`);
    }
  }
}
