import { describe, expect, it } from "vitest";
import type { OrderCreatedEvent } from "../../../domain/events/OrderDomainEvents";
import {
  buildEventEnvelope,
  deserializeDomainEventPayload,
  DOMAIN_EVENT_PAYLOAD_VERSION,
  extractAggregateIdFromEvent,
  extractOccurredAtFromEvent,
  extractRestaurantIdFromEvent,
  serializeDomainEventPayload,
} from "../serialization/domainEventSerializer";
import { ORDER_AGGREGATE_TYPE } from "../EventEnvelope";

describe("domainEventSerializer", () => {
  const sampleEvent: OrderCreatedEvent = {
    type: "OrderCreated",
    schemaVersion: 1,
    orderId: 42,
    restaurantId: 7,
    tableId: 3,
    tableNumber: 12,
    orderNumber: "ORD-0042",
    trackingToken: "tok-abc",
    totalAmount: "25.50",
    lineCount: 2,
    sessionId: null,
    createdAt: "2026-06-27 10:00:00",
  };

  it("round-trips payload through JSON serialization", () => {
    const json = serializeDomainEventPayload(sampleEvent);
    const restored = deserializeDomainEventPayload(
      "OrderCreated",
      json,
      DOMAIN_EVENT_PAYLOAD_VERSION
    );
    expect(restored).toEqual(sampleEvent);
  });

  it("builds transport-agnostic envelope from domain event", () => {
    const envelope = buildEventEnvelope({
      id: "outbox-1",
      eventId: "evt-1",
      event: sampleEvent,
      aggregateId: 42,
      restaurantId: 7,
      sequenceNumber: 1,
      occurredAt: sampleEvent.createdAt,
      correlationId: "corr-1",
      causationId: "cause-1",
    });

    expect(envelope).toMatchObject({
      id: "outbox-1",
      eventId: "evt-1",
      eventType: "OrderCreated",
      aggregateType: ORDER_AGGREGATE_TYPE,
      aggregateId: 42,
      restaurantId: 7,
      sequenceNumber: 1,
      payloadVersion: DOMAIN_EVENT_PAYLOAD_VERSION,
      correlationId: "corr-1",
      causationId: "cause-1",
    });
    expect(envelope.payload).toEqual(sampleEvent);
  });

  it("extracts aggregate, restaurant, and occurred-at from events", () => {
    expect(extractAggregateIdFromEvent(sampleEvent)).toBe(42);
    expect(extractRestaurantIdFromEvent(sampleEvent)).toBe(7);
    expect(extractOccurredAtFromEvent(sampleEvent)).toBe("2026-06-27 10:00:00");
  });

  it("rejects payload when event type mismatches envelope", () => {
    const json = serializeDomainEventPayload(sampleEvent);
    expect(() =>
      deserializeDomainEventPayload("OrderCancelled", json, 1)
    ).toThrow(/type mismatch/);
  });
});
