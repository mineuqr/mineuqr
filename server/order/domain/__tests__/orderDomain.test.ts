import { describe, expect, it } from "vitest";
import { Order } from "../aggregate/Order";
import { OrderLifecyclePolicy } from "../policies/OrderLifecyclePolicy";
import {
  InvalidTransitionError,
  OrderAlreadyCompletedError,
} from "../errors/OrderDomainErrors";

const baseLine = {
  menuItemId: 1,
  nameAr: "حمص",
  nameEn: null,
  unitPrice: "10.00",
  quantity: 2,
  notes: null,
};

function newOrder() {
  return Order.placeNew({
    restaurantId: 1,
    tableId: 1,
    tableNumber: 3,
    totalAmount: "20.00",
    orderNumber: "ORD-0001",
    trackingToken: "tok",
    createdAt: "2026-06-27T12:00:00.000Z",
    lines: [baseLine],
  });
}

describe("OrderLifecyclePolicy", () => {
  it("allows pending → preparing", () => {
    expect(OrderLifecyclePolicy.canTransition("pending", "preparing")).toBe(true);
  });

  it("forbids pending → ready skip", () => {
    expect(OrderLifecyclePolicy.canTransition("pending", "ready")).toBe(false);
  });
});

describe("Order aggregate", () => {
  it("rejects empty cart", () => {
    expect(() =>
      Order.placeNew({
        restaurantId: 1,
        tableId: 1,
        tableNumber: 1,
        totalAmount: "0.00",
        orderNumber: "ORD-1",
        trackingToken: "t",
        createdAt: "2026-06-27T12:00:00.000Z",
        lines: [],
      })
    ).toThrow();
  });

  it("emits OrderCreated after recordCreated", () => {
    const order = newOrder();
    const persisted = Order.reconstitute({
      ...order.snapshotForCreate(),
      id: 99,
      status: "pending",
      readyAt: null,
      updatedAt: "2026-06-27T12:00:00.000Z",
      sessionId: null,
      customerName: null,
      customerPhone: null,
      notes: null,
    });
    persisted.recordCreated(99);
    const events = persisted.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("OrderCreated");
  });

  it("rejects advance from served", () => {
    const order = Order.reconstitute({
      id: 1,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      sessionId: null,
      customerName: null,
      customerPhone: null,
      notes: null,
      totalAmount: "20.00",
      orderNumber: "ORD-1",
      trackingToken: "t",
      createdAt: "2026-06-27T12:00:00.000Z",
      updatedAt: "2026-06-27T12:00:00.000Z",
      status: "served",
      readyAt: "2026-06-27T12:05:00.000Z",
      lines: [baseLine],
    });
    expect(() =>
      order.advanceStatus("cancelled", { role: "owner" }, "2026-06-27T12:10:00.000Z")
    ).toThrow(OrderAlreadyCompletedError);
  });

  it("rejects invalid transition", () => {
    const order = Order.reconstitute({
      id: 1,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      sessionId: null,
      customerName: null,
      customerPhone: null,
      notes: null,
      totalAmount: "20.00",
      orderNumber: "ORD-1",
      trackingToken: "t",
      createdAt: "2026-06-27T12:00:00.000Z",
      updatedAt: "2026-06-27T12:00:00.000Z",
      status: "pending",
      readyAt: null,
      lines: [baseLine],
    });
    expect(() =>
      order.advanceStatus("ready", { role: "owner" }, "2026-06-27T12:10:00.000Z")
    ).toThrow(InvalidTransitionError);
  });

  it("emits OrderReady on first ready transition", () => {
    const order = Order.reconstitute({
      id: 1,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      sessionId: null,
      customerName: null,
      customerPhone: null,
      notes: null,
      totalAmount: "20.00",
      orderNumber: "ORD-1",
      trackingToken: "t",
      createdAt: "2026-06-27T12:00:00.000Z",
      updatedAt: "2026-06-27T12:00:00.000Z",
      status: "preparing",
      readyAt: null,
      lines: [baseLine],
    });
    order.advanceStatus("ready", { role: "owner" }, "2026-06-27 12:05:00");
    const types = order.pullDomainEvents().map((e) => e.type);
    expect(types).toContain("OrderStatusChanged");
    expect(types).toContain("OrderReady");
  });
});
