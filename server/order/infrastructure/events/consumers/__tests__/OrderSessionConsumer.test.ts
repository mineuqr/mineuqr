import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "../../../../../_core/env";
import { TABLE_EVENT_TYPES } from "../../../../../diningSession/sessionTypes";
import type { EventEnvelope } from "../../EventEnvelope";
import { OrderSessionConsumer } from "../OrderSessionConsumer";

vi.mock("../../../../../diningSession/sessionService", () => ({
  recordSessionEvent: vi.fn(async () => ({ eventId: 1 })),
}));

vi.mock("../../../../../diningSession/sessionAggregateWriters", () => ({
  incrementSessionAggregatesForOrder: vi.fn(async () => undefined),
  decrementSessionAggregatesForCancelledOrder: vi.fn(async () => undefined),
}));

vi.mock("../../../../../operational-session/check/CheckService", () => ({
  ensureCheckForOrder: vi.fn(async () => ({ id: 200, sessionId: null })),
  applyCancelledOrderChargeCompensation: vi.fn(async () => ({
    checkId: 200,
    compensated: true,
  })),
}));

vi.mock("../../../../../db", () => ({
  getOrderById: vi.fn(),
}));

import { recordSessionEvent } from "../../../../../diningSession/sessionService";
import {
  decrementSessionAggregatesForCancelledOrder,
  incrementSessionAggregatesForOrder,
} from "../../../../../diningSession/sessionAggregateWriters";
import { ensureCheckForOrder, applyCancelledOrderChargeCompensation } from "../../../../../operational-session/check/CheckService";
import { getOrderById } from "../../../../../db";

describe("OrderSessionConsumer", () => {
  const consumer = new OrderSessionConsumer();

  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
  });

  it("records session event and increments aggregates on OrderCreated", async () => {
    const envelope: EventEnvelope = {
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
        sessionId: 10,
        createdAt: "2026-06-27 10:00:00",
      },
    };

    await consumer.handle(envelope);

    expect(recordSessionEvent).toHaveBeenCalledWith({
      restaurantId: 1,
      tableId: 7,
      sessionId: 10,
      orderId: 55,
      eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
      metadata: {
        orderNumber: "ORD-1",
        totalAmount: "20.00",
        itemCount: 2,
      },
    });
    expect(incrementSessionAggregatesForOrder).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "20.00",
        orderId: 55,
      },
      { procedure: "OrderSessionConsumer" }
    );
  });

  it("enrolls sessionless OrderCreated into Check via ensureCheckForOrder", async () => {
    const envelope: EventEnvelope = {
      id: "o1b",
      eventId: "e1b",
      eventType: "OrderCreated",
      aggregateType: "Order",
      aggregateId: 56,
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
        orderId: 56,
        restaurantId: 1,
        tableId: 0,
        tableNumber: 0,
        orderNumber: "ORD-K1",
        trackingToken: "tok-k",
        totalAmount: "12.00",
        lineCount: 1,
        sessionId: null,
        createdAt: "2026-06-27 10:00:00",
      },
    };

    await consumer.handle(envelope);

    expect(ensureCheckForOrder).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 56,
    });
    expect(recordSessionEvent).not.toHaveBeenCalled();
    expect(incrementSessionAggregatesForOrder).not.toHaveBeenCalled();
  });

  it("decrements aggregates on OrderCancelled when order has session", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      id: 55,
      restaurantId: 1,
      sessionId: 10,
      totalAmount: "20.00",
    } as Awaited<ReturnType<typeof getOrderById>>);

    await consumer.handle({
      id: "o2",
      eventId: "e2",
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
    });

    expect(decrementSessionAggregatesForCancelledOrder).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "20.00",
        orderId: 55,
      },
      { procedure: "OrderSessionConsumer" }
    );
  });

  it("compensates Charges on sessionless OrderCancelled", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      id: 56,
      restaurantId: 1,
      sessionId: null,
      totalAmount: "12.00",
    } as Awaited<ReturnType<typeof getOrderById>>);

    await consumer.handle({
      id: "o3",
      eventId: "e3",
      eventType: "OrderCancelled",
      aggregateType: "Order",
      aggregateId: 56,
      aggregateVersion: null,
      restaurantId: 1,
      sequenceNumber: 3,
      occurredAt: "2026-06-27 11:00:00",
      correlationId: null,
      causationId: null,
      payloadVersion: 1,
      payload: {
        type: "OrderCancelled",
        schemaVersion: 1,
        orderId: 56,
        cancelledAt: "2026-06-27 11:00:00",
      },
    });

    expect(applyCancelledOrderChargeCompensation).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 56,
    });
    expect(decrementSessionAggregatesForCancelledOrder).not.toHaveBeenCalled();
  });
});
