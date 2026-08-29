/**
 * RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1
 */
import { describe, expect, it } from "vitest";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import { receiptItemsFromCollectionFactComposition } from "../receiptItemsFromCollectionFactComposition";

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
    taxBreakdown: { totalTaxAmount: "11.25", lines: [] },
    composition: [],
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

describe("receiptItemsFromCollectionFactComposition", () => {
  it("maps frozen composition in sequence order", () => {
    const lines = receiptItemsFromCollectionFactComposition(
      fact({
        composition: [
          {
            sequence: 2,
            description: "Tea",
            netAmount: "5.00",
            taxAmount: "0.75",
            originOrderId: 55,
          },
          {
            sequence: 1,
            description: "Kabsa",
            netAmount: "75.00",
            taxAmount: "11.25",
            originOrderId: 55,
          },
        ],
      })
    );
    expect(lines.map((line) => line.name)).toEqual(["Kabsa", "Tea"]);
    expect(lines[0]).toEqual({
      orderId: 55,
      name: "Kabsa",
      quantity: 1,
      unitPrice: "75.00",
      lineTotal: "75.00",
    });
  });

  it("does not invent lines when composition is empty", () => {
    expect(receiptItemsFromCollectionFactComposition(fact())).toEqual([]);
  });
});
