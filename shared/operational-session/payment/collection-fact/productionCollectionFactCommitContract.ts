/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1
 * Canonical production Collection Fact commit contract.
 * Channel-independent. Not Cashier-owned. Not a second Payment aggregate.
 * Does not replace Payment process. Does not invent refund/void/complimentary kinds.
 */

import { formatChargeMoney, parseChargeMoney } from "../../check/charge/chargeMoney";
import { CollectionFactError } from "./collectionFactErrors";
import {
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  type CollectionFact,
  type CollectionFactCommitContext,
  type CommitCollectionFactCommand,
} from "./collectionFactContract";
import {
  assertCollectionFactCommitContext,
  assertCommitCollectionFactCommand,
} from "./collectionFactInvariants";
import { isCollectionFactProductionPurpose } from "./collectionFactPurposeGovernance";

export const PRODUCTION_COLLECTION_FACT_COMMIT_PROGRAM_ID =
  "PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1" as const;

/**
 * Identity vocabulary. Diagram `paymentId` maps to `paymentIntentId`.
 * There is no separate payments table or Payment aggregate.
 */
export const COLLECTION_FACT_IDENTITY = {
  tenant: "restaurantId",
  economicSale: "restaurantId + orderingChannel + orderId",
  payment: "paymentIntentId",
  retry: "idempotencyKey",
  fact: "collectionFactId",
  terminalAttribution: "terminalId",
  actorAttribution: "actorType + actorId",
  businessDayAttribution: "businessDay",
} as const;

/**
 * One financial event, two semantic labels. Not two writes.
 * HTTP SUCCESS is transport after PAID. ST/OS/SR are downstream.
 */
export const COLLECTION_FACT_FINALITY = {
  paymentCommit: "attempt to persist the immutable Collection Fact",
  committed: "insert succeeded, or idempotent replay of that insert",
  paid: "the same committed fact; not a second financial authority",
  httpSuccess: "transport acknowledgement after paid",
  settlement: "ST / OS / SR downstream; must not mutate the fact",
} as const;

export const PRODUCTION_COLLECTION_FACT_KIND = "collection" as const;

/**
 * Minimum immutable snapshot. Every field has a financial, identity, audit,
 * or operational reason. Diagram `paymentId` is `paymentIntentId`.
 * Terminal, actor, and business day are attribution — not economic identity.
 */
export const PRODUCTION_COLLECTION_FACT_SNAPSHOT = {
  restaurantId: "tenant isolation",
  collectionFactId: "durable fact identity assigned at insert",
  paymentIntentId: "payment identity (diagram paymentId)",
  orderId: "economic sale identity",
  orderingChannel: "economic sale identity / channel of origin",
  amount: "authoritative collected amount",
  currencyCode: "authoritative currency",
  currencySnapshot: "frozen currency display/policy at commit",
  taxAmount: "frozen tax total",
  taxPolicySnapshot: "frozen tax policy at commit",
  taxBreakdown: "frozen tax composition",
  discountAmount: "frozen discount total",
  composition: "frozen line composition for reporting without live Order/Check",
  tenders: "frozen tender breakdown",
  actorType: "actor attribution snapshot",
  actorId: "actor attribution snapshot",
  terminalId: "terminal attribution snapshot; mandatory in production",
  businessDay: "business-day attribution snapshot; not economic identity",
  committedAt: "commit timestamp snapshot",
  idempotencyKey: "retry identity for the same logical payment commit",
  fingerprint: "payload hash that binds retry to the same snapshot",
  checkId: "optional operational bill reference; never financial authority",
  purpose: "must be production for this contract",
  kind: "collection only; refund/void/complimentary are future compensating events",
} as const;

