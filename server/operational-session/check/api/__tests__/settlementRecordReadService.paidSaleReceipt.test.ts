/**
 * RECEIPT-SR-IDENTITY-1 — getReceipt dual identity (SR historical/refund vs CF paid-sale).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SettlementRecordDetailDto } from "../settlementRecordApiDtos";
import type { SettlementRecordReceiptDto } from "../settlementRecordApiDtos";

const mocks = vi.hoisted(() => ({
  resolvePaidSaleReceiptFromCollectionFact: vi.fn(),
}));

vi.mock("../paidSaleReceiptResolution", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../paidSaleReceiptResolution")>();
  return {
    ...actual,
    resolvePaidSaleReceiptFromCollectionFact: (...a: unknown[]) =>
      mocks.resolvePaidSaleReceiptFromCollectionFact(...a),
  };
});

import { SettlementRecordReadService } from "../settlementRecordReadService";

function detail(
  overrides: Partial<SettlementRecordDetailDto> = {}
): SettlementRecordDetailDto {
  return {
    settlementRecordId: "sr:1:10:settlement:1",
    settlementNumber: "ST-000010",
    documentNumber: "ST-000010",
    documentType: "settlement",
    refundNumber: null,
    originSettlementNumber: null,
    settlementTime: "2026-08-27T12:00:00.000Z",
    settlementStatus: "settled",
    sourceType: "check",
    sourceIdentifier: "10",
    sourceChannel: null,
    invoiceNumber: null,
    recordKind: "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    outcome: "paid",
    checkId: 10,
    sessionId: 20,
    orders: [{ orderId: 55, displayReference: "ORD-0055" }],
    checks: [{ checkId: 10 }],
    itemsSnapshot: [],
    financialSnapshot: {
      subtotal: "80.00",
      discountAmount: "0.00",
      taxAmount: "12.00",
      grandTotal: "92.00",
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    },
    taxSnapshot: { totalTaxAmount: "12.00", lines: [] },
    paymentMethods: [
      {
        paymentMethod: "cash",
        amount: "92.00",
        currencyCode: "SAR",
        status: "applied",
        businessTimestamp: "2026-08-27T12:00:00.000Z",
      },
    ],
    grandTotal: "92.00",
    operator: { actorType: "user", actorId: "7" },
    attribution: null,
    audit: {
      createdAt: "2026-08-27T12:00:00.000Z",
      settledAt: "2026-08-27T12:00:00.000Z",
      businessDay: "2026-08-27",
    },
    ...overrides,
  };
}

function cfReceipt(
  overrides: Partial<SettlementRecordReceiptDto> = {}
): SettlementRecordReceiptDto {
  return {
    settlementRecordId: "",
    settlementNumber: "ORD-0055",
    documentNumber: "ORD-0055",
    documentType: "settlement",
    refundNumber: null,
    originSettlementNumber: null,
    settlementTime: "2026-08-27T12:00:00.000Z",
    settlementStatus: "settled",
    recordKind: "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    businessDay: "2026-08-27",
    invoiceNumber: null,
    sourceChannel: null,
    orders: [{ orderId: 55, displayReference: "ORD-0055" }],
    itemsSnapshot: [],
    paymentMethods: [
      {
        paymentMethod: "cash",
        amount: "86.25",
        currencyCode: "SAR",
        status: "captured",
        businessTimestamp: "2026-08-27T12:00:00.000Z",
      },
    ],
    financialSnapshot: {
      subtotal: "80.00",
      discountAmount: "5.00",
      taxAmount: "11.25",
      grandTotal: "86.25",
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    },
    taxSnapshot: { totalTaxAmount: "11.25", lines: [] },
    grandTotal: "86.25",
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    outcome: "paid",
    ...overrides,
  };
}

describe("SettlementRecordReadService.getReceipt dual identity", () => {
  beforeEach(() => {
    mocks.resolvePaidSaleReceiptFromCollectionFact.mockReset();
  });

  it("historical Settlement Record lookup does not resolve Collection Fact", async () => {
    const svc = new SettlementRecordReadService();
    vi.spyOn(svc, "getById").mockResolvedValue(detail());
    const receipt = await svc.getReceipt({
      restaurantId: 1,
      settlementRecordId: "sr:1:10:settlement:1",
    });
    expect(receipt?.settlementRecordId).toBe("sr:1:10:settlement:1");
    expect(receipt?.grandTotal).toBe("92.00");
    expect(receipt?.documentNumber).toBe("ST-000010");
    expect(mocks.resolvePaidSaleReceiptFromCollectionFact).not.toHaveBeenCalled();
  });

  it("missing Settlement Record does not fall through to Collection Fact", async () => {
    const svc = new SettlementRecordReadService();
    vi.spyOn(svc, "getById").mockResolvedValue(null);
    const receipt = await svc.getReceipt({
      restaurantId: 1,
      settlementRecordId: "sr:missing",
      orderId: 55,
    });
    expect(receipt).toBeNull();
    expect(mocks.resolvePaidSaleReceiptFromCollectionFact).not.toHaveBeenCalled();
  });

  it("refund Settlement Record remains SR-backed", async () => {
    const svc = new SettlementRecordReadService();
    vi.spyOn(svc, "getById").mockResolvedValue(
      detail({
        settlementRecordId: "sr:1:10:refund:2",
        documentType: "refund",
        documentNumber: "RF-000001",
        refundNumber: "RF-000001",
        recordKind: "refund",
        recordGeneration: 2,
        originSettlementNumber: "ST-000010",
      })
    );
    const receipt = await svc.getReceipt({
      restaurantId: 1,
      settlementRecordId: "sr:1:10:refund:2",
    });
    expect(receipt?.documentType).toBe("refund");
    expect(receipt?.documentNumber).toBe("RF-000001");
    expect(receipt?.recordKind).toBe("refund");
    expect(mocks.resolvePaidSaleReceiptFromCollectionFact).not.toHaveBeenCalled();
  });

  it("orderId-only current sale uses Collection Fact and does not load SR", async () => {
    const svc = new SettlementRecordReadService();
    const getById = vi.spyOn(svc, "getById");
    mocks.resolvePaidSaleReceiptFromCollectionFact.mockResolvedValue(cfReceipt());
    const receipt = await svc.getReceipt({ restaurantId: 1, orderId: 55 });
    expect(getById).not.toHaveBeenCalled();
    expect(mocks.resolvePaidSaleReceiptFromCollectionFact).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt?.settlementRecordId).toBe("");
    expect(receipt?.grandTotal).toBe("86.25");
  });

  it("reprint of the same orderId is idempotent", async () => {
    const svc = new SettlementRecordReadService();
    mocks.resolvePaidSaleReceiptFromCollectionFact.mockResolvedValue(cfReceipt());
    const first = await svc.getReceipt({ restaurantId: 1, orderId: 55 });
    const second = await svc.getReceipt({ restaurantId: 1, orderId: 55 });
    expect(first).toEqual(second);
    expect(mocks.resolvePaidSaleReceiptFromCollectionFact).toHaveBeenCalledTimes(2);
  });
});
