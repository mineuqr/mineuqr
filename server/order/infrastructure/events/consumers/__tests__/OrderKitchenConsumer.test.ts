import { describe, expect, it, vi } from "vitest";
import { OrderKitchenConsumer } from "../OrderKitchenConsumer";
import { opsLog } from "../../../../../_core/opsLog";
import { OPS_EVENT } from "../../../../../_core/opsTaxonomy";

vi.mock("../../../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

describe("OrderKitchenConsumer", () => {
  it("logs kitchen integration telemetry without side effects", async () => {
    const consumer = new OrderKitchenConsumer();
    await consumer.handle({
      id: "o1",
      eventId: "e1",
      eventType: "OrderCreated",
      aggregateType: "Order",
      aggregateId: 1,
      aggregateVersion: null,
      restaurantId: 2,
      sequenceNumber: 1,
      occurredAt: "2026-06-27 10:00:00",
      correlationId: null,
      causationId: null,
      payloadVersion: 1,
      payload: { type: "OrderCreated" },
    });

    expect(opsLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: OPS_EVENT.order_kitchen_event_received })
    );
  });
});
