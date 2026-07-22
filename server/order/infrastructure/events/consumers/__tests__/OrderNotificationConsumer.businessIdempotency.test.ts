import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventEnvelope } from "../../EventEnvelope";
import { OrderNotificationConsumer } from "../OrderNotificationConsumer";
import { InMemoryDurableBusinessClaimStore } from "../idempotency/DurableBusinessClaimStore";

vi.mock("../../../../../db", () => ({
  createNotification: vi.fn(async () => ({ id: 1 })),
  getRestaurantById: vi.fn(async () => ({
    id: 1,
    userId: 10,
    currencySymbol: "ر.س",
  })),
  getOrderItemsByOrderId: vi.fn(async () => [
    { nameAr: "حمص", quantity: 2 },
  ]),
  getOrderById: vi.fn(async () => ({
    id: 7,
    orderNumber: "ORD-7",
    trackingToken: "tok-7",
  })),
}));

vi.mock("../../../../../customerPush/sendReadyPush", () => ({
  sendReadyPushForOrder: vi.fn(async () => undefined),
}));

vi.mock("../../../../../customerPush/routes", () => ({
  cleanupPushSubscriptionsForOrder: vi.fn(async () => undefined),
}));

import { createNotification } from "../../../../../db";

function createdEnvelope(eventId: string, orderId = 55): EventEnvelope {
  return {
    id: `o-${eventId}`,
    eventId,
    eventType: "OrderCreated",
    aggregateType: "Order",
    aggregateId: orderId,
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
      orderId,
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      orderNumber: "ORD-1",
      trackingToken: "tok",
      totalAmount: "20.00",
      lineCount: 2,
      sessionId: null,
      createdAt: "2026-06-27 10:00:00",
    },
  };
}

describe("OrderNotificationConsumer business idempotency", () => {
  const claims = new InMemoryDurableBusinessClaimStore();
  const consumer = new OrderNotificationConsumer(claims);

  beforeEach(() => {
    vi.clearAllMocks();
    claims.clear();
  });

  it("creates a single notification for one OrderCreated", async () => {
    await consumer.handle(createdEnvelope("e1"));
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it("ignores duplicate OrderCreated with distinct eventIds", async () => {
    await consumer.handle(createdEnvelope("e1"));
    await consumer.handle(createdEnvelope("e2"));
    await consumer.handle(createdEnvelope("e1"));
    expect(createNotification).toHaveBeenCalledTimes(1);
  });
});
