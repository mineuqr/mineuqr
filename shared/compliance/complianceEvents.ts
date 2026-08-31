/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Authoritative compliance event contracts. Downstream of financial truth.
 * collectionFactId is the event identity for future compliance artifact idempotency.
 */

export type ProductionCollectionFactCommittedEvent = Readonly<{
  /** Authoritative downstream compliance event identity. */
  collectionFactId: string;
  restaurantId: number;
  /** Server-resolved ISO country code from restaurant context. */
  countryCode: string;
  orderId: number;
  committedAt: string;
  commitOutcome: "created" | "replayed";
  /** Cashier POS invoice number when allocated; not a tax invoice. */
  cashierInvoiceNumber?: string | null;
}>;

/** Deferred wiring — refund settlement hook contract only. */
export type RefundCommittedEvent = Readonly<{
  refundSettlementRecordId: string;
  restaurantId: number;
  countryCode: string;
  orderId: number;
  committedAt: string;
}>;
