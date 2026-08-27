import { describe, expect, it } from "vitest";
import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "../payment/collection-fact/collectionFactContract";
import {
  resolveCrmpSaleAttributionAnchor,
  type CrmpProductionFactCandidate,
} from "../check/crmpSaleAttributionAnchor";

function fact(
  over: Partial<CrmpProductionFactCandidate> = {}
): CrmpProductionFactCandidate {
  return {
    collectionFactId: "cf_1",
    restaurantId: 1,
    orderId: 44,
    paymentIntentId: "cpi_1",
    purpose: COLLECTION_FACT_PRODUCTION_PURPOSE,
    amount: "50.00",
    discountAmount: "0.00",
    currencyCode: "SAR",
    tenders: [
      { paymentMethod: "cash", amount: "20.00" },
      { paymentMethod: "card", amount: "30.00" },
    ],
    checkId: 100,
    committedAt: "t1",
    businessDay: "2026-08-27",
    actorId: "7",
    terminalId: "term_1",
    orderingChannel: "cashier_pos",
    ...over,
  };
}

describe("resolveCrmpSaleAttributionAnchor", () => {
  it("uses the unique production Collection Fact", () => {
    const anchor = resolveCrmpSaleAttributionAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [44],
      facts: [fact()],
    });
    expect(anchor.kind).toBe("collection_fact");
    if (anchor.kind === "collection_fact") {
      expect(anchor.fact.collectionFactId).toBe("cf_1");
      expect(anchor.fact.tenders).toHaveLength(2);
      expect(anchor.fact.actorId).toBe("7");
      expect(anchor.fact.terminalId).toBe("term_1");
      expect(anchor.fact.businessDay).toBe("2026-08-27");
    }
  });

  it("uses the legacy SR path when there is no production Collection Fact", () => {
    const anchor = resolveCrmpSaleAttributionAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [44],
      facts: [fact({ purpose: "shadow" })],
    });
    expect(anchor).toEqual({
      kind: "legacy_settlement_record",
      restaurantId: 1,
      checkId: 100,
      reason: "no_production_collection_fact",
    });
  });

  it("fails closed on multiple production Collection Facts", () => {
    const anchor = resolveCrmpSaleAttributionAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [44, 45],
      facts: [
        fact({ collectionFactId: "cf_a", orderId: 44, paymentIntentId: "cpi_a" }),
        fact({ collectionFactId: "cf_b", orderId: 45, paymentIntentId: "cpi_b" }),
      ],
    });
    expect(anchor.kind).toBe("ambiguous");
    if (anchor.kind === "ambiguous") {
      expect(anchor.collectionFactIds).toEqual(["cf_a", "cf_b"]);
    }
  });

  it("fails closed on the wrong restaurant", () => {
    const anchor = resolveCrmpSaleAttributionAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [44],
      facts: [fact({ restaurantId: 9 })],
    });
    expect(anchor.kind).toBe("invalid");
  });

  it("ignores isolated Collection Facts when a unique production fact remains", () => {
    const anchor = resolveCrmpSaleAttributionAnchor({
      restaurantId: 1,
      checkId: 100,
      orderIds: [44],
      facts: [
        fact({
          collectionFactId: "cf_shadow",
          purpose: "shadow",
          paymentIntentId: "cpi_shadow",
        }),
        fact(),
      ],
    });
    expect(anchor.kind).toBe("collection_fact");
    if (anchor.kind === "collection_fact") {
      expect(anchor.fact.collectionFactId).toBe("cf_1");
    }
  });
});
