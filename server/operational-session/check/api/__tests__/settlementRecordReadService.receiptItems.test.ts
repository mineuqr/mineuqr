/**
 * RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1
 * SR-keyed Detail / Receipt item source.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import type { SettlementRecord } from "@shared/operational-session";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
  getOrdersByIds: vi.fn(),
  listProductionCollectionFactsByOrderId: vi.fn(),
  mapCashierInvoiceNumbersByOrderIds: vi.fn(),
  findSettlementRecordById: vi.fn(),
  loadSettlementRecordAttributionDisplay: vi.fn(),
  findRefundDocumentSequenceByRecordId: vi.fn(),
}));

vi.mock("../../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
  getOrderItemsByOrderId: (...a: unknown[]) => mocks.getOrderItemsByOrderId(...a),
  getOrdersByIds: (...a: unknown[]) => mocks.getOrdersByIds(...a),
}));

vi.mock("../../../payment/collection-fact/collectionFactRepository", () => ({
  listProductionCollectionFactsByOrderId: (...a: unknown[]) =>
    mocks.listProductionCollectionFactsByOrderId(...a),
}));

vi.mock("../../../../pos/cashier-invoice/cashierInvoiceRepository", () => ({
  mapCashierInvoiceNumbersByOrderIds: (...a: unknown[]) =>
    mocks.mapCashierInvoiceNumbersByOrderIds(...a),
}));

vi.mock("../../settlementRecordRepository", () => ({
  findSettlementRecordById: (...a: unknown[]) =>
    mocks.findSettlementRecordById(...a),
  listSettlementRecordsForCheck: vi.fn(),
  listSettlementRecordsForRestaurantPaged: vi.fn(),
  listSettlementRecordsForSession: vi.fn(),
}));

vi.mock("../settlementRecordAttributionDisplay", () => ({
  loadSettlementRecordAttributionDisplay: (...a: unknown[]) =>
    mocks.loadSettlementRecordAttributionDisplay(...a),
}));

vi.mock("../../refundDocumentNumberRepository", () => ({
  findRefundDocumentSequenceByRecordId: (...a: unknown[]) =>
    mocks.findRefundDocumentSequenceByRecordId(...a),
  mapRefundDocumentSequencesByRecordIds: vi.fn(),
}));

import { SettlementRecordReadService } from "../settlementRecordReadService";

function sampleRecord(
  overrides: Partial<SettlementRecord> = {}
): SettlementRecord {
  return {
    settlementRecordId: "sr:1:10:settlement:1",
    restaurantId: 1,
    recordKind: "settlement",
    schemaVersion: 1,
    recordGeneration: 1,
    checkId: 10,
    sessionId: 20,
    financialReference: "fin:check:10:gen:1",
    priorSettlementRecordId: null,
    orderRefs: [{ orderId: 55 }],
    orderSettlementRefs: [],
    subtotal: "80.00",
    discountAmount: "5.00",
    taxAmount: "11.25",
    grandTotal: "86.25",
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [],
    },
    taxBreakdown: { totalTaxAmount: "11.25", lines: [] },
    paymentSnapshot: [
      {
        settlementTransactionId: 1,
        paymentMethod: "cash",
        amount: "86.25",
        currencyCode: "SAR",
        status: "applied",
        businessTimestamp: "2026-08-27T12:00:00.000Z",
        reference: null,
        externalReference: null,
      },
    ],
    businessDay: "2026-08-27",
    settledAt: "2026-08-27T12:00:00.000Z",
    createdAt: "2026-08-27T12:00:00.000Z",
    createdByActorType: "user",
    createdByActorId: "7",
    producer: "check_aggregate",
    ...overrides,
  };
}

function fact(overrides: Partial<CollectionFact> = {}): CollectionFact {
  return {
    collectionFactId: "cf-1",
    restaurantId: 1,
    orderId: 55,
    paymentIntentId: "pi-1",
    orderingChannel: "kiosk",
    kind: "collection",
    purpose: "production",
    schemaVersion: 1,
    subtotal: "80.00",
    discountAmount: "5.00",
    taxAmount: "11.25",
    amount: "86.25",
    currencyCode: "SAR",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [],
    },
    taxBreakdown: { totalTaxAmount: "11.25", lines: [] },
    composition: [
      {
        sequence: 1,
        description: "Kabsa",
        netAmount: "80.00",
        taxAmount: "11.25",
        originOrderId: 55,
      },
    ],
    tenders: [{ paymentMethod: "cash", amount: "86.25" }],
    checkId: 10,
    actorType: "user",
    actorId: "7",
    terminalId: "term-1",
    businessDay: "2026-08-27",
    idempotencyKey: "idem-1",
    fingerprint: "fp-1",
    committedAt: "2026-08-27T12:00:00.000Z",
    createdAt: "2026-08-27T12:00:00.000Z",
    ...overrides,
  };
}

describe("SettlementRecordReadService receipt items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findSettlementRecordById.mockResolvedValue(sampleRecord());
    mocks.getOrderById.mockResolvedValue({
      id: 55,
      restaurantId: 1,
      orderNumber: "ORD-0055",
      businessDay: "2026-08-27",
      dailyDisplayNumber: 5,
      identityScope: "KIOSK",
      orderingChannel: "kiosk",
    });
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, restaurantId: 1, orderingChannel: "kiosk" },
    ]);
    mocks.getOrderItemsByOrderId.mockResolvedValue([
      { nameEn: "MUTATED LIVE ITEM", nameAr: "", quantity: 99, price: "1.00" },
    ]);
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([]);
    mocks.mapCashierInvoiceNumbersByOrderIds.mockResolvedValue(
      new Map([[55, "000042"]])
    );
    mocks.loadSettlementRecordAttributionDisplay.mockResolvedValue(null);
    mocks.findRefundDocumentSequenceByRecordId.mockResolvedValue(null);
  });

  it("uses frozen CF composition and ignores later live Order item mutation", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([fact()]);
    const svc = new SettlementRecordReadService();
    const receipt = await svc.getReceipt({
      restaurantId: 1,
      settlementRecordId: "sr:1:10:settlement:1",
    });
    expect(receipt?.invoiceNumber).toBe("000042");
    expect(receipt?.settlementNumber).toBe("ST-000010");
    expect(receipt?.invoiceNumber).not.toBe(receipt?.settlementNumber);
    expect(receipt?.grandTotal).toBe("86.25");
    expect(receipt?.itemsSnapshot).toEqual([
      {
        orderId: 55,
        name: "Kabsa",
        quantity: 1,
        unitPrice: "80.00",
        lineTotal: "80.00",
      },
    ]);
    expect(receipt?.itemsSnapshot[0]?.name).not.toBe("MUTATED LIVE ITEM");
    expect(mocks.getOrderItemsByOrderId).not.toHaveBeenCalled();
  });

  it("keeps historical no-CF receipts readable from live Order items", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([]);
    const svc = new SettlementRecordReadService();
    const receipt = await svc.getReceipt({
      restaurantId: 1,
      settlementRecordId: "sr:1:10:settlement:1",
    });
    expect(receipt?.settlementNumber).toBe("ST-000010");
    expect(receipt?.itemsSnapshot[0]?.name).toBe("MUTATED LIVE ITEM");
    expect(receipt?.grandTotal).toBe("86.25");
  });

  it("keeps refund receipt ST/RF identity and does not use Invoice as Settlement number", async () => {
    mocks.findSettlementRecordById.mockResolvedValue(
      sampleRecord({
        settlementRecordId: "sr:1:10:refund:2",
        recordKind: "refund",
        recordGeneration: 2,
        priorSettlementRecordId: "sr:1:10:settlement:1",
        grandTotal: "86.25",
      })
    );
    mocks.findRefundDocumentSequenceByRecordId.mockResolvedValue(1);
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([fact()]);
    const svc = new SettlementRecordReadService();
    const receipt = await svc.getReceipt({
      restaurantId: 1,
      settlementRecordId: "sr:1:10:refund:2",
    });
    expect(receipt?.documentType).toBe("refund");
    expect(receipt?.documentNumber).toBe("RF-000001");
    expect(receipt?.settlementNumber).toBe("RF-000001");
    expect(receipt?.originSettlementNumber).toBe("ST-000010");
    expect(receipt?.invoiceNumber).toBe("000042");
    expect(receipt?.invoiceNumber).not.toBe(receipt?.settlementNumber);
    expect(receipt?.itemsSnapshot[0]?.name).toBe("Kabsa");
  });
});
