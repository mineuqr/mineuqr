/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — SettleOrderPaidService unit tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  ensureCheckForOrder: vi.fn(),
  confirmPayment: vi.fn(),
  listSettlementRecordsForCheck: vi.fn(),
  tryMaterializeOrderSettlementProjections: vi.fn(),
  getOrderSettlementProjectionStore: vi.fn(() => ({})),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
}));

vi.mock("../../../operational-session/check", () => ({
  CheckTransitionError: class CheckTransitionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CheckTransitionError";
    }
  },
  ensureCheckForOrder: (...a: unknown[]) => mocks.ensureCheckForOrder(...a),
  findBlockingMembershipForOrder: (...a: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...a),
}));

vi.mock("../../../operational-session/payment/PaymentConfirmService", () => ({
  confirmPayment: (...a: unknown[]) => mocks.confirmPayment(...a),
}));

vi.mock("../../../operational-session/check/settlementRecordRepository", () => ({
  listSettlementRecordsForCheck: (...a: unknown[]) =>
    mocks.listSettlementRecordsForCheck(...a),
}));

vi.mock(
  "../../../operational-session/check/api/orderSettlementReadComposition",
  () => ({
    getOrderSettlementProjectionStore: () =>
      mocks.getOrderSettlementProjectionStore(),
  })
);

vi.mock(
  "../../../operational-session/check/read/orderSettlementProjectionMaterializer",
  () => ({
    tryMaterializeOrderSettlementProjections: (...a: unknown[]) =>
      mocks.tryMaterializeOrderSettlementProjections(...a),
  })
);

import {
  settleOrderPaid,
  SettleOrderPaidError,
} from "../SettleOrderPaidService";

describe("SELF-ORDERING-SETTLEMENT-ADOPTION-1 SettleOrderPaidService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      trackingToken: "tok-abc",
    });
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      membership: { checkId: 100, orderId: 55, active: 1 },
      checkOutcome: "open",
    });
    mocks.confirmPayment.mockResolvedValue({
      check: { id: 100, grandTotal: "42.00" },
      orderSettlement: { settlements: [] },
      orderSettlementEvents: [],
      settlementRecord: {
        record: {
          settlementRecordId: "sr:1:100:settlement:1",
          grandTotal: "42.00",
          currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
          paymentSnapshot: [
            { paymentMethod: "cash", amount: "42.00" },
          ],
        },
        events: [],
        outcome: "created",
      },
      settlementRecordEvents: [],
      settlementContext: {
        restaurantId: 1,
        registerId: null,
        financialShiftId: null,
        operatorUserId: null,
        deviceId: null,
        operationalScreenId: null,
        resolvedAt: "t",
        status: "unavailable",
        gaps: ["no_operational_hints"],
      },
      settlementAttribution: {
        outcome: "skipped",
        attributionId: null,
        settlementRecordId: null,
        registerId: null,
        financialShiftId: null,
        operatorUserId: null,
        cashTenderAmount: null,
        gaps: ["no_operational_hints"],
        reason: "skipped",
      },
      settlementAttributionEvents: [],
    });
    mocks.tryMaterializeOrderSettlementProjections.mockResolvedValue(undefined);
  });

  it("confirms Payment and returns settlementRecordId", async () => {
    await expect(
      settleOrderPaid({
        restaurantId: 1,
        orderId: 55,
        trackingToken: "tok-abc",
        settlements: [{ paymentMethod: "cash" }],
      })
    ).rejects.toMatchObject({ code: "FINANCIAL_REQUIRES_CASHIER" });
    expect(mocks.confirmPayment).not.toHaveBeenCalled();
  });

  it("passes station hints into settle without fabricating", async () => {
    await expect(
      settleOrderPaid({
        restaurantId: 1,
        orderId: 55,
        trackingToken: "tok-abc",
        registerId: "reg_1",
        deviceId: "dev_1",
      })
    ).rejects.toMatchObject({ code: "FINANCIAL_REQUIRES_CASHIER" });
    expect(mocks.confirmPayment).not.toHaveBeenCalled();
  });

  it("is idempotent when Check already paid", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      membership: { checkId: 100, orderId: 55, active: 1 },
      checkOutcome: "paid",
    });
    await expect(
      settleOrderPaid({
        restaurantId: 1,
        orderId: 55,
        trackingToken: "tok-abc",
      })
    ).rejects.toMatchObject({ code: "FINANCIAL_REQUIRES_CASHIER" });
    expect(mocks.confirmPayment).not.toHaveBeenCalled();
  });

  it("rejects tracking token mismatch", async () => {
    await expect(
      settleOrderPaid({
        restaurantId: 1,
        orderId: 55,
        trackingToken: "wrong",
      })
    ).rejects.toBeInstanceOf(SettleOrderPaidError);
    expect(mocks.confirmPayment).not.toHaveBeenCalled();
  });

  it("ensures Check when membership missing then settles", async () => {
    await expect(
      settleOrderPaid({
        restaurantId: 1,
        orderId: 55,
        trackingToken: "tok-abc",
      })
    ).rejects.toMatchObject({ code: "FINANCIAL_REQUIRES_CASHIER" });
    expect(mocks.ensureCheckForOrder).not.toHaveBeenCalled();
    expect(mocks.confirmPayment).not.toHaveBeenCalled();
  });
});
