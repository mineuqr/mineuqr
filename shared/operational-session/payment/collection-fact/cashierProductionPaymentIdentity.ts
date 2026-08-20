/**
 * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1
 * Cashier payment-attempt identity. Not orderId, not idempotencyKey,
 * not collectionFactId. Not a payments table.
 */

import { CollectionFactError } from "./collectionFactErrors";

export const CASHIER_PRODUCTION_ACTOR_TYPE = "staff_user" as const;

export function assertCashierProductionPaymentIdentities(input: {
  paymentIntentId: string;
  idempotencyKey: string;
  orderId: number;
  terminalId: string;
  actorType: string;
  actorUserId: number;
}): void {
  const paymentIntentId = input.paymentIntentId.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  const terminalId = input.terminalId.trim();
  const actorType = input.actorType.trim();
  if (!paymentIntentId || paymentIntentId.length > 128) {
    throw new CollectionFactError("VALIDATION", "paymentIntentId is required");
  }
  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw new CollectionFactError("VALIDATION", "idempotencyKey is required");
  }
  if (!terminalId || terminalId.length > 128) {
    throw new CollectionFactError("VALIDATION", "terminalId is required");
  }
  if (!actorType || actorType.length > 64) {
    throw new CollectionFactError("VALIDATION", "actorType is required");
  }
  if (!Number.isInteger(input.actorUserId) || input.actorUserId <= 0) {
    throw new CollectionFactError(
      "VALIDATION",
      "production Collection Fact requires actor identity"
    );
  }
  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    throw new CollectionFactError("VALIDATION", "orderId is required");
  }
  if (paymentIntentId === String(input.orderId)) {
    throw new CollectionFactError(
      "VALIDATION",
      "paymentIntentId must not equal orderId"
    );
  }
  if (paymentIntentId === idempotencyKey) {
    throw new CollectionFactError(
      "VALIDATION",
      "paymentIntentId must not equal idempotencyKey"
    );
  }
  if (paymentIntentId.startsWith("pcf_")) {
    throw new CollectionFactError(
      "VALIDATION",
      "paymentIntentId must not be a collectionFactId"
    );
  }
}
