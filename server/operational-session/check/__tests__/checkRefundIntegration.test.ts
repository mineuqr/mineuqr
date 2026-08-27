/**
 * REFUND-DOMAIN-IMPLEMENTATION-1 — Check Aggregate integration tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  listSettlementRecordsForCheck: vi.fn(),
  listOrderSettlementsForCheck: vi.fn(),
  findSettlementRecordByIdentity: vi.fn(),
  insertSettlementRecord: vi.fn(),
  updateOrderSettlement: vi.fn(),
  allocateRefundDocumentNumber: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  listProductionCollectionFactsForRefundAnchor: vi.fn(),
}));

vi.mock("../checkRepository", () => ({
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
}));

vi.mock("../checkMapper", () => ({
  mapRowToOperationalCheck: (row: Record<string, unknown>) => row,
}));

vi.mock("../settlementRecordRepository", () => ({
  listSettlementRecordsForCheck: (...a: unknown[]) =>
    mocks.listSettlementRecordsForCheck(...a),
  findSettlementRecordByIdentity: (...a: unknown[]) =>
    mocks.findSettlementRecordByIdentity(...a),
  insertSettlementRecord: (...a: unknown[]) =>
    mocks.insertSettlementRecord(...a),
  SettlementRecordPersistenceError: class SettlementRecordPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("../orderSettlementRepository", () => ({
  listOrderSettlementsForCheck: (...a: unknown[]) =>
    mocks.listOrderSettlementsForCheck(...a),
  updateOrderSettlement: (...a: unknown[]) =>
    mocks.updateOrderSettlement(...a),
}));

vi.mock("../refundDocumentNumberRepository", () => ({
  allocateRefundDocumentNumber: (...a: unknown[]) =>
    mocks.allocateRefundDocumentNumber(...a),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

vi.mock("../../payment/collection-fact/collectionFactRepository", () => ({
  listProductionCollectionFactsForRefundAnchor: (...a: unknown[]) =>
    mocks.listProductionCollectionFactsForRefundAnchor(...a),
}));

import { applyRefundOnCheck } from "../checkRefundIntegration";
import {
  createSettlementRecord,
  type OperationalCheck,
  type OrderSettlement,
} from "@shared/operational-session";

const AT = "2026-07-26 14:00:00";

function makeCheck(): OperationalCheck {
  return {
    id: 100,
    restaurantId: 1,
    sessionId: 10,
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "0.00",
    subtotal: "100.00",
    taxAmount: "15.00",
    taxBreakdown: {
      totalTaxAmount: "15.00",
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15.00",
          amount: "15.00",
        },
      ],
    },
    grandTotal: "115.00",
    snapshotsFrozenAt: "2026-07-26 12:00:00",
    totalsFrozenAt: "2026-07-26 13:00:00",
    settledAt: "2026-07-26 13:00:00",
    voidedAt: null,
    createdAt: "2026-07-26 12:00:00",
    updatedAt: "2026-07-26 13:00:00",
  };
}

function makeOs(): OrderSettlement {
  return {
    restaurantId: 1,
    checkId: 100,
    orderId: 55,
    status: "settled",
    orderTotalSnapshot: "115.00",
    settledAmount: "115.00",
    outstandingAmount: "0.00",
    allocatedAmount: "115.00",
    createdAt: AT,
    updatedAt: AT,
  };
}

describe("checkRefundIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const check = makeCheck();
    mocks.findCheckById.mockResolvedValue(check);
    mocks.listSettlementRecordsForCheck.mockResolvedValue([
      createSettlementRecord({
        check,
        outcome: "paid",
        createdAt: "2026-07-26 13:00:00",
        orderIds: [55],
        paymentSnapshotOverride: [
          {
            settlementTransactionId: null,
            paymentMethod: "cash",
            amount: "115.00",
            currencyCode: "SAR",
            status: "captured",
            businessTimestamp: "2026-07-26 13:00:00",
            reference: null,
            externalReference: null,
          },
        ],
      }).record,
    ]);
    mocks.listOrderSettlementsForCheck.mockResolvedValue([makeOs()]);
    mocks.findSettlementRecordByIdentity.mockResolvedValue(null);
    mocks.insertSettlementRecord.mockResolvedValue(1);
    mocks.allocateRefundDocumentNumber.mockResolvedValue(1);
    mocks.updateOrderSettlement.mockResolvedValue(undefined);
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([]);
  });

  it("applies full refund atomically: OS update + SR insert", async () => {
    const result = await applyRefundOnCheck({
      restaurantId: 1,
      checkId: 100,
      amount: "115.00",
    });

    expect(result.outcome).toBe("applied");
    expect(result.settlementRecord?.recordKind).toBe("refund");
    expect(mocks.allocateRefundDocumentNumber).toHaveBeenCalled();
    expect(result.orderSettlements[0]?.status).toBe("refunded");
    expect(mocks.insertSettlementRecord).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrderSettlement).toHaveBeenCalled();
  });

  it("partial refund does not transition OS when budget remains", async () => {
    const result = await applyRefundOnCheck({
      restaurantId: 1,
      checkId: 100,
      amount: "15.00",
    });

    expect(result.outcome).toBe("applied");
    expect(result.remainingBudget).toBe("100.00");
    expect(result.orderSettlements[0]?.status).toBe("settled");
    expect(mocks.updateOrderSettlement).not.toHaveBeenCalled();
    expect(mocks.insertSettlementRecord).toHaveBeenCalledTimes(1);
  });

  it("idempotent retry when refund generation already exists", async () => {
    const check = makeCheck();
    const primary = createSettlementRecord({
      check,
      outcome: "paid",
      createdAt: "2026-07-26 13:00:00",
      orderIds: [55],
    }).record;
    const existingRefund = {
      ...primary,
      settlementRecordId: "sr:1:100:refund:2",
      recordKind: "refund" as const,
      recordGeneration: 2,
      priorSettlementRecordId: primary.settlementRecordId,
      grandTotal: "15.00",
      subtotal: "15.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] as const },
    };
    mocks.findSettlementRecordByIdentity.mockResolvedValue(existingRefund);

    const result = await applyRefundOnCheck({
      restaurantId: 1,
      checkId: 100,
      amount: "15.00",
    });

    expect(result.outcome).toBe("already_applied");
    expect(mocks.insertSettlementRecord).not.toHaveBeenCalled();
  });

  it("enforces tenant isolation on Check load", async () => {
    mocks.findCheckById.mockResolvedValue({
      ...makeCheck(),
      restaurantId: 99,
    });
    await expect(
      applyRefundOnCheck({
        restaurantId: 1,
        checkId: 100,
        amount: "10.00",
      })
    ).rejects.toThrow(/Check not found/);
  });

  it("CF-backed apply uses Collection Fact amount, not gen=1 SR grandTotal", async () => {
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "cf-1",
        restaurantId: 1,
        orderId: 55,
        paymentIntentId: "pi-1",
        purpose: "production",
        amount: "90.00",
        discountAmount: "0.00",
        currencyCode: "SAR",
        tenders: [{ paymentMethod: "card", amount: "90.00" }],
        checkId: 100,
        committedAt: AT,
        businessDay: "2026-07-26",
        actorId: "7",
        terminalId: "term-1",
        orderingChannel: "qr",
      },
    ]);

    const over = applyRefundOnCheck({
      restaurantId: 1,
      checkId: 100,
      amount: "115.00",
    });
    await expect(over).rejects.toThrow(/RF-BUDGET-01|exceeds refundable/);

    const result = await applyRefundOnCheck({
      restaurantId: 1,
      checkId: 100,
      amount: "90.00",
    });
    expect(result.outcome).toBe("applied");
    expect(result.remainingBudget).toBe("0.00");
    expect(result.settledValue).toBe("90.00");
    expect(result.settlementRecord?.recordKind).toBe("refund");
    expect(mocks.insertSettlementRecord).toHaveBeenCalled();
  });
});
