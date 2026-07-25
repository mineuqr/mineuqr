/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — thin read compose for Shift tender mix.
 *
 * Membership: Financial Shift attributions (custody association).
 * Tender facts: Settlement Record paymentSnapshot (Settlement ownership).
 * Bucket rules: REPORTING-PAYMENT-METHOD-ANALYTICS-1 builder (no UI math).
 *
 * Does NOT invoke the Expected Cash formula.
 * Does NOT mutate Financial Shift / Settlement / Reporting ownership.
 */

import type { SettlementRecord } from "@shared/operational-session";
import {
  formatReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import {
  buildPaymentMethodAnalyticsFromCapturedLines,
  type PaymentMethodAnalyticsTenderLine,
} from "../../reporting-platform/PaymentMethodAnalyticsService";
import { listSettlementRecordsByIds } from "../../operational-session/check/settlementRecordRepository";
import type { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import type { FinancialShiftTenderSummaryDto } from "./crmpApiDtos";

const DISPLAY_METHODS = [
  "cash",
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
  "stc_pay",
  "bank_transfer",
  "other",
] as const;

export type SettlementRecordBatchLoader = (input: {
  restaurantId: number;
  settlementRecordIds: readonly string[];
}) => Promise<readonly SettlementRecord[]>;

const defaultSettlementLoader: SettlementRecordBatchLoader = (input) =>
  listSettlementRecordsByIds(input);

function linesFromRecords(
  records: readonly SettlementRecord[]
): PaymentMethodAnalyticsTenderLine[] {
  const lines: PaymentMethodAnalyticsTenderLine[] = [];
  for (const record of records) {
    if (record.recordKind === "refund" || record.recordKind === "void") {
      continue;
    }
    for (const snap of record.paymentSnapshot) {
      lines.push({
        paymentMethod: String(snap.paymentMethod),
        amount: String(snap.amount),
        status: String(snap.status),
        checkId: record.checkId,
      });
    }
  }
  return lines;
}

function sumRefundGrandTotals(records: readonly SettlementRecord[]): string {
  let cents = 0;
  for (const record of records) {
    if (record.recordKind !== "refund") continue;
    cents += Math.round(parseReportingAmount(record.grandTotal) * 100);
  }
  return formatReportingAmount(cents / 100);
}

export async function buildFinancialShiftTenderSummary(input: {
  restaurantId: number;
  registerId: string;
  shifts: FinancialShiftDomainService;
  loadSettlementRecords?: SettlementRecordBatchLoader;
  /**
   * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — when set, compose tender for a
   * closed/archived shift (active resolve would miss it).
   */
  financialShiftId?: string;
}): Promise<FinancialShiftTenderSummaryDto | null> {
  const shift = input.financialShiftId
    ? await input.shifts.get(input.restaurantId, input.financialShiftId)
    : await input.shifts.resolveActive({
        restaurantId: input.restaurantId,
        registerId: input.registerId,
      });
  if (!shift) return null;

  const settlementRecordIds = shift.attributions.map(
    (a) => a.settlementRecordId
  );
  const loader = input.loadSettlementRecords ?? defaultSettlementLoader;
  const records = await loader({
    restaurantId: input.restaurantId,
    settlementRecordIds,
  });

  const analytics = buildPaymentMethodAnalyticsFromCapturedLines(
    {
      restaurantId: input.restaurantId,
      from: shift.openedAt,
      to: shift.closedAt,
    },
    linesFromRecords(records)
  );

  const byMethod = new Map(
    analytics.buckets.map((b) => [
      b.paymentMethod,
      {
        paymentMethod: b.paymentMethod,
        amount: b.tenderAmount,
        transactionCount: b.transactionCount,
      },
    ])
  );

  const methods = DISPLAY_METHODS.map((paymentMethod) => {
    const hit = byMethod.get(paymentMethod);
    return (
      hit ?? {
        paymentMethod,
        amount: "0.00",
        transactionCount: 0,
      }
    );
  });

  const known = new Set<string>(DISPLAY_METHODS);
  for (const bucket of analytics.buckets) {
    if (!known.has(bucket.paymentMethod)) {
      methods.push({
        paymentMethod: bucket.paymentMethod,
        amount: bucket.tenderAmount,
        transactionCount: bucket.transactionCount,
      });
    }
  }

  const cash = byMethod.get("cash");

  return {
    financialShiftId: shift.financialShiftId,
    registerId: shift.registerId,
    restaurantId: shift.restaurantId,
    attributedSettlementCount: shift.attributions.length,
    monetaryTenderTotal: analytics.monetaryTenderTotal,
    cashTenderTotal: cash?.amount ?? "0.00",
    complimentaryAmount: analytics.complimentaryAmount,
    refundAmount: sumRefundGrandTotals(records),
    methods,
  };
}
