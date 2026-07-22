/**
 * CHECK-SETTLEMENT-METHODS-1 — Settlement Transaction contracts.
 *
 * Check remains the aggregate root.
 * Settlement transactions are owned lines under a Check — not a separate aggregate.
 * Revenue SSOT remains Check.grandTotal where outcome = paid.
 */

import type { PaymentMethod } from "./paymentMethod";

export const SETTLEMENT_TRANSACTION_STATUSES = [
  "captured",
  "pending",
  "voided",
  "refunded",
] as const;

export type SettlementTransactionStatus =
  (typeof SETTLEMENT_TRANSACTION_STATUSES)[number];

export function isSettlementTransactionStatus(
  value: string
): value is SettlementTransactionStatus {
  return (SETTLEMENT_TRANSACTION_STATUSES as readonly string[]).includes(value);
}

export function assertSettlementTransactionStatus(
  value: string
): SettlementTransactionStatus {
  if (!isSettlementTransactionStatus(value)) {
    throw new Error(`Invalid settlement transaction status: ${value}`);
  }
  return value;
}

/**
 * Canonical settlement transaction (persistence: check_settlement_transactions).
 */
export type SettlementTransaction = Readonly<{
  id: number;
  restaurantId: number;
  checkId: number;
  /** Copied from Check at settle; null when Check is sessionless. */
  sessionId: number | null;
  paymentMethod: PaymentMethod;
  /** Decimal string, same money scale as Check.grandTotal. */
  amount: string;
  currencyCode: string;
  status: SettlementTransactionStatus;
  /** Business wall / stored UTC instant at capture (Check settledAt for atomic settle). */
  businessTimestamp: string;
  reference: string | null;
  externalReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}>;

/** Input line for an atomic Check settle (id assigned on persist). */
export type SettlementTransactionInput = Readonly<{
  paymentMethod: PaymentMethod;
  amount: string;
  reference?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  /** Defaults to `captured` on settle. */
  status?: SettlementTransactionStatus;
}>;
