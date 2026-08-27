/**
 * REFUND-DOCUMENT-SR-SIMPLIFICATION-1 — ST lookup no longer requires gen=1 SR
 * for CF-backed original-sale identity.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const mocks = vi.hoisted(() => ({
  getRestaurantById: vi.fn(),
  getCheckRefundBudget: vi.fn(),
  findCheckById: vi.fn(),
  mapRowToOperationalCheck: vi.fn(),
  listSettlementRecordsForCheck: vi.fn(),
  resolveRefundOriginalSaleAnchorForCheck: vi.fn(),
}));

vi.mock("../../../../db", () => ({
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
}));

vi.mock("../../CheckService", () => ({
  getCheckRefundBudget: (...a: unknown[]) => mocks.getCheckRefundBudget(...a),
}));

vi.mock("../../checkRepository", () => ({
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
}));

vi.mock("../../checkMapper", () => ({
  mapRowToOperationalCheck: (...a: unknown[]) =>
    mocks.mapRowToOperationalCheck(...a),
}));

vi.mock("../../settlementRecordRepository", () => ({
  listSettlementRecordsForCheck: (...a: unknown[]) =>
    mocks.listSettlementRecordsForCheck(...a),
}));

vi.mock("../../checkRefundOriginalSaleResolution", () => ({
  resolveRefundOriginalSaleAnchorForCheck: (...a: unknown[]) =>
    mocks.resolveRefundOriginalSaleAnchorForCheck(...a),
}));

import { lookupCheckRefundBySettlementNumber } from "../checkRefundLookupService";

const AT = "2026-08-27T12:00:00.000Z";

function paidCheck() {
  return {
    id: 100,
    restaurantId: 1,
    sessionId: 10,
    outcome: "paid" as const,
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive" as const,
      components: [],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "0.00",
    subtotal: "90.00",
    taxAmount: "0.00",
    taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    grandTotal: "90.00",
    snapshotsFrozenAt: AT,
    totalsFrozenAt: AT,
    settledAt: AT,
    voidedAt: null,
    createdAt: AT,
    updatedAt: AT,
  };
}

function cfAnchor() {
  return {
    kind: "collection_fact" as const,
    collectionFactId: "cf-1",
    paymentIntentId: "pi-1",
    orderId: 55,
    restaurantId: 1,
    checkId: 100,
    originalCollectedAmount: "90.00",
    currencyCode: "SAR",
    tenders: [{ paymentMethod: "cash", amount: "90.00" }],
    committedAt: AT,
    businessDay: "2026-08-27",
    actorId: "7",
    terminalId: "term-1",
    orderingChannel: "qr",
  };
}

describe("lookupCheckRefundBySettlementNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRestaurantById.mockResolvedValue({ refundPolicyJson: null });
    mocks.getCheckRefundBudget.mockResolvedValue({
      settledValue: "90.00",
      appliedRefundTotal: "0.00",
      refundableBalance: "90.00",
      priorSettlementRecordId: "",
      nextRecordGeneration: 1,
      originalSaleKind: "collection_fact",
      collectionFactId: "cf-1",
    });
    mocks.findCheckById.mockResolvedValue({ id: 100, restaurantId: 1 });
    mocks.mapRowToOperationalCheck.mockReturnValue(paidCheck());
    mocks.listSettlementRecordsForCheck.mockResolvedValue([]);
    mocks.resolveRefundOriginalSaleAnchorForCheck.mockResolvedValue(cfAnchor());
  });

  it("looks up a CF-backed sale without gen=1 SR", async () => {
    const dto = await lookupCheckRefundBySettlementNumber({
      restaurantId: 1,
      settlementNumber: "ST-000000100",
    });
    expect(dto.checkId).toBe(100);
    expect(dto.settlementRecordId).toBeNull();
    expect(dto.originalAmount).toBe("90.00");
    expect(dto.refundableBalance).toBe("90.00");
    expect(dto.paymentMethodSummary).toBe("cash");
    expect(dto.eligible).toBe(true);
    expect(dto.rejectionCode).toBeNull();
  });

  it("still requires gen=1 SR for legacy no-CF lookup", async () => {
    mocks.resolveRefundOriginalSaleAnchorForCheck.mockResolvedValue({
      kind: "legacy_settlement_record",
      restaurantId: 1,
      checkId: 100,
      reason: "no_production_collection_fact",
    });
    await expect(
      lookupCheckRefundBySettlementNumber({
        restaurantId: 1,
        settlementNumber: "ST-000000100",
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
  });

  it("marks CF-backed open Check as NOT_PAID instead of inventing a settlement document", async () => {
    mocks.mapRowToOperationalCheck.mockReturnValue({
      ...paidCheck(),
      outcome: "open",
      settledAt: null,
    });
    const dto = await lookupCheckRefundBySettlementNumber({
      restaurantId: 1,
      settlementNumber: "ST-000000100",
    });
    expect(dto.settlementRecordId).toBeNull();
    expect(dto.rejectionCode).toBe("NOT_PAID");
    expect(dto.eligible).toBe(false);
  });

  it("rejects malformed settlement numbers", async () => {
    await expect(
      lookupCheckRefundBySettlementNumber({
        restaurantId: 1,
        settlementNumber: "sr:1:100:settlement:1",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});
