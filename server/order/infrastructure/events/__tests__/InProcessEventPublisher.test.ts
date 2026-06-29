import { describe, expect, it, vi } from "vitest";
import { InProcessEventPublisher } from "../publisher/InProcessEventPublisher";
import type { EventInfrastructureMetrics } from "../../monitoring/EventInfrastructureMetrics";
import type { EventEnvelope } from "../../EventEnvelope";
import type { ConsumerRegistryDispatchDelegate } from "../../registry/OrderEventConsumerRegistry";

describe("InProcessEventPublisher", () => {
  const envelope: EventEnvelope = {
    id: "outbox-1",
    eventId: "evt-1",
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: 1,
    aggregateVersion: null,
    restaurantId: 5,
    sequenceNumber: 1,
    occurredAt: "2026-06-27 10:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: { type: "OrderCreated" },
  };

  it("delegates to registration layer and records publication metrics", async () => {
    const metrics: EventInfrastructureMetrics = {
      recordPublicationSuccess: vi.fn(),
      recordPublicationFailure: vi.fn(),
      recordRetry: vi.fn(),
      recordQueueDepth: vi.fn(),
      recordRelayBatch: vi.fn(),
    };
    const dispatchDelegate: ConsumerRegistryDispatchDelegate = {
      dispatch: vi.fn(async () => ({
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        results: [],
      })),
    };

    const publisher = new InProcessEventPublisher(metrics, dispatchDelegate);
    await publisher.publish(envelope);

    expect(dispatchDelegate.dispatch).toHaveBeenCalledWith(envelope);
    expect(metrics.recordPublicationSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "OrderCreated",
        restaurantId: 5,
      })
    );
    expect(metrics.recordPublicationFailure).not.toHaveBeenCalled();
  });
});
