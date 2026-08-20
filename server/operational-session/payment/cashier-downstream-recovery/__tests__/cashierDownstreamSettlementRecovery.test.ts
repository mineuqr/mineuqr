/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  listSettlementTransactionsForCheck: vi.fn(),
  insertSettlementTransactions: vi.fn(),
  listOrderSettlementsForCheck: vi.fn(),
  listSettlementRecordsForCheck: vi.fn(),
  applyFullSettlementToCheckOrders: vi.fn(),
  createSettlementRecordForCheckFinalize: vi.fn(),
  findProductionCollectionFactByCheckId: vi.fn(),
  opsLog: vi.fn(),
}));

vi.mock("../../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../../../check/checkRepository", () => ({
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
}));

vi.mock("../../../check/settlementTransactionRepository", () => ({
  listSettlementTransactionsForCheck: (...a: unknown[]) =>
    mocks.listSettlementTransactionsForCheck(...a),
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
}));

vi.mock("../../../check/orderSettlementRepository", () => ({
  listOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.listOrderSettlementsForCheck(...a),
}));

vi.mock("../../../check/settlementRecordRepository", () => ({
  listSettlementRecordsForCheck: (...a: unknown[]) =>
    mocks.listSettlementRecordsForCheck(...a),
}));

vi.mock("../../../check/checkOrderSettlementIntegration", () => ({
  applyFullSettlementToCheckOrders: (...a: unknown[]) =>
    mocks.applyFullSettlementToCheckOrders(...a),
}));

vi.mock("../../../check/checkSettlementRecordIntegration", () => ({
  createSettlementRecordForCheckFinalize: (...a: unknown[]) =>
    mocks.createSettlementRecordForCheckFinalize(...a),
}));

vi.mock("../../collection-fact/collectionFactRepository", () => ({
  findProductionCollectionFactByCheckId: (...a: unknown[]) =>
    mocks.findProductionCollectionFactByCheckId(...a),
  findCollectionFactByFactId: vi.fn(),
  updateCollectionFact: () => {
    throw new Error("Collection Fact UPDATE is forbidden");
  },
  deleteCollectionFact: () => {
    throw new Error("Collection Fact DELETE is forbidden");
  },
}));

vi.mock("../../../check/checkMapper", () => ({
  mapRowToOperationalCheck: (row: { id: number; restaurantId: number }) => ({
    id: row.id,
    restaurantId: row.restaurantId,
    sessionId: null,
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: { taxEnabled: false, taxMode: "exclusive", rates: [] },
    subtotal: "10.00",
    taxAmount: "0.00",
    taxBreakdown: [],
    grandTotal: "10.00",
    billDiscountAmount: "0.00",
    settledAt: "2026-08-20 10:00:00",
  }),
}));

import {
  deriveCashierDownstreamRecoveryState,
  inspectCashierDownstreamSettlement,
  ensureRemainingCashierDownstreamSettlement,
} from "../cashierDownstreamSettlementRecovery";

const fact = {
  collectionFactId: "pcf_recover-1",
  paymentIntentId: "cpi_recover-1",
  orderId: 55,
  tenders: [{ paymentMethod: "cash" as const, amount: "10.00" }],
};

const paidCheck = {
  id: 200,
  restaurantId: 1,
  sessionId: null,
  outcome: "paid" as const,
  grandTotal: "10.00",
};

