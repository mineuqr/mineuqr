/**
 * REALTIME-EXPO-ADOPTION-1
 * Publish metadata-only expo-channel hints after ActiveOrders (P-02) projection sync.
 * Fire-and-forget — never fails the projection consumer.
 */

import type { EventEnvelope } from "../../infrastructure/events/EventEnvelope";
import type { RealtimeHintType } from "@shared/realtime-platform";
import {
  getRealtimeHintPublisher,
  isRealtimePlatformEnabled,
} from "../../../realtime-platform/composition";

/** Allowed expo-channel hint types for this adoption program. */
const DOMAIN_TO_HINT: Record<string, RealtimeHintType> = {
  OrderReady: "order.ready",
  OrderCompleted: "order.served",
  OrderCancelled: "order.cancelled",
  OrderCreated: "expo.queue_changed",
  OrderStatusChanged: "expo.queue_changed",
  OrderLifecycleStageChanged: "expo.queue_changed",
};

export function mapOrderEventToExpoHintType(
  eventType: string
): RealtimeHintType | null {
  return DOMAIN_TO_HINT[eventType] ?? null;
}

/**
 * Called only after durable ActiveOrdersProjectionConsumer sync succeeds.
 */
export async function publishExpoRealtimeHintAfterProjection(
  envelope: EventEnvelope
): Promise<void> {
  if (!isRealtimePlatformEnabled()) return;

  const hintType = mapOrderEventToExpoHintType(envelope.eventType);
  if (!hintType) return;

  const orderId =
    (envelope.payload as { orderId?: number })?.orderId ?? envelope.aggregateId;

  try {
    await getRealtimeHintPublisher().publish({
      type: hintType,
      channel: "expo",
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
