/**
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1
 * SETTLEMENT-RECORD-REPORTING-ADOPTION-1
 *
 * Payment-method analytics from Settlement Record payment snapshots (publication).
 * Does not replace Check Revenue (SUM paid published grandTotal).
 * Does not recalculate tender amounts.
 */

import {
  REPORTING_CONTRACT_VERSION,
  averageReportingAmount,
  formatReportingAmount,
  parseReportingAmount,
  type PaymentMethodAnalyticsDto,
  type ReportingPeriodInput,
} from "@shared/reporting-platform";
import {
  isPaymentMethod,
  paymentMethodCategory,
  type PaymentMethod,
} from "@shared/operational-session";
import { ReportingValidationError } from "./BusinessMetricsService";
import { comparePaymentMethodParity } from "./financialReportingParity";
import { resolveFinancialReportingSourceMode } from "./financialReportingSource";
import { listSettlementTransactionsForReporting } from "./settlementTransactionReportingAdapter";
import { listSettlementRecordPaymentLinesForReporting } from "./settlementRecordReportingAdapter";
import { opsLog } from "../_core/opsLog";

type Acc = {
  tenderAmount: number;
  transactionCount: number;
  checkIds: Set<number>;
};

type TenderLine = Readonly<{
  paymentMethod: string;
  amount: string;
  status: string;
  checkId: number;
}>;

function emptyAcc(): Acc {
  return { tenderAmount: 0, transactionCount: 0, checkIds: new Set() };
}

function buildPaymentMethodAnalyticsDto(
  input: ReportingPeriodInput,
  rows: readonly TenderLine[]
): PaymentMethodAnalyticsDto {
  const monetary = new Map<PaymentMethod, Acc>();
  let complimentaryAmount = 0;

  for (const row of rows) {
    if (row.status !== "captured") continue;
    if (!isPaymentMethod(row.paymentMethod)) continue;

    if (row.paymentMethod === "complimentary") {
      complimentaryAmount += parseReportingAmount(row.amount);
      continue;
    }

    const acc = monetary.get(row.paymentMethod) ?? emptyAcc();
    acc.tenderAmount += parseReportingAmount(row.amount);
    acc.transactionCount += 1;
    acc.checkIds.add(row.checkId);
    monetary.set(row.paymentMethod, acc);
  }

  let monetaryTotal = 0;
  for (const acc of monetary.values()) {
    monetaryTotal += acc.tenderAmount;
  }

  const buckets = [...monetary.entries()]
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

  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "PaymentMethodAnalytics",
    programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
    generatedAt: new Date().toISOString(),
    restaurantId: input.restaurantId,
    from: input.from ?? null,
    to: input.to ?? null,
    monetaryTenderTotal: formatReportingAmount(monetaryTotal),
    complimentaryAmount: formatReportingAmount(complimentaryAmount),
    buckets,
  };
}

async function loadTenderLines(
  input: ReportingPeriodInput
): Promise<readonly TenderLine[]> {
  const mode = resolveFinancialReportingSourceMode();
  if (mode === "check") {
    const st = await listSettlementTransactionsForReporting({
      restaurantId: input.restaurantId,
      from: input.from,
      to: input.to,
    });
    return st.map((row) => ({
      paymentMethod: row.paymentMethod,
      amount: row.amount,
      status: row.status,
      checkId: row.checkId,
    }));
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
      }))
    );
    const published = buildPaymentMethodAnalyticsDto(input, srTenders);
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

  return srTenders;
}

/**
 * Build payment-method analytics for a restaurant period.
 * Source: Settlement Record paymentSnapshot (captured lines).
 * listSettlementRecordPaymentLinesForReporting is the publication read path.
 */
export async function getPaymentMethodAnalytics(
  input: ReportingPeriodInput
): Promise<PaymentMethodAnalyticsDto> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }

  const rows = await loadTenderLines(input);
  return buildPaymentMethodAnalyticsDto(input, rows);
}
