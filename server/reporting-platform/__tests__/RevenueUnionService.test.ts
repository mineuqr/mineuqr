/**
 * REVENUE-UNION-ADOPTION-1 — service mapping + published vs shadow eligibility.
 */
import { describe, expect, it } from "vitest";
import {
  computeShadowRevenueUnion,
  toRevenueUnionLegacyFact,
} from "../revenue-union/RevenueUnionService";
import type { CheckReportingRow } from "../checkReportingRepository";

function check(partial: Partial<CheckReportingRow> & Pick<CheckReportingRow, "id" | "outcome" | "grandTotal">): CheckReportingRow {
  return {
    restaurantId: 1,
    sessionId: null,
    taxAmount: "0.00",
    settledAt: "2026-08-20 12:00:00",
    voidedAt: null,
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: false,
      mode: "exclusive",
      components: [],
    },
    ...partial,
  };
}

describe("RevenueUnionService", () => {
  it("maps published Check rows and ignores facts when eligibility is none", () => {
    const legacy = [
      toRevenueUnionLegacyFact(check({ id: 5, outcome: "paid", grandTotal: "12.00" }), {
        businessDay: "2026-08-20",
      }),
    ];
    const published = computeShadowRevenueUnion({
      legacy,
      facts: [
        {
          collectionFactId: "pcf-x",
          restaurantId: 1,
          orderId: 9,
          paymentIntentId: "int-x",
          orderingChannel: "cashier_pos",
          purpose: "validation",
          amount: "99.00",
          taxAmount: "0.00",
          discountAmount: "0.00",
          currencyCode: "SAR",
          currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
          taxPolicySnapshot: {
            version: 1,
            enabled: false,
            mode: "exclusive",
            components: [],
          },
          tenders: [{ paymentMethod: "cash", amount: "99.00" }],
          checkId: null,
          businessDay: "2026-08-20",
          committedAt: "2026-08-20T12:00:00.000Z",
        },
      ],
      eligibility: "none",
    });
    expect(published.totals.grossRevenue).toBe("12.00");
    expect(published.totals.collectionFactCount).toBe(0);
  });

  it("maps published eligibility the same as none for isolated facts", () => {
    const legacy = [
      toRevenueUnionLegacyFact(check({ id: 5, outcome: "paid", grandTotal: "12.00" }), {
        businessDay: "2026-08-20",
      }),
    ];
    const published = computeShadowRevenueUnion({
      legacy,
      facts: [
        {
          collectionFactId: "pcf-x",
          restaurantId: 1,
          orderId: 9,
          paymentIntentId: "int-x",
          orderingChannel: "cashier_pos",
          purpose: "validation",
          amount: "99.00",
          taxAmount: "0.00",
          discountAmount: "0.00",
          currencyCode: "SAR",
          currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
          taxPolicySnapshot: {
            version: 1,
            enabled: false,
            mode: "exclusive",
            components: [],
          },
          tenders: [{ paymentMethod: "cash", amount: "99.00" }],
          checkId: null,
          businessDay: "2026-08-20",
          committedAt: "2026-08-20T12:00:00.000Z",
        },
      ],
      eligibility: "published",
    });
    expect(published.totals.grossRevenue).toBe("12.00");
    expect(published.totals.collectionFactCount).toBe(0);
    expect(published.eligibilityRejectedFactCount).toBe(1);
  });
});
