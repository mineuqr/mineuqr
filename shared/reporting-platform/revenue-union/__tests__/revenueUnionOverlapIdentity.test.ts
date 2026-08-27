/**
 * SR-OVERLAP-IDENTITY-HARDENING-1 — identity proof cases.
 * Read-only Union resolution. Does not write Confirm, CF, PAID, refunds, or SR.
 */
import { describe, expect, it } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import {
  computeRevenueUnion,
  provenEconomicSaleOverlap,
  resolveLegacyOrderIdsForOverlap,
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

describe("SR-OVERLAP-IDENTITY-HARDENING-1", () => {
  it("recovers only a singleton membership orderId when frozen orderRefs are empty", () => {
    expect(
      resolveLegacyOrderIdsForOverlap({
        frozenOrderIds: [44],
        membershipOrderIds: [99],
      })
    ).toEqual([44]);
    expect(
      resolveLegacyOrderIdsForOverlap({
        frozenOrderIds: [],
        membershipOrderIds: [44],
      })
    ).toEqual([44]);
    expect(
      resolveLegacyOrderIdsForOverlap({
        frozenOrderIds: [],
        membershipOrderIds: [44, 55],
      })
    ).toEqual([]);
    expect(
      resolveLegacyOrderIdsForOverlap({
        frozenOrderIds: [],
        membershipOrderIds: [],
      })
    ).toEqual([]);
  });

  it("1 matching CF + SR by authoritative order identity excludes SR", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "80.00" })],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(1);
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.legacyGross).toBe("0.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
    expect(union.totals.paidContributionCount).toBe(1);
  });

  it("2 matching CF + SR through proven singleton Check membership excludes SR", () => {
    const orderIds = resolveLegacyOrderIdsForOverlap({
      frozenOrderIds: [],
      membershipOrderIds: [44],
    });
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds,
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(1);
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.paidContributionCount).toBe(1);
  });

  it("3 matching checkId without proven economic uniqueness fails closed", () => {
    expect(
      provenEconomicSaleOverlap(
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [],
        }),
        production({
          paymentIntentId: "int-1",
          amount: "80.00",
          checkId: 10,
        })
      )
    ).toBe(false);
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [],
        }),
      ],
      facts: [
        production({ paymentIntentId: "int-1", amount: "80.00", checkId: 10 }),
      ],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(0);
    expect(union.totals.grossRevenue).toBe("160.00");
  });

  it("4 empty SR orderRefs with no other proof retains SR", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds: [],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.productionOverlapCount).toBe(0);
    expect(union.totals.legacyGross).toBe("80.00");
    expect(union.totals.collectionFactGross).toBe("80.00");
  });

  it("5 wrong restaurant does not overlap", () => {
    expect(
      provenEconomicSaleOverlap(
        legacy({ checkId: 10, outcome: "paid", grandTotal: "80.00" }),
        production({
          paymentIntentId: "int-1",
          amount: "80.00",
          restaurantId: 2,
        })
      )
    ).toBe(false);
  });

  it("6 isolated CF does not exclude an unrelated SR", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
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
  });

  it("7 legacy SR-only is retained", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "50.00" })],
      facts: [],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("50.00");
    expect(union.contributions[0]?.authority).toBe("LEGACY_CHECK");
  });

  it("8 refund publications are not sale overlap (refunds stay on refund channel)", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "80.00" })],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      refunds: [
        {
          restaurantId: 1,
          checkId: 10,
          settlementRecordId: "sr-refund-10",
          grandTotal: "10.00",
          settledAt: "2026-08-20 13:00:00",
          businessDay: "2026-08-20",
        },
      ],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("80.00");
    expect(union.totals.refundPublishedTotal).toBe("10.00");
    expect(union.totals.netRevenue).toBe("70.00");
    expect(union.totals.refundPublicationCount).toBe(1);
  });

  it("9 complimentary CF overlapping a complimentary SR is not Gross", () => {
    const union = computeRevenueUnion({
      legacy: [
        legacy({
          checkId: 10,
          outcome: "complimentary",
          grandTotal: "0.00",
        }),
      ],
      facts: [
        production({
          paymentIntentId: "int-1",
          amount: "0.00",
          discountAmount: "40.00",
        }),
      ],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.totals.collectionFactGross).toBe("0.00");
    expect(union.totals.complimentaryCount).toBe(1);
  });

  it("10 multiple CF candidates for one sale fail closed", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "80.00" })],
      facts: [
        production({ paymentIntentId: "int-a", amount: "80.00" }),
        production({ paymentIntentId: "int-b", amount: "80.00" }),
      ],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("0.00");
    expect(union.conflicts.some((c) => c.code === "DUPLICATE_FACT")).toBe(true);
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
  });

  it("11 multiple SR orderIds mentioning the CF fail closed", () => {
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
    expect(union.productionOverlapCount).toBe(0);
    expect(union.conflicts.some((c) => c.code === "UNRESOLVED")).toBe(true);
    expect(union.totals.grossRevenue).toBe("0.00");
  });

  it("12 proven CF + SR overlap yields exactly one Gross contribution", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "80.00" })],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.contributions.filter((c) => c.outcome === "paid")).toHaveLength(
      1
    );
    expect(union.contributions[0]?.authority).toBe("COLLECTION_FACT");
  });

  it("13 no CF keeps the legacy SR", () => {
    const union = computeRevenueUnion({
      legacy: [legacy({ checkId: 10, outcome: "paid", grandTotal: "25.00" })],
      facts: [],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("25.00");
    expect(union.totals.legacyGross).toBe("25.00");
  });

  it("14 historical SR with a different order remains when CF occupies another sale", () => {
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
          grandTotal: "15.00",
          orderIds: [99],
        }),
      ],
      facts: [production({ paymentIntentId: "int-1", amount: "80.00" })],
      eligibility: "published",
    });
    expect(union.totals.grossRevenue).toBe("95.00");
    expect(union.totals.legacyGross).toBe("15.00");
  });

  it("15 multi-order membership recovery does not invent overlap", () => {
    const orderIds = resolveLegacyOrderIdsForOverlap({
      frozenOrderIds: [],
      membershipOrderIds: [44, 55],
    });
    expect(orderIds).toEqual([]);
    expect(
      provenEconomicSaleOverlap(
        legacy({
          checkId: 10,
          outcome: "paid",
          grandTotal: "80.00",
          orderIds,
        }),
        production({ paymentIntentId: "int-1", amount: "80.00", checkId: 10 })
      )
    ).toBe(false);
  });
});