describe("CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findCheckById.mockResolvedValue(paidCheck);
    mocks.listSettlementTransactionsForCheck.mockResolvedValue([]);
    mocks.listOrderSettlementsForCheck.mockResolvedValue([
      { status: "pending" },
    ]);
    mocks.listSettlementRecordsForCheck.mockResolvedValue([]);
    mocks.findProductionCollectionFactByCheckId.mockResolvedValue(fact);
    mocks.applyFullSettlementToCheckOrders.mockResolvedValue({
      settlements: [{ status: "settled" }],
      events: [],
      outcomes: ["applied"],
    });
    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:200:settlement:1" },
      events: [],
      outcome: "applied",
    });
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);
  });

  it("treats Collection Fact commit as pending until ST OS SR exist", async () => {
    mocks.findCheckById.mockResolvedValue({ ...paidCheck, outcome: "open" });
    const inspection = await inspectCashierDownstreamSettlement({
      restaurantId: 1,
      checkId: 200,
    });
    expect(inspection.state).toBe("pending");
    expect(inspection.collectionFactId).toBe("pcf_recover-1");
    expect(inspection.recoveryId).toBe("pcf_recover-1");
    expect(inspection.components).toEqual({
      checkPaid: false,
      st: false,
      os: false,
      sr: false,
    });
  });

  it("does not create a second recovery obligation for the same Collection Fact", async () => {
    const first = await inspectCashierDownstreamSettlement({
      restaurantId: 1,
      checkId: 200,
    });
    const second = await inspectCashierDownstreamSettlement({
      restaurantId: 1,
      checkId: 200,
    });
    expect(first.collectionFactId).toBe(second.collectionFactId);
    expect(mocks.findProductionCollectionFactByCheckId).toHaveBeenCalledTimes(2);
  });

  it("skips ST on retry when ST already exists and continues OS then SR", async () => {
    mocks.listSettlementTransactionsForCheck.mockResolvedValue([
      { paymentMethod: "cash", amount: "10.00" },
    ]);
    mocks.applyFullSettlementToCheckOrders.mockRejectedValueOnce(
      new Error("os down")
    );

    await expect(
      ensureRemainingCashierDownstreamSettlement({
        restaurantId: 1,
        checkId: 200,
      })
    ).rejects.toThrow("os down");
    expect(mocks.insertSettlementTransactions).not.toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).not.toHaveBeenCalled();
  });

  it("skips OS when already settled and retries only SR", async () => {
    mocks.listSettlementTransactionsForCheck.mockResolvedValue([
      { paymentMethod: "cash", amount: "10.00" },
    ]);
    mocks.listOrderSettlementsForCheck.mockResolvedValue([
      { status: "settled" },
    ]);
    mocks.createSettlementRecordForCheckFinalize.mockRejectedValueOnce(
      new Error("sr down")
    );
    await expect(
      ensureRemainingCashierDownstreamSettlement({
        restaurantId: 1,
        checkId: 200,
      })
    ).rejects.toThrow("sr down");
    expect(mocks.applyFullSettlementToCheckOrders).not.toHaveBeenCalled();

    mocks.createSettlementRecordForCheckFinalize.mockResolvedValue({
      record: { settlementRecordId: "sr:1:200:settlement:1" },
      events: [],
      outcome: "already_applied",
    });
    mocks.listSettlementRecordsForCheck
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ recordKind: "settlement" }]);
    await ensureRemainingCashierDownstreamSettlement({
      restaurantId: 1,
      checkId: 200,
    });
    expect(mocks.applyFullSettlementToCheckOrders).not.toHaveBeenCalled();
    expect(mocks.createSettlementRecordForCheckFinalize).toHaveBeenCalled();
  });

  it("inserts ST from Collection Fact tenders when ST is missing after PAID", async () => {
    await ensureRemainingCashierDownstreamSettlement({
      restaurantId: 1,
      checkId: 200,
    });
    expect(mocks.insertSettlementTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 200,
        lines: [expect.objectContaining({ paymentMethod: "cash", amount: "10.00" })],
      })
    );
  });

  it("marks complimentary or voided Checks as failed_requires_attention", () => {
    expect(
      deriveCashierDownstreamRecoveryState("voided", {
        checkPaid: false,
        st: false,
        os: false,
        sr: false,
      })
    ).toBe("failed_requires_attention");
  });

  it("is completed only when Check PAID and ST OS SR all exist", () => {
    expect(
      deriveCashierDownstreamRecoveryState("paid", {
        checkPaid: true,
        st: true,
        os: true,
        sr: true,
      })
    ).toBe("completed");
    expect(
      deriveCashierDownstreamRecoveryState("paid", {
        checkPaid: true,
        st: true,
        os: true,
        sr: false,
      })
    ).toBe("pending");
  });
});
