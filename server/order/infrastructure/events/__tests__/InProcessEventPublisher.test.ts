import { describe, expect, it, vi } from "vitest";
import { InProcessEventPublisher } from "../publisher/InProcessEventPublisher";
import type { EventInfrastructureMetrics } from "../monitoring/EventInfrastructureMetrics";
import type { EventEnvelope } from "../EventEnvelope";

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

  it("records publication success metrics without consumer dispatch", async () => {
    const metrics: EventInfrastructureMetrics = {
      recordPublicationSuccess: vi.fn(),
      recordPublicationFailure: vi.fn(),
      recordRetry: vi.fn(),
      recordQueueDepth: vi.fn(),
      recordRelayBatch: vi.fn(),
    };

    const publisher = new InProcessEventPublisher(metrics);
    await publisher.publish(envelope);

    expect(metrics.recordPublicationSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "OrderCreated",
        restaurantId: 5,
      })
    );
    expect(metrics.recordPublicationFailure).not.toHaveBeenCalled();
  });
});
