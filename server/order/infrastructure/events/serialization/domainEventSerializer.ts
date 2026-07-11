import type { OrderDomainEvent } from "../../../domain/events/OrderDomainEvents";
import type { EventEnvelope } from "../EventEnvelope";
import { ORDER_AGGREGATE_TYPE } from "../EventEnvelope";

export const DOMAIN_EVENT_PAYLOAD_VERSION = 1;

export type SerializedEventPayload = OrderDomainEvent;

export function serializeDomainEventPayload(
  event: OrderDomainEvent
): string {
  return JSON.stringify(event);
}

export function deserializeDomainEventPayload(
  eventType: string,
  payloadJson: string,
  payloadVersion: number
): SerializedEventPayload {
  const parsed = JSON.parse(payloadJson) as Record<string, unknown>;
  if (parsed.type !== eventType) {
    throw new Error(
      `Event type mismatch: envelope=${eventType} payload=${String(parsed.type)}`
    );
  }
  if (
    typeof parsed.schemaVersion === "number" &&
    parsed.schemaVersion > payloadVersion
  ) {
    // Forward compatibility: accept unknown future fields; version gate only warns
  }
  return parsed as SerializedEventPayload;
}

export function parseEnvelopePayload<T = SerializedEventPayload>(
  envelope: EventEnvelope
): T {
  return deserializeDomainEventPayload(
    envelope.eventType,
    JSON.stringify(envelope.payload),
    envelope.payloadVersion
  ) as T;
}

/** Build envelope from domain event (pre-persistence). */
export function buildEventEnvelope(input: {
  id: string;
  eventId: string;
  event: OrderDomainEvent;
  aggregateId: number;
  aggregateVersion?: number | null;
  restaurantId: number;
  sequenceNumber: number;
  occurredAt: string;
  correlationId?: string | null;
  causationId?: string | null;
}): EventEnvelope<SerializedEventPayload> {
  return {
    id: input.id,
    eventId: input.eventId,
    eventType: input.event.type,
    aggregateType: ORDER_AGGREGATE_TYPE,
    aggregateId: input.aggregateId,
    aggregateVersion: input.aggregateVersion ?? null,
    restaurantId: input.restaurantId,
    sequenceNumber: input.sequenceNumber,
    occurredAt: input.occurredAt,
    correlationId: input.correlationId ?? null,
    causationId: input.causationId ?? null,
    payloadVersion: DOMAIN_EVENT_PAYLOAD_VERSION,
    payload: input.event,
  };
}

export function extractRestaurantIdFromEvent(
  event: OrderDomainEvent,
  fallbackRestaurantId?: number
): number {
  if ("restaurantId" in event && typeof event.restaurantId === "number") {
    return event.restaurantId;
  }
  if (fallbackRestaurantId != null) {
    return fallbackRestaurantId;
  }
  throw new Error(`Cannot resolve restaurantId for event ${event.type}`);
}

export function extractOccurredAtFromEvent(event: OrderDomainEvent): string {
  switch (event.type) {
    case "OrderCreated":
      return event.createdAt;
    case "OrderStatusChanged":
      return event.changedAt;
    case "OrderReady":
      return event.readyAt;
    case "OrderCompleted":
      return event.servedAt;
    case "OrderCancelled":
      return event.cancelledAt;
    case "OrderLifecycleStageChanged":
      return event.changedAt;
    default:
      return new Date().toISOString();
  }
}

export function extractAggregateIdFromEvent(event: OrderDomainEvent): number {
  return event.orderId;
}
