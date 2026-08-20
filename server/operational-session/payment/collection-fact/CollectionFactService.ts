/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 / ADR-ARCH-039
 * Server-side Collection Fact writer. Insert-only. Idempotent. Tenant-scoped.
 *
 * NOT connected to Cashier Confirm, PAID, Revenue, or Settlement.
 * Callers must supply a store. Production payment paths must not call this.
 * Production purpose additionally enforces PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1.
 */

import { createHash, randomUUID } from "node:crypto";
import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import {
  assertCollectionFactCommitContext,
  assertCommitCollectionFactCommand,
  assertFingerprintsMatch,
  assertSameIntentIdentity,
  buildCollectionFactId,
  collectionFactFingerprintPayload,
  collectionFactKind,
  collectionFactSchemaVersion,
  CollectionFactError,
  PAYMENT_COLLECTION_FACT_PROGRAM_ID,
  assertProductionCollectionFactCommit,
  isCollectionFactProductionPurpose,
  type CollectionFact,
  type CollectionFactCommitContext,
  type CommitCollectionFactCommand,
  type CommitCollectionFactResult,
} from "@shared/operational-session/payment/collection-fact";
import { freezeCollectionFact } from "./collectionFactImmutability";
import type { CollectionFactStore } from "./collectionFactStore";

