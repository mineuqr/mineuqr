/**
 * SETTLEMENT-ATTRIBUTION-ADOPTION-1 / REFUND-REGISTER-ADOPTION-1
 * Pure helpers for attribution adoption.
 * Copies cash tender facts from settle / refund SR snapshots — never recalculates Check totals.
 * Register remains custody only (ADR-ARCH-028 / 032).
 */

import { addAmounts, fromCents, normalizeAmount, toCents } from "../valueObjects";

export const SETTLEMENT_ATTRIBUTION_ADOPTION_PROGRAM_ID =
  "SETTLEMENT-ATTRIBUTION-ADOPTION-1" as const;

export const REFUND_REGISTER_ADOPTION_PROGRAM_ID =
  "REFUND-REGISTER-ADOPTION-1" as const;

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

function assertContextResolved(input: {
  settlementRecordId: string | null | undefined;
  registerId: string | null | undefined;
  financialShiftId: string | null | undefined;
  operatorUserId: number | null | undefined;
}): { ok: true } | { ok: false; gaps: string[]; reason: string } {
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
  return assertContextResolved(input);
}

/**
 * REFUND-REGISTER-ADOPTION-1 — eligible when published Settlement Record is recordKind=refund
 * and Settlement Context is fully resolved. Never fabricates Register/Shift/operator.
 * Check outcome alone is NOT the refund signal (Check stays paid|complimentary).
 */
export function isRefundAttributionEligible(input: {
  recordKind: string | null | undefined;
  settlementRecordId: string | null | undefined;
  registerId: string | null | undefined;
  financialShiftId: string | null | undefined;
  operatorUserId: number | null | undefined;
}): { ok: true } | { ok: false; gaps: string[]; reason: string } {
  if (input.recordKind !== "refund") {
    return {
      ok: false,
      gaps: ["record_kind_not_refund"],
      reason: "Only Settlement Record recordKind=refund is refund-attributable",
    };
  }
  return assertContextResolved(input);
}

/**
 * Custody fact for refund SR: cash returned decreases Expected Cash (signed negative).
 * Non-cash refund → 0.00. Never invents movement without paymentSnapshot facts.
 */
export function cashCustodyAmountForRefundRecord(input: {
  paymentSnapshot: readonly Readonly<{
    paymentMethod: string;
    amount: string;
  }>[];
}): string {
  const cashOut = sumCashTenderAmounts(input.paymentSnapshot);
  if (toCents(cashOut) === 0) return "0.00";
  return normalizeAmount(fromCents(-toCents(cashOut)));
}
