/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 / ADR-ARCH-039
 * Insert-only Collection Fact invariants (I-COL-01, I-COL-02, I-COL-06, I-COL-08).
 */

import { CANONICAL_MONETARY_PAYMENT_METHODS } from "../../check/paymentMethod";
import { formatChargeMoney, parseChargeMoney } from "../../check/charge/chargeMoney";
import { CollectionFactError } from "./collectionFactErrors";
import {
  COLLECTION_FACT_KIND,
  COLLECTION_FACT_PURPOSES,
  COLLECTION_FACT_SCHEMA_VERSION,
  type CollectionFact,
  type CollectionFactCommitContext,
  type CollectionFactCompositionLine,
  type CollectionFactPurpose,
  type CollectionFactTender,
  type CommitCollectionFactCommand,
} from "./collectionFactContract";

const MONEY_PATTERN = /^-?\d+(\.\d{1,2})?$/;
const BUSINESS_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCollectionFactPurpose(
  value: string
): value is CollectionFactPurpose {
  return (COLLECTION_FACT_PURPOSES as readonly string[]).includes(value);
}

export function assertCollectionFactAppendOnly(
  operation: "insert" | "update" | "delete"
): void {
  if (operation === "update" || operation === "delete") {
    throw new CollectionFactError(
      "IMMUTABLE",
      `I-COL-02: Collection Fact is insert-only; ${operation} is forbidden — use a compensating event`
    );
  }
}

export function assertCopiedMoneyField(label: string, value: string): void {
  if (typeof value !== "string" || !MONEY_PATTERN.test(value)) {
    throw new CollectionFactError(
      "VALIDATION",
      `${label} must be a decimal string`
    );
  }
}

function assertCanonicalTender(
  tender: CollectionFactTender,
  index: number
): void {
  if (
    !(CANONICAL_MONETARY_PAYMENT_METHODS as readonly string[]).includes(
      tender.paymentMethod
    )
  ) {
    throw new CollectionFactError(
      "VALIDATION",
      `tenders[${index}].paymentMethod must be cash|card|other`
    );
  }
  assertCopiedMoneyField(`tenders[${index}].amount`, tender.amount);
}

function assertCompositionLine(
  line: CollectionFactCompositionLine,
  index: number
): void {
  if (!Number.isInteger(line.sequence) || line.sequence < 1) {
    throw new CollectionFactError(
      "VALIDATION",
      `composition[${index}].sequence must be a positive integer`
    );
  }
  if (!line.description.trim()) {
    throw new CollectionFactError(
      "VALIDATION",
      `composition[${index}].description is required`
    );
  }
  assertCopiedMoneyField(`composition[${index}].netAmount`, line.netAmount);
  assertCopiedMoneyField(`composition[${index}].taxAmount`, line.taxAmount);
}

export function sumTenderAmounts(
  tenders: readonly CollectionFactTender[]
): string {
  let sum = 0;
  for (const tender of tenders) {
    sum += parseChargeMoney(tender.amount);
  }
  return formatChargeMoney(sum);
}

export function assertTendersReconcileToAmount(input: {
  tenders: readonly CollectionFactTender[];
  amount: string;
}): void {
  const tenderSum = sumTenderAmounts(input.tenders);
  if (tenderSum !== formatChargeMoney(parseChargeMoney(input.amount))) {
    throw new CollectionFactError(
      "VALIDATION",
      `tender sum ${tenderSum} must equal amount ${input.amount}`
    );
  }
}

export function assertCollectionFactCommitContext(
  context: CollectionFactCommitContext,
  command: CommitCollectionFactCommand
): void {
  if (!context.actorAuthorized) {
    throw new CollectionFactError(
      "UNAUTHORIZED",
      "Collection Fact commit requires an authorized actor"
    );
  }
  if (
    !Number.isInteger(context.restaurantId) ||
    context.restaurantId <= 0 ||
    context.restaurantId !== command.restaurantId
  ) {
    throw new CollectionFactError(
      "TENANT",
      "Collection Fact restaurantId does not match authorized tenant"
    );
  }
  if (context.terminalId != null && context.terminalId.trim() === "") {
    throw new CollectionFactError("VALIDATION", "terminalId is invalid");
  }
  if (
    context.actorUserId != null &&
    (!Number.isInteger(context.actorUserId) || context.actorUserId <= 0)
  ) {
    throw new CollectionFactError("UNAUTHORIZED", "actor identity is invalid");
  }
}

