/**
 * REVENUE-UNION-ADOPTION-1 — union formula, authority, idempotency, reconciliation.
 */
import { describe, expect, it } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import {
  classifyEconomicTransaction,
  compareFactToContribution,
  compareLegacyToUnion,
  computeRevenueUnion,
  isCollectionFactRevenueEligible,
  isPublishableAuthorityClass,
  periodKeyFromFrozenBusinessDay,
  PUBLISHED_COLLECTION_FACT_PURPOSES,
  type RevenueUnionCollectionFact,
  type RevenueUnionLegacyFact,
} from "../index";

const CURRENCY = { currencyCode: "SAR", currencySymbol: "ر.س" };
const TAX = {
  version: 1 as const,
  enabled: true,
  mode: "exclusive" as const,
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

function legacy(
  partial: Partial<RevenueUnionLegacyFact> &
    Pick<RevenueUnionLegacyFact, "checkId" | "outcome" | "grandTotal">
): RevenueUnionLegacyFact {
  return {
    restaurantId: 1,
    settlementRecordId: `sr-${partial.checkId}`,
    taxAmount: "0.00",
    currencyCode: "SAR",
    currencySnapshot: CURRENCY,
    taxPolicySnapshot: TAX,
    businessDay: "2026-08-20",
    settledAt: "2026-08-20 12:00:00",
    voidedAt: null,
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    orderIds: [partial.checkId],
    ...partial,
  };
}

function fact(
  partial: Partial<RevenueUnionCollectionFact> &
    Pick<RevenueUnionCollectionFact, "paymentIntentId" | "amount">
): RevenueUnionCollectionFact {
  return {
    collectionFactId: `pcf-${partial.paymentIntentId}`,
    restaurantId: 1,
    orderId: 9001,
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    purpose: "validation",
    taxAmount: "0.00",
    discountAmount: "0.00",
    currencyCode: "SAR",
    currencySnapshot: CURRENCY,
    taxPolicySnapshot: TAX,
    tenders: [{ paymentMethod: "cash", amount: partial.amount }],
    checkId: null,
    businessDay: "2026-08-20",
    committedAt: "2026-08-20T12:00:00.000Z",
    ...partial,
  };
}

describe("REVENUE-UNION-ADOPTION-1", () => {
  it("counts a legacy paid Check as LEGACY_CHECK revenue", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "115.00", taxAmount: "15.00" })],
      facts: [],
      eligibility: "isolated",
    });
    expect(union.totals.grossRevenue).toBe("115.00");
    expect(union.totals.legacyGross).toBe("115.00");
    expect(union.totals.collectionFactGross).toBe("0.00");
    expect(union.contributions[0]?.authority).toBe("LEGACY_CHECK");
  });

  it("counts an isolated Collection Fact as COLLECTION_FACT revenue", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [
        fact({
          paymentIntentId: "int-1",
          amount: "80.00",
          taxAmount: "10.43",
          orderId: 44,
        }),
      ],
      eligibility: "isolated",
    });
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
    expect(union.contributions[0]?.authority).toBe("COLLECTION_FACT");
    expect(
      compareFactToContribution({
        factAmount: "80.00",
        factTax: "10.43",
        factCurrency: "SAR",
        factBusinessDay: "2026-08-20",
        contributionAmount: union.contributions[0].amount,
        contributionTax: union.contributions[0].taxAmount,
        contributionCurrency: union.contributions[0].currencyCode,
        contributionBusinessDay: union.contributions[0].businessDay,
      })
    ).toEqual([]);
  });

  it("uses one authority when the same sale is represented twice — publishes neither", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "115.00",
          orderIds: [44],
        }),
      ],
      facts: [fact({ paymentIntentId: "int-1", amount: "115.00", orderId: 44, checkId: 10 })],
      eligibility: "isolated",
    });
    expect(union.conflicts.some((c) => c.code === "BOTH")).toBe(true);
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.totals.paidContributionCount).toBe(0);
  });

  it("collapses duplicate Check and duplicate Collection Fact events", () => {
    const paid = legacy({ checkId: 10, outcome: "paid", grandTotal: "50.00" });
    const row = fact({ paymentIntentId: "int-2", amount: "25.00", orderId: 77 });
    const union = computeRevenueUnion({
      legacy: [paid, paid],
      facts: [row, { ...row, collectionFactId: "pcf-dup" }],
      eligibility: "isolated",
    });
    expect(union.totals.legacyPaidCount).toBe(1);
    expect(union.totals.collectionFactCount).toBe(1);
    expect(union.totals.grossRevenue).toBe("75.00");
    expect(union.conflicts.map((c) => c.code).sort()).toEqual([
      "DUPLICATE_FACT",
      "DUPLICATE_LEGACY",
    ]);
  });

  it("does not treat complimentary or void as Gross Revenue", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({ checkId: 1, outcome: "complimentary", grandTotal: "90.00" }),
        legacy({
          checkId: 2,
          outcome: "voided",
          grandTotal: "40.00",
          settledAt: null,
          voidedAt: "2026-08-20 13:00:00",
        }),
      ],
      facts: [],
      eligibility: "isolated",
    });
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.totals.complimentaryCount).toBe(1);
    expect(union.totals.complimentaryAmount).toBe("90.00");
    expect(union.totals.voidedCount).toBe(1);
  });

  it("subtracts legacy refund publications from Net without changing Gross", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "100.00" })],
      facts: [],
      refunds: [
        {
          restaurantId: 1,
          checkId: 10,
          settlementRecordId: "sr-rf",
          grandTotal: "25.00",
          settledAt: "2026-08-20 15:00:00",
          businessDay: "2026-08-20",
        },
      ],
      eligibility: "isolated",
    });
    expect(union.totals.grossRevenue).toBe("100.00");
    expect(union.totals.refundPublishedTotal).toBe("25.00");
    expect(union.totals.netRevenue).toBe("75.00");
  });

  it("counts split tenders on one Check or one Fact as one contribution", () => {
    const checkUnion = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "100.00" })],
      facts: [],
      eligibility: "isolated",
    });
    const factUnion = computeRevenueUnion({
      legacy: [],
      facts: [
        fact({
          paymentIntentId: "int-split",
          amount: "100.00",
          orderId: 88,
          tenders: [
            { paymentMethod: "cash", amount: "40.00" },
            { paymentMethod: "card", amount: "60.00" },
          ],
        }),
      ],
      eligibility: "isolated",
    });
    expect(checkUnion.totals.paidContributionCount).toBe(1);
    expect(factUnion.totals.paidContributionCount).toBe(1);
    expect(factUnion.totals.grossRevenue).toBe("100.00");
  });

  it("counts multi-check as one contribution per paid Check", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({ checkId: 11, outcome: "paid", grandTotal: "30.00", orderIds: [1] }),
        legacy({ checkId: 12, outcome: "paid", grandTotal: "70.00", orderIds: [2] }),
      ],
      facts: [],
      eligibility: "isolated",
    });
    expect(union.totals.grossRevenue).toBe("100.00");
    expect(union.totals.legacyPaidCount).toBe(2);
  });

  it("uses frozen Collection Fact businessDay for period keys", () => {
    expect(periodKeyFromFrozenBusinessDay("2026-08-20", "day")).toBe("2026-08-20");
    expect(periodKeyFromFrozenBusinessDay("2026-08-20", "month")).toBe("2026-08");
    expect(periodKeyFromFrozenBusinessDay("2026-08-20", "week")).toMatch(/^2026-W\d{2}$/);
  });

  it("ignores Collection Facts when eligibility is none (published / production-safe)", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "50.00" })],
      facts: [fact({ paymentIntentId: "int-1", amount: "999.00", orderId: 99 })],
      eligibility: "none",
    });
    expect(union.totals.grossRevenue).toBe("50.00");
    expect(union.totals.collectionFactCount).toBe(0);
  });

  it("preserves historical Check-only datasets and mixed non-overlapping identities", () => {
    const historical = computeRevenueUnion({
      legacy: [legacy({ checkId: 1, outcome: "paid", grandTotal: "10.00" })],
      facts: [],
      eligibility: "isolated",
    });
    const mixed = computeRevenueUnion({
      legacy: [legacy({ checkId: 1, outcome: "paid", grandTotal: "10.00", orderIds: [1] })],
      facts: [fact({ paymentIntentId: "int-new", amount: "20.00", orderId: 2 })],
      eligibility: "isolated",
    });
    expect(historical.totals.grossRevenue).toBe("10.00");
    expect(mixed.totals.grossRevenue).toBe("30.00");
    expect(mixed.conflicts.filter((c) => c.code === "BOTH")).toHaveLength(0);
  });

  it("isolates tenants and flags mixed currency", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({ restaurantId: 1, checkId: 1, outcome: "paid", grandTotal: "10.00" }),
        legacy({
          restaurantId: 2,
          checkId: 1,
          outcome: "paid",
          grandTotal: "7.00",
          currencyCode: "USD",
          currencySnapshot: { currencyCode: "USD", currencySymbol: "$" },
        }),
      ],
      facts: [],
      eligibility: "isolated",
    });
    expect(union.totals.grossRevenue).toBe("17.00");
    expect(union.conflicts.some((c) => c.code === "CURRENCY")).toBe(true);
    expect(union.contributions.map((c) => c.restaurantId).sort()).toEqual([1, 2]);
  });

  it("matches legacy summary when Collection Fact production state is empty", () => {
    const rows = [legacy({ checkId: 3, outcome: "paid", grandTotal: "42.00", taxAmount: "5.48" })];
    const union = computeRevenueUnion({
      legacy: rows,
      facts: [],
      eligibility: "none",
    });
    expect(
      compareLegacyToUnion({
        legacyGross: "42.00",
        legacyTax: "5.48",
        legacyPaidCount: 1,
        union,
      })
    ).toEqual([]);
  });
});

