/**
 * REFUND-CF-ANCHOR-1 — original-sale resolver behavior.
 */
import { describe, expect, it } from "vitest";
import {
  AmbiguousRefundOriginalSaleError,
  RefundIdentityViolationError,
  resolveRefundOriginalSaleAnchor,
  type RefundProductionFactCandidate,
} from "../index";

function fact(
  overrides: Partial<RefundProductionFactCandidate> = {}
): RefundProductionFactCandidate {
  return {
    collectionFactId: "cf-1",
    restaurantId: 1,
    orderId: 55,
    paymentIntentId: "pi-1",
    purpose: "production",
    amount: "90.00",
    discountAmount: "0.00",
    currencyCode: "SAR",
    subtotal: "90.00",
    taxAmount: "0.00",
    taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    tenders: [{ paymentMethod: "cash", amount: "90.00" }],
    checkId: 100,
    committedAt: "2026-08-27 12:00:00",
    businessDay: "2026-08-27",
    actorId: "7",
    terminalId: "term-1",
    orderingChannel: "qr",
    ...overrides,
  };
}

describe("resolveRefundOriginalSaleAnchor", () => {
  it("resolves a unique production Collection Fact as the original sale", () => {
    const anchor = resolveRefundOriginalSaleAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [55],
      facts: [fact()],
    });
    expect(anchor.kind).toBe("collection_fact");
    if (anchor.kind !== "collection_fact") return;
    expect(anchor.collectionFactId).toBe("cf-1");
    expect(anchor.paymentIntentId).toBe("pi-1");
    expect(anchor.originalCollectedAmount).toBe("90.00");
    expect(anchor.orderId).toBe(55);
  });

  it("does not use gen=1 SR and classifies zero production facts as legacy", () => {
    const anchor = resolveRefundOriginalSaleAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [55],
      facts: [],
    });
    expect(anchor).toEqual({
      kind: "legacy_settlement_record",
      restaurantId: 1,
      checkId: 100,
      reason: "no_production_collection_fact",
    });
  });

  it("ignores isolated non-production facts instead of treating them as the sale", () => {
    const anchor = resolveRefundOriginalSaleAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [55],
      facts: [fact({ purpose: "shadow" }), fact({ purpose: "test" })],
    });
    expect(anchor.kind).toBe("legacy_settlement_record");
  });

  it("fail-closes when two production Collection Facts match the sale", () => {
    expect(() =>
      resolveRefundOriginalSaleAnchor({
        restaurantId: 1,
        checkId: 100,
        orderIds: [55, 56],
        facts: [
          fact({ collectionFactId: "cf-a", orderId: 55, paymentIntentId: "pi-a" }),
          fact({ collectionFactId: "cf-b", orderId: 56, paymentIntentId: "pi-b" }),
        ],
      })
    ).toThrow(AmbiguousRefundOriginalSaleError);
  });

  it("rejects a Collection Fact from another restaurant", () => {
    expect(() =>
      resolveRefundOriginalSaleAnchor({
        restaurantId: 1,
        checkId: 100,
        orderIds: [55],
        facts: [fact({ restaurantId: 2 })],
      })
    ).toThrow(RefundIdentityViolationError);
  });

  it("dedupes the same collectionFactId instead of treating copies as ambiguous", () => {
    const anchor = resolveRefundOriginalSaleAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [55],
      facts: [fact(), fact()],
    });
    expect(anchor.kind).toBe("collection_fact");
  });

  it("fail-closes on a production fact missing paymentIntentId", () => {
    expect(() =>
      resolveRefundOriginalSaleAnchor({
        restaurantId: 1,
        checkId: 100,
        orderIds: [55],
        facts: [fact({ paymentIntentId: "" })],
      })
    ).toThrow(RefundIdentityViolationError);
  });

  it("does not select an unrelated order's Collection Fact", () => {
    const anchor = resolveRefundOriginalSaleAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [55],
      facts: [fact({ orderId: 99, checkId: null, collectionFactId: "cf-other" })],
    });
    expect(anchor.kind).toBe("legacy_settlement_record");
  });
});
