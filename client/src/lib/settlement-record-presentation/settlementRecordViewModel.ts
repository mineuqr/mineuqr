/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
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
  settlementRecordUiLabel,
  settlementStatusLabel,
  type SettlementRecordLang,
} from "./settlementRecordCopy";
import {
  formatSettlementHistoryTimeParts,
} from "./settlementHistoryPresentation";
import { resolveSettlementOperationalIdentity } from "@shared/operational-document-identity";

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
  settlementTimeDateLabel: string;
  settlementTimeClockLabel: string;
  sourceLabel: string;
  sourceType: "session" | "check";
  recordKind: string;
  recordGeneration: number;
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

  return {
    settlementRecordId: item.settlementRecordId,
    settlementNumber: resolveSettlementOperationalIdentity({
      checkId: item.checkId,
      settlementRecordId: item.settlementRecordId,
      recordGeneration: item.recordGeneration,
    }),
    settlementTimeDateLabel: time.dateLabel,
    settlementTimeClockLabel: time.timeLabel,
    sourceLabel: `${sourceTypeLabel} #${item.sourceNumber}`,
    sourceType: item.sourceType,
    recordKind: item.recordKind,
    recordGeneration: item.recordGeneration,
    priorSettlementRecordId: item.priorSettlementRecordId,
    grandTotalLabel: money(item.grandTotal, item.currencySymbol),
    paymentMethodSummaryLabel: methods || "—",
    statusLabel: settlementStatusLabel(item.settlementStatus, language),
  };
}

export type SettlementDetailViewModel = Readonly<{
  settlementNumber: string;
  settlementTimeLabel: string;
  settlementStatusLabel: string;
  sourceTypeLabel: string;
  sourceIdentifier: string;
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
  return {
    settlementNumber: resolveSettlementOperationalIdentity({
      checkId: detail.checkId,
      settlementRecordId: detail.settlementRecordId,
      recordGeneration: detail.recordGeneration,
    }),
    settlementTimeLabel: formatTime(detail.settlementTime, language),
    settlementStatusLabel: settlementStatusLabel(detail.settlementStatus, language),
    sourceTypeLabel,
    sourceIdentifier: `${sourceTypeLabel} #${detail.sourceIdentifier}`,
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
      statusLabel: p.status,
    })),
    grandTotalLabel: money(detail.grandTotal, sym),
    operatorLabel:
      detail.operator.actorId != null
        ? `${detail.operator.actorType ?? "staff"} · ${detail.operator.actorId}`
        : "—",
    createdAtLabel: formatTime(detail.audit.createdAt, language),
    settledAtLabel: detail.audit.settledAt
      ? formatTime(detail.audit.settledAt, language)
      : "—",
    businessDay: detail.audit.businessDay,
  };
}

export type SettlementReceiptViewModel = Readonly<{
  settlementNumber: string;
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
    audit: {
      createdAt: receipt.settlementTime,
      settledAt: receipt.settlementTime,
      businessDay: receipt.businessDay,
    },
  };
  const detail = toSettlementDetailViewModel(detailLike, language);
  return {
    settlementNumber: detail.settlementNumber,
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
