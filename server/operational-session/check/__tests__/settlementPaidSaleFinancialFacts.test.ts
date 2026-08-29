/**
 * CHECK-FINALIZE-PAYABLE-ISOLATION-1
 */
import { describe, expect, it } from "vitest";
import {
  resolveProductionCollectionFactsByEnrolledOrders,
  settlementFinancialFactsFromCollectionFact,
  settlementFinancialFactsFromOrderResolutions,
} from "../settlementPaidSaleFinancialFacts";
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
    expect(facts.orderFacts[55]?.grandTotal).toBe("10.00");
  });
});

describe("resolveProductionCollectionFactsByEnrolledOrders", () => {
  it("resolves each enrolled Order to its own unique production CF", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55, 66],
      facts: [
        fact({ collectionFactId: "pcf_a", orderId: 55, amount: "10.00" }),
        fact({
          collectionFactId: "pcf_b",
          orderId: 66,
          amount: "20.00",
          paymentIntentId: "pi_2",
          idempotencyKey: "idem-2",
        }),
      ],
    });
    expect(resolved.get(55)).toMatchObject({
      status: "unique",
      fact: { collectionFactId: "pcf_a" },
    });
    expect(resolved.get(66)).toMatchObject({
      status: "unique",
      fact: { collectionFactId: "pcf_b" },
    });
  });

  it("does not let Order A inherit Order B's CF", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55, 66],
      facts: [fact({ collectionFactId: "pcf_a", orderId: 55, amount: "10.00" })],
    });
    expect(resolved.get(55)?.status).toBe("unique");
    expect(resolved.get(66)?.status).toBe("missing");
  });

  it("marks multiple production CFs on one Order as ambiguous", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55],
      facts: [
        fact({ collectionFactId: "pcf_1", orderId: 55 }),
        fact({
          collectionFactId: "pcf_2",
          orderId: 55,
          paymentIntentId: "pi_2",
          idempotencyKey: "idem-2",
        }),
      ],
    });
    expect(resolved.get(55)?.status).toBe("ambiguous");
  });

  it("ignores CFs whose orderId is not enrolled", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55],
      facts: [
        fact({
          collectionFactId: "pcf_other",
          orderId: 99,
          amount: "99.00",
        }),
      ],
    });
    expect(resolved.get(55)?.status).toBe("missing");
    expect(resolved.has(99)).toBe(false);
  });
});

describe("settlementFinancialFactsFromOrderResolutions", () => {
  it("uses each Order's CF and does not use a Check-wide total", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55, 66],
      facts: [
        fact({
          collectionFactId: "pcf_a",
          orderId: 55,
          amount: "10.00",
          subtotal: "8.70",
          taxAmount: "1.30",
          tenders: [{ paymentMethod: "cash", amount: "10.00" }],
        }),
        fact({
          collectionFactId: "pcf_b",
          orderId: 66,
          amount: "20.00",
          subtotal: "17.40",
          taxAmount: "2.60",
          paymentIntentId: "pi_2",
          idempotencyKey: "idem-2",
          tenders: [{ paymentMethod: "card", amount: "20.00" }],
          committedAt: "2026-07-23T13:06:00.000Z",
        }),
      ],
    });
    const facts = settlementFinancialFactsFromOrderResolutions(resolved);
    expect(facts?.orderFacts[55]?.grandTotal).toBe("10.00");
    expect(facts?.orderFacts[66]?.grandTotal).toBe("20.00");
    expect(facts?.grandTotal).toBe("30.00");
    expect(facts?.paymentLines).toEqual([
      { paymentMethod: "cash", amount: "10.00", status: "captured" },
      { paymentMethod: "card", amount: "20.00", status: "captured" },
    ]);
    expect(facts?.settledAt).toBe("2026-07-23T13:06:00.000Z");
  });

  it("does not apply Order A's CF to a missing Order B", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55, 66],
      facts: [fact({ orderId: 55, amount: "10.00" })],
    });
    const facts = settlementFinancialFactsFromOrderResolutions(resolved);
    expect(facts?.orderFacts[55]?.grandTotal).toBe("10.00");
    expect(facts?.orderFacts[66]).toBeUndefined();
    expect(facts?.grandTotal).toBe("10.00");
  });

  it("does not silently pick one CF when an Order is ambiguous", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55],
      facts: [
        fact({ collectionFactId: "pcf_1", amount: "10.00" }),
        fact({
          collectionFactId: "pcf_2",
          amount: "11.00",
          paymentIntentId: "pi_2",
          idempotencyKey: "idem-2",
        }),
      ],
    });
    expect(settlementFinancialFactsFromOrderResolutions(resolved)).toBeNull();
  });

  it("keeps a unique Order CF when a sibling Order is ambiguous", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55, 66],
      facts: [
        fact({ collectionFactId: "pcf_a", orderId: 55, amount: "10.00" }),
        fact({
          collectionFactId: "pcf_b1",
          orderId: 66,
          amount: "20.00",
          paymentIntentId: "pi_2",
          idempotencyKey: "idem-2",
        }),
        fact({
          collectionFactId: "pcf_b2",
          orderId: 66,
          amount: "21.00",
          paymentIntentId: "pi_3",
          idempotencyKey: "idem-3",
        }),
      ],
    });
    const facts = settlementFinancialFactsFromOrderResolutions(resolved);
    expect(facts?.orderFacts[55]?.grandTotal).toBe("10.00");
    expect(facts?.orderFacts[66]).toBeUndefined();
    expect(facts?.grandTotal).toBe("10.00");
  });

  it("returns null when no enrolled Order has a unique CF", () => {
    const resolved = resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: [55, 66],
      facts: [],
    });
    expect(settlementFinancialFactsFromOrderResolutions(resolved)).toBeNull();
  });
});
