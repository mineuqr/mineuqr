/**
 * RECEIPT-SR-IDENTITY-1 / RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";

const mocks = vi.hoisted(() => ({
  getOrderById: vi.fn(),
  listProductionCollectionFactsByOrderId: vi.fn(),
  cashierInvoiceNumberForOrder: vi.fn(),
}));

vi.mock("../../../../db", () => ({
  getOrderById: (...a: unknown[]) => mocks.getOrderById(...a),
}));

vi.mock("../../../payment/collection-fact/collectionFactRepository", () => ({
  listProductionCollectionFactsByOrderId: (...a: unknown[]) =>
    mocks.listProductionCollectionFactsByOrderId(...a),
}));

vi.mock("../../../../pos/cashier-invoice/cashierInvoiceRepository", () => ({
  cashierInvoiceNumberForOrder: (...a: unknown[]) =>
    mocks.cashierInvoiceNumberForOrder(...a),
}));

import {
  AmbiguousPaidSaleReceiptError,
  PaidSaleReceiptIdentityError,
  resolvePaidSaleReceiptFromCollectionFact,
} from "../paidSaleReceiptResolution";

function fact(overrides: Partial<CollectionFact> = {}): CollectionFact {
  return {
    collectionFactId: "cf-1",
    restaurantId: 1,
    orderId: 55,
    paymentIntentId: "pi-1",
    orderingChannel: "cashier",
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
    taxBreakdown: {
      totalTaxAmount: "11.25",
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15",
          amount: "11.25",
        },
      ],
    },
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

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 55,
    restaurantId: 1,
    orderNumber: "ORD-0055",
    businessDay: "2026-08-27",
    dailyDisplayNumber: 12,
    ...overrides,
  };
}

describe("resolvePaidSaleReceiptFromCollectionFact", () => {
  beforeEach(() => {
    mocks.getOrderById.mockReset();
    mocks.listProductionCollectionFactsByOrderId.mockReset();
    mocks.cashierInvoiceNumberForOrder.mockReset();
    mocks.getOrderById.mockResolvedValue(order());
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([fact()]);
    mocks.cashierInvoiceNumberForOrder.mockResolvedValue(null);
  });

  it("resolves a unique production Collection Fact without Settlement Record identity", async () => {
    const receipt = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt).not.toBeNull();
    expect(receipt?.settlementRecordId).toBe("");
    expect(receipt?.recordKind).toBe("settlement");
    expect(receipt?.grandTotal).toBe("86.25");
    expect(receipt?.financialSnapshot.subtotal).toBe("80.00");
    expect(receipt?.financialSnapshot.discountAmount).toBe("5.00");
    expect(receipt?.financialSnapshot.taxAmount).toBe("11.25");
    expect(receipt?.paymentMethods).toEqual([
      expect.objectContaining({
        paymentMethod: "cash",
        amount: "86.25",
        currencyCode: "SAR",
      }),
    ]);
    expect(receipt?.currencyCode).toBe("SAR");
    expect(receipt?.orders[0]?.orderId).toBe(55);
    expect(receipt?.businessDay).toBe("2026-08-27");
    expect(receipt?.itemsSnapshot[0]?.name).toBe("Kabsa");
    expect(receipt?.itemsSnapshot[0]?.unitPrice).toBe("80.00");
    expect(receipt?.settlementNumber).toBe("");
    expect(receipt?.documentNumber).toBe("");
    expect(receipt?.outcome).toBe("paid");
  });

  it("preserves Kiosk identityScope on the Order reference", async () => {
    mocks.getOrderById.mockResolvedValue(
      order({
        identityScope: "KIOSK",
        dailyDisplayNumber: 5,
        businessDay: "2026-08-27",
        orderingChannel: "kiosk",
      })
    );
    mocks.cashierInvoiceNumberForOrder.mockResolvedValue("000042");
    const receipt = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt?.invoiceNumber).toBe("000042");
    expect(receipt?.settlementNumber).toBe("");
    expect(receipt?.settlementNumber).not.toBe("000042");
    expect(receipt?.orders[0]?.displayReference).toBe("K #005");
    expect(receipt?.orders[0]?.displayReference).not.toBe("T #005");
    expect(receipt?.sourceChannel).toBe("self_order");
  });

  it("does not default Waiter or POS Orders to TABLE", async () => {
    mocks.getOrderById.mockResolvedValue(
      order({
        identityScope: "WAITER",
        dailyDisplayNumber: 5,
        businessDay: "2026-08-27",
        orderingChannel: "waiter_tablet",
      })
    );
    const waiter = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(waiter?.orders[0]?.displayReference).toBe("WT #005");
    expect(waiter?.sourceChannel).toBe("waiter_order");

    mocks.getOrderById.mockResolvedValue(
      order({
        identityScope: "POS",
        dailyDisplayNumber: 5,
        businessDay: "2026-08-27",
        orderingChannel: "cashier_pos",
      })
    );
    const pos = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(pos?.orders[0]?.displayReference).toBe("P #005");
    expect(pos?.sourceChannel).toBe("counter");
  });

  it("does not default Table Orders to another channel", async () => {
    mocks.getOrderById.mockResolvedValue(
      order({
        identityScope: "TABLE",
        dailyDisplayNumber: 5,
        businessDay: "2026-08-27",
        orderingChannel: "table_session",
      })
    );
    const receipt = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt?.orders[0]?.displayReference).toBe("T #005");
    expect(receipt?.sourceChannel).toBe("table_order");
  });

  it("keeps Invoice serial separate from Settlement number and Order reference", async () => {
    mocks.cashierInvoiceNumberForOrder.mockResolvedValue("000126");
    const receipt = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt?.invoiceNumber).toBe("000126");
    expect(receipt?.settlementNumber).toBe("");
    expect(receipt?.documentNumber).toBe("");
    expect(receipt?.settlementNumber).not.toBe(receipt?.invoiceNumber);
    expect(receipt?.orders[0]?.orderId).toBe(55);
    expect(receipt?.orders[0]?.displayReference).not.toBe("000126");
    expect(receipt?.orders[0]?.displayReference).toBeTruthy();
  });

  it("does not change receipt items when live Order items would have changed", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([
      fact({
        composition: [
          {
            sequence: 1,
            description: "Kabsa",
            netAmount: "80.00",
            taxAmount: "11.25",
            originOrderId: 55,
          },
        ],
      }),
    ]);
    const receipt = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt?.itemsSnapshot).toEqual([
      {
        orderId: 55,
        name: "Kabsa",
        quantity: 1,
        unitPrice: "80.00",
        lineTotal: "80.00",
      },
    ]);
    expect(receipt?.grandTotal).toBe("86.25");
  });

  it("maps a zero-amount Collection Fact as complimentary", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([
      fact({
        amount: "0.00",
        discountAmount: "80.00",
        taxAmount: "0.00",
        subtotal: "0.00",
        tenders: [{ paymentMethod: "other", amount: "0.00" }],
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
      }),
    ]);
    const receipt = await resolvePaidSaleReceiptFromCollectionFact({
      restaurantId: 1,
      orderId: 55,
    });
    expect(receipt?.outcome).toBe("complimentary");
    expect(receipt?.grandTotal).toBe("0.00");
  });

  it("returns null when there is no production Collection Fact (legacy path)", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([]);
    await expect(
      resolvePaidSaleReceiptFromCollectionFact({ restaurantId: 1, orderId: 55 })
    ).resolves.toBeNull();
  });

  it("ignores isolated Collection Facts instead of treating them as the sale", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([
      fact({ purpose: "shadow", collectionFactId: "cf-shadow" }),
    ]);
    await expect(
      resolvePaidSaleReceiptFromCollectionFact({ restaurantId: 1, orderId: 55 })
    ).resolves.toBeNull();
  });

  it("fail-closes when multiple production Collection Facts exist", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockResolvedValue([
      fact({ collectionFactId: "cf-1" }),
      fact({ collectionFactId: "cf-2", paymentIntentId: "pi-2" }),
    ]);
    await expect(
      resolvePaidSaleReceiptFromCollectionFact({ restaurantId: 1, orderId: 55 })
    ).rejects.toBeInstanceOf(AmbiguousPaidSaleReceiptError);
  });

  it("fail-closes when the order belongs to a different restaurant", async () => {
    mocks.getOrderById.mockResolvedValue(order({ restaurantId: 99 }));
    await expect(
      resolvePaidSaleReceiptFromCollectionFact({ restaurantId: 1, orderId: 55 })
    ).rejects.toBeInstanceOf(PaidSaleReceiptIdentityError);
    expect(mocks.listProductionCollectionFactsByOrderId).not.toHaveBeenCalled();
  });

  it("propagates Collection Fact query failures instead of treating them as legacy", async () => {
    mocks.listProductionCollectionFactsByOrderId.mockRejectedValue(
      new Error("db unavailable")
    );
    await expect(
      resolvePaidSaleReceiptFromCollectionFact({ restaurantId: 1, orderId: 55 })
    ).rejects.toThrow("db unavailable");
  });

  it("does not write Collection Fact, PAID, or Settlement Record", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync(
        new URL("../paidSaleReceiptResolution.ts", import.meta.url),
        "utf8"
      )
    );
    expect(src).not.toContain("insertSettlementRecord");
    expect(src).not.toContain("commitCollectionFact");
    expect(src).not.toContain("commitCashierProductionCollectionFact");
    expect(src).not.toContain("markOrderPaid");
    expect(src).not.toContain("createSettlementRecord");
  });
});
