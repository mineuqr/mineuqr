/**
 * SPLIT-PAYMENT-PERSISTENCE-1 — mapper round-trip tests.
 */
import { describe, expect, it } from "vitest";
import type { SplitPayment, PaymentAttempt } from "@shared/operational-session";
import {
  getAttemptExternalProviderReference,
  mapRowToPaymentAttempt,
  mapRowsToSplitPayment,
  toPaymentAttemptInsertValues,
  toPaymentAttemptOutcomeUpdateValues,
  toSplitPaymentInsertValues,
  toSplitPaymentUpdateValues,
  toTenderInsertValues,
} from "../splitPaymentMapper";

const payment: SplitPayment = {
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
      tenderId: "t1",
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay_1",
      method: "cash",
      amount: "40.00",
      createdAt: "2026-07-23 10:00:00",
    },
    {
      tenderId: "t2",
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay_1",
      method: "visa",
      amount: "60.00",
      createdAt: "2026-07-23 10:00:00",
    },
  ],
  tenderAllocations: [
    {
      tenderAllocationId: "ta1",
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay_1",
      tenderId: "t1",
      amount: "40.00",
      createdAt: "2026-07-23 10:00:00",
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
      createdAt: "2026-07-23 10:00:00",
    },
  ],
  impliesFinancialSettlement: false,
  createdAt: "2026-07-23 10:00:00",
  updatedAt: "2026-07-23 10:05:00",
};

describe("SPLIT-PAYMENT-PERSISTENCE-1 mapper", () => {
  it("round-trips Payment header + children", () => {
    const insert = toSplitPaymentInsertValues(payment, 1);
    const header = {
      id: 1,
      ...insert,
      financialReference: insert.financialReference,
    };
    const tenderRows = payment.tenders.map((t, i) => ({
      id: i + 1,
      ...toTenderInsertValues(t),
    }));
    const tenderAllocRows = payment.tenderAllocations.map((a, i) => ({
      id: i + 1,
      restaurantId: a.restaurantId,
      checkId: a.checkId,
      paymentId: a.paymentId,
      tenderAllocationId: a.tenderAllocationId,
      tenderId: a.tenderId,
      amount: a.amount,
      createdAt: a.createdAt,
    }));
    const allocRows = payment.allocations.map((a, i) => ({
      id: i + 1,
      restaurantId: a.restaurantId,
      checkId: a.checkId,
      paymentId: a.paymentId,
      allocationId: a.allocationId,
      orderId: a.orderId,
      amount: a.amount,
      createdAt: a.createdAt,
    }));

    const mapped = mapRowsToSplitPayment(
      header,
      tenderRows,
      tenderAllocRows,
      allocRows
    );
    expect(mapped).toEqual(payment);
    expect(mapped.impliesFinancialSettlement).toBe(false);
    expect(mapped.paymentId).toBe("pay_1");
  });

  it("update values exclude identity keys and bump version", () => {
    const update = toSplitPaymentUpdateValues(payment, 3);
    expect(update).toEqual({
      status: "captured",
      amount: "100.00",
      allocatedAmount: "40.00",
      unallocatedAmount: "60.00",
      version: 3,
      updatedAt: "2026-07-23 10:05:00",
    });
    expect(update).not.toHaveProperty("paymentId");
    expect(update).not.toHaveProperty("checkId");
  });

  it("maps PaymentAttempt and preserves provider reference separately", () => {
    const attempt: PaymentAttempt = {
      restaurantId: 1,
      checkId: 10,
      attemptId: "att_1",
      paymentId: "pay_1",
      status: "succeeded",
      amount: "100.00",
      method: "visa",
      createdAt: "2026-07-23 10:00:00",
      updatedAt: "2026-07-23 10:01:00",
    };
    const insert = toPaymentAttemptInsertValues(attempt, "psp_abc");
    const row = { id: 9, ...insert };
    const mapped = mapRowToPaymentAttempt(row);
    expect(mapped).toEqual(attempt);
    expect(getAttemptExternalProviderReference(row)).toBe("psp_abc");
    expect(mapped).not.toHaveProperty("externalProviderReference");
  });

  it("outcome update values do not include amount/method/attemptId", () => {
    const attempt: PaymentAttempt = {
      restaurantId: 1,
      checkId: 10,
      attemptId: "att_1",
      paymentId: "pay_1",
      status: "failed",
      amount: "100.00",
      method: "visa",
      createdAt: "2026-07-23 10:00:00",
      updatedAt: "2026-07-23 10:02:00",
    };
    const values = toPaymentAttemptOutcomeUpdateValues(attempt, null);
    expect(values).toEqual({
      status: "failed",
      paymentId: "pay_1",
      externalProviderReference: null,
      updatedAt: "2026-07-23 10:02:00",
    });
    expect(values).not.toHaveProperty("amount");
    expect(values).not.toHaveProperty("method");
    expect(values).not.toHaveProperty("attemptId");
  });

  it("rejects invalid payment status on read", () => {
    expect(() =>
      mapRowsToSplitPayment(
        {
          id: 1,
          ...toSplitPaymentInsertValues(payment, 1),
          status: "not_a_status" as never,
        },
        [],
        [],
        []
      )
    ).toThrow(/Invalid SplitPaymentStatus/);
  });
});