export const PRODUCTION_COLLECTION_FACT_IDENTITY_RULES = {
  sameLogicalCommit:
    "same restaurantId + same idempotencyKey + same fingerprint → same fact, no duplicate",
  samePaymentIntent:
    "same restaurantId + same paymentIntentId already stored with a different idempotencyKey → CONFLICT",
  differentEconomicPayment:
    "different paymentIntentId must not collapse into an existing fact",
  collectionFactId:
    "assigned at insert (pcf_ + UUID); never the business idempotency definition",
  businessDay: "attribution snapshot only; never economic identity by itself",
  terminal: "mandatory production attribution; not part of financial identity",
  checkId: "optional operational reference; not economic identity",
} as const;

export const PRODUCTION_COLLECTION_FACT_FAILURE = {
  duplicateRequest: "identical retry → replayed same fact",
  retryAfterTimeout: "same idempotencyKey + same snapshot → replayed same fact",
  dbCommitSuccessResponseLost: "retry as duplicateRequest",
  validationFailure: "no insert; VALIDATION/UNAUTHORIZED/TENANT",
  tenderMismatch: "no insert; VALIDATION",
  invalidTerminal: "no insert; VALIDATION",
  invalidEconomicIdentity: "no insert; VALIDATION",
  conflictingPaymentIntent: "no insert; CONFLICT",
  duplicateIdempotencyKeyDifferentPayload: "no insert; CONFLICT",
  downstreamSettlementFailure:
    "committed fact remains; ST/OS/SR recovery is downstream and must not UPDATE/DELETE the fact",
} as const;

export type ProductionCollectionFactCommitCommand = CommitCollectionFactCommand & {
  purpose: typeof COLLECTION_FACT_PRODUCTION_PURPOSE;
};

export function isProductionCollectionFactCommitCommand(
  command: CommitCollectionFactCommand
): command is ProductionCollectionFactCommitCommand {
  return isCollectionFactProductionPurpose(command.purpose);
}

function requireToken(
  value: string | null | undefined,
  label: string,
  maxLen: number
): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed.length > maxLen) {
    throw new CollectionFactError("VALIDATION", `${label} is required`);
  }
  return trimmed;
}

/**
 * Production-only rules on top of the shared Collection Fact command.
 * Isolated purposes keep the more relaxed infrastructure writer.
 */
export function assertProductionCollectionFactCommit(input: {
  context: CollectionFactCommitContext;
  command: CommitCollectionFactCommand;
}): void {
  assertCollectionFactCommitContext(input.context, input.command);
  assertCommitCollectionFactCommand(input.command);
  if (!isProductionCollectionFactCommitCommand(input.command)) {
    throw new CollectionFactError(
      "VALIDATION",
      "production Collection Fact purpose must be production"
    );
  }
  requireToken(input.context.terminalId, "terminalId", 128);
  requireToken(input.context.actorType, "actorType", 64);
  if (
    input.context.actorUserId == null ||
    !Number.isInteger(input.context.actorUserId) ||
    input.context.actorUserId <= 0
  ) {
    throw new CollectionFactError(
      "VALIDATION",
      "production Collection Fact requires actor identity"
    );
  }
  const taxTotal = formatChargeMoney(
    parseChargeMoney(input.command.taxBreakdown.totalTaxAmount)
  );
  const taxAmount = formatChargeMoney(parseChargeMoney(input.command.taxAmount));
  if (taxTotal !== taxAmount) {
    throw new CollectionFactError(
      "VALIDATION",
      `taxBreakdown.totalTaxAmount ${taxTotal} must equal taxAmount ${taxAmount}`
    );
  }
  for (const line of input.command.composition) {
    if (line.originOrderId != null && line.originOrderId !== input.command.orderId) {
      throw new CollectionFactError(
        "VALIDATION",
        "composition originOrderId must match the economic orderId"
      );
    }
  }
}

export function collectionFactCommitIsPaid(
  outcome: "created" | "replayed"
): boolean {
  return outcome === "created" || outcome === "replayed";
}

export function committedFactIsAuthoritative(fact: CollectionFact): boolean {
  return (
    isCollectionFactProductionPurpose(fact.purpose) &&
    fact.kind === PRODUCTION_COLLECTION_FACT_KIND &&
    fact.amount.length > 0
  );
}
