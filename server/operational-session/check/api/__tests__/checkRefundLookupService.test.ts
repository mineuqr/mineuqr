/**
 * REFUND-INVOICE-IDENTITY-AND-CONCURRENCY-HARDENING-1
 * Invoice primary lookup + legacy ST secondary.
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
  findCashierInvoiceBySequenceNumber: vi.fn(),
  listFinanciallyCompleteMembershipsForOrder: vi.fn(),
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

vi.mock("../../../../pos/cashier-invoice/cashierInvoiceRepository", () => ({
  findCashierInvoiceBySequenceNumber: (...a: unknown[]) =>
    mocks.findCashierInvoiceBySequenceNumber(...a),
}));

vi.mock("../../checkOrderMembershipRepository", () => ({
  listFinanciallyCompleteMembershipsForOrder: (...a: unknown[]) =>
    mocks.listFinanciallyCompleteMembershipsForOrder(...a),
}));

import {
  lookupCheckRefundByInvoiceNumber,
  lookupCheckRefundBySettlementNumber,
} from "../checkRefundLookupService";

const AT = new Date().toISOString();
const BUSINESS_DAY = AT.slice(0, 10);

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
    businessDay: BUSINESS_DAY,
    actorId: "7",
    terminalId: "term-1",
    orderingChannel: "qr",
  };
}

function stubBudgetPath() {
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
}

describe("lookupCheckRefundByInvoiceNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubBudgetPath();
    mocks.findCashierInvoiceBySequenceNumber.mockResolvedValue({
      restaurantId: 1,
      orderId: 55,
      sequenceNumber: 50,
      invoiceNumber: "000050",
    });
    mocks.listFinanciallyCompleteMembershipsForOrder.mockResolvedValue([
      {
        membership: {
          restaurantId: 1,
          checkId: 100,
          orderId: 55,
          active: 1,
        },
        checkOutcome: "paid",
      },
    ]);
  });

  it("resolves Invoice → Order → Check → CF budget", async () => {
    const dto = await lookupCheckRefundByInvoiceNumber({
      restaurantId: 1,
      invoiceNumber: "000050",
    });
    expect(dto.checkId).toBe(100);
    expect(dto.invoiceNumber).toBe("000050");
    expect(dto.originalAmount).toBe("90.00");
    expect(dto.refundableBalance).toBe("90.00");
    expect(dto.eligible).toBe(true);
    expect(mocks.findCashierInvoiceBySequenceNumber).toHaveBeenCalledWith({
      restaurantId: 1,
      sequenceNumber: 50,
    });
  });

  it("rejects missing Invoice deterministically", async () => {
    mocks.findCashierInvoiceBySequenceNumber.mockResolvedValue(null);
    await expect(
      lookupCheckRefundByInvoiceNumber({
        restaurantId: 1,
        invoiceNumber: "000099",
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Unknown invoice number",
    });
  });

  it("rejects ambiguous Check membership without first-pick", async () => {
    mocks.listFinanciallyCompleteMembershipsForOrder.mockResolvedValue([
      {
        membership: { restaurantId: 1, checkId: 100, orderId: 55, active: 1 },
        checkOutcome: "paid",
      },
      {
        membership: { restaurantId: 1, checkId: 200, orderId: 55, active: 1 },
        checkOutcome: "paid",
      },
    ]);
    await expect(
      lookupCheckRefundByInvoiceNumber({
        restaurantId: 1,
        invoiceNumber: "000050",
      })
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Ambiguous invoice check membership",
    });
  });

  it("keeps restaurant scope on Invoice sequence lookup", async () => {
    mocks.findCheckById.mockResolvedValue({ id: 100, restaurantId: 42 });
    mocks.mapRowToOperationalCheck.mockReturnValue({
      ...paidCheck(),
      restaurantId: 42,
    });
    mocks.findCashierInvoiceBySequenceNumber.mockResolvedValue({
      restaurantId: 42,
      orderId: 55,
      sequenceNumber: 50,
      invoiceNumber: "000050",
    });
    await lookupCheckRefundByInvoiceNumber({
      restaurantId: 42,
      invoiceNumber: "50",
    });
    expect(mocks.findCashierInvoiceBySequenceNumber).toHaveBeenCalledWith({
      restaurantId: 42,
      sequenceNumber: 50,
    });
    expect(mocks.listFinanciallyCompleteMembershipsForOrder).toHaveBeenCalledWith(
      42,
      55
    );
  });
});

describe("lookupCheckRefundBySettlementNumber (legacy ST)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubBudgetPath();
  });

  it("looks up a CF-backed sale without gen=1 SR via ST-", async () => {
    const dto = await lookupCheckRefundBySettlementNumber({
      restaurantId: 1,
      settlementNumber: "ST-000000100",
    });
    expect(dto.checkId).toBe(100);
    expect(dto.settlementRecordId).toBeNull();
    expect(dto.invoiceNumber).toBeNull();
    expect(dto.originalAmount).toBe("90.00");
    expect(dto.eligible).toBe(true);
  });

  it("rejects bare digits (Invoice identity owns digit tokens)", async () => {
    await expect(
      lookupCheckRefundBySettlementNumber({
        restaurantId: 1,
        settlementNumber: "000050",
      })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Unknown settlement number",
    });
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
      message: "Unknown refund sale",
    });
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