describe("REVENUE-UNION-PUBLISHED-ADOPTION-1", () => {
  it("publishes only the production Collection Fact purpose", () => {
    expect(PUBLISHED_COLLECTION_FACT_PURPOSES).toEqual(["production"]);
    expect(
      isCollectionFactRevenueEligible("production", "published")
    ).toBe(true);
    expect(
      isCollectionFactRevenueEligible("validation", "published")
    ).toBe(false);
    expect(isCollectionFactRevenueEligible("shadow", "published")).toBe(false);
    expect(isCollectionFactRevenueEligible("test", "published")).toBe(false);
    expect(isCollectionFactRevenueEligible("synthetic", "published")).toBe(
      false
    );
    expect(isCollectionFactRevenueEligible("production", "isolated")).toBe(
      false
    );
  });

  it("does not let isolated facts suppress published Check revenue", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "115.00",
          orderIds: [44],
        }),
      ],
      facts: [
        fact({
          paymentIntentId: "int-1",
          amount: "115.00",
          orderId: 44,
          checkId: 10,
        }),
      ],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "BOTH")).toBe(false);
    expect(union.totals.grossRevenue).toBe("115.00");
    expect(union.totals.collectionFactCount).toBe(0);
    expect(union.eligibilityRejectedFactCount).toBe(1);
  });

  it("counts one production Collection Fact as one published contribution", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [
        fact({
          paymentIntentId: "int-prod",
          amount: "80.00",
          taxAmount: "10.43",
          orderId: 44,
          purpose: "production",
        }),
      ],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.collectionFactCount).toBe(1);
    expect(union.contributions[0]?.authority).toBe("COLLECTION_FACT");
  });

  it("publishes the production Collection Fact when it overlaps a paid Settlement Record sale", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          taxAmount: "10.43",
          orderIds: [44],
        }),
      ],
      facts: [
        fact({
          paymentIntentId: "int-prod",
          amount: "80.00",
          taxAmount: "10.43",
          orderId: 44,
          checkId: 10,
          purpose: "production",
        }),
      ],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "PRODUCTION_OVERLAP")).toBe(
      true
    );
    expect(union.conflicts.some((c) => c.code === "BOTH")).toBe(false);
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
    expect(union.totals.legacyGross).toBe("0.00");
    expect(union.totals.paidContributionCount).toBe(1);
    expect(union.contributions[0]?.authority).toBe("COLLECTION_FACT");
  });

  it("classifies BOTH as unpublished and UNRESOLVED as unpublished", () => {
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: true,
        eligibleFactPresent: false,
      })
    ).toBe("LEGACY_CHECK");
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: false,
        eligibleFactPresent: true,
      })
    ).toBe("COLLECTION_FACT");
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: true,
        eligibleFactPresent: true,
      })
    ).toBe("BOTH");
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: true,
        eligibleFactPresent: true,
        saleOverlapProven: true,
        productionPublishedEligible: true,
      })
    ).toBe("PRODUCTION_OVERLAP");
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: false,
        eligibleFactPresent: false,
      })
    ).toBe("UNRESOLVED");
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: false,
        eligibleFactPresent: true,
        eligibleFactValid: false,
      })
    ).toBe("UNRESOLVED");
    expect(isPublishableAuthorityClass("BOTH")).toBe(false);
    expect(isPublishableAuthorityClass("PRODUCTION_OVERLAP")).toBe(false);
    expect(isPublishableAuthorityClass("DUPLICATE")).toBe(false);
    expect(isPublishableAuthorityClass("UNRESOLVED")).toBe(false);
    expect(isPublishableAuthorityClass("LEGACY_CHECK")).toBe(true);
  });

  it("marks an eligible but invalid Collection Fact as UNRESOLVED and does not publish it", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [
        fact({
          paymentIntentId: "int-bad",
          amount: "-12.00",
          orderId: 44,
        }),
      ],
      eligibility: "isolated",
    });
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
    expect(union.totals.collectionFactCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.unresolvedCount).toBe(1);
  });

  it("does not publish an invalid production Collection Fact", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [
        fact({
          paymentIntentId: "int-bad-prod",
          amount: "-12.00",
          orderId: 44,
          purpose: "production",
        }),
      ],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
    expect(union.totals.collectionFactCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("0.00");
  });
});
