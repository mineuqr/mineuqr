/**
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1
 * REFUND-REPORTING-ADOPTION-1
 *
 * Payment-method analytics from Settlement Record payment snapshots (publication).
 * Does not replace Check Revenue (SUM paid published grandTotal).
 * Does not recalculate tender amounts.
 * Refund tender buckets are additive (status=refunded) — never mutate captured totals.
 */

import {
  REPORTING_CONTRACT_VERSION,
  averageReportingAmount,
  formatReportingAmount,
  parseReportingAmount,
  type PaymentMethodAnalyticsBucketDto,
  type PaymentMethodAnalyticsDto,
  type ReportingPeriodInput,
} from "@shared/reporting-platform";
import {
  isPaymentMethod,
  paymentMethodCategory,
  toCanonicalPaymentMethod,
  type PaymentMethod,
} from "@shared/operational-session";
import { ReportingValidationError } from "./BusinessMetricsService";
import { comparePaymentMethodParity } from "./financialReportingParity";
import { resolveFinancialReportingSourceMode } from "./financialReportingSource";
import { listSettlementTransactionsForReporting } from "./settlementTransactionReportingAdapter";
import {
  listRefundSettlementRecordPaymentLinesForReporting,
  listSettlementRecordPaymentLinesForReporting,
} from "./settlementRecordReportingAdapter";
import { opsLog } from "../_core/opsLog";

type Acc = {
  tenderAmount: number;
  transactionCount: number;
  checkIds: Set<number>;
};

export type PaymentMethodAnalyticsTenderLine = Readonly<{
  paymentMethod: string;
  amount: string;
  status: string;
  checkId: number;
}>;

type TenderLine = PaymentMethodAnalyticsTenderLine;

function emptyAcc(): Acc {
  return { tenderAmount: 0, transactionCount: 0, checkIds: new Set() };
}

/**
 * Pure tender-bucket builder (REPORTING-PAYMENT-METHOD-ANALYTICS-1 rules).
 * Reused by Financial Shift Ops tender summary (attribution → SR snapshots).
 * Does not recalculate tender amounts — only aggregates captured lines.
 */
export function buildPaymentMethodAnalyticsFromCapturedLines(
  input: Readonly<{
    restaurantId: number;
    from?: string | null;
    to?: string | null;
  }>,
  rows: readonly PaymentMethodAnalyticsTenderLine[]
): PaymentMethodAnalyticsDto {
  return buildPaymentMethodAnalyticsDto(
    {
      restaurantId: input.restaurantId,
      from: input.from ?? undefined,
      to: input.to ?? undefined,
    },
    rows
  );
}

function bucketsFromAccMap(
  monetary: Map<PaymentMethod, Acc>,
  monetaryTotal: number
): PaymentMethodAnalyticsBucketDto[] {
  return [...monetary.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([paymentMethod, acc]) => {
      const checkCount = acc.checkIds.size;
      const mix =
        monetaryTotal > 0 ? (acc.tenderAmount / monetaryTotal) * 100 : 0;
      return {
        paymentMethod,
        category: paymentMethodCategory(paymentMethod),
        tenderAmount: formatReportingAmount(acc.tenderAmount),
        transactionCount: acc.transactionCount,
        checkCount,
        averageCheck: averageReportingAmount(acc.tenderAmount, checkCount),
        mixPercent: (Math.round(mix * 100) / 100).toFixed(2),
      };
    });
}

function accumulateTenderLines(
  rows: readonly TenderLine[],
  status: "captured" | "refunded"
): { monetary: Map<PaymentMethod, Acc>; complimentaryAmount: number; total: number } {
  const monetary = new Map<PaymentMethod, Acc>();
  let complimentaryAmount = 0;

  for (const row of rows) {
    if (row.status !== status) continue;
    if (!isPaymentMethod(row.paymentMethod)) continue;

    if (row.paymentMethod === "complimentary") {
      if (status === "captured") {
        complimentaryAmount += parseReportingAmount(row.amount);
      }
      continue;
    }

    const catalogKey = toCanonicalPaymentMethod(
      row.paymentMethod
    ) as PaymentMethod;
    const acc = monetary.get(catalogKey) ?? emptyAcc();
    acc.tenderAmount += parseReportingAmount(row.amount);
    acc.transactionCount += 1;
    acc.checkIds.add(row.checkId);
    monetary.set(catalogKey, acc);
  }

  let total = 0;
  for (const acc of monetary.values()) {
    total += acc.tenderAmount;
  }
  return { monetary, complimentaryAmount, total };
}

