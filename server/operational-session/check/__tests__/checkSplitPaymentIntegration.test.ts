/**
 * SPLIT-PAYMENT-INTEGRATION-1 — Aggregate orchestration + Domain + Repository.
 * Domain is real; Check / repository / OS integration deps are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SplitPayment } from "@shared/operational-session";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  findSplitPaymentByIdentity: vi.fn(),
  listSplitPaymentsForCheck: vi.fn(),
  insertSplitPayment: vi.fn(),
  updateSplitPayment: vi.fn(),
  insertPaymentAttempt: vi.fn(),
  findPaymentAttemptByIdentity: vi.fn(),
  listPaymentAttemptsForCheck: vi.fn(),
  finalizePaymentAttemptOutcome: vi.fn(),
  ensureOrderSettlementForEnrollment: vi.fn(),
  applyPartialSettlementForOrder: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
}));

vi.mock("../checkMapper", () => ({
  mapRowToOperationalCheck: (row: Record<string, unknown>) => ({
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: null,
    outcome: row.outcome ?? "open",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      mode: "exclusive",
      components: [],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "0.00",
    subtotal: "100.00",
    taxAmount: "0.00",
    taxBreakdown: { lines: [], totalTax: "0.00" },
    grandTotal: row.grandTotal ?? "100.00",
    snapshotsFrozenAt: "t",
    totalsFrozenAt: null,
    settledAt: null,
    voidedAt: null,
    createdAt: "t",
    updatedAt: "t",
  }),
}));

vi.mock("../splitPaymentRepository", () => {
  class SplitPaymentPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "SplitPaymentPersistenceError";
      this.code = code;
    }
  }
  return {
    SplitPaymentPersistenceError,
    findSplitPaymentByIdentity: (...a: unknown[]) =>
      mocks.findSplitPaymentByIdentity(...a),
    listSplitPaymentsForCheck: (...a: unknown[]) =>
      mocks.listSplitPaymentsForCheck(...a),
    insertSplitPayment: (...a: unknown[]) => mocks.insertSplitPayment(...a),
    updateSplitPayment: (...a: unknown[]) => mocks.updateSplitPayment(...a),
    insertPaymentAttempt: (...a: unknown[]) => mocks.insertPaymentAttempt(...a),
    findPaymentAttemptByIdentity: (...a: unknown[]) =>
      mocks.findPaymentAttemptByIdentity(...a),
    listPaymentAttemptsForCheck: (...a: unknown[]) =>
      mocks.listPaymentAttemptsForCheck(...a),
    finalizePaymentAttemptOutcome: (...a: unknown[]) =>
      mocks.finalizePaymentAttemptOutcome(...a),
  };
});

vi.mock("../checkOrderSettlementIntegration", () => ({
  ensureOrderSettlementForEnrollment: (...a: unknown[]) =>
    mocks.ensureOrderSettlementForEnrollment(...a),
  applyPartialSettlementForOrder: (...a: unknown[]) =>
    mocks.applyPartialSettlementForOrder(...a),
}));

import {
  applyPaymentOnCheck,
  authorizePaymentOnCheck,
  capturePaymentOnCheck,
  computeAppliedPaymentValue,
  createPaymentOnCheck,
  failPaymentAttemptOnCheck,
  startPaymentAttemptOnCheck,
} from "../checkSplitPaymentIntegration";

const AT = "2026-07-23 12:00:00";

function openCheckRow() {
  return {
    id: 100,
    restaurantId: 1,
    outcome: "open",
    grandTotal: "100.00",
  };
}

function payment(overrides: Partial<SplitPayment> = {}): SplitPayment {
  return {
    restaurantId: 1,
    checkId: 100,
    paymentId: "pay_1",
    paymentReference: "pref_1",
    financialReference: null,
    status: "pending",
    amount: "40.00",
    allocatedAmount: "0.00",
    unallocatedAmount: "40.00",
    tenders: [],
    tenderAllocations: [],
    allocations: [],
    impliesFinancialSettlement: false,
    createdAt: AT,
    updatedAt: AT,
    ...overrides,
  };
}

describe("SPLIT-PAYMENT-INTEGRATION-1 orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCheckById.mockResolvedValue(openCheckRow());
    mocks.listSplitPaymentsForCheck.mockResolvedValue([]);
    mocks.insertSplitPayment.mockResolvedValue(1);
    mocks.updateSplitPayment.mockResolvedValue(2);
    mocks.ensureOrderSettlementForEnrollment.mockResolvedValue({
      settlements: [],
      events: [],
      outcomes: ["already_in_state"],
    });
    mocks.applyPartialSettlementForOrder.mockResolvedValue({
      settlements: [
        {
          restaurantId: 1,
          checkId: 100,
          orderId: 55,
          status: "partially_settled",
          orderTotalSnapshot: "100.00",
          allocatedAmount: "100.00",
          settledAmount: "40.00",
          outstandingAmount: "60.00",
          createdAt: AT,
          updatedAt: AT,
        },
      ],
      events: [{ eventType: "OrderSettlementPartiallySettled" }],
      outcomes: ["applied"],
    });
  });

  it("creates Payment through Domain and Repository", async () => {
    mocks.findSplitPaymentByIdentity.mockResolvedValue(null);

    const result = await createPaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
      paymentReference: "pref_1",
      amount: "40.00",
    });

    expect(result.outcome).toBe("applied");
    expect(result.payment?.status).toBe("pending");
    expect(result.events.some((e) => e.eventType === "PaymentCreated")).toBe(
      true
    );
    expect(mocks.insertSplitPayment).toHaveBeenCalledTimes(1);
    expect(result.payment?.impliesFinancialSettlement).toBe(false);
  });

  it("idempotent create does not duplicate persistence", async () => {
    mocks.findSplitPaymentByIdentity.mockResolvedValue({
      payment: payment(),
      version: 1,
    });

    const result = await createPaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
      paymentReference: "pref_1",
      amount: "40.00",
    });

    expect(result.outcome).toBe("already_applied");
    expect(mocks.insertSplitPayment).not.toHaveBeenCalled();
    expect(result.events).toEqual([]);
  });

  it("authorizes then captures with version CAS", async () => {
    mocks.findSplitPaymentByIdentity.mockResolvedValue({
      payment: payment(),
      version: 1,
    });

    const auth = await authorizePaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
    });
    expect(auth.outcome).toBe("applied");
    expect(auth.payment?.status).toBe("authorized");
    expect(mocks.updateSplitPayment).toHaveBeenCalledWith(
      expect.objectContaining({ status: "authorized" }),
      { expectedVersion: 1 },
      undefined
    );

    const authorized = payment({ status: "authorized" });
    mocks.findSplitPaymentByIdentity.mockResolvedValue({
      payment: authorized,
      version: 2,
    });
    const capturedSnapshot = payment({
      status: "captured",
      tenders: [
        {
          tenderId: "t1",
          restaurantId: 1,
          checkId: 100,
          paymentId: "pay_1",
          method: "cash",
          amount: "40.00",
          createdAt: AT,
        },
      ],
    });
    mocks.listSplitPaymentsForCheck
      .mockResolvedValueOnce([]) // pre-capture outstanding gate
      .mockResolvedValueOnce([{ payment: capturedSnapshot, version: 3 }]);

    const cap = await capturePaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
      tenders: [{ tenderId: "t1", method: "cash", amount: "40.00" }],
    });
    expect(cap.outcome).toBe("applied");
    expect(cap.payment?.status).toBe("captured");
    expect(cap.outstanding?.outstandingBalance).toBe("60.00");
    expect(cap.events.some((e) => e.eventType === "OutstandingUpdated")).toBe(
      true
    );
  });

  it("applyPayment updates Order Settlement only via OS Aggregate path", async () => {
    const captured = payment({
      status: "captured",
      tenders: [
        {
          tenderId: "t1",
          restaurantId: 1,
          checkId: 100,
          paymentId: "pay_1",
          method: "cash",
          amount: "40.00",
          createdAt: AT,
        },
      ],
    });
    mocks.findSplitPaymentByIdentity.mockResolvedValue({
      payment: captured,
      version: 3,
    });
    mocks.listSplitPaymentsForCheck.mockResolvedValue([
      { payment: captured, version: 3 },
    ]);

    const result = await applyPaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
      portions: [
        {
          portionId: "po1",
          paymentId: "pay_1",
          amount: "40.00",
          orderId: 55,
        },
      ],
      allocationIds: ["alloc_1"],
    });

    expect(result.outcome).toBe("applied");
    expect(result.payment?.status).toBe("applied");
    expect(mocks.ensureOrderSettlementForEnrollment).toHaveBeenCalledWith(
      { restaurantId: 1, checkId: 100, orderId: 55 },
      undefined
    );
    expect(mocks.applyPartialSettlementForOrder).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        checkId: 100,
        orderId: 55,
        coverageAmount: "40.00",
      },
      undefined
    );
    expect(result.orderSettlement.outcomes).toEqual(["applied"]);
    expect(result.outstanding?.appliedPaymentValue).toBe("40.00");
  });

  it("idempotent authorize returns already_applied without update", async () => {
    mocks.findSplitPaymentByIdentity.mockResolvedValue({
      payment: payment({ status: "authorized" }),
      version: 2,
    });

    const result = await authorizePaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
    });
    expect(result.outcome).toBe("already_applied");
    expect(mocks.updateSplitPayment).not.toHaveBeenCalled();
  });

  it("PaymentAttempt start is historical and idempotent", async () => {
    mocks.findPaymentAttemptByIdentity.mockResolvedValue(null);
    mocks.listPaymentAttemptsForCheck.mockResolvedValue([]);
    mocks.insertPaymentAttempt.mockResolvedValue(1);

    const started = await startPaymentAttemptOnCheck({
      restaurantId: 1,
      checkId: 100,
      attemptId: "att_1",
      amount: "40.00",
      method: "visa",
    });
    expect(started.outcome).toBe("applied");
    expect(started.attempt?.attemptId).toBe("att_1");
    expect(mocks.insertPaymentAttempt).toHaveBeenCalledTimes(1);

    mocks.findPaymentAttemptByIdentity.mockResolvedValue({
      attempt: started.attempt,
      externalProviderReference: null,
      sequence: 1,
    });
    const again = await startPaymentAttemptOnCheck({
      restaurantId: 1,
      checkId: 100,
      attemptId: "att_1",
      amount: "40.00",
      method: "visa",
    });
    expect(again.outcome).toBe("already_applied");
  });

  it("failed attempt does not touch Payment or Order Settlement", async () => {
    mocks.findPaymentAttemptByIdentity.mockResolvedValue({
      attempt: {
        restaurantId: 1,
        checkId: 100,
        attemptId: "att_f",
        paymentId: null,
        status: "started",
        amount: "10.00",
        method: "visa",
        createdAt: AT,
        updatedAt: AT,
      },
      externalProviderReference: null,
      sequence: 1,
    });
    mocks.finalizePaymentAttemptOutcome.mockResolvedValue(undefined);

    const result = await failPaymentAttemptOnCheck({
      restaurantId: 1,
      checkId: 100,
      attemptId: "att_f",
    });
    expect(result.outcome).toBe("applied");
    expect(result.payment).toBeNull();
    expect(mocks.updateSplitPayment).not.toHaveBeenCalled();
    expect(mocks.applyPartialSettlementForOrder).not.toHaveBeenCalled();
  });

  it("computeAppliedPaymentValue counts only value-received statuses", () => {
    expect(
      computeAppliedPaymentValue([
        payment({ status: "pending", amount: "10.00" }),
        payment({
          paymentId: "p2",
          status: "captured",
          amount: "25.00",
          unallocatedAmount: "25.00",
        }),
        payment({
          paymentId: "p3",
          status: "failed",
          amount: "5.00",
          unallocatedAmount: "5.00",
        }),
      ])
    ).toBe("25.00");
  });

  it("rejects mutations on non-open Check", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...openCheckRow(),
      outcome: "paid",
    });
    await expect(
      createPaymentOnCheck({
        restaurantId: 1,
        checkId: 100,
        paymentId: "pay_x",
        paymentReference: "pref_x",
        amount: "10.00",
      })
    ).rejects.toThrow(/outcome "paid"/);
  });
});
