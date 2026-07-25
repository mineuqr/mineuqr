/**
 * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { getOrdersWorkspaceActions } from "@/lib/operational-workspace/operationalActions";
import {
  isSessionlessSelfOrderingOrder,
  unpaidGrandTotalForOrder,
  unpaidOrderIdSet,
} from "../selfOrderingOrderSettlementPresentation";

describe("SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 presentation", () => {
  it("detects sessionless Self Ordering Orders", () => {
    expect(isSessionlessSelfOrderingOrder({ sessionId: null })).toBe(true);
    expect(isSessionlessSelfOrderingOrder({ sessionId: undefined })).toBe(true);
    expect(isSessionlessSelfOrderingOrder({ sessionId: 42 })).toBe(false);
  });

  it("builds unpaid order id set from Counter Pickup unpaid queue", () => {
    expect(unpaidOrderIdSet([{ orderId: 1 }, { orderId: 2 }])).toEqual(
      new Set([1, 2])
    );
    expect(unpaidGrandTotalForOrder([{ orderId: 9, grandTotal: "12.50" }], 9)).toBe(
      "12.50"
    );
    expect(unpaidGrandTotalForOrder([], 9)).toBeNull();
  });

  it("exposes Settle + Cancel for unpaid sessionless; blocks cancel after paid", () => {
    const unpaid = getOrdersWorkspaceActions("ready", {
      sessionless: true,
      unpaidSessionless: true,
    });
    expect(unpaid.map((a) => a.id)).toEqual([
      "serve-order",
      "settle-self-ordering",
      "cancel-order",
    ]);

    const paid = getOrdersWorkspaceActions("ready", {
      sessionless: true,
      unpaidSessionless: false,
    });
    expect(paid.map((a) => a.id)).toEqual(["serve-order"]);
    expect(paid.some((a) => a.id === "cancel-order")).toBe(false);
    expect(paid.some((a) => a.id === "settle-self-ordering")).toBe(false);
  });

  it("keeps Waiter / Table QR sessioned cancel unchanged", () => {
    const sessioned = getOrdersWorkspaceActions("pending", {
      sessionless: false,
      unpaidSessionless: false,
    });
    expect(sessioned.map((a) => a.id)).toEqual([
      "accept-order",
      "cancel-order",
    ]);
    expect(sessioned.some((a) => a.id === "settle-self-ordering")).toBe(false);
  });
});
