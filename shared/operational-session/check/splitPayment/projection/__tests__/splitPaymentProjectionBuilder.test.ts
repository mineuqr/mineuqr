/**
 * SPLIT-PAYMENT-PROJECTION-1 — builder determinism / identity / timeline.
 */
import { describe, expect, it } from "vitest";
import type {
  CheckFinancialResponsibility,
  PaymentAttempt,
  SplitPayment,
} from "../../splitPaymentContract";
import {
  buildSplitPaymentAttemptProjection,
  buildSplitPaymentOutstandingProjection,
  buildSplitPaymentProjection,
  buildSplitPaymentProjectionEventClaimKey,
  buildSplitPaymentProjectionRevision,
} from "../splitPaymentProjectionBuilder";

const AT = "2026-07-23T12:00:00.000Z";

function payment(overrides: Partial<SplitPayment> = {}): SplitPayment {
  return {
    restaurantId: 1,
    checkId: 10,
    paymentId: "pay_1",
    paymentReference: "pref_1",
    financialReference: "fref_1",
    status: "captured",
    amount: "100.00",
    allocatedAmount: "40.00",
    unallocatedAmount: "60.00",
    tenders: [
      {
        tenderId: "t_cash",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        method: "cash",
        amount: "40.00",
        createdAt: "2026-07-23T12:00:01.000Z",
      },
      {
        tenderId: "t_visa",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        method: "visa",
        amount: "60.00",
        createdAt: "2026-07-23T12:00:02.000Z",
      },
    ],
    tenderAllocations: [
      {
        tenderAllocationId: "ta1",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        tenderId: "t_cash",
        amount: "40.00",
        createdAt: "2026-07-23T12:00:03.000Z",
      },
    ],
    allocations: [
      {
        allocationId: "a1",
        restaurantId: 1,
        checkId: 10,
        paymentId: "pay_1",
        orderId: 55,
        amount: "40.00",
        createdAt: "2026-07-23T12:00:04.000Z",
      },
    ],
    impliesFinancialSettlement: false,
    createdAt: AT,
    updatedAt: "2026-07-23T12:05:00.000Z",
    ...overrides,
  };
}

describe("SPLIT-PAYMENT-PROJECTION-1 builder", () => {
  it("maps Write Model fields and preserves canonical identities", () => {
    const p = buildSplitPaymentProjection(payment());
    expect(p.paymentId).toBe("pay_1");
    expect(p.paymentReference).toBe("pref_1");
    expect(p.financialReference).toBe("fref_1");
    expect(p.amount).toBe("100.00");
    expect(p.allocatedAmount).toBe("40.00");
    expect(p.unallocatedAmount).toBe("60.00");
    expect(p.isCaptured).toBe(true);
    expect(p.isValueReceived).toBe(true);
    expect(p.impliesFinancialSettlement).toBe(false);
    expect(p.isFinanciallyComplete).toBe(false);
    expect(p.tenderCount).toBe(2);
    expect(p.tenderMethods).toEqual(["cash", "visa"]);
    expect(p.projectionSchemaVersion).toBe(1);
  });

  it("duplicate projection execution is identical", () => {
    const src = payment();
    const a = buildSplitPaymentProjection(src);
    const b = buildSplitPaymentProjection(src);
    expect(a).toEqual(b);
    expect(a.projectionRevision).toBe(
      buildSplitPaymentProjectionRevision(src)
    );
  });

  it("orders historical timeline deterministically", () => {
    const p = buildSplitPaymentProjection(payment());
    expect(p.timeline.map((e) => e.id)).toEqual([
      "t_cash",
      "t_visa",
      "ta1",
      "a1",
    ]);
    expect(p.timeline.every((e, i, arr) => i === 0 || arr[i - 1]!.at <= e.at))
      .toBe(true);
  });

  it("payment completion flags applied status only", () => {
    const applied = buildSplitPaymentProjection(
      payment({
        status: "applied",
        allocatedAmount: "100.00",
        unallocatedAmount: "0.00",
      })
    );
    expect(applied.isPaymentCompleted).toBe(true);
    expect(applied.isTerminal).toBe(true);
    expect(applied.isFinanciallyComplete).toBe(false);
  });

  it("builds outstanding and attempt projections without inventing money", () => {
    const outstanding: CheckFinancialResponsibility = {
      restaurantId: 1,
      checkId: 10,
      financialResponsibility: "100.00",
      appliedPaymentValue: "40.00",
      outstandingBalance: "60.00",
    };
    const o = buildSplitPaymentOutstandingProjection(outstanding, {
      projectionTimestamp: AT,
    });
    expect(o.outstandingBalance).toBe("60.00");
    expect(o.projectionRevision).toContain("60.00");

    const attempt: PaymentAttempt = {
      restaurantId: 1,
      checkId: 10,
      attemptId: "att_1",
      paymentId: "pay_1",
      status: "succeeded",
      amount: "100.00",
      method: "visa",
      createdAt: AT,
      updatedAt: AT,
    };
    const a = buildSplitPaymentAttemptProjection(attempt);
    expect(a.attemptId).toBe("att_1");
    expect(a.paymentId).toBe("pay_1");
    expect(a.isSucceeded).toBe(true);
  });

  it("event claim keys are deterministic for duplicates", () => {
    const event = {
      eventType: "PaymentCaptured" as const,
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay_1",
      paymentReference: "pref_1",
      financialReference: "fref_1",
      occurredAt: AT,
      status: "captured" as const,
      amount: "100.00",
    };
    expect(buildSplitPaymentProjectionEventClaimKey(event)).toBe(
      buildSplitPaymentProjectionEventClaimKey(event)
    );
  });
});
