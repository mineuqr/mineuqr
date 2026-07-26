/**
 * REFUND-PRESENTATION-ADOPTION-1 — Settlement History status facet → API filters.
 * Presentation mapping only — no financial logic.
 */

export type SettlementHistoryStatusFacet =
  | "all"
  | "paid"
  | "refunded"
  | "complimentary"
  | "voided";

export type SettlementHistoryApiFilters = Readonly<{
  outcome: "paid" | "complimentary" | "voided" | null;
  recordKind: "settlement" | "refund" | "void" | "reversal" | "correction" | null;
}>;

/**
 * Map operator-facing status facet to Settlement Record list filters.
 * Refunded is recordKind=refund (outcome often remains paid on compensating docs).
 */
export function settlementHistoryFiltersForStatusFacet(
  facet: SettlementHistoryStatusFacet
): SettlementHistoryApiFilters {
  switch (facet) {
    case "paid":
      return { outcome: "paid", recordKind: "settlement" };
    case "refunded":
      return { outcome: null, recordKind: "refund" };
    case "complimentary":
      return { outcome: "complimentary", recordKind: null };
    case "voided":
      return { outcome: "voided", recordKind: null };
    case "all":
    default:
      return { outcome: null, recordKind: null };
  }
}
