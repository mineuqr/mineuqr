import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventEnvelope } from "../../EventEnvelope";
import { OrderNotificationConsumer } from "../OrderNotificationConsumer";

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
import { sendReadyPushForOrder } from "../../../../../customerPush/sendReadyPush";
import { cleanupPushSubscriptionsForOrder } from "../../../../../customerPush/routes";

describe("OrderNotificationConsumer", () => {
  const consumer = new OrderNotificationConsumer();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates owner notification on OrderCreated", async () => {
    await consumer.handle({
      id: "o1",
      eventId: "e1",
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
        sessionId: null,
        createdAt: "2026-06-27 10:00:00",
      },
    });

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        notificationType: "new_order",
      })
    );
  });

  it("sends ready push on OrderReady", async () => {
    await consumer.handle({
      id: "o2",
      eventId: "e2",
      eventType: "OrderReady",
      aggregateType: "Order",
      aggregateId: 7,
      aggregateVersion: null,
      restaurantId: 1,
      sequenceNumber: 2,
      occurredAt: "2026-06-27 11:00:00",
      correlationId: null,
      causationId: null,
      payloadVersion: 1,
      payload: {
        type: "OrderReady",
        schemaVersion: 1,
        orderId: 7,
        trackingToken: "tok-7",
        readyAt: "2026-06-27 11:00:00",
      },
    });

    expect(sendReadyPushForOrder).toHaveBeenCalledWith({
      orderId: 7,
      trackingToken: "tok-7",
      orderNumber: "ORD-7",
    });
  });

  it("cleans up push subscriptions on OrderCompleted", async () => {
    await consumer.handle({
      id: "o3",
      eventId: "e3",
      eventType: "OrderCompleted",
      aggregateType: "Order",
      aggregateId: 7,
      aggregateVersion: null,
      restaurantId: 1,
      sequenceNumber: 3,
      occurredAt: "2026-06-27 12:00:00",
      correlationId: null,
      causationId: null,
      payloadVersion: 1,
      payload: {
        type: "OrderCompleted",
        schemaVersion: 1,
        orderId: 7,
        servedAt: "2026-06-27 12:00:00",
      },
    });

    expect(cleanupPushSubscriptionsForOrder).toHaveBeenCalledWith(7);
  });
});
