/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 / ADR-ARCH-039
 * Immutable Collection Fact contract. Insert-only financial authority infrastructure.
 * Dormant: not Cashier, Revenue, Settlement, or PAID.
 */

import type {
  CurrencySnapshot,
  TaxBreakdown,
  TaxPolicySnapshot,
} from "../../check/checkContract";
import type { CanonicalMonetaryPaymentMethod } from "../../check/paymentMethod";
import type { OrderingChannel } from "../../../ordering-platform/orderingChannelRegistry";

export const PAYMENT_COLLECTION_FACT_PROGRAM_ID =
  "PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1" as const;

export const COLLECTION_FACT_SCHEMA_VERSION = 1 as const;

export const COLLECTION_FACT_KIND = "collection" as const;
export type CollectionFactKind = typeof COLLECTION_FACT_KIND;

/** Isolation purposes only. Production collections are not persistable in this program. */
export const COLLECTION_FACT_PURPOSES = [
  "synthetic",
  "shadow",
  "test",
  "validation",
] as const;

export type CollectionFactPurpose = (typeof COLLECTION_FACT_PURPOSES)[number];

export type CollectionFactTender = Readonly<{
  paymentMethod: CanonicalMonetaryPaymentMethod;
  amount: string;
}>;

export type CollectionFactCompositionLine = Readonly<{
  sequence: number;
  description: string;
  netAmount: string;
  taxAmount: string;
  originOrderId: number | null;
}>;

export type CollectionFact = Readonly<{
  collectionFactId: string;
  restaurantId: number;
  orderId: number;
  paymentIntentId: string;
  orderingChannel: OrderingChannel | string;
  kind: CollectionFactKind;
  purpose: CollectionFactPurpose;
  schemaVersion: typeof COLLECTION_FACT_SCHEMA_VERSION | number;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  amount: string;
  currencyCode: string;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  taxBreakdown: TaxBreakdown;
  composition: readonly CollectionFactCompositionLine[];
  tenders: readonly CollectionFactTender[];
  /** Operational/commercial bill reference only. Not financial authority. */
  checkId: number | null;
  actorType: string | null;
  actorId: string | null;
  terminalId: string | null;
  businessDay: string;
  idempotencyKey: string;
  fingerprint: string;
  committedAt: string;
  createdAt: string;
}>;

export type CollectionFactCommitContext = Readonly<{
  restaurantId: number;
  actorAuthorized: boolean;
  actorUserId: number | null;
  actorType: string | null;
  terminalId: string | null;
}>;

export type CommitCollectionFactCommand = Readonly<{
  restaurantId: number;
  orderId: number;
  paymentIntentId: string;
  orderingChannel: OrderingChannel | string;
  purpose: CollectionFactPurpose;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  amount: string;
  currencyCode: string;
  currencySnapshot: CurrencySnapshot;
  taxPolicySnapshot: TaxPolicySnapshot;
  taxBreakdown: TaxBreakdown;
  composition: readonly CollectionFactCompositionLine[];
  tenders: readonly CollectionFactTender[];
  checkId?: number | null;
  businessDay: string;
  idempotencyKey: string;
  committedAt?: string;
}>;

export type CommitCollectionFactResult = Readonly<{
  outcome: "created" | "replayed";
  fact: CollectionFact;
}>;
