import { describe, expect, it, vi } from "vitest";
import { OrderPrintingConsumer } from "../OrderPrintingConsumer";
import type { OrderPrintDispatchPort } from "../ports/OrderPrintDispatchPort";

describe("OrderPrintingConsumer", () => {
  it("dispatches print request via port on OrderCreated", async () => {
    const dispatch = vi.fn(async () => undefined);
    const port: OrderPrintDispatchPort = { dispatchPrintRequest: dispatch };
    const consumer = new OrderPrintingConsumer(port);

    await consumer.handle({
      id: "o1",
      eventId: "e1",
      eventType: "OrderCreated",
      aggregateType: "Order",
      aggregateId: 9,
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
        orderId: 9,
        restaurantId: 1,
        tableId: 1,
        tableNumber: 1,
        orderNumber: "ORD-9",
        trackingToken: "tok",
        totalAmount: "10.00",
        lineCount: 1,
        sessionId: null,
        createdAt: "2026-06-27 10:00:00",
      },
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 9,
        restaurantId: 1,
        eventType: "OrderCreated",
        eventId: "e1",
        orderNumber: "ORD-9",
      })
    );
  });
});
