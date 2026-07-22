import { describe, expect, it } from "vitest";
import {
  applyComplimentary,
  applyFullSettlement,
  applyPartialSettlement,
  cancelOrderSettlement,
  createOrderSettlement,
  recalculateOrderSettlement,
  refundOrderSettlement,
  voidOrderSettlement,
} from "../orderSettlementCommands";
import {
  DuplicateSettlementError,
  IllegalTerminalTransitionError,
  InvalidTransitionError,
  SettlementInvariantViolationError,
  SettlementOverflowError,
} from "../orderSettlementErrors";
import type { OrderSettlement } from "../orderSettlementContract";
import { assertTransitionAllowed } from "../orderSettlementLifecycle";

const AT = "2026-07-22T12:00:00.000Z";

function createPending(total = "100.00"): OrderSettlement {
  const r = createOrderSettlement({
    restaurantId: 1,
    checkId: 10,
    orderId: 55,
    orderTotalSnapshot: total,
    membershipExists: true,
    checkRestaurantId: 1,
    orderRestaurantId: 1,
    at: AT,
  });
  expect(r.outcome).toBe("applied");
  return r.settlement;
}

describe("ORDER-SETTLEMENT-DOMAIN-1 commands", () => {
  describe("create", () => {
    it("creates pending with full outstanding", () => {
      const r = createOrderSettlement({
        restaurantId: 1,
        checkId: 10,
        orderId: 55,
        orderTotalSnapshot: "20.00",
        membershipExists: true,
        checkRestaurantId: 1,
        orderRestaurantId: 1,
        at: AT,
      });
      expect(r.settlement.status).toBe("pending");
      expect(r.settlement.outstandingAmount).toBe("20.00");
      expect(r.settlement.settledAmount).toBe("0.00");
      expect(r.events[0]?.eventType).toBe("OrderSettlementCreated");
    });

    it("rejects without membership (I-OS-02)", () => {
      expect(() =>
        createOrderSettlement({
          restaurantId: 1,
          checkId: 10,
          orderId: 55,
          orderTotalSnapshot: "20.00",
          membershipExists: false,
          checkRestaurantId: 1,
          orderRestaurantId: 1,
          at: AT,
        })
      ).toThrow(SettlementInvariantViolationError);
    });

    it("rejects duplicate identity (I-OS-01)", () => {
      expect(() =>
        createOrderSettlement({
          restaurantId: 1,
          checkId: 10,
          orderId: 55,
          orderTotalSnapshot: "20.00",
          membershipExists: true,
          existingIdentities: [
            { restaurantId: 1, checkId: 10, orderId: 55 },
          ],
          checkRestaurantId: 1,
          orderRestaurantId: 1,
          at: AT,
        })
      ).toThrow(DuplicateSettlementError);
    });

    it("rejects tenant mismatch (I-OS-11)", () => {
      expect(() =>
        createOrderSettlement({
          restaurantId: 1,
          checkId: 10,
          orderId: 55,
          orderTotalSnapshot: "20.00",
          membershipExists: true,
          checkRestaurantId: 2,
          orderRestaurantId: 1,
          at: AT,
        })
      ).toThrow(SettlementInvariantViolationError);
    });

    it("rejects BI keys (I-OS-12)", () => {
      expect(() =>
        createOrderSettlement({
          restaurantId: 1,
          checkId: 10,
          orderId: 55,
          orderTotalSnapshot: "20.00",
          membershipExists: true,
          checkRestaurantId: 1,
          orderRestaurantId: 1,
          at: AT,
          businessIdentityDay: "2026-07-22",
        })
      ).toThrow(SettlementInvariantViolationError);
    });
  });

  describe("recalculate", () => {
    it("updates snapshot and outstanding while pending", () => {
      const pending = createPending("50.00");
      const r = recalculateOrderSettlement({
        settlement: pending,
        orderTotalSnapshot: "75.00",
        at: AT,
      });
      expect(r.outcome).toBe("applied");
      expect(r.settlement.orderTotalSnapshot).toBe("75.00");
      expect(r.settlement.outstandingAmount).toBe("75.00");
      expect(r.events[0]?.eventType).toBe("OrderSettlementRecalculated");
    });

    it("is idempotent when amounts unchanged", () => {
      const pending = createPending("50.00");
      const r = recalculateOrderSettlement({
        settlement: pending,
        orderTotalSnapshot: "50.00",
        at: AT,
      });
      expect(r.outcome).toBe("already_in_state");
      expect(r.events).toHaveLength(0);
    });

    it("rejects recalculate on terminal", () => {
      const settled = applyFullSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement;
      expect(() =>
        recalculateOrderSettlement({
          settlement: settled,
          orderTotalSnapshot: "120.00",
          at: AT,
        })
      ).toThrow(InvalidTransitionError);
    });
  });

  describe("applyPartialSettlement", () => {
    it("moves pending → partially_settled", () => {
      const r = applyPartialSettlement({
        settlement: createPending("100.00"),
        coverageAmount: "40.00",
        at: AT,
      });
      expect(r.settlement.status).toBe("partially_settled");
      expect(r.settlement.settledAmount).toBe("40.00");
      expect(r.settlement.outstandingAmount).toBe("60.00");
      expect(r.events[0]?.eventType).toBe("OrderSettlementPartiallySettled");
    });

    it("promotes to settled when coverage completes", () => {
      const r = applyPartialSettlement({
        settlement: createPending("100.00"),
        coverageAmount: "100.00",
        at: AT,
      });
      expect(r.settlement.status).toBe("settled");
      expect(r.events[0]?.eventType).toBe("OrderSettlementSettled");
    });

    it("rejects overflow coverage", () => {
      expect(() =>
        applyPartialSettlement({
          settlement: createPending("10.00"),
          coverageAmount: "11.00",
          at: AT,
        })
      ).toThrow(SettlementOverflowError);
    });
  });

  describe("applyFullSettlement", () => {
    it("settles from pending", () => {
      const r = applyFullSettlement({
        settlement: createPending("33.00"),
        at: AT,
      });
      expect(r.settlement.status).toBe("settled");
      expect(r.settlement.outstandingAmount).toBe("0.00");
      expect(r.settlement.settledAmount).toBe("33.00");
    });

    it("is idempotent when already settled (ADR-021)", () => {
      const settled = applyFullSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement;
      const r = applyFullSettlement({ settlement: settled, at: AT });
      expect(r.outcome).toBe("already_in_state");
      expect(r.events).toHaveLength(0);
    });

    it("settles from partially_settled", () => {
      const partial = applyPartialSettlement({
        settlement: createPending("100.00"),
        coverageAmount: "25.00",
        at: AT,
      }).settlement;
      const r = applyFullSettlement({ settlement: partial, at: AT });
      expect(r.settlement.status).toBe("settled");
      expect(r.settlement.settledAmount).toBe("100.00");
    });
  });

  describe("applyComplimentary", () => {
    it("covers fully as complimentary", () => {
      const r = applyComplimentary({
        settlement: createPending("12.00"),
        at: AT,
      });
      expect(r.settlement.status).toBe("complimentary");
      expect(r.settlement.outstandingAmount).toBe("0.00");
    });
  });

  describe("cancel / void / refund", () => {
    it("cancels pending without collection", () => {
      const r = cancelOrderSettlement({
        settlement: createPending(),
        at: AT,
      });
      expect(r.settlement.status).toBe("cancelled");
      expect(r.settlement.settledAmount).toBe("0.00");
      expect(r.settlement.outstandingAmount).toBe("0.00");
    });

    it("voids pending", () => {
      const r = voidOrderSettlement({
        settlement: createPending(),
        at: AT,
      });
      expect(r.settlement.status).toBe("voided");
    });

    it("voids after settled (terminal→terminal)", () => {
      const settled = applyFullSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement;
      const r = voidOrderSettlement({ settlement: settled, at: AT });
      expect(r.settlement.status).toBe("voided");
    });

    it("refunds settled without reopening pending", () => {
      const settled = applyFullSettlement({
        settlement: createPending("50.00"),
        at: AT,
      }).settlement;
      const r = refundOrderSettlement({ settlement: settled, at: AT });
      expect(r.settlement.status).toBe("refunded");
      expect(r.settlement.settledAmount).toBe("0.00");
      expect(r.events[0]).toMatchObject({
        eventType: "OrderSettlementRefunded",
        refundedAmount: "50.00",
      });
    });

    it("forbids settled → pending (I-OS-14)", () => {
      const settled = applyFullSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement;
      // Domain has no reopen command; assert transition guard directly via void path reverse attempt
      expect(() =>
        recalculateOrderSettlement({
          settlement: settled,
          orderTotalSnapshot: "100.00",
          at: AT,
        })
      ).toThrow(InvalidTransitionError);
    });

    it("idempotent void / cancel / refund", () => {
      const voided = voidOrderSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement;
      expect(voidOrderSettlement({ settlement: voided, at: AT }).outcome).toBe(
        "already_in_state"
      );

      const cancelled = cancelOrderSettlement({
        settlement: createPending("1.00"),
        at: AT,
      }).settlement;
      expect(
        cancelOrderSettlement({ settlement: cancelled, at: AT }).outcome
      ).toBe("already_in_state");

      const refunded = refundOrderSettlement({
        settlement: applyFullSettlement({
          settlement: createPending("2.00"),
          at: AT,
        }).settlement,
        at: AT,
      }).settlement;
      expect(
        refundOrderSettlement({ settlement: refunded, at: AT }).outcome
      ).toBe("already_in_state");
    });

    it("rejects cancel from settled", () => {
      const settled = applyFullSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement;
      expect(() =>
        cancelOrderSettlement({ settlement: settled, at: AT })
      ).toThrow(InvalidTransitionError);
    });

    it("rejects refund from pending", () => {
      expect(() =>
        refundOrderSettlement({ settlement: createPending(), at: AT })
      ).toThrow(InvalidTransitionError);
    });
  });

  describe("determinism / ADR-021 compatibility", () => {
    it("same state + same command yields same outcome", () => {
      const pending = createPending("10.00");
      const a = applyFullSettlement({ settlement: pending, at: AT });
      const b = applyFullSettlement({ settlement: pending, at: AT });
      expect(a.settlement).toEqual(b.settlement);
      expect(a.outcome).toBe(b.outcome);
      expect(a.events.map((e) => e.eventType)).toEqual(
        b.events.map((e) => e.eventType)
      );
    });

    it("duplicate settle after apply is already_in_state", () => {
      const once = applyFullSettlement({
        settlement: createPending("10.00"),
        at: AT,
      });
      const twice = applyFullSettlement({
        settlement: once.settlement,
        at: AT,
      });
      expect(twice.outcome).toBe("already_in_state");
      expect(twice.events).toEqual([]);
    });
  });
});

describe("ORDER-SETTLEMENT-DOMAIN-1 I-OS-14 via commands", () => {
  it("refunded cannot be recalculated to pending", () => {
    const refunded = refundOrderSettlement({
      settlement: applyFullSettlement({
        settlement: createPending(),
        at: AT,
      }).settlement,
      at: AT,
    }).settlement;
    expect(() =>
      recalculateOrderSettlement({
        settlement: refunded,
        orderTotalSnapshot: "100.00",
        at: AT,
      })
    ).toThrow(InvalidTransitionError);
  });

  it("voided cannot receive partial settlement", () => {
    const voided = voidOrderSettlement({
      settlement: createPending(),
      at: AT,
    }).settlement;
    expect(() =>
      applyPartialSettlement({
        settlement: voided,
        coverageAmount: "1.00",
        at: AT,
      })
    ).toThrow(InvalidTransitionError);
  });

  it("assertTransitionAllowed rejects settled → pending", () => {
    expect(() => assertTransitionAllowed("settled", "pending")).toThrow(
      IllegalTerminalTransitionError
    );
  });
});
