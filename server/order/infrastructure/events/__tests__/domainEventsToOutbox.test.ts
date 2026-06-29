import { describe, expect, it } from "vitest";
import type { OrderDomainEvent } from "../../../domain/events/OrderDomainEvents";
import { domainEventsToOutboxInputs } from "../outbox/domainEventsToOutbox";

describe("domainEventsToOutboxInputs", () => {
  const events: OrderDomainEvent[] = [
    {
      type: "OrderStatusChanged",
      schemaVersion: 1,
      orderId: 10,
      restaurantId: 2,
      fromStatus: "pending",
      toStatus: "preparing",
      changedAt: "2026-06-27 11:00:00",
    },
    {
      type: "OrderReady",
      schemaVersion: 1,
      orderId: 10,
      trackingToken: "tok",
      readyAt: "2026-06-27 11:30:00",
    },
  ];

  it("maps each domain event to a unique outbox append input", () => {
    const inputs = domainEventsToOutboxInputs(events, {
      restaurantId: 2,
      correlationId: "corr",
      causationId: "cause",
    });

    expect(inputs).toHaveLength(2);
    const eventIds = inputs.map((m) => m.envelope.eventId);
    expect(new Set(eventIds).size).toBe(2);

    expect(inputs[0]!.envelope).toMatchObject({
      eventType: "OrderStatusChanged",
      aggregateId: 10,
      restaurantId: 2,
      correlationId: "corr",
      causationId: "cause",
    });
    expect(inputs[1]!.envelope).toMatchObject({
      eventType: "OrderReady",
      restaurantId: 2,
    });
  });
});
