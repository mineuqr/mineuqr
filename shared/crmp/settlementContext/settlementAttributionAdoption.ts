/**
 * SETTLEMENT-ATTRIBUTION-ADOPTION-1 — pure helpers for attribution adoption.
 * Copies cash tender facts from settle lines / SR snapshot — never recalculates Check totals.
 */

import { addAmounts, normalizeAmount } from "../valueObjects";

export const SETTLEMENT_ATTRIBUTION_ADOPTION_PROGRAM_ID =
  "SETTLEMENT-ATTRIBUTION-ADOPTION-1" as const;

export const SETTLEMENT_ATTRIBUTION_OUTCOMES = [
  "created",
  "already_applied",
  "skipped",
  "failed",
] as const;

export type SettlementAttributionOutcome =
  (typeof SETTLEMENT_ATTRIBUTION_OUTCOMES)[number];

export type SettlementAttributionAdoptionResult = Readonly<{
  outcome: SettlementAttributionOutcome;
  attributionId: string | null;
  settlementRecordId: string | null;
  registerId: string | null;
  financialShiftId: string | null;
  operatorUserId: number | null;
  cashTenderAmount: string | null;
  gaps: readonly string[];
  reason: string | null;
}>;

export function skippedAttribution(input: {
  gaps: readonly string[];
  reason: string;
  settlementRecordId?: string | null;
}): SettlementAttributionAdoptionResult {
  return {
    outcome: "skipped",
    attributionId: null,
    settlementRecordId: input.settlementRecordId ?? null,
    registerId: null,
    financialShiftId: null,
    operatorUserId: null,
    cashTenderAmount: null,
    gaps: [...input.gaps],
    reason: input.reason,
  };
}

export function failedAttribution(input: {
  gaps: readonly string[];
  reason: string;
  settlementRecordId?: string | null;
}): SettlementAttributionAdoptionResult {
  return {
    outcome: "failed",
    attributionId: null,
    settlementRecordId: input.settlementRecordId ?? null,
    registerId: null,
    financialShiftId: null,
    operatorUserId: null,
    cashTenderAmount: null,
    gaps: [...input.gaps],
    reason: input.reason,
  };
}

/** Sum amounts where paymentMethod === cash — custody fact copy only. */
export function sumCashTenderAmounts(
  lines: readonly Readonly<{ paymentMethod: string; amount: string }>[]
): string {
  const cash = lines
    .filter((l) => l.paymentMethod === "cash")
    .map((l) => normalizeAmount(l.amount));
  if (cash.length === 0) return "0.00";
  return addAmounts(...cash);
}

/**
 * Eligible when terminal paid/complimentary publish path and context is fully resolved.
 * Never fabricates missing Register/Shift/operator.
 */
export function isAttributionEligible(input: {
  outcome: string;
  settlementRecordId: string | null | undefined;
  registerId: string | null | undefined;
  financialShiftId: string | null | undefined;
  operatorUserId: number | null | undefined;
}): { ok: true } | { ok: false; gaps: string[]; reason: string } {
  if (input.outcome !== "paid" && input.outcome !== "complimentary") {
    return {
      ok: false,
      gaps: ["outcome_not_attributable"],
      reason: "Only paid/complimentary settlements are attributed",
    };
  }
  if (!input.settlementRecordId?.trim()) {
    return {
      ok: false,
      gaps: ["settlement_record_missing"],
      reason: "Settlement Record id required for Attribution",
    };
  }
  const gaps: string[] = [];
  if (!input.registerId?.trim()) gaps.push("register_unavailable");
  if (!input.financialShiftId?.trim()) gaps.push("financial_shift_unavailable");
  if (input.operatorUserId == null || input.operatorUserId <= 0) {
    gaps.push("operator_unavailable");
  }
  if (gaps.length > 0) {
    return {
      ok: false,
      gaps,
      reason: "Settlement Context incomplete — fail-open skip",
    };
  }
  return { ok: true };
}
