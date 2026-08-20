/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1
 * Canonical fingerprint payload for Collection Fact idempotency (ADR-021 / I-COL-01).
 */

import type { CommitCollectionFactCommand } from "./collectionFactContract";

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

export function collectionFactFingerprintPayload(
  command: CommitCollectionFactCommand
): string {
  return canonicalJson({
    restaurantId: command.restaurantId,
    orderId: command.orderId,
    paymentIntentId: command.paymentIntentId.trim(),
    orderingChannel: command.orderingChannel,
    purpose: command.purpose,
    subtotal: command.subtotal,
    discountAmount: command.discountAmount,
    taxAmount: command.taxAmount,
    amount: command.amount,
    currencyCode: command.currencyCode,
    currencySnapshot: command.currencySnapshot,
    taxPolicySnapshot: command.taxPolicySnapshot,
    taxBreakdown: command.taxBreakdown,
    composition: [...command.composition].sort(
      (a, b) => a.sequence - b.sequence
    ),
    tenders: [...command.tenders].sort((a, b) => {
      const method = a.paymentMethod.localeCompare(b.paymentMethod);
      return method !== 0 ? method : a.amount.localeCompare(b.amount);
    }),
    businessDay: command.businessDay,
    checkId: command.checkId ?? null,
  });
}
