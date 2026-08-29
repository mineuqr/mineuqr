/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1
 * API-safe Settlement Record read DTOs.
 *
 * Copy-only fields from immutable Settlement Record documents.
 * Refund is a native recordKind — no parallel DTO model.
 * Optional attribution display is CRMP read enrichment (labels only).
 * No Domain mutation, no money calculation, no legacy financial DTOs.
 */

import type { SettlementRecordKind } from "@shared/operational-session";

export const SETTLEMENT_RECORD_API_CONTRACT_ID =
  "SETTLEMENT-RECORD-UI-ADOPTION-1" as const;
/** v2 — exposes generation + prior linkage for compensating (refund) records. */
export const SETTLEMENT_RECORD_API_CONTRACT_VERSION = 2 as const;

/** Operator-facing history row — newest-first list. */
export type SettlementRecordHistoryItemDto = Readonly<{
  settlementRecordId: string;
  /**
   * Primary document number (ST-… or RF-…).
   * Kept as `settlementNumber` for backward-compatible clients.
   */
  settlementNumber: string;
  /** Explicit document number (same as settlementNumber). */
  documentNumber: string;
  documentType: "settlement" | "refund";
  refundNumber: string | null;
  originSettlementNumber: string | null;
  settlementTime: string;
  sourceType: "session" | "check";
  sourceNumber: string;
  /** Order.orderingChannel → Counter / Table Order / Waiter Order / Self-Order. */
  sourceChannel: string | null;
  /** Cashier Invoice serial for the first enrolled Order; null when none. */
  invoiceNumber: string | null;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  paymentStatus: string;
  paymentMethodSummary: string;
  settlementStatus: string;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
  priorSettlementRecordId: string | null;
  outcome: string;
  businessDay: string;
  checkId: number;
  sessionId: number | null;
}>;

export type SettlementRecordHistoryPageDto = Readonly<{
  items: readonly SettlementRecordHistoryItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}>;

export type SettlementRecordOrderRefDto = Readonly<{
  orderId: number;
  displayReference: string | null;
}>;

export type SettlementRecordItemSnapshotLineDto = Readonly<{
  orderId: number;
  name: string;
  quantity: number;
  unitPrice: string | null;
  lineTotal: string | null;
}>;

export type SettlementRecordPaymentLineDto = Readonly<{
  paymentMethod: string;
  amount: string;
  currencyCode: string;
  status: string;
  businessTimestamp: string;
}>;

export type SettlementRecordTaxLineDto = Readonly<{
  name: string;
  ratePercent: string;
  amount: string;
}>;

/** Read-only Settlement Detail document. */
export type SettlementRecordDetailDto = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  documentNumber: string;
  documentType: "settlement" | "refund";
  refundNumber: string | null;
  originSettlementNumber: string | null;
  settlementTime: string;
  settlementStatus: string;
  sourceType: "session" | "check";
  sourceIdentifier: string;
  sourceChannel: string | null;
  invoiceNumber: string | null;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
  priorSettlementRecordId: string | null;
  outcome: string;
  checkId: number;
  sessionId: number | null;
  orders: readonly SettlementRecordOrderRefDto[];
  checks: readonly { checkId: number }[];
  itemsSnapshot: readonly SettlementRecordItemSnapshotLineDto[];
  financialSnapshot: Readonly<{
    subtotal: string;
    discountAmount: string;
    taxAmount: string;
    grandTotal: string;
    currencyCode: string;
    currencySymbol: string;
  }>;
  taxSnapshot: Readonly<{
    totalTaxAmount: string;
    lines: readonly SettlementRecordTaxLineDto[];
  }>;
  paymentMethods: readonly SettlementRecordPaymentLineDto[];
  grandTotal: string;
  operator: Readonly<{
    actorType: string | null;
    actorId: string | null;
  }>;
  /**
   * REFUND-PRESENTATION-ADOPTION-1 — Register / Shift / Operator display labels
   * from Settlement Attribution (fail-open null when not attributed).
   */
  attribution: Readonly<{
    registerLabel: string;
    shiftLabel: string;
    operatorLabel: string;
  }> | null;
  audit: Readonly<{
    createdAt: string;
    settledAt: string | null;
    businessDay: string;
  }>;
}>;

/**
 * Customer receipt payload.
 * Historical paid and refund receipts: money from Settlement Record.
 * Current Cashier paid-sale receipts: money from Collection Fact; settlementRecordId may be empty.
 */
export type SettlementRecordReceiptDto = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  documentNumber: string;
  documentType: "settlement" | "refund";
  refundNumber: string | null;
  originSettlementNumber: string | null;
  settlementTime: string;
  settlementStatus: string;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
  priorSettlementRecordId: string | null;
  businessDay: string;
  invoiceNumber: string | null;
  sourceChannel: string | null;
  orders: readonly SettlementRecordOrderRefDto[];
  itemsSnapshot: readonly SettlementRecordItemSnapshotLineDto[];
  paymentMethods: readonly SettlementRecordPaymentLineDto[];
  financialSnapshot: SettlementRecordDetailDto["financialSnapshot"];
  taxSnapshot: SettlementRecordDetailDto["taxSnapshot"];
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  outcome: string;
}>;
