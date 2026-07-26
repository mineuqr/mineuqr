/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * Settlement Record → API DTO mapping (polymorphic over recordKind).
 * Pure field mapping / display summarization. No money arithmetic.
 */

import type { SettlementRecord } from "@shared/operational-session";
import { resolveSettlementOperationalIdentity } from "@shared/operational-document-identity";
import type {
  SettlementRecordDetailDto,
  SettlementRecordHistoryItemDto,
  SettlementRecordItemSnapshotLineDto,
  SettlementRecordOrderRefDto,
  SettlementRecordPaymentLineDto,
  SettlementRecordReceiptDto,
  SettlementRecordTaxLineDto,
} from "./settlementRecordApiDtos";

function settlementNumberOf(record: SettlementRecord): string {
  return resolveSettlementOperationalIdentity({
    checkId: record.checkId,
    settlementRecordId: record.settlementRecordId,
    recordGeneration: record.recordGeneration,
  });
}

function settlementTimeOf(record: SettlementRecord): string {
  return record.settledAt ?? record.createdAt;
}

function sourceTypeOf(record: SettlementRecord): "session" | "check" {
  return record.sessionId != null ? "session" : "check";
}

function sourceNumberOf(record: SettlementRecord): string {
  if (record.sessionId != null) return String(record.sessionId);
  return String(record.checkId);
}

function settlementStatusOf(record: SettlementRecord): string {
  if (record.outcome === "complimentary") return "complimentary";
  if (record.outcome === "voided") return "voided";
  if (record.recordKind === "refund") return "refunded";
  if (record.recordKind === "reversal") return "reversed";
  if (record.recordKind === "correction") return "corrected";
  if (record.recordKind === "void") return "voided";
  return "settled";
}

function paymentStatusOf(record: SettlementRecord): string {
  if (record.outcome === "complimentary") return "complimentary";
  if (record.outcome === "voided" || record.recordKind === "void") return "voided";
  const statuses = record.paymentSnapshot.map((p) => String(p.status));
  if (statuses.length === 0) return settlementStatusOf(record);
  if (statuses.every((s) => s === "applied" || s === "captured" || s === "succeeded")) {
    return "paid";
  }
  return statuses[0] ?? "paid";
}

function paymentMethodSummaryOf(record: SettlementRecord): string {
  const methods = record.paymentSnapshot.map((p) => String(p.paymentMethod));
  if (methods.length === 0) {
    return record.outcome === "complimentary" ? "complimentary" : "none";
  }
  return Array.from(new Set(methods)).join(", ");
}

function toPaymentLines(
  record: SettlementRecord
): readonly SettlementRecordPaymentLineDto[] {
  return record.paymentSnapshot.map((line) => ({
    paymentMethod: String(line.paymentMethod),
    amount: String(line.amount),
    currencyCode: String(line.currencyCode),
    status: String(line.status),
    businessTimestamp: String(line.businessTimestamp),
  }));
}

function toTaxLines(record: SettlementRecord): readonly SettlementRecordTaxLineDto[] {
  return record.taxBreakdown.lines.map((line) => ({
    name: String(line.name),
    ratePercent: String(line.ratePercent),
    amount: String(line.amount),
  }));
}

export function toSettlementRecordHistoryItemDto(
  record: SettlementRecord
): SettlementRecordHistoryItemDto {
  return {
    settlementRecordId: record.settlementRecordId,
    settlementNumber: settlementNumberOf(record),
    settlementTime: settlementTimeOf(record),
    sourceType: sourceTypeOf(record),
    sourceNumber: sourceNumberOf(record),
    grandTotal: String(record.grandTotal),
    currencyCode: record.currencySnapshot.currencyCode,
    currencySymbol: record.currencySnapshot.currencySymbol,
    paymentStatus: paymentStatusOf(record),
    paymentMethodSummary: paymentMethodSummaryOf(record),
    settlementStatus: settlementStatusOf(record),
    recordKind: record.recordKind,
    recordGeneration: record.recordGeneration,
    priorSettlementRecordId: record.priorSettlementRecordId,
    outcome: record.outcome,
    businessDay: record.businessDay,
    checkId: record.checkId,
    sessionId: record.sessionId,
  };
}

export function toSettlementRecordDetailDto(input: {
  record: SettlementRecord;
  orders?: readonly SettlementRecordOrderRefDto[];
  itemsSnapshot?: readonly SettlementRecordItemSnapshotLineDto[];
}): SettlementRecordDetailDto {
  const { record } = input;
  const orders =
    input.orders ??
    record.orderRefs.map((ref) => ({
      orderId: ref.orderId,
      displayReference: null as string | null,
    }));

  return {
    settlementRecordId: record.settlementRecordId,
    settlementNumber: settlementNumberOf(record),
    settlementTime: settlementTimeOf(record),
    settlementStatus: settlementStatusOf(record),
    sourceType: sourceTypeOf(record),
    sourceIdentifier: sourceNumberOf(record),
    recordKind: record.recordKind,
    recordGeneration: record.recordGeneration,
    priorSettlementRecordId: record.priorSettlementRecordId,
    outcome: record.outcome,
    checkId: record.checkId,
    sessionId: record.sessionId,
    orders,
    checks: [{ checkId: record.checkId }],
    itemsSnapshot: input.itemsSnapshot ?? [],
    financialSnapshot: {
      subtotal: String(record.subtotal),
      discountAmount: String(record.discountAmount),
      taxAmount: String(record.taxAmount),
      grandTotal: String(record.grandTotal),
      currencyCode: record.currencySnapshot.currencyCode,
      currencySymbol: record.currencySnapshot.currencySymbol,
    },
    taxSnapshot: {
      totalTaxAmount: String(record.taxBreakdown.totalTaxAmount),
      lines: toTaxLines(record),
    },
    paymentMethods: toPaymentLines(record),
    grandTotal: String(record.grandTotal),
    operator: {
      actorType: record.createdByActorType,
      actorId: record.createdByActorId,
    },
    attribution: null,
    audit: {
      createdAt: record.createdAt,
      settledAt: record.settledAt,
      businessDay: record.businessDay,
    },
  };
}

/** Attach presentation attribution labels without mutating the Settlement Record. */
export function withSettlementRecordAttributionDisplay(
  detail: SettlementRecordDetailDto,
  attribution: SettlementRecordDetailDto["attribution"]
): SettlementRecordDetailDto {
  return { ...detail, attribution };
}

export function toSettlementRecordReceiptDto(
  detail: SettlementRecordDetailDto
): SettlementRecordReceiptDto {
  return {
    settlementRecordId: detail.settlementRecordId,
    settlementNumber: detail.settlementNumber,
    settlementTime: detail.settlementTime,
    settlementStatus: detail.settlementStatus,
    recordKind: detail.recordKind,
    recordGeneration: detail.recordGeneration,
    priorSettlementRecordId: detail.priorSettlementRecordId,
    businessDay: detail.audit.businessDay,
    orders: detail.orders,
    itemsSnapshot: detail.itemsSnapshot,
    paymentMethods: detail.paymentMethods,
    financialSnapshot: detail.financialSnapshot,
    taxSnapshot: detail.taxSnapshot,
    grandTotal: detail.grandTotal,
    currencyCode: detail.financialSnapshot.currencyCode,
    currencySymbol: detail.financialSnapshot.currencySymbol,
    outcome: detail.outcome,
  };
}
