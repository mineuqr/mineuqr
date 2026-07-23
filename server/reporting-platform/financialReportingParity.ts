/**
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1 — dual-run parity helpers.
 * Compares Check/ST legacy reads to Settlement Record publication (no money math).
 */

import {
  formatReportingAmount,
  parseReportingAmount,
  type BusinessMetricsSummaryDto,
  type PaymentMethodAnalyticsDto,
} from "@shared/reporting-platform";

export type FinancialParityDelta = Readonly<{
  field: string;
  legacy: string | number;
  settlementRecord: string | number;
}>;

export type FinancialParityResult = Readonly<{
  matched: boolean;
  deltas: readonly FinancialParityDelta[];
}>;

function moneyEqual(a: string, b: string): boolean {
  return parseReportingAmount(a) === parseReportingAmount(b);
}

export function compareBusinessMetricsParity(
  legacy: BusinessMetricsSummaryDto,
  settlementRecord: BusinessMetricsSummaryDto
): FinancialParityResult {
  const deltas: FinancialParityDelta[] = [];
  const moneyFields: Array<keyof BusinessMetricsSummaryDto> = [
    "revenue",
    "averageCheck",
    "taxCollected",
    "complimentaryAmount",
  ];
  for (const field of moneyFields) {
    const l = String(legacy[field]);
    const s = String(settlementRecord[field]);
    if (!moneyEqual(l, s)) {
      deltas.push({ field, legacy: l, settlementRecord: s });
    }
  }
  const countFields: Array<keyof BusinessMetricsSummaryDto> = [
    "paidCheckCount",
    "complimentaryCount",
    "voidedCount",
  ];
  for (const field of countFields) {
    if (legacy[field] !== settlementRecord[field]) {
      deltas.push({
        field,
        legacy: Number(legacy[field]),
        settlementRecord: Number(settlementRecord[field]),
      });
    }
  }
  return { matched: deltas.length === 0, deltas };
}

export function comparePaymentMethodParity(
  legacy: PaymentMethodAnalyticsDto,
  settlementRecord: PaymentMethodAnalyticsDto
): FinancialParityResult {
  const deltas: FinancialParityDelta[] = [];
  if (
    !moneyEqual(legacy.monetaryTenderTotal, settlementRecord.monetaryTenderTotal)
  ) {
    deltas.push({
      field: "monetaryTenderTotal",
      legacy: legacy.monetaryTenderTotal,
      settlementRecord: settlementRecord.monetaryTenderTotal,
    });
  }
  if (
    !moneyEqual(legacy.complimentaryAmount, settlementRecord.complimentaryAmount)
  ) {
    deltas.push({
      field: "complimentaryAmount",
      legacy: legacy.complimentaryAmount,
      settlementRecord: settlementRecord.complimentaryAmount,
    });
  }

  const legacyByMethod = new Map(
    legacy.buckets.map((b) => [b.paymentMethod, b] as const)
  );
  const srByMethod = new Map(
    settlementRecord.buckets.map((b) => [b.paymentMethod, b] as const)
  );
  const methods = new Set([...legacyByMethod.keys(), ...srByMethod.keys()]);
  for (const method of methods) {
    const l = legacyByMethod.get(method);
    const s = srByMethod.get(method);
    const lAmt = l?.tenderAmount ?? formatReportingAmount(0);
    const sAmt = s?.tenderAmount ?? formatReportingAmount(0);
    if (!moneyEqual(lAmt, sAmt)) {
      deltas.push({
        field: `bucket.${method}.tenderAmount`,
        legacy: lAmt,
        settlementRecord: sAmt,
      });
    }
    const lCount = l?.transactionCount ?? 0;
    const sCount = s?.transactionCount ?? 0;
    if (lCount !== sCount) {
      deltas.push({
        field: `bucket.${method}.transactionCount`,
        legacy: lCount,
        settlementRecord: sCount,
      });
    }
  }

  return { matched: deltas.length === 0, deltas };
}
