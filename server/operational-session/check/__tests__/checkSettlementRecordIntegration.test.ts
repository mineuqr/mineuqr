/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — atomic finalize integration + idempotency.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listActiveOrderIdsForCheck: vi.fn(),
  findSettlementRecordByIdentity: vi.fn(),
  insertSettlementRecord: vi.fn(),
  existsSettlementRecord: vi.fn(),
  listProductionCollectionFactsForRefundAnchor: vi.fn(),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

vi.mock("../../payment/collection-fact/collectionFactRepository", () => ({
  listProductionCollectionFactsForRefundAnchor: (...a: unknown[]) =>
    mocks.listProductionCollectionFactsForRefundAnchor(...a),
}));

vi.mock("../settlementRecordRepository", () => {
  class SettlementRecordPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "SettlementRecordPersistenceError";
      this.code = code;
    }
  }
  return {
    SettlementRecordPersistenceError,
    findSettlementRecordByIdentity: (...a: unknown[]) =>
      mocks.findSettlementRecordByIdentity(...a),
    insertSettlementRecord: (...a: unknown[]) =>
      mocks.insertSettlementRecord(...a),
    existsSettlementRecord: (...a: unknown[]) =>
      mocks.existsSettlementRecord(...a),
  };
});

import { createSettlementRecordForCheckFinalize } from "../checkSettlementRecordIntegration";
import { SettlementRecordPersistenceError } from "../settlementRecordRepository";
import type { OperationalCheck } from "@shared/operational-session";

const check: OperationalCheck = {
  id: 100,
  restaurantId: 1,
  sessionId: 10,
  outcome: "open",
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    version: 1,
    enabled: false,
    mode: "exclusive",
    components: [],
  },
  serviceChargeSnapshot: null,
  billDiscountAmount: "0.00",
  subtotal: "20.00",
  taxAmount: "0.00",
  taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
  grandTotal: "20.00",
  snapshotsFrozenAt: "2026-07-23 12:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-23 12:00:00",
  updatedAt: "2026-07-23 12:00:00",
};

const fakeTx = { __tx: true };

describe("createSettlementRecordForCheckFinalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.findSettlementRecordByIdentity.mockResolvedValue(null);
    mocks.insertSettlementRecord.mockResolvedValue(7);
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([]);
  });

  it("applies Settlement Record with copied freeze values", async () => {
    const result = await createSettlementRecordForCheckFinalize(
      {
        restaurantId: 1,
        check,
        outcome: "paid",
        freeze: {
          subtotal: "20.00",
          billDiscountAmount: "0.00",
          taxAmount: "0.00",
          taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
          grandTotal: "20.00",
          settledAt: "2026-07-23 13:00:00",
        },
        settlementLines: [
          { paymentMethod: "cash", amount: "20.00", status: "captured" },
        ],
        orderSettlements: [],
        createdAt: "2026-07-23 13:00:00",
      },
      fakeTx as never
    );

    expect(result.outcome).toBe("applied");
    expect(result.record?.grandTotal).toBe("20.00");
    expect(result.record?.paymentSnapshot[0]?.amount).toBe("20.00");
    expect(result.events[0]?.eventType).toBe("SettlementRecordCreated");
    expect(mocks.insertSettlementRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 100,
        restaurantId: 1,
        recordKind: "settlement",
        recordGeneration: 1,
      }),
      fakeTx
    );
    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(
      1,
      100,
      fakeTx
    );
  });

  it("is idempotent when record already exists", async () => {
    mocks.findSettlementRecordByIdentity.mockResolvedValue({
      settlementRecordId: "sr:1:100:settlement:1",
      grandTotal: "20.00",
    });

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: null,
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.outcome).toBe("already_applied");
    expect(mocks.insertSettlementRecord).not.toHaveBeenCalled();
  });

  it("treats concurrent duplicate insert as already_applied", async () => {
    mocks.insertSettlementRecord.mockRejectedValue(
      new SettlementRecordPersistenceError("DUPLICATE", "dup")
    );
    mocks.findSettlementRecordByIdentity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        settlementRecordId: "sr:1:100:settlement:1",
        grandTotal: "20.00",
      });

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: null,
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.outcome).toBe("already_applied");
  });

  it("uses unique production Collection Fact money when Check freeze differs", async () => {
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "pcf_1",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        subtotal: "8.70",
        discountAmount: "0.00",
        taxAmount: "1.30",
        amount: "10.00",
        taxBreakdown: {
          totalTaxAmount: "1.30",
          lines: [],
        },
        tenders: [{ paymentMethod: "cash", amount: "10.00" }],
        committedAt: "2026-07-23T13:05:00.000Z",
      },
    ]);

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "9.57",
        billDiscountAmount: "0.00",
        taxAmount: "1.43",
        taxBreakdown: { totalTaxAmount: "1.43", lines: [] },
        grandTotal: "11.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: [
        { paymentMethod: "cash", amount: "11.00", status: "captured" },
      ],
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.record?.grandTotal).toBe("10.00");
    expect(result.record?.subtotal).toBe("8.70");
    expect(result.record?.taxAmount).toBe("1.30");
    expect(result.record?.paymentSnapshot[0]?.amount).toBe("10.00");
    expect(result.record?.settledAt).toBe("2026-07-23T13:05:00.000Z");
  });

  it("uses each Order CF on a multi-order Check instead of Check freeze", async () => {
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55, 66]);
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "pcf_a",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        subtotal: "8.70",
        discountAmount: "0.00",
        taxAmount: "1.30",
        amount: "10.00",
        taxBreakdown: { totalTaxAmount: "1.30", lines: [] },
        tenders: [{ paymentMethod: "cash", amount: "10.00" }],
        committedAt: "2026-07-23T13:05:00.000Z",
      },
      {
        collectionFactId: "pcf_b",
        restaurantId: 1,
        orderId: 66,
        purpose: "production",
        subtotal: "17.40",
        discountAmount: "0.00",
        taxAmount: "2.60",
        amount: "20.00",
        taxBreakdown: { totalTaxAmount: "2.60", lines: [] },
        tenders: [{ paymentMethod: "card", amount: "20.00" }],
        committedAt: "2026-07-23T13:06:00.000Z",
      },
    ]);

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "26.10",
        billDiscountAmount: "0.00",
        taxAmount: "3.90",
        taxBreakdown: { totalTaxAmount: "3.90", lines: [] },
        grandTotal: "35.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: [
        { paymentMethod: "cash", amount: "35.00", status: "captured" },
      ],
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.record?.grandTotal).toBe("30.00");
    expect(result.record?.subtotal).toBe("26.10");
    expect(result.record?.taxAmount).toBe("3.90");
    expect(result.record?.paymentSnapshot.map((line) => line.amount)).toEqual([
      "10.00",
      "20.00",
    ]);
    expect(result.record?.settledAt).toBe("2026-07-23T13:06:00.000Z");
  });

  it("does not apply one Order CF to a sibling Order without a CF", async () => {
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55, 66]);
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "pcf_a",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        subtotal: "8.70",
        discountAmount: "0.00",
        taxAmount: "1.30",
        amount: "10.00",
        taxBreakdown: { totalTaxAmount: "1.30", lines: [] },
        tenders: [{ paymentMethod: "cash", amount: "10.00" }],
        committedAt: "2026-07-23T13:05:00.000Z",
      },
    ]);

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "26.10",
        billDiscountAmount: "0.00",
        taxAmount: "3.90",
        taxBreakdown: { totalTaxAmount: "3.90", lines: [] },
        grandTotal: "35.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: [
        { paymentMethod: "cash", amount: "35.00", status: "captured" },
      ],
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.record?.grandTotal).toBe("10.00");
    expect(result.record?.paymentSnapshot).toHaveLength(1);
    expect(result.record?.paymentSnapshot[0]?.amount).toBe("10.00");
  });

  it("does not pick a CF when one Order has multiple production facts", async () => {
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "pcf_1",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        subtotal: "8.70",
        discountAmount: "0.00",
        taxAmount: "1.30",
        amount: "10.00",
        taxBreakdown: { totalTaxAmount: "1.30", lines: [] },
        tenders: [{ paymentMethod: "cash", amount: "10.00" }],
        committedAt: "2026-07-23T13:05:00.000Z",
      },
      {
        collectionFactId: "pcf_2",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        subtotal: "9.57",
        discountAmount: "0.00",
        taxAmount: "1.43",
        amount: "11.00",
        taxBreakdown: { totalTaxAmount: "1.43", lines: [] },
        tenders: [{ paymentMethod: "cash", amount: "11.00" }],
        committedAt: "2026-07-23T13:06:00.000Z",
      },
    ]);

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: [
        { paymentMethod: "cash", amount: "20.00", status: "captured" },
      ],
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.record?.grandTotal).toBe("20.00");
  });

  it("does not use Check freeze for void when looking up paid-sale CFs", async () => {
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "pcf_1",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        amount: "10.00",
      },
    ]);
    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "voided",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: null,
      },
      settlementLines: null,
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });
    expect(result.record?.grandTotal).toBe("20.00");
    expect(result.record?.recordKind).toBe("void");
    expect(
      mocks.listProductionCollectionFactsForRefundAnchor
    ).not.toHaveBeenCalled();
  });

  it("uses complimentary CF amount when a unique production CF exists", async () => {
    mocks.listProductionCollectionFactsForRefundAnchor.mockResolvedValue([
      {
        collectionFactId: "pcf_comp",
        restaurantId: 1,
        orderId: 55,
        purpose: "production",
        subtotal: "0.00",
        discountAmount: "10.00",
        taxAmount: "0.00",
        amount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        tenders: [{ paymentMethod: "other", amount: "0.00" }],
        committedAt: "2026-07-23T13:05:00.000Z",
      },
    ]);
    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "complimentary",
      freeze: {
        subtotal: "11.00",
        billDiscountAmount: "11.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "0.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: [
        { paymentMethod: "other", amount: "0.00", status: "captured" },
      ],
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });
    expect(result.record?.grandTotal).toBe("0.00");
    expect(result.record?.discountAmount).toBe("10.00");
    expect(result.record?.settledAt).toBe("2026-07-23T13:05:00.000Z");
  });

  it("keeps Check freeze when no production Collection Fact exists", async () => {
    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: [
        { paymentMethod: "cash", amount: "20.00", status: "captured" },
      ],
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });
    expect(result.record?.grandTotal).toBe("20.00");
  });

  it("propagates non-duplicate insert failures for TX rollback", async () => {
    mocks.insertSettlementRecord.mockRejectedValue(new Error("disk full"));
    await expect(
      createSettlementRecordForCheckFinalize({
        restaurantId: 1,
        check,
        outcome: "paid",
        freeze: {
          subtotal: "20.00",
          billDiscountAmount: "0.00",
          taxAmount: "0.00",
          taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
          grandTotal: "20.00",
          settledAt: "2026-07-23 13:00:00",
        },
        settlementLines: null,
        orderSettlements: [],
        createdAt: "2026-07-23 13:00:00",
      })
    ).rejects.toThrow("disk full");
  });
});
