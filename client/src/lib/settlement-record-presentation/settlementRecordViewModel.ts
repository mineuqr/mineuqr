/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * REFUND-PRESENTATION-ADOPTION-1
 * ViewModels (presentation only) — polymorphic over recordKind.
 */

import {
  preferredPaymentMethodLabel,
  type PresentationLanguage,
} from "@shared/reporting-platform";
import type {
  SettlementRecordDetailApiDto,
  SettlementRecordHistoryItemApiDto,
  SettlementRecordReceiptApiDto,
} from "./settlementRecordApiTypes";
import {
  settlementPaymentStatusLabel,
  settlementRecordUiLabel,
  settlementStatusLabel,
  type SettlementRecordLang,
} from "./settlementRecordCopy";
import {
  formatSettlementHistoryTimeParts,
} from "./settlementHistoryPresentation";
import { resolveSettlementOperationalIdentity } from "@shared/operational-document-identity";

function operatorDisplayLabel(
  detail: SettlementRecordDetailApiDto,
  language: SettlementRecordLang
): string {
  if (detail.attribution?.operatorLabel && detail.attribution.operatorLabel !== "—") {
    return detail.attribution.operatorLabel;
  }
  if (detail.operator.actorId == null) return "—";
  const type = (detail.operator.actorType ?? "staff").toLowerCase();
  if (type === "system") {
    return settlementRecordUiLabel("operatorSystem", language);
  }
  return settlementRecordUiLabel("operatorStaff", language);
}

function formatTime(value: string, language: SettlementRecordLang): string {
  const { dateLabel, timeLabel } = formatSettlementHistoryTimeParts(
    value,
    language
  );
  return `${dateLabel} · ${timeLabel}`;
}

function money(amount: string, symbol: string): string {
  return `${symbol}${amount}`;
}

function methodLabel(method: string, language: PresentationLanguage): string {
  try {
    return preferredPaymentMethodLabel(method as never, language);
  } catch {
    return method;
  }
}

export type SettlementHistoryRowViewModel = Readonly<{
  settlementRecordId: string;
  settlementNumber: string;
  documentNumber: string;
  documentType: "settlement" | "refund";
  documentTypeLabel: string;
  originSettlementNumber: string | null;
  settlementTimeDateLabel: string;
  settlementTimeClockLabel: string;
  businessDay: string;
  sourceLabel: string;
  sourceType: "session" | "check";
  recordKind: string;
  recordGeneration: number;
  generationLabel: string | null;
  priorSettlementRecordId: string | null;
  grandTotalLabel: string;
  paymentMethodSummaryLabel: string;
  statusLabel: string;
}>;

export function toSettlementHistoryRowViewModel(
  item: SettlementRecordHistoryItemApiDto,
  language: SettlementRecordLang
): SettlementHistoryRowViewModel {
  const methods = item.paymentMethodSummary
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) =>
      m === "complimentary" || m === "none"
        ? m === "complimentary"
          ? settlementRecordUiLabel("complimentary", language)
          : "—"
        : methodLabel(m, language)
    )
    .join(", ");

  const sourceTypeLabel =
    item.sourceType === "session"
      ? settlementRecordUiLabel("sessionSource", language)
      : settlementRecordUiLabel("checkSource", language);

  const time = formatSettlementHistoryTimeParts(item.settlementTime, language);

  const showGeneration =
    item.recordKind === "refund" ||
    item.recordKind === "reversal" ||
    item.recordKind === "correction" ||
    item.recordGeneration > 1;

  const documentType =
    item.documentType ??
    (item.recordKind === "refund" ? "refund" : "settlement");
  const documentNumber =
    item.documentNumber ||
    item.settlementNumber ||
    (documentType === "settlement"
      ? resolveSettlementOperationalIdentity({ checkId: item.checkId })
      : item.settlementNumber);

  return {
    settlementRecordId: item.settlementRecordId,
    settlementNumber: documentNumber,
    documentNumber,
    documentType,
    documentTypeLabel:
      documentType === "refund"
        ? settlementRecordUiLabel("documentTypeRefund", language)
        : settlementRecordUiLabel("documentTypeSettlement", language),
    originSettlementNumber: item.originSettlementNumber ?? null,
    settlementTimeDateLabel: time.dateLabel,
    settlementTimeClockLabel: time.timeLabel,
    businessDay: item.businessDay,
    sourceLabel: `${sourceTypeLabel} #${item.sourceNumber}`,
    sourceType: item.sourceType,
    recordKind: item.recordKind,
    recordGeneration: item.recordGeneration,
    generationLabel: showGeneration ? String(item.recordGeneration) : null,
    priorSettlementRecordId: item.priorSettlementRecordId,
    grandTotalLabel: money(item.grandTotal, item.currencySymbol),
    paymentMethodSummaryLabel: methods || "—",
    statusLabel: settlementStatusLabel(item.settlementStatus, language),
  };
}

