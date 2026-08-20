/**
 * REVENUE-UNION-ADOPTION-1 — dual-run comparison (not a second published authority).
 */

import { parseReportingAmount } from "../reportingMoney";
import type { RevenueUnionResult } from "./revenueUnionContract";

export type RevenueUnionMismatch = Readonly<{
  field: string;
  expected: string;
  actual: string;
}>;

export function compareLegacyToUnion(input: {
  legacyGross: string;
  legacyTax: string;
  legacyPaidCount: number;
  union: RevenueUnionResult;
}): readonly RevenueUnionMismatch[] {
  const mismatches: RevenueUnionMismatch[] = [];
  const push = (field: string, expected: string, actual: string) => {
    if (expected !== actual) mismatches.push({ field, expected, actual });
  };
  push("legacyGross", input.legacyGross, input.union.totals.legacyGross);
  if (
    input.union.eligibility === "none" ||
    input.union.eligibility === "published" ||
    input.union.totals.collectionFactCount === 0
  ) {
    push("grossRevenue", input.legacyGross, input.union.totals.grossRevenue);
    push("taxCollected", input.legacyTax, input.union.totals.taxCollected);
    if (input.legacyPaidCount !== input.union.totals.paidContributionCount) {
      mismatches.push({
        field: "paidContributionCount",
        expected: String(input.legacyPaidCount),
        actual: String(input.union.totals.paidContributionCount),
      });
    }
  }
  if (input.union.conflicts.some((c) => c.code === "BOTH")) {
    mismatches.push({
      field: "authority",
      expected: "ONE",
      actual: "BOTH",
    });
  }
  return mismatches;
}

export function compareFactToContribution(input: {
  factAmount: string;
  factTax: string;
  factCurrency: string;
  factBusinessDay: string;
  contributionAmount: string;
  contributionTax: string;
  contributionCurrency: string;
  contributionBusinessDay: string | null;
}): readonly RevenueUnionMismatch[] {
  const pairs: Array<[string, string, string]> = [
    ["amount", input.factAmount, input.contributionAmount],
    ["tax", input.factTax, input.contributionTax],
    ["currency", input.factCurrency, input.contributionCurrency],
    ["businessDay", input.factBusinessDay, input.contributionBusinessDay ?? ""],
  ];
  return pairs
    .filter(([, expected, actual]) => expected !== actual)
    .map(([field, expected, actual]) => ({ field, expected, actual }));
}

export function moneyEquals(a: string, b: string): boolean {
  return parseReportingAmount(a) === parseReportingAmount(b);
}
