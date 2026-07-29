/**
 * REALTIME-KITCHEN-ADOPTION-1
 * Publish metadata-only kitchen-channel hints after ActiveOrders (P-02) projection sync.
 * Fire-and-forget — never fails the projection consumer.
 */

import type { EventEnvelope } from "../../infrastructure/events/EventEnvelope";
import type { RealtimeHintType } from "@shared/realtime-platform";
import {
  getRealtimeHintPublisher,
  isRealtimePlatformEnabled,
} from "../../../realtime-platform/composition";

/** Allowed kitchen-channel hint types for this adoption program. */
const DOMAIN_TO_HINT: Record<string, RealtimeHintType> = {
  OrderCreated: "order.created",
  OrderStatusChanged: "order.status_changed",
  OrderReady: "order.status_changed",
  OrderCancelled: "order.cancelled",
  OrderCompleted: "kitchen.queue_changed",
  OrderLifecycleStageChanged: "order.status_changed",
};

export function mapOrderEventToKitchenHintType(
  eventType: string
): RealtimeHintType | null {
  return DOMAIN_TO_HINT[eventType] ?? null;
}

/**
 * Called only after durable ActiveOrdersProjectionConsumer sync succeeds.
 */
export async function publishKitchenRealtimeHintAfterProjection(
  envelope: EventEnvelope
): Promise<void> {
  if (!isRealtimePlatformEnabled()) return;

  const hintType = mapOrderEventToKitchenHintType(envelope.eventType);
  if (!hintType) return;

  const orderId =
    (envelope.payload as { orderId?: number })?.orderId ?? envelope.aggregateId;

  try {
    await getRealtimeHintPublisher().publish({
      type: hintType,
      channel: "kitchen",
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
