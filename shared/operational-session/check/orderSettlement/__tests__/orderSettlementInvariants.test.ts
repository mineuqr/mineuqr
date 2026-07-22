import { describe, expect, it } from "vitest";
import {
  assertCheckOrdersSubtotalReconciles,
  assertComplimentaryCheckConsistency,
  assertMoneyInvariants,
  assertNotRevenueAuthority,
  assertPaidCheckConsistency,
  assertSingleNonVoidContribution,
  assertVoidedCheckConsistency,
} from "../orderSettlementInvariants";
import {
  applyFullSettlement,
  createOrderSettlement,
  voidOrderSettlement,
} from "../orderSettlementCommands";
import { SettlementInvariantViolationError } from "../orderSettlementErrors";
import type { OrderSettlement } from "../orderSettlementContract";

const AT = "2026-07-22T12:00:00.000Z";

function pending(orderId: number, total: string, checkId = 10): OrderSettlement {
  return createOrderSettlement({
    restaurantId: 1,
    checkId,
    orderId,
    orderTotalSnapshot: total,
    membershipExists: true,
    checkRestaurantId: 1,
    orderRestaurantId: 1,
    at: AT,
  }).settlement;
}

describe("ORDER-SETTLEMENT-DOMAIN-1 invariants", () => {
  it("I-OS-03/04 money invariants on pending", () => {
    const s = pending(1, "10.00");
    expect(() => assertMoneyInvariants(s)).not.toThrow();
  });

  it("I-OS-05 reconciles active snapshots", () => {
    const a = pending(1, "10.00");
    const b = pending(2, "5.00");
    expect(() =>
      assertCheckOrdersSubtotalReconciles([a, b], "15.00")
    ).not.toThrow();
    expect(() =>
      assertCheckOrdersSubtotalReconciles([a, b], "14.00")
    ).toThrow();
  });

  it("I-OS-06 rejects multi-check non-void contribution", () => {
    const a = pending(55, "10.00", 10);
    const b = pending(55, "10.00", 11);
    expect(() => assertSingleNonVoidContribution(55, 1, [a, b])).toThrow(
      SettlementInvariantViolationError
    );
  });

  it("I-OS-06 allows voided on other check", () => {
    const a = pending(55, "10.00", 10);
    const b = voidOrderSettlement({
      settlement: pending(55, "10.00", 11),
      at: AT,
    }).settlement;
    expect(() => assertSingleNonVoidContribution(55, 1, [a, b])).not.toThrow();
  });

  it("I-OS-07 paid check consistency", () => {
    const settled = applyFullSettlement({
      settlement: pending(1, "10.00"),
      at: AT,
    }).settlement;
    expect(() =>
      assertPaidCheckConsistency("paid", [settled])
    ).not.toThrow();
    expect(() =>
      assertPaidCheckConsistency("paid", [pending(2, "10.00")])
    ).toThrow(SettlementInvariantViolationError);
  });

  it("I-OS-08 complimentary consistency", () => {
    expect(() =>
      assertComplimentaryCheckConsistency("complimentary", [
        pending(1, "1.00"),
      ])
    ).toThrow(SettlementInvariantViolationError);
  });

  it("I-OS-09 voided consistency", () => {
    const voided = voidOrderSettlement({
      settlement: pending(1, "1.00"),
      at: AT,
    }).settlement;
    expect(() =>
      assertVoidedCheckConsistency("voided", [voided])
    ).not.toThrow();
  });

  it("I-OS-10 rejects revenue role claim", () => {
    expect(() => assertNotRevenueAuthority("revenue")).toThrow(
      SettlementInvariantViolationError
    );
    expect(() =>
      assertNotRevenueAuthority("order_settlement_state")
    ).not.toThrow();
  });
});
