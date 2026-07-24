/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — SettleOrderPaidService unit tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  ensureCheckForOrder: vi.fn(),
  settleCheckPaidByIdDetailed: vi.fn(),
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
  settleCheckPaidByIdDetailed: (...a: unknown[]) =>
    mocks.settleCheckPaidByIdDetailed(...a),
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
    mocks.settleCheckPaidByIdDetailed.mockResolvedValue({
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
    });
    mocks.tryMaterializeOrderSettlementProjections.mockResolvedValue(undefined);
  });

  it("reuses settleCheckPaidByIdDetailed and returns settlementRecordId", async () => {
    const result = await settleOrderPaid({
      restaurantId: 1,
      orderId: 55,
      trackingToken: "tok-abc",
      settlements: [{ paymentMethod: "cash" }],
    });

    expect(mocks.settleCheckPaidByIdDetailed).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 100,
      settlements: [{ paymentMethod: "cash" }],
      settlementContextHints: {
        registerId: undefined,
        deviceId: undefined,
        operatorUserId: undefined,
        operationalScreenId: undefined,
      },
    });
    expect(result.settlementRecordId).toBe("sr:1:100:settlement:1");
    expect(result.alreadySettled).toBe(false);
    expect(result.settlementContext.status).toBe("unavailable");
    expect(mocks.tryMaterializeOrderSettlementProjections).toHaveBeenCalled();
  });

  it("passes station hints into settle without fabricating", async () => {
    await settleOrderPaid({
      restaurantId: 1,
      orderId: 55,
      trackingToken: "tok-abc",
      registerId: "reg_1",
      deviceId: "dev_1",
    });
    expect(mocks.settleCheckPaidByIdDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        settlementContextHints: expect.objectContaining({
          registerId: "reg_1",
          deviceId: "dev_1",
        }),
      })
    );
  });

  it("is idempotent when Check already paid", async () => {
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      membership: { checkId: 100, orderId: 55, active: 1 },
      checkOutcome: "paid",
    });
    mocks.listSettlementRecordsForCheck.mockResolvedValue([
      {
        settlementRecordId: "sr:1:100:settlement:1",
        grandTotal: "42.00",
        settledAt: "2026-07-24T12:00:00.000Z",
        createdAt: "2026-07-24T12:00:00.000Z",
        currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
        paymentSnapshot: [{ paymentMethod: "mada" }],
      },
    ]);

    const result = await settleOrderPaid({
      restaurantId: 1,
      orderId: 55,
      trackingToken: "tok-abc",
    });

    expect(mocks.settleCheckPaidByIdDetailed).not.toHaveBeenCalled();
    expect(result.alreadySettled).toBe(true);
    expect(result.settlementRecordId).toBe("sr:1:100:settlement:1");
  });

  it("rejects tracking token mismatch", async () => {
    await expect(
      settleOrderPaid({
        restaurantId: 1,
        orderId: 55,
        trackingToken: "wrong",
      })
    ).rejects.toBeInstanceOf(SettleOrderPaidError);
    expect(mocks.settleCheckPaidByIdDetailed).not.toHaveBeenCalled();
  });

  it("ensures Check when membership missing then settles", async () => {
    mocks.findBlockingMembershipForOrder
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        membership: { checkId: 100, orderId: 55, active: 1 },
        checkOutcome: "open",
      });
    mocks.ensureCheckForOrder.mockResolvedValue({ id: 100 });

    await settleOrderPaid({
      restaurantId: 1,
      orderId: 55,
      trackingToken: "tok-abc",
    });

    expect(mocks.ensureCheckForOrder).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 55,
    });
    expect(mocks.settleCheckPaidByIdDetailed).toHaveBeenCalled();
  });
});
