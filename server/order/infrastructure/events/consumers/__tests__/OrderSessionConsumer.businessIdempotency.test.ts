import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../../../../../_core/env";
import type { EventEnvelope } from "../../EventEnvelope";
import { OrderSessionConsumer } from "../OrderSessionConsumer";
import { InMemoryDurableBusinessClaimStore } from "../idempotency/DurableBusinessClaimStore";

vi.mock("../../../../../diningSession/sessionService", () => ({
  recordSessionEvent: vi.fn(async () => ({ eventId: 1 })),
}));

vi.mock("../../../../../diningSession/sessionAggregateWriters", () => ({
  incrementSessionAggregatesForOrder: vi.fn(async () => undefined),
  decrementSessionAggregatesForCancelledOrder: vi.fn(async () => undefined),
}));

vi.mock("../../../../../db", () => ({
  getOrderById: vi.fn(async () => ({
    id: 55,
    restaurantId: 1,
    sessionId: 10,
    totalAmount: "20.00",
  })),
}));

import { recordSessionEvent } from "../../../../../diningSession/sessionService";
import {
  decrementSessionAggregatesForCancelledOrder,
  incrementSessionAggregatesForOrder,
} from "../../../../../diningSession/sessionAggregateWriters";

function createdEnvelope(eventId: string): EventEnvelope {
  return {
    id: `o-${eventId}`,
    eventId,
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: 55,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 1,
    occurredAt: "2026-06-27 10:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: {
      type: "OrderCreated",
      schemaVersion: 1,
      orderId: 55,
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      orderNumber: "ORD-1",
      trackingToken: "tok",
      totalAmount: "20.00",
      lineCount: 2,
      sessionId: 10,
      createdAt: "2026-06-27 10:00:00",
    },
  };
}

function cancelledEnvelope(eventId: string): EventEnvelope {
  return {
    id: `o-${eventId}`,
    eventId,
    eventType: "OrderCancelled",
    aggregateType: "Order",
    aggregateId: 55,
    aggregateVersion: null,
    restaurantId: 1,
    sequenceNumber: 2,
    occurredAt: "2026-06-27 11:00:00",
    correlationId: null,
    causationId: null,
    payloadVersion: 1,
    payload: {
      type: "OrderCancelled",
      schemaVersion: 1,
      orderId: 55,
      cancelledAt: "2026-06-27 11:00:00",
    },
  };
}

describe("OrderSessionConsumer business idempotency", () => {
  const claims = new InMemoryDurableBusinessClaimStore();
  const consumer = new OrderSessionConsumer(claims);

  beforeEach(() => {
    vi.clearAllMocks();
    claims.clear();
    ENV.tableSessionDualWrite = true;
  });

  it("applies create aggregates once under distinct eventIds", async () => {
    await consumer.handle(createdEnvelope("e1"));
    await consumer.handle(createdEnvelope("e2"));
    expect(recordSessionEvent).toHaveBeenCalledTimes(1);
    expect(incrementSessionAggregatesForOrder).toHaveBeenCalledTimes(1);
  });

  it("applies cancel aggregates once under distinct eventIds", async () => {
    await consumer.handle(cancelledEnvelope("c1"));
    await consumer.handle(cancelledEnvelope("c2"));
    expect(decrementSessionAggregatesForCancelledOrder).toHaveBeenCalledTimes(1);
  });
});
