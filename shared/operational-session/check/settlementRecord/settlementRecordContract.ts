/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — Settlement Record contracts.
 *
 * Immutable Canonical Financial Document produced by the Check Aggregate.
 * NOT an Aggregate Root. NOT a monetary authority. NOT a calculator.
 * Pure domain types only — no persistence / ORM / API concerns.
 */

import type {
  CheckTerminalOutcome,
  CurrencySnapshot,
  TaxBreakdown,
  TaxPolicySnapshot,
} from "../checkContract";
import type { PaymentMethod } from "../paymentMethod";
import type { SettlementTransactionStatus } from "../settlementTransactionContract";

export const SETTLEMENT_RECORD_PROGRAM_ID =
  "SETTLEMENT-RECORD-IMPLEMENTATION-1" as const;
export const SETTLEMENT_RECORD_ADR_ID = "ADR-ARCH-026" as const;

/** Document shape version — versions structure, never mutates money. */
export const SETTLEMENT_RECORD_SCHEMA_VERSION = 1 as const;

/**
 * Settlement document producer (Check Aggregate as publisher).
 * Not Financial Core. Not Invoice / CF / PAID identity.
 */
export const SETTLEMENT_RECORD_PRODUCER = "check_aggregate" as const;

export const SETTLEMENT_RECORD_KINDS = [
  "settlement",
  "refund",
  "void",
  "reversal",
  "correction",
] as const;

export type SettlementRecordKind = (typeof SETTLEMENT_RECORD_KINDS)[number];

/** Opaque stable document identity — independent from DB surrogate. */
export type SettlementRecordId = string;

/**
 * Settlement document correlation key (`fin:check:{checkId}:gen:{n}`).
 * Not Invoice serial, Collection Fact id, PAID identity, or payable identity.
 */
export type SettlementFinancialReference = string;

/**
 * Copied tender fact — never recalculated.
 * Source: SettlementTransaction lines at Check finalize.
 */
export type SettlementPaymentSnapshotLine = Readonly<{
  settlementTransactionId: number | null;
  paymentMethod: PaymentMethod | string;
  amount: string;
  currencyCode: string;
  status: SettlementTransactionStatus | string;
  businessTimestamp: string;
  reference: string | null;
  externalReference: string | null;
}>;

/** Enrolled Order identity reference at finalize (Membership / OS). */
export type SettlementOrderRef = Readonly<{
  orderId: number;
}>;

/** Optional Order Settlement identity reference at finalize. */
export type SettlementOrderSettlementRef = Readonly<{
  orderId: number;
  checkId: number;
  status: string;
}>;

/**
 * Settlement Record — Immutable Financial Document / Published Financial Fact.
 *
 * All money fields are opaque decimal strings copied from the finalized Check
 * snapshot. Domain MUST NEVER calculate subtotal, discount, tax, grand total,
 * FX, or service charges (SR-INV-01).
 */
export type SettlementRecord = Readonly<{
  settlementRecordId: SettlementRecordId;
  restaurantId: number;
  recordKind: SettlementRecordKind;
  schemaVersion: typeof SETTLEMENT_RECORD_SCHEMA_VERSION | number;
  /** Monotonic generation for Check settle / correction chain (SR-INV-05). */
  recordGeneration: number;
  checkId: number;
  /** Optional Session correlation — never Business Owner of this document. */
  sessionId: number | null;
  financialReference: SettlementFinancialReference | null;
  priorSettlementRecordId: SettlementRecordId | null;
  orderRefs: readonly SettlementOrderRef[];
  orderSettlementRefs: readonly SettlementOrderSettlementRef[];
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  outcome: CheckTerminalOutcome;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  taxBreakdown: TaxBreakdown;
  paymentSnapshot: readonly SettlementPaymentSnapshotLine[];
  /** Frozen business-day key at finalize — never recomputed from live settings. */
  businessDay: string;
  settledAt: string | null;
  createdAt: string;
  createdByActorType: string | null;
  createdByActorId: string | null;
  producer: typeof SETTLEMENT_RECORD_PRODUCER | string;
}>;

/** Identity value object for uniqueness (SR-INV-05 / SR-INV-07). */
export type SettlementRecordIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
}>;

export function isSettlementRecordKind(
  value: string
): value is SettlementRecordKind {
  return (SETTLEMENT_RECORD_KINDS as readonly string[]).includes(value);
}

export function assertSettlementRecordKind(
  value: string
): SettlementRecordKind {
  if (!isSettlementRecordKind(value)) {
    throw new Error(`Invalid SettlementRecordKind: ${value}`);
  }
  return value;
}