function hashFingerprint(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function logCollectionFact(event: {
  type: string;
  severity: "info" | "warn" | "error";
  restaurantId: number;
  action: string;
  metadata: Record<string, unknown>;
}): void {
  opsLog({
    type: event.type,
    category: "PAYMENT",
    severity: event.severity,
    ts: nowIso(),
    restaurantId: event.restaurantId,
    action: event.action,
    metadata: {
      program: PAYMENT_COLLECTION_FACT_PROGRAM_ID,
      ...event.metadata,
    },
  });
}

function replayOrConflict(
  existing: CollectionFact,
  command: CommitCollectionFactCommand,
  fingerprint: string
): CollectionFact {
  assertFingerprintsMatch(existing.fingerprint, fingerprint);
  assertSameIntentIdentity(existing, command);
  return existing;
}

export async function commitCollectionFact(
  input: {
    context: CollectionFactCommitContext;
    command: CommitCollectionFactCommand;
  },
  store: CollectionFactStore
): Promise<CommitCollectionFactResult> {
  const { context, command } = input;
  logCollectionFact({
    type: OPS_EVENT.payment_collection_fact_commit_attempt,
    severity: "info",
    restaurantId: command.restaurantId,
    action: "payment.collection_fact.commit_attempt",
    metadata: {
      purpose: command.purpose,
      orderingChannel: command.orderingChannel,
    },
  });

  try {
    assertCollectionFactCommitContext(context, command);
    assertCommitCollectionFactCommand(command);
    if (isCollectionFactProductionPurpose(command.purpose)) {
      assertProductionCollectionFactCommit({ context, command });
    }
  } catch (error) {
    const code =
      error instanceof CollectionFactError ? error.code : "VALIDATION";
    logCollectionFact({
      type:
        code === "UNAUTHORIZED" || code === "TENANT"
          ? OPS_EVENT.payment_collection_fact_authorization_failed
          : OPS_EVENT.payment_collection_fact_validation_failed,
      severity: "warn",
      restaurantId: command.restaurantId,
      action: "payment.collection_fact.commit_rejected",
      metadata: { code },
    });
    throw error;
  }

  const fingerprint = hashFingerprint(collectionFactFingerprintPayload(command));
  const idempotencyKey = command.idempotencyKey.trim();
  const paymentIntentId = command.paymentIntentId.trim();

  const existingByKey = await store.findByIdempotency({
    restaurantId: command.restaurantId,
    idempotencyKey,
  });
  if (existingByKey) {
    const fact = replayOrConflict(existingByKey, command, fingerprint);
    logCollectionFact({
      type: OPS_EVENT.payment_collection_fact_replayed,
      severity: "info",
      restaurantId: command.restaurantId,
      action: "payment.collection_fact.replayed",
      metadata: { collectionFactId: fact.collectionFactId },
    });
    return { outcome: "replayed", fact };
  }

  const existingByIntent = await store.findByPaymentIntent({
    restaurantId: command.restaurantId,
    paymentIntentId,
  });
  if (existingByIntent) {
    if (existingByIntent.idempotencyKey === idempotencyKey) {
      const fact = replayOrConflict(existingByIntent, command, fingerprint);
      logCollectionFact({
        type: OPS_EVENT.payment_collection_fact_replayed,
        severity: "info",
        restaurantId: command.restaurantId,
        action: "payment.collection_fact.replayed",
        metadata: { collectionFactId: fact.collectionFactId },
      });
      return { outcome: "replayed", fact };
    }
    logCollectionFact({
      type: OPS_EVENT.payment_collection_fact_duplicate_prevented,
      severity: "warn",
      restaurantId: command.restaurantId,
      action: "payment.collection_fact.duplicate_prevented",
      metadata: { collectionFactId: existingByIntent.collectionFactId },
    });
    throw new CollectionFactError(
      "CONFLICT",
      "Payment intent already has a Collection Fact"
    );
  }

  const committedAt = command.committedAt ?? nowIso();
  const fact: CollectionFact = {
    collectionFactId: buildCollectionFactId(randomUUID()),
    restaurantId: command.restaurantId,
    orderId: command.orderId,
    paymentIntentId,
    orderingChannel: command.orderingChannel,
    kind: collectionFactKind(),
    purpose: command.purpose,
    schemaVersion: collectionFactSchemaVersion(),
    subtotal: command.subtotal,
    discountAmount: command.discountAmount,
    taxAmount: command.taxAmount,
    amount: command.amount,
    currencyCode: command.currencyCode,
    currencySnapshot: command.currencySnapshot,
    taxPolicySnapshot: command.taxPolicySnapshot,
    taxBreakdown: command.taxBreakdown,
    composition: command.composition,
    tenders: command.tenders,
    checkId: command.checkId ?? null,
    actorType: context.actorType,
    actorId: context.actorUserId != null ? String(context.actorUserId) : null,
    terminalId: context.terminalId,
    businessDay: command.businessDay,
    idempotencyKey,
    fingerprint,
    committedAt,
    createdAt: committedAt,
  };

  try {
    const inserted = await store.insert(freezeCollectionFact(fact));
    logCollectionFact({
      type: OPS_EVENT.payment_collection_fact_committed,
      severity: "info",
      restaurantId: command.restaurantId,
      action: "payment.collection_fact.committed",
      metadata: {
        collectionFactId: inserted.collectionFactId,
        purpose: inserted.purpose,
      },
    });
    return { outcome: "created", fact: inserted };
  } catch (error) {
    if (error instanceof CollectionFactError && error.code === "DUPLICATE") {
      const raced =
        (await store.findByIdempotency({
          restaurantId: command.restaurantId,
          idempotencyKey,
        })) ??
        (await store.findByPaymentIntent({
          restaurantId: command.restaurantId,
          paymentIntentId,
        }));
      if (!raced) {
        throw new CollectionFactError(
          "STORAGE",
          "Duplicate Collection Fact reported but row was not found"
        );
      }
      const replayed = replayOrConflict(raced, command, fingerprint);
      logCollectionFact({
        type: OPS_EVENT.payment_collection_fact_replayed,
        severity: "info",
        restaurantId: command.restaurantId,
        action: "payment.collection_fact.replayed",
        metadata: { collectionFactId: replayed.collectionFactId },
      });
      return { outcome: "replayed", fact: replayed };
    }
    logCollectionFact({
      type: OPS_EVENT.payment_collection_fact_storage_failed,
      severity: "error",
      restaurantId: command.restaurantId,
      action: "payment.collection_fact.storage_failed",
      metadata: {
        code: error instanceof CollectionFactError ? error.code : "STORAGE",
      },
    });
    throw error instanceof CollectionFactError
      ? error
      : new CollectionFactError("STORAGE", "Collection Fact storage failed");
  }
}
