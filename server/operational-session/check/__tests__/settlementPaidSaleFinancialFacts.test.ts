import { describe, expect, it } from "vitest";
import { settlementFinancialFactsFromCollectionFact } from "../settlementPaidSaleFinancialFacts";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";

function fact(overrides: Partial<CollectionFact> = {}): CollectionFact {
  return {
    collectionFactId: "pcf_1",
    restaurantId: 1,
    orderId: 55,
    paymentIntentId: "pi_1",
    orderingChannel: "kiosk",
    kind: "collection",
    purpose: "production",
    schemaVersion: 1,
    subtotal: "8.70",
    discountAmount: "0.00",
    taxAmount: "1.30",
    amount: "10.00",
    currencyCode: "SAR",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [],
    },
    taxBreakdown: { totalTaxAmount: "1.30", lines: [] },
    composition: [],
    tenders: [{ paymentMethod: "cash", amount: "10.00" }],
    checkId: 0,
    actorType: "staff_user",
    actorId: "1",
    terminalId: "term-1",
    businessDay: "2026-07-23",
    idempotencyKey: "idem-1",
    fingerprint: "fp-1",
    committedAt: "2026-07-23T13:05:00.000Z",
    createdAt: "2026-07-23T13:05:00.000Z",
    ...overrides,
  };
}

describe("settlementFinancialFactsFromCollectionFact", () => {
  it("copies CF amount and tenders without using Check money", () => {
    const facts = settlementFinancialFactsFromCollectionFact(fact());
    expect(facts.source).toBe("collection_fact");
    expect(facts.grandTotal).toBe("10.00");
    expect(facts.subtotal).toBe("8.70");
    expect(facts.taxAmount).toBe("1.30");
    expect(facts.paymentLines).toEqual([
      { paymentMethod: "cash", amount: "10.00", status: "captured" },
    ]);
    expect(facts.settledAt).toBe("2026-07-23T13:05:00.000Z");
  });
});
