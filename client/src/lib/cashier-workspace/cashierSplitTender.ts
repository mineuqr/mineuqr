/**
 * Cashier presentation-only split tender math.
 * Does not persist amounts. Settlement lines are forwarded to Check.
 * Over-tender/change is cash presentation only — settlement still equals grandTotal.
 */

import type { SelectablePaymentMethod } from "@shared/operational-session";

export type CashierSettlementLine = {
  paymentMethod: SelectablePaymentMethod;
  amount?: string;
};

function toCents(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const frac = (match[2] ?? "").padEnd(2, "0");
  if (!Number.isSafeInteger(whole)) return null;
  return whole * 100 + Number(frac);
}

function fromCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

export type CashierTenderDraft = {
  cashTender: string;
  cardTender: string;
  amountDue: string;
};

export type CashierSettlementPlan = {
  paymentMethod: SelectablePaymentMethod;
  settlements: readonly CashierSettlementLine[];
  appliedCents: number;
  remainingCents: number;
  changeCents: number;
  totalEnteredCents: number;
};

function parseTenderCents(value: string): number {
  const trimmed = value.trim();
  if (trimmed.length === 0) return 0;
  return toCents(trimmed) ?? -1;
}

export function resolveCashierSettlementPlan(
  draft: CashierTenderDraft
): CashierSettlementPlan | null {
  const dueCents = toCents(draft.amountDue);
  if (dueCents == null || dueCents <= 0) return null;
  const cashCents = parseTenderCents(draft.cashTender);
  const cardCents = parseTenderCents(draft.cardTender);
  if (cashCents < 0 || cardCents < 0) return null;
  if (cashCents === 0 && cardCents === 0) return null;

  if (cardCents === 0) {
    if (cashCents < dueCents) {
      return {
        paymentMethod: "cash",
        settlements: [{ paymentMethod: "cash" }],
        appliedCents: cashCents,
        remainingCents: dueCents - cashCents,
        changeCents: 0,
        totalEnteredCents: cashCents,
      };
    }
    return {
      paymentMethod: "cash",
      settlements: [{ paymentMethod: "cash" }],
      appliedCents: dueCents,
      remainingCents: 0,
      changeCents: cashCents - dueCents,
      totalEnteredCents: cashCents,
    };
  }

  if (cashCents === 0) {
    return {
      paymentMethod: "card",
      settlements: [{ paymentMethod: "card" }],
      appliedCents: cardCents,
      remainingCents: Math.max(0, dueCents - cardCents),
      changeCents: 0,
      totalEnteredCents: cardCents,
    };
  }

  return {
    paymentMethod: "cash",
    settlements: [
      { paymentMethod: "cash", amount: fromCents(cashCents) },
      { paymentMethod: "card", amount: fromCents(cardCents) },
    ],
    appliedCents: cashCents + cardCents,
    remainingCents: Math.max(0, dueCents - cashCents - cardCents),
    changeCents: 0,
    totalEnteredCents: cashCents + cardCents,
  };
}

export function canConfirmCashierSettlement(
  draft: CashierTenderDraft
): boolean {
  const plan = resolveCashierSettlementPlan(draft);
  if (!plan || plan.remainingCents !== 0) return false;
  if (plan.settlements.length > 1) {
    const dueCents = toCents(draft.amountDue);
    return dueCents != null && plan.appliedCents === dueCents;
  }
  if (plan.paymentMethod === "card") {
    const dueCents = toCents(draft.amountDue);
    return dueCents != null && plan.appliedCents === dueCents;
  }
  return true;
}

export function displayCents(cents: number): string {
  return fromCents(cents);
}
