/**
 * ADR-ARCH-032 / REFUND-DOMAIN-IMPLEMENTATION-1 — Refund Platform domain contracts.
 *
 * Check-owned FSP capability. NOT an Aggregate Root. NOT monetary authority.
 * Settlement Ledger is entry only; Check Aggregate decides money.
 * Pure domain types — no persistence / ORM / API / UI.
 */

export const REFUND_PROGRAM_ID = "REFUND-DOMAIN-IMPLEMENTATION-1" as const;
export const REFUND_ADR_ID = "ADR-ARCH-032" as const;

/** Refund lifecycle (ADR-032 §15). */
export const REFUND_STATUSES = [
  "requested",
  "validated",
  "applied",
  "completed",
] as const;

export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_TERMINAL_STATUSES = ["completed"] as const;

export type RefundTerminalStatus = (typeof REFUND_TERMINAL_STATUSES)[number];

/** Stable opaque Refund identity — independent of transport eventId. */
export type RefundId = string;

/** Opaque business reference for ADR-021 business-fact idempotency. */
export type RefundReference = string;

export type RefundIdentity = Readonly<{
  restaurantId: number;
  checkId: number;
  refundId: RefundId;
}>;

/**
 * Assignment of refunded value to prior Order Settlement / tender targets.
 * Sum(allocations) ≤ Refund amount (I-FC-05 / RF-INV-F02).
 */
export type RefundAllocation = Readonly<{
  allocationId: string;
  orderId: number | null;
  amount: string;
  tenderMethod: string | null;
}>;

/**
 * Document-chain link plus optional CF original-sale identity.
 * priorSettlementRecordId is refund-document chaining, not original-sale SSOT.
 * Empty prior is allowed for the first CF-backed refund document.
 */
export type RefundReferenceLink = Readonly<{
  priorSettlementRecordId: string;
  settlementRecordGeneration: number;
  checkId: number;
  /** CF original-sale identity. Not a document id. Optional for legacy SR-anchored refunds. */
  originalCollectionFactId?: string | null;
}>;

/**
 * Check-decided reverse money snapshot for compensating Settlement Record.
 * Copied into SR — SR never calculates (SR-INV-01 / RF-INV-P03).
 */
export type RefundReverseSnapshot = Readonly<{
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  taxBreakdown: Readonly<{
    totalTaxAmount: string;
    lines: readonly Readonly<{
      componentId: string;
      name: string;
      ratePercent: string;
      amount: string;
    }>[];
  }>;
}>;

/**
 * Refund — Check-owned financial capability fact (not Aggregate Root).
 */
export type Refund = Readonly<{
  refundId: RefundId;
  restaurantId: number;
  checkId: number;
  status: RefundStatus;
  amount: string;
  currencyCode: string;
  refundReference: RefundReference | null;
  referenceLink: RefundReferenceLink;
  allocations: readonly RefundAllocation[];
  reverseSnapshot: RefundReverseSnapshot;
  /** Settlement Record generation assigned at apply/publish. */
  recordGeneration: number | null;
  refundSettlementRecordId: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}>;

/**
 * Derived refundable budget.
 * CF-backed original collected amount comes from production Collection Fact.
 * Already-refunded remains the existing refund SR chain (document persistence).
 * priorSettlementRecordId is the refund-document prior (gen=1 or previous refund),
 * not original-sale identity. Never UI-invented (RF-BUDGET-02).
 */
export type RefundBudget = Readonly<{
  restaurantId: number;
  checkId: number;
  settledValue: string;
  appliedRefundTotal: string;
  refundableBalance: string;
  priorSettlementRecordId: string;
  nextRecordGeneration: number;
  originalSaleKind: "collection_fact" | "legacy_settlement_record";
  collectionFactId: string | null;
}>;
