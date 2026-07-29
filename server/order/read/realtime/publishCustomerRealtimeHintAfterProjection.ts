/**
 * REALTIME-CUSTOMER-TRACKING-ADOPTION-1
 * Publish metadata-only customer-channel hints after Public Order Status (P-11) sync.
 * Fire-and-forget — never fails the projection consumer.
 *
 * Internal bus hints still carry restaurantId/aggregateId for ACL routing.
 * Public SSE delivery strips those fields (see publicCustomerHint).
 */

import type { EventEnvelope } from "../../infrastructure/events/EventEnvelope";
import type { RealtimeHintType } from "@shared/realtime-platform";
import {
  getRealtimeHintPublisher,
  isRealtimePlatformEnabled,
} from "../../../realtime-platform/composition";

/** Allowed customer-channel hint types for this adoption program. */
const DOMAIN_TO_HINT: Record<string, RealtimeHintType> = {
  OrderCreated: "customer.status_changed",
  OrderStatusChanged: "customer.status_changed",
  OrderLifecycleStageChanged: "customer.status_changed",
  OrderReady: "order.ready",
  OrderCompleted: "order.served",
  OrderCancelled: "order.cancelled",
};

export function mapOrderEventToCustomerHintType(
  eventType: string
): RealtimeHintType | null {
  return DOMAIN_TO_HINT[eventType] ?? null;
}

/**
 * Called only after durable PublicOrderStatusProjectionConsumer sync succeeds.
 */
export async function publishCustomerRealtimeHintAfterProjection(
  envelope: EventEnvelope
): Promise<void> {
  if (!isRealtimePlatformEnabled()) return;

  const hintType = mapOrderEventToCustomerHintType(envelope.eventType);
  if (!hintType) return;

  const orderId =
    (envelope.payload as { orderId?: number })?.orderId ?? envelope.aggregateId;

  try {
    await getRealtimeHintPublisher().publish({
      type: hintType,
      channel: "customer",
      restaurantId: envelope.restaurantId,
      aggregateId: String(orderId),
      seq: envelope.sequenceNumber,
      version: envelope.eventId,
      correlationId: envelope.correlationId ?? undefined,
      ts: envelope.occurredAt,
    });
  } catch {
    /* transport must never break projection path */
  }
}