function buildPaymentMethodAnalyticsDto(
  input: ReportingPeriodInput,
  rows: readonly TenderLine[],
  refundRows: readonly TenderLine[] = []
): PaymentMethodAnalyticsDto {
  const captured = accumulateTenderLines(rows, "captured");
  // Prefer dedicated refund publications; fall back to refunded status on primary lines.
  const refundSource = refundRows.length > 0 ? refundRows : rows;
  const refunded = accumulateTenderLines(refundSource, "refunded");

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "PaymentMethodAnalytics",
    programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
    generatedAt: new Date().toISOString(),
    restaurantId: input.restaurantId,
    from: input.from ?? null,
    to: input.to ?? null,
    monetaryTenderTotal: formatReportingAmount(captured.total),
    complimentaryAmount: formatReportingAmount(captured.complimentaryAmount),
    buckets: bucketsFromAccMap(captured.monetary, captured.total),
    refundTenderTotal: formatReportingAmount(refunded.total),
    refundBuckets: bucketsFromAccMap(refunded.monetary, refunded.total),
  };
}

async function loadTenderLines(
  input: ReportingPeriodInput
): Promise<{
  rows: readonly TenderLine[];
  refundRows: readonly TenderLine[];
}> {
  const refundLines = await listRefundSettlementRecordPaymentLinesForReporting({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
  });
  const refundRows = refundLines.map((row) => ({
    paymentMethod: row.paymentMethod,
    amount: row.amount,
    status: row.status,
    checkId: row.checkId,
  }));

  const mode = resolveFinancialReportingSourceMode();
  if (mode === "check") {
    const st = await listSettlementTransactionsForReporting({
      restaurantId: input.restaurantId,
      from: input.from,
      to: input.to,
    });
    return {
      rows: st.map((row) => ({
        paymentMethod: row.paymentMethod,
        amount: row.amount,
        status: row.status,
        checkId: row.checkId,
      })),
      refundRows,
    };
  }

  const srLines = await listSettlementRecordPaymentLinesForReporting({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
  });
  const srTenders = srLines.map((row) => ({
    paymentMethod: row.paymentMethod,
    amount: row.amount,
    status: row.status,
    checkId: row.checkId,
  }));

  if (mode === "dual") {
    const st = await listSettlementTransactionsForReporting({
      restaurantId: input.restaurantId,
      from: input.from,
      to: input.to,
    });
    const legacy = buildPaymentMethodAnalyticsDto(
      input,
      st.map((row) => ({
        paymentMethod: row.paymentMethod,
        amount: row.amount,
        status: row.status,
        checkId: row.checkId,
      })),
      refundRows
    );
    const published = buildPaymentMethodAnalyticsDto(
      input,
      srTenders,
      refundRows
    );
    const parity = comparePaymentMethodParity(legacy, published);
    if (!parity.matched) {
      opsLog({
        type: "reporting_payment_parity_mismatch",
        category: "SYSTEM",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        metadata: {
          from: input.from ?? null,
          to: input.to ?? null,
          deltas: parity.deltas,
        },
      });
    }
  }

  return { rows: srTenders, refundRows };
}

/**
 * Build payment-method analytics for a restaurant period.
 * Source: Settlement Record paymentSnapshot (captured + refunded lines).
 * listSettlementRecordPaymentLinesForReporting is the publication read path.
 */
export async function getPaymentMethodAnalytics(
  input: ReportingPeriodInput
): Promise<PaymentMethodAnalyticsDto> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }

  const { rows, refundRows } = await loadTenderLines(input);
  return buildPaymentMethodAnalyticsDto(input, rows, refundRows);
}
