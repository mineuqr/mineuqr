/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1
 * Client API type aliases — polymorphic over recordKind (incl. refund).
 */

export type SettlementRecordHistoryItemApiDto = Readonly<{
  settlementRecordId: string;
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
  recordKind: string;
  recordGeneration: number;
  priorSettlementRecordId: string | null;
  outcome: string;
  businessDay: string;
  checkId: number;
  sessionId: number | null;
}>;

export type SettlementRecordHistoryPageApiDto = Readonly<{
  items: readonly SettlementRecordHistoryItemApiDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}>;

export type SettlementRecordDetailApiDto = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  settlementTime: string;
  settlementStatus: string;
  sourceType: "session" | "check";
  sourceIdentifier: string;
  recordKind: string;
  recordGeneration: number;
  priorSettlementRecordId: string | null;
  outcome: string;
  checkId: number;
  sessionId: number | null;
  orders: readonly { orderId: number; displayReference: string | null }[];
  checks: readonly { checkId: number }[];
  itemsSnapshot: readonly {
    orderId: number;
    name: string;
    quantity: number;
    unitPrice: string | null;
    lineTotal: string | null;
  }[];
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
    lines: readonly { name: string; ratePercent: string; amount: string }[];
  }>;
  paymentMethods: readonly {
    paymentMethod: string;
    amount: string;
    currencyCode: string;
    status: string;
    businessTimestamp: string;
  }[];
  grandTotal: string;
  operator: Readonly<{ actorType: string | null; actorId: string | null }>;
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

export type SettlementRecordReceiptApiDto = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  settlementTime: string;
  settlementStatus: string;
  recordKind: string;
  recordGeneration: number;
  priorSettlementRecordId: string | null;
  businessDay: string;
  orders: SettlementRecordDetailApiDto["orders"];
  itemsSnapshot: SettlementRecordDetailApiDto["itemsSnapshot"];
  paymentMethods: SettlementRecordDetailApiDto["paymentMethods"];
  financialSnapshot: SettlementRecordDetailApiDto["financialSnapshot"];
  taxSnapshot: SettlementRecordDetailApiDto["taxSnapshot"];
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  outcome: string;
}>;
