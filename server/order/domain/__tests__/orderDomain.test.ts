import { describe, expect, it } from "vitest";
import { Order } from "../aggregate/Order";
import { OrderLifecyclePolicy } from "../policies/OrderLifecyclePolicy";
import {
  InvalidTransitionError,
  OrderAlreadyCompletedError,
} from "../errors/OrderDomainErrors";
import type { UserActor } from "../value-objects/OrderActor";

const ownerActor: UserActor = {
  kind: "user",
  userId: 1,
  dashboardRole: "owner",
  displayName: "Owner",
  restaurantId: 1,
};

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
      lifecycleStage: "active",
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
      lifecycleStage: "completed",
      readyAt: "2026-06-27T12:05:00.000Z",
      lines: [baseLine],
    });
    expect(() =>
      order.advanceStatus("cancelled", ownerActor, "2026-06-27T12:10:00.000Z")
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
      lifecycleStage: "active",
      readyAt: null,
      lines: [baseLine],
    });
    expect(() =>
      order.advanceStatus("ready", ownerActor, "2026-06-27T12:10:00.000Z")
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
      lifecycleStage: "active",
      readyAt: null,
      lines: [baseLine],
    });
    order.advanceStatus("ready", ownerActor, "2026-06-27 12:05:00");
    const events = order.pullDomainEvents();
    const types = events.map((e) => e.type);
    expect(types).toContain("OrderStatusChanged");
    expect(types).toContain("OrderReady");
    const statusChanged = events.find((e) => e.type === "OrderStatusChanged");
    expect(statusChanged?.actor).toEqual(ownerActor);
  });

  it("allows device actors to advance but not cancel", () => {
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
      lifecycleStage: "active",
      readyAt: null,
      lines: [baseLine],
    });
    const deviceActor = {
      kind: "device" as const,
      deviceId: "dev-1",
      tokenId: "tok-1",
      deviceRole: "kitchen_display",
      displayName: "Kitchen",
      restaurantId: 1,
    };
    order.advanceStatus("ready", deviceActor, "2026-06-27 12:05:00");
    expect(order.status).toBe("ready");
    expect(() =>
      order.advanceStatus("cancelled", deviceActor, "2026-06-27 12:10:00")
    ).toThrow(InvalidTransitionError);
  });
});

describe("ORDER-LIFECYCLE-ARCHIVE-1 lifecycle stage", () => {
  it("defaults new orders to active lifecycle", () => {
    const order = newOrder();
    expect(order.lifecycleStage).toBe("active");
  });

  it("allows active → completed → archived transitions", () => {
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
      lifecycleStage: "active",
      readyAt: "2026-06-27T12:05:00.000Z",
      lines: [baseLine],
    });

    order.advanceLifecycleStage("completed", "2026-06-27 12:10:00");
    expect(order.lifecycleStage).toBe("completed");

    order.advanceLifecycleStage("archived", "2026-06-27 13:00:00");
    expect(order.lifecycleStage).toBe("archived");
  });

  it("rejects invalid lifecycle transitions", () => {
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
      lifecycleStage: "archived",
      readyAt: null,
      lines: [baseLine],
    });

    expect(() =>
      order.advanceLifecycleStage("active", "2026-06-27 14:00:00")
    ).toThrow();
    expect(() =>
      order.advanceLifecycleStage("completed", "2026-06-27 14:00:00")
    ).toThrow();
  });

  it("emits OrderLifecycleStageChanged on transition", () => {
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
      status: "ready",
      lifecycleStage: "active",
      readyAt: "2026-06-27T12:05:00.000Z",
      lines: [baseLine],
    });

    order.advanceLifecycleStage("completed", "2026-06-27 12:10:00");
    const events = order.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "OrderLifecycleStageChanged",
      fromStage: "active",
      toStage: "completed",
    });
  });
});
