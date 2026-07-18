/**
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1
 *
 * Payment-method analytics derived exclusively from Settlement Transactions.
 * Does not replace Check Revenue (SUM paid Check.grandTotal).
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
import { listSettlementTransactionsForReporting } from "./settlementTransactionReportingAdapter";

type Acc = {
  tenderAmount: number;
  transactionCount: number;
  checkIds: Set<number>;
};

function emptyAcc(): Acc {
  return { tenderAmount: 0, transactionCount: 0, checkIds: new Set() };
}

/**
 * Build payment-method analytics for a restaurant period.
 * Source: captured Settlement Transactions only.
 */
export async function getPaymentMethodAnalytics(
  input: ReportingPeriodInput
): Promise<PaymentMethodAnalyticsDto> {
  if (!Number.isInteger(input.restaurantId) || input.restaurantId <= 0) {
    throw new ReportingValidationError("Invalid restaurantId");
  }

  const rows = await listSettlementTransactionsForReporting({
    restaurantId: input.restaurantId,
    from: input.from,
    to: input.to,
  });

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
