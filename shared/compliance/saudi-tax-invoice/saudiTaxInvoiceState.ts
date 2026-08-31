/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
 * Compliance/tax-document state machine — separate from financial PAID.
 */

import type { SaudiTaxInvoiceStatus } from "./saudiTaxInvoiceContract";

const ALLOWED: Readonly<
  Record<SaudiTaxInvoiceStatus, readonly SaudiTaxInvoiceStatus[]>
> = {
  blocked_profile: ["generated", "retryable", "failed"],
  retryable: ["generated", "failed", "blocked_profile"],
  failed: ["retryable"],
  generated: [],
};

export function canTransitionSaudiTaxInvoiceStatus(
  from: SaudiTaxInvoiceStatus,
  to: SaudiTaxInvoiceStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from].includes(to);
}

export function assertSaudiTaxInvoiceStatusTransition(
  from: SaudiTaxInvoiceStatus,
  to: SaudiTaxInvoiceStatus
): void {
  if (!canTransitionSaudiTaxInvoiceStatus(from, to)) {
    throw new Error(
      `Invalid Saudi Tax Invoice status transition: ${from} → ${to}`
    );
  }
}

/** Issued/generated snapshot body is immutable. */
export function isSaudiTaxInvoiceSnapshotImmutable(
  status: SaudiTaxInvoiceStatus
): boolean {
  return status === "generated";
}
