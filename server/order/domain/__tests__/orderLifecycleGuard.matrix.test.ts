/**
 * ORDER-LIFECYCLE-GUARD-1 — complete operational transition matrix.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { Order } from "../aggregate/Order";
import {
  ORDER_LIFECYCLE_ALLOWED_TRANSITIONS,
  OrderLifecyclePolicy,
} from "../policies/OrderLifecyclePolicy";
import { OrderCancellationPolicy } from "../policies/OrderCancellationPolicy";
import {
  InvalidTransitionError,
  OrderAlreadyCancelledError,
  OrderAlreadyCompletedError,
} from "../errors/OrderDomainErrors";
import { ORDER_STATUSES, type OrderStatus } from "../value-objects/OrderStatus";
import type { UserActor } from "../value-objects/OrderActor";

const actor: UserActor = {
  kind: "user",
  userId: 1,
  dashboardRole: "staff",
  displayName: "Staff",
  restaurantId: 1,
};

const line = {
  menuItemId: 1,
  nameAr: "item",
  nameEn: null,
  unitPrice: "10.00",
  quantity: 1,
  notes: null,
};

function orderAt(status: OrderStatus) {
  return Order.reconstitute({
    id: 11,
    restaurantId: 1,
    tableId: 1,
    tableNumber: 1,
    sessionId: 3,
    customerName: null,
    customerPhone: null,
    notes: null,
    totalAmount: "10.00",
    orderNumber: "ORD-11",
    trackingToken: "tok",
    createdAt: "2026-08-29T12:00:00.000Z",
    updatedAt: "2026-08-29T12:00:00.000Z",
    status,
    lifecycleStage: status === "served" || status === "cancelled" ? "completed" : "active",
    readyAt: status === "ready" || status === "served" ? "2026-08-29T12:05:00.000Z" : null,
    lines: [line],
  });
}

const ALLOWED = new Set(
  ORDER_STATUSES.flatMap((from) =>
    ORDER_LIFECYCLE_ALLOWED_TRANSITIONS[from].map((to) => `${from}->${to}`)
  )
);

describe("ORDER-LIFECYCLE-GUARD-1 matrix", () => {
  it("certifies the operational transition matrix", () => {
    expect(ORDER_LIFECYCLE_ALLOWED_TRANSITIONS).toEqual({
      pending: ["preparing", "cancelled"],
      preparing: ["ready"],
      ready: ["served"],
      served: [],
      cancelled: [],
    });
    expect(ALLOWED).toEqual(
      new Set([
        "pending->preparing",
        "pending->cancelled",
        "preparing->ready",
        "ready->served",
      ])
    );
  });

  it("allows only the certified positive transitions on the aggregate", () => {
    const pending = orderAt("pending");
    pending.advanceStatus("preparing", actor, "2026-08-29T12:10:00.000Z");
    expect(pending.status).toBe("preparing");
    expect(pending.pullDomainEvents().some((e) => e.type === "OrderStatusChanged")).toBe(
      true
    );

    const preparing = orderAt("preparing");
    preparing.advanceStatus("ready", actor, "2026-08-29T12:10:00.000Z");
    expect(preparing.status).toBe("ready");

    const ready = orderAt("ready");
    ready.advanceStatus("served", actor, "2026-08-29T12:10:00.000Z");
    expect(ready.status).toBe("served");

    const cancellable = orderAt("pending");
    cancellable.advanceStatus("cancelled", actor, "2026-08-29T12:10:00.000Z");
    expect(cancellable.status).toBe("cancelled");
  });

  it("rejects every other from→to pair server-side and leaves status unchanged", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        if (from === to) continue;
        if (ALLOWED.has(`${from}->${to}`)) continue;
        const order = orderAt(from);
        expect(
          () => order.advanceStatus(to, actor, "2026-08-29T12:10:00.000Z"),
          `${from} → ${to}`
        ).toThrow();
        expect(order.status, `${from} → ${to} must not mutate`).toBe(from);
      }
    }
  });

  it("rejects cancel after accept, ready, and served", () => {
    expect(OrderCancellationPolicy.canCancel("pending", actor)).toBe(true);
    expect(OrderCancellationPolicy.canCancel("preparing", actor)).toBe(false);
    expect(OrderCancellationPolicy.canCancel("ready", actor)).toBe(false);
    expect(OrderCancellationPolicy.canCancel("served", actor)).toBe(false);
    expect(OrderCancellationPolicy.canCancel("cancelled", actor)).toBe(false);

    expect(() =>
      orderAt("preparing").advanceStatus("cancelled", actor, "2026-08-29T12:10:00.000Z")
    ).toThrow(InvalidTransitionError);
    expect(() =>
      orderAt("ready").advanceStatus("cancelled", actor, "2026-08-29T12:10:00.000Z")
    ).toThrow(InvalidTransitionError);
    expect(() =>
      orderAt("served").advanceStatus("cancelled", actor, "2026-08-29T12:10:00.000Z")
    ).toThrow(OrderAlreadyCompletedError);
  });

  it("rejects backward and reopen transitions", () => {
    expect(OrderLifecyclePolicy.canTransition("preparing", "pending")).toBe(false);
    expect(OrderLifecyclePolicy.canTransition("ready", "preparing")).toBe(false);
    expect(OrderLifecyclePolicy.canTransition("ready", "pending")).toBe(false);
    expect(OrderLifecyclePolicy.canTransition("served", "ready")).toBe(false);
    expect(OrderLifecyclePolicy.canTransition("served", "pending")).toBe(false);
    expect(OrderLifecyclePolicy.canTransition("cancelled", "pending")).toBe(false);
    expect(OrderLifecyclePolicy.canTransition("cancelled", "preparing")).toBe(false);
    expect(() =>
      orderAt("cancelled").advanceStatus("preparing", actor, "2026-08-29T12:10:00.000Z")
    ).toThrow(OrderAlreadyCancelledError);
  });

  it("same-status is not a transition", () => {
    for (const status of ORDER_STATUSES) {
      expect(OrderLifecyclePolicy.canTransition(status, status)).toBe(false);
    }
  });
});
