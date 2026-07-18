/**
 * CHECK-SETTLEMENT-METHODS-1 — settlement / split-payment invariants.
 *
 * Pure validation — no persistence, no gateway logic.
 */

import {
  DEFAULT_PAID_PAYMENT_METHOD,
  type PaymentMethod,
} from "./paymentMethod";
import type { SettlementTransactionInput } from "./settlementTransactionContract";

export class SettlementValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettlementValidationError";
  }
}

function parseAmount(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new SettlementValidationError(`Invalid settlement amount: ${value}`);
  }
  return Math.round(n * 100) / 100;
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

/**
 * Validate split (or single) tender lines for a paid Check settle.
 * Sum of amounts must equal Check grandTotal (2-decimal money).
 */
export function assertPaidSettlementLines(
  grandTotal: string,
  lines: readonly SettlementTransactionInput[]
): readonly SettlementTransactionInput[] {
  if (lines.length === 0) {
    throw new SettlementValidationError(
      "Paid settlement requires at least one settlement transaction"
    );
  }

  let sum = 0;
  for (const line of lines) {
    if (line.paymentMethod === "complimentary") {
      throw new SettlementValidationError(
        "Complimentary payment method is not valid on a paid Check"
      );
    }
    const amount = parseAmount(line.amount);
    if (amount <= 0) {
      throw new SettlementValidationError(
        "Settlement transaction amount must be positive"
      );
    }
    sum += amount;
  }

  const expected = parseAmount(grandTotal);
  if (Math.abs(sum - expected) > 0.001) {
    throw new SettlementValidationError(
      `Settlement transactions sum ${formatAmount(sum)} must equal Check grandTotal ${formatAmount(expected)}`
    );
  }

  return lines;
}

/** Single complimentary tender covering the Check grandTotal. */
export function complimentarySettlementLine(
  grandTotal: string
): SettlementTransactionInput {
  return {
    paymentMethod: "complimentary",
    amount: formatAmount(parseAmount(grandTotal)),
    status: "captured",
  };
}

/**
 * Default paid tender when UI/API omits methods — full grandTotal as `other`.
 * Preserves existing markPaid behavior.
 */
export function defaultPaidSettlementLine(
  grandTotal: string,
  paymentMethod: PaymentMethod = DEFAULT_PAID_PAYMENT_METHOD
): SettlementTransactionInput {
  if (paymentMethod === "complimentary") {
    throw new SettlementValidationError(
      "Default paid settlement cannot use complimentary method"
    );
  }
  return {
    paymentMethod,
    amount: formatAmount(parseAmount(grandTotal)),
    status: "captured",
  };
}

/**
 * Future partial-settlement helper (architecture only).
 * Returns whether captured tenders fully cover the Check.
 * Current product settles atomically — Check stays open until full cover.
 */
export function isCheckFullyCoveredBySettlements(
  grandTotal: string,
  capturedAmounts: readonly string[]
): boolean {
  let sum = 0;
  for (const a of capturedAmounts) {
    sum += parseAmount(a);
  }
  return Math.abs(sum - parseAmount(grandTotal)) <= 0.001;
}