export type SettlementDetailViewModel = Readonly<{
  settlementNumber: string;
  documentNumber: string;
  documentType: "settlement" | "refund";
  documentTypeLabel: string;
  refundNumber: string | null;
  originSettlementNumber: string | null;
  settlementTimeLabel: string;
  settlementStatusLabel: string;
  sourceTypeLabel: string;
  sourceIdentifier: string;
  checkId: number;
  recordKind: string;
  outcome: string;
  recordGeneration: number;
  generationLabel: string;
  priorSettlementRecordId: string | null;
  priorSettlementNumber: string | null;
  orders: readonly { orderId: number; label: string }[];
  checks: readonly { label: string }[];
  items: readonly { name: string; quantity: number; unitPriceLabel: string }[];
  financial: Readonly<{
    subtotalLabel: string;
    discountLabel: string;
    taxLabel: string;
    grandTotalLabel: string;
  }>;
  taxLines: readonly { name: string; rateLabel: string; amountLabel: string }[];
  payments: readonly {
    methodLabel: string;
    amountLabel: string;
    statusLabel: string;
  }[];
  grandTotalLabel: string;
  operatorLabel: string;
  registerLabel: string;
  shiftLabel: string;
  createdAtLabel: string;
  settledAtLabel: string;
  businessDay: string;
}>;

export function toSettlementDetailViewModel(
  detail: SettlementRecordDetailApiDto,
  language: SettlementRecordLang
): SettlementDetailViewModel {
  const sym = detail.financialSnapshot.currencySymbol;
  const sourceTypeLabel =
    detail.sourceType === "session"
      ? settlementRecordUiLabel("sessionSource", language)
      : settlementRecordUiLabel("checkSource", language);
  const priorId = detail.priorSettlementRecordId;
  const documentType =
    detail.documentType ??
    (detail.recordKind === "refund" ? "refund" : "settlement");
  const documentNumber =
    detail.documentNumber ||
    detail.settlementNumber ||
    resolveSettlementOperationalIdentity({ checkId: detail.checkId });
  const originSettlementNumber =
    detail.originSettlementNumber ??
    (documentType === "refund"
      ? resolveSettlementOperationalIdentity({ checkId: detail.checkId })
      : null);

  return {
    settlementNumber: documentNumber,
    documentNumber,
    documentType,
    documentTypeLabel:
      documentType === "refund"
        ? settlementRecordUiLabel("documentTypeRefund", language)
        : settlementRecordUiLabel("documentTypeSettlement", language),
    refundNumber: detail.refundNumber ?? null,
    originSettlementNumber,
    settlementTimeLabel: formatTime(detail.settlementTime, language),
    settlementStatusLabel: settlementStatusLabel(detail.settlementStatus, language),
    sourceTypeLabel,
    sourceIdentifier: `${sourceTypeLabel} #${detail.sourceIdentifier}`,
    checkId: detail.checkId,
    recordKind: detail.recordKind,
    outcome: detail.outcome,
    recordGeneration: detail.recordGeneration,
    generationLabel: String(detail.recordGeneration),
    priorSettlementRecordId: priorId,
    priorSettlementNumber: originSettlementNumber,
    orders: detail.orders.map((o) => ({
      orderId: o.orderId,
      label: o.displayReference ?? `#${o.orderId}`,
    })),
    checks: detail.checks.map((c) => ({
      label: `${settlementRecordUiLabel("checkSource", language)} #${c.checkId}`,
    })),
    items: detail.itemsSnapshot.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceLabel: item.unitPrice != null ? money(item.unitPrice, sym) : "—",
    })),
    financial: {
      subtotalLabel: money(detail.financialSnapshot.subtotal, sym),
      discountLabel: money(detail.financialSnapshot.discountAmount, sym),
      taxLabel: money(detail.financialSnapshot.taxAmount, sym),
      grandTotalLabel: money(detail.financialSnapshot.grandTotal, sym),
    },
    taxLines: detail.taxSnapshot.lines.map((line) => ({
      name: line.name,
      rateLabel: `${line.ratePercent}%`,
      amountLabel: money(line.amount, sym),
    })),
    payments: detail.paymentMethods.map((p) => ({
      methodLabel: methodLabel(p.paymentMethod, language),
      amountLabel: money(p.amount, sym),
      statusLabel: settlementPaymentStatusLabel(p.status, language),
    })),
    grandTotalLabel: money(detail.grandTotal, sym),
    operatorLabel: operatorDisplayLabel(detail, language),
    registerLabel:
      detail.attribution?.registerLabel ??
      settlementRecordUiLabel("attributionMissing", language),
    shiftLabel:
      detail.attribution?.shiftLabel ??
      settlementRecordUiLabel("attributionMissing", language),
    createdAtLabel: formatTime(detail.audit.createdAt, language),
    settledAtLabel: detail.audit.settledAt
      ? formatTime(detail.audit.settledAt, language)
      : "—",
    businessDay: detail.audit.businessDay,
  };
}

