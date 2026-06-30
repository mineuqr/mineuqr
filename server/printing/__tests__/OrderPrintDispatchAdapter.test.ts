import { describe, expect, it, vi } from "vitest";
import { OrderPrintDispatchAdapter } from "../infrastructure/adapters/OrderPrintDispatchAdapter";
import type { PrintingService } from "../application/PrintingService";

describe("OrderPrintDispatchAdapter", () => {
  it("delegates order events to printing service with idempotent key", async () => {
    const printingService = {
      buildPayloadForOrder: vi.fn(async () => ({
        schemaVersion: 1,
        restaurantId: 1,
        orderId: 9,
        orderNumber: "ORD-9",
        orderStatus: "ready",
        tableNumber: 1,
        totalAmount: "10.00",
        createdAt: "2026-06-27T10:00:00.000Z",
        lineItems: [],
        requestedAt: "2026-06-27T10:01:00.000Z",
        trigger: { source: "order_event" },
      })),
      requestPrint: vi.fn(async () => makeJob()),
    } satisfies Partial<PrintingService>;

    const adapter = new OrderPrintDispatchAdapter(printingService as PrintingService);

    await adapter.dispatchPrintRequest({
      orderId: 9,
      restaurantId: 1,
      eventType: "OrderCreated",
      eventId: "evt-1",
      orderNumber: "ORD-9",
    });

    expect(printingService.buildPayloadForOrder).toHaveBeenCalled();
    expect(printingService.requestPrint).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "order-event:OrderCreated:evt-1",
        source: "order_event",
      })
    );
  });
});

function makeJob() {
  return {
    id: 1,
    restaurantId: 1,
    orderId: 9,
    orderNumber: "ORD-9",
    status: "printing" as const,
    source: "order_event" as const,
    idempotencyKey: "k",
    triggerEventType: "OrderCreated",
    triggerEventId: "evt-1",
    correlationId: null,
    payloadVersion: 1,
    payload: {},
    attemptCount: 1,
    lastError: null,
    operatorUserId: null,
    createdAt: "2026-06-27T10:01:00.000Z",
    updatedAt: "2026-06-27T10:01:00.000Z",
    dispatchedAt: "2026-06-27T10:01:01.000Z",
    printingAt: "2026-06-27T10:01:02.000Z",
    completedAt: null,
  };
}
