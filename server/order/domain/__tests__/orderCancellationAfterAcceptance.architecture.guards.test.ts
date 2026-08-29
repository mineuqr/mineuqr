/**
 * ORDER-CANCELLATION-AFTER-ACCEPTANCE-CLOSE-1
 */
import { describe, expect, it } from "vitest";
import { Order } from "../aggregate/Order";
import { OrderCancellationPolicy } from "../policies/OrderCancellationPolicy";
import { InvalidTransitionError } from "../errors/OrderDomainErrors";
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

function orderAt(status: "pending" | "preparing" | "ready") {
  return Order.reconstitute({
    id: 9,
    restaurantId: 1,
    tableId: 1,
    tableNumber: 1,
    sessionId: status === "pending" ? 3 : 3,
    customerName: null,
    customerPhone: null,
    notes: null,
    totalAmount: "10.00",
    orderNumber: "ORD-9",
    trackingToken: "tok",
    createdAt: "2026-08-29T12:00:00.000Z",
    updatedAt: "2026-08-29T12:00:00.000Z",
    status,
    lifecycleStage: "active",
    readyAt: status === "ready" ? "2026-08-29T12:05:00.000Z" : null,
    lines: [line],
  });
}

describe("ORDER-CANCELLATION-AFTER-ACCEPTANCE-CLOSE-1", () => {
  it("allows cancel only while pending", () => {
    expect(OrderCancellationPolicy.canCancel("pending", actor)).toBe(true);
    expect(OrderCancellationPolicy.canCancel("preparing", actor)).toBe(false);
    expect(OrderCancellationPolicy.canCancel("ready", actor)).toBe(false);
    const pending = orderAt("pending");
    pending.advanceStatus("cancelled", actor, "2026-08-29T12:10:00.000Z");
    expect(pending.status).toBe("cancelled");
  });

  it("rejects stale cancel after accept and keeps preparing", () => {
    const accepted = orderAt("preparing");
    expect(() =>
      accepted.advanceStatus("cancelled", actor, "2026-08-29T12:10:00.000Z")
    ).toThrow(InvalidTransitionError);
    expect(accepted.status).toBe("preparing");
  });
});
