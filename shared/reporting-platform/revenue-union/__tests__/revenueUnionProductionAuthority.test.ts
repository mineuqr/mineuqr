/**
 * REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1 — overlap authority cases.
 * Does not write Collection Facts. Does not call Cashier or Confirm.
 */
import { describe, expect, it } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import {
  classifyEconomicTransaction,
  computeRevenueUnion,
  provenEconomicSaleOverlap,
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
    orderIds: [44],
    ...partial,
  };
}

function production(
  partial: Partial<RevenueUnionCollectionFact> &
    Pick<RevenueUnionCollectionFact, "paymentIntentId" | "amount">
): RevenueUnionCollectionFact {
  return {
    collectionFactId: `pcf-${partial.paymentIntentId}`,
    restaurantId: 1,
    orderId: 44,
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    purpose: "production",
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

describe("REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1", () => {
  it("CASE 1 legacy SR only publishes LEGACY_CHECK", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "115.00", taxAmount: "15.00" })],
      facts: [],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("115.00");
    expect(union.totals.legacyGross).toBe("115.00");
    expect(union.contributions).toHaveLength(1);
    expect(union.contributions[0]?.authority).toBe("LEGACY_CHECK");
  });

  it("CASE 2 production Collection Fact only publishes COLLECTION_FACT", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00", taxAmount: "10.43" })],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
    expect(union.contributions[0]?.authority).toBe("COLLECTION_FACT");
  });

  it("CASE 3 12 proven overlap publishes CF only and excludes legacy Gross", () => {
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
        production({
          paymentIntentId: "int-1",
          amount: "80.00",
          taxAmount: "10.43",
          checkId: 10,
        }),
      ],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(1);
    expect(union.conflicts.some((c) => c.code === "BOTH")).toBe(false);
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.taxCollected).toBe("10.43");
    expect(union.totals.netRevenue).toBe("80.00");
    expect(union.totals.legacyGross).toBe("0.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
    expect(union.totals.paidContributionCount).toBe(1);
    expect(union.contributions).toHaveLength(1);
    expect(union.contributions[0]?.authority).toBe("COLLECTION_FACT");
    expect(union.productionOverlapExcludedLegacyIds).toEqual(["check:1:10"]);
  });

  it("CASE 4 checkId equality alone is not overlap", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [1],
        }),
      ],
      facts: [
        production({
          paymentIntentId: "int-1",
          amount: "80.00",
          orderId: 99,
          checkId: 10,
        }),
      ],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(0);
    expect(union.conflicts.some((c) => c.code === "BOTH")).toBe(false);
    expect(union.totals.grossRevenue).toBe("160.00");
    expect(union.totals.legacyGross).toBe("80.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
  });

  it("complimentary Collection Fact is not Gross", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [
        production({
          paymentIntentId: "int-comp",
          amount: "0.00",
          taxAmount: "0.00",
          discountAmount: "25.00",
          tenders: [{ paymentMethod: "other", amount: "0.00" }],
        }),
      ],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.totals.collectionFactGross).toBe("0.00");
    expect(union.totals.complimentaryCount).toBe(1);
    expect(union.totals.complimentaryAmount).toBe("25.00");
    expect(union.totals.taxCollected).toBe("0.00");
  });

  it("CASE 5 13 overlap without checkId when order membership matches", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          taxAmount: "10.43",
          orderIds: [44],
          orderingChannel: null,
        }),
      ],
      facts: [
        production({
          paymentIntentId: "int-1",
          amount: "80.00",
          taxAmount: "10.43",
          checkId: null,
        }),
      ],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(1);
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.legacyGross).toBe("0.00");
    expect(union.totals.paidContributionCount).toBe(1);
  });

  it("CASE 6 same amount different identity is two transactions", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [1],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00", orderId: 2 })],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("160.00");
    expect(union.totals.paidContributionCount).toBe(2);
  });

  it("CASE 7 same identity different amount is UNRESOLVED and not merged", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [44],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "50.00" })],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
    expect(union.productionOverlapCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.totals.paidContributionCount).toBe(0);
  });

  it("CASE 8 two production facts for one sale do not publish twice", () => {
    const union = computeRevenueUnion({
      legacy: [],
      facts: [
        production({ paymentIntentId: "int-a", amount: "80.00" }),
        production({ paymentIntentId: "int-b", amount: "80.00" }),
      ],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "DUPLICATE_FACT")).toBe(true);
    expect(union.totals.collectionFactCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("0.00");
  });

  it("CASE 9 isolated fact cannot suppress published legacy", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "115.00" })],
      facts: [
        production({
          paymentIntentId: "int-1",
          amount: "115.00",
          purpose: "validation",
        }),
      ],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("115.00");
    expect(union.totals.legacyGross).toBe("115.00");
    expect(union.totals.collectionFactCount).toBe(0);
    expect(union.eligibilityRejectedFactCount).toBe(1);
  });

  it("CASE 10 invalid production fact cannot supersede legacy", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "115.00" })],
      facts: [production({ paymentIntentId: "int-bad", amount: "-12.00" })],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
    expect(union.totals.grossRevenue).toBe("115.00");
    expect(union.totals.legacyGross).toBe("115.00");
    expect(union.totals.collectionFactCount).toBe(0);
  });

  it("CASE 11 overlap keeps refund Settlement Record Net semantics", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "100.00",
          orderIds: [44],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "100.00" })],
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
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("100.00");
    expect(union.totals.refundPublishedTotal).toBe("25.00");
    expect(union.totals.netRevenue).toBe("75.00");
    expect(union.totals.refundPublicationCount).toBe(1);
  });

  it("I-3 unrelated legacy sale is not suppressed", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [44],
        }),
        legacy({
          checkId: 11,
          outcome: "paid",
          grandTotal: "20.00",
          orderIds: [99],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("100.00");
    expect(union.totals.legacyGross).toBe("20.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
    expect(union.totals.paidContributionCount).toBe(2);
  });

  it("I-4 I-5 amount or checkId alone cannot prove overlap", () => {
    expect(
      provenEconomicSaleOverlap(
        legacy({ checkId: 10, outcome: "paid", grandTotal: "80.00", orderIds: [] }),
        production({ paymentIntentId: "int-1", amount: "80.00", checkId: 10 })
      )
    ).toBe(false);
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "50.00",
          orderIds: [],
        }),
      ],
      facts: [
        production({ paymentIntentId: "int-1", amount: "50.00", checkId: 10 }),
      ],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("100.00");
  });

  it("I-6 I-10 distinct paymentIntentId values stay distinct; same inputs are deterministic", () => {
    const input = {
      legacy: [] as RevenueUnionLegacyFact[],
      facts: [
        production({ paymentIntentId: "int-a", amount: "10.00", orderId: 1 }),
        production({ paymentIntentId: "int-b", amount: "20.00", orderId: 2 }),
      ],
      eligibility: "published" as const,
    };
    const a = computeRevenueUnion(input);
    const b = computeRevenueUnion(input);
    expect(a.totals.grossRevenue).toBe("30.00");
    expect(a.totals.paidContributionCount).toBe(2);
    expect(a).toEqual(b);
  });

  it("does not treat a multi-order Check mention as proven overlap", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "160.00",
          orderIds: [44, 55],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
    expect(union.productionOverlapCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.totals.paidContributionCount).toBe(0);
  });

  it("I-11 I-12 union computation is side-effect free and does not mutate inputs", () => {
    const legacyRows = [
      legacy({
        checkId: 10,
        outcome: "paid",
        grandTotal: "80.00",
        orderIds: [44],
      }),
    ];
    const facts = [production({ paymentIntentId: "int-1", amount: "80.00" })];
    const legacySnapshot = JSON.stringify(legacyRows);
    const factsSnapshot = JSON.stringify(facts);
    computeRevenueUnion({
      legacy: legacyRows,
      facts,
      eligibility: "published",
    });
    expect(JSON.stringify(legacyRows)).toBe(legacySnapshot);
    expect(JSON.stringify(facts)).toBe(factsSnapshot);
  });

  it("classifier PRODUCTION_OVERLAP is not a second published Gross root", () => {
    expect(
      classifyEconomicTransaction({
        paidLegacyPresent: true,
        eligibleFactPresent: true,
        saleOverlapProven: true,
        productionPublishedEligible: true,
      })
    ).toBe("PRODUCTION_OVERLAP");
  });
});
