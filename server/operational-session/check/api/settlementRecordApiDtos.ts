/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — API-safe Settlement Record read DTOs.
 *
 * Copy-only fields from immutable Settlement Record documents.
 * No Domain mutation, no money calculation, no legacy financial DTOs.
 */

import type { SettlementRecordKind } from "@shared/operational-session";

export const SETTLEMENT_RECORD_API_CONTRACT_ID =
  "SETTLEMENT-RECORD-UI-ADOPTION-1" as const;
export const SETTLEMENT_RECORD_API_CONTRACT_VERSION = 1 as const;

/** Operator-facing history row — newest-first list. */
export type SettlementRecordHistoryItemDto = Readonly<{
  settlementRecordId: string;
  /** Document number for operator display (opaque Settlement Record id). */
  settlementNumber: string;
  settlementTime: string;
  sourceType: "session" | "check";
  sourceNumber: string;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  paymentStatus: string;
  paymentMethodSummary: string;
  settlementStatus: string;
  recordKind: SettlementRecordKind;
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
  settlementTime: string;
  settlementStatus: string;
  sourceType: "session" | "check";
  sourceIdentifier: string;
  recordKind: SettlementRecordKind;
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
  audit: Readonly<{
    createdAt: string;
    settledAt: string | null;
    businessDay: string;
  }>;
}>;

/** Customer receipt payload — Settlement Record snapshot only for money. */
export type SettlementRecordReceiptDto = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  settlementTime: string;
  settlementStatus: string;
  businessDay: string;
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