export function assertCommitCollectionFactCommand(
  command: CommitCollectionFactCommand
): void {
  if (!Number.isInteger(command.restaurantId) || command.restaurantId <= 0) {
    throw new CollectionFactError("TENANT", "restaurantId is required");
  }
  if (!Number.isInteger(command.orderId) || command.orderId <= 0) {
    throw new CollectionFactError("VALIDATION", "orderId is required");
  }
  const intent = command.paymentIntentId.trim();
  if (!intent || intent.length > 128) {
    throw new CollectionFactError("VALIDATION", "paymentIntentId is invalid");
  }
  if (!command.orderingChannel.trim()) {
    throw new CollectionFactError("VALIDATION", "orderingChannel is required");
  }
  if (!isCollectionFactPurpose(command.purpose)) {
    throw new CollectionFactError(
      "VALIDATION",
      "purpose must be synthetic|shadow|test|validation|production"
    );
  }
  const key = command.idempotencyKey.trim();
  if (key.length < 8 || key.length > 128) {
    throw new CollectionFactError("VALIDATION", "idempotencyKey is invalid");
  }
  if (!BUSINESS_DAY_PATTERN.test(command.businessDay)) {
    throw new CollectionFactError("VALIDATION", "businessDay must be YYYY-MM-DD");
  }
  if (!command.currencyCode.trim() || command.currencyCode.length > 8) {
    throw new CollectionFactError("VALIDATION", "currencyCode is invalid");
  }
  if (command.currencySnapshot.currencyCode !== command.currencyCode) {
    throw new CollectionFactError(
      "VALIDATION",
      "currencySnapshot.currencyCode must match currencyCode"
    );
  }
  assertCopiedMoneyField("subtotal", command.subtotal);
  assertCopiedMoneyField("discountAmount", command.discountAmount);
  assertCopiedMoneyField("taxAmount", command.taxAmount);
  assertCopiedMoneyField("amount", command.amount);
  if (parseChargeMoney(command.amount) <= 0) {
    throw new CollectionFactError("VALIDATION", "amount must be greater than 0");
  }
  if (command.composition.length < 1) {
    throw new CollectionFactError("VALIDATION", "composition is required");
  }
  command.composition.forEach(assertCompositionLine);
  if (command.tenders.length < 1) {
    throw new CollectionFactError("VALIDATION", "tenders are required");
  }
  command.tenders.forEach(assertCanonicalTender);
  assertTendersReconcileToAmount({
    tenders: command.tenders,
    amount: command.amount,
  });
  if (
    command.checkId != null &&
    (!Number.isInteger(command.checkId) || command.checkId <= 0)
  ) {
    throw new CollectionFactError("VALIDATION", "checkId is invalid");
  }
}

export function buildCollectionFactId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new CollectionFactError("VALIDATION", "collectionFactId is required");
  }
  return trimmed.startsWith("pcf_") ? trimmed : `pcf_${trimmed}`;
}

export function collectionFactKind(): typeof COLLECTION_FACT_KIND {
  return COLLECTION_FACT_KIND;
}

export function collectionFactSchemaVersion(): typeof COLLECTION_FACT_SCHEMA_VERSION {
  return COLLECTION_FACT_SCHEMA_VERSION;
}

export function assertFingerprintsMatch(
  stored: string,
  incoming: string
): void {
  if (stored !== incoming) {
    throw new CollectionFactError(
      "CONFLICT",
      "Idempotency key reused with a conflicting Collection Fact payload"
    );
  }
}

export function assertSameIntentIdentity(
  stored: CollectionFact,
  command: CommitCollectionFactCommand
): void {
  if (
    stored.paymentIntentId !== command.paymentIntentId.trim() ||
    stored.orderId !== command.orderId ||
    stored.restaurantId !== command.restaurantId
  ) {
    throw new CollectionFactError(
      "CONFLICT",
      "Idempotent replay does not match stored Collection Fact identity"
    );
  }
}