export type SettlementReceiptViewModel = Readonly<{
  settlementNumber: string;
  documentNumber: string;
  documentType: "settlement" | "refund";
  isRefundReceipt: boolean;
  originSettlementNumber: string | null;
  settlementTimeLabel: string;
  businessDay: string;
  statusLabel: string;
  items: SettlementDetailViewModel["items"];
  payments: SettlementDetailViewModel["payments"];
  financial: SettlementDetailViewModel["financial"];
  grandTotalLabel: string;
  orders: SettlementDetailViewModel["orders"];
}>;

export function toSettlementReceiptViewModel(
  receipt: SettlementRecordReceiptApiDto,
  language: SettlementRecordLang
): SettlementReceiptViewModel {
  const checkIdFromId = Number(receipt.settlementRecordId.split(":")[2] ?? 0);
  const detailLike: SettlementRecordDetailApiDto = {
    settlementRecordId: receipt.settlementRecordId,
    settlementNumber: receipt.settlementNumber,
    documentNumber: receipt.documentNumber,
    documentType: receipt.documentType,
    refundNumber: receipt.refundNumber,
    originSettlementNumber: receipt.originSettlementNumber,
    settlementTime: receipt.settlementTime,
    settlementStatus: receipt.settlementStatus,
    sourceType: "check",
    sourceIdentifier: "",
    recordKind: receipt.recordKind,
    recordGeneration: receipt.recordGeneration,
    priorSettlementRecordId: receipt.priorSettlementRecordId,
    outcome: receipt.outcome,
    checkId: Number.isFinite(checkIdFromId) ? checkIdFromId : 0,
    sessionId: null,
    orders: receipt.orders,
    checks: [],
    itemsSnapshot: receipt.itemsSnapshot,
    financialSnapshot: receipt.financialSnapshot,
    taxSnapshot: receipt.taxSnapshot,
    paymentMethods: receipt.paymentMethods,
    grandTotal: receipt.grandTotal,
    operator: { actorType: null, actorId: null },
    attribution: null,
    audit: {
      createdAt: receipt.settlementTime,
      settledAt: receipt.settlementTime,
      businessDay: receipt.businessDay,
    },
  };
  const detail = toSettlementDetailViewModel(detailLike, language);
  return {
    settlementNumber: detail.documentNumber,
    documentNumber: detail.documentNumber,
    documentType: detail.documentType,
    isRefundReceipt: detail.documentType === "refund",
    originSettlementNumber: detail.originSettlementNumber,
    settlementTimeLabel: detail.settlementTimeLabel,
    businessDay: receipt.businessDay,
    statusLabel: detail.settlementStatusLabel,
    items: detail.items,
    payments: detail.payments,
    financial: detail.financial,
    grandTotalLabel: detail.grandTotalLabel,
    orders: detail.orders,
  };
}

/** Remaining = outstanding − amountPaid (display aid only; Check settles full total). */
export function computeRemainingDisplay(
  outstanding: string,
  amountPaid: string
): string {
  const o = Number.parseFloat(outstanding);
  const p = Number.parseFloat(amountPaid);
  if (!Number.isFinite(o) || !Number.isFinite(p)) return outstanding;
  const rem = Math.max(0, Math.round((o - p) * 100) / 100);
  return rem.toFixed(2);
}
