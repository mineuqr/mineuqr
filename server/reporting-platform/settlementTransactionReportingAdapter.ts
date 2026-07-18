/**
 * CHECK-SETTLEMENT-METHODS-1 — Reporting Platform read adapter for settlement tenders.
 *
 * Does not change Revenue / Tax / Paid Checks formulas.
 * Revenue remains SUM(paid Check.grandTotal).
 * This adapter enables future "Revenue by payment method" without gateway logic.
 */

import {
  listSettlementTransactionsForRestaurant,
} from "../operational-session/check/settlementTransactionRepository";
import type { SettlementTransaction } from "@shared/operational-session";
import {
  paymentMethodCategory,
  type PaymentMethod,
  type PaymentMethodCategory,
} from "@shared/operational-session";
import { formatReportingAmount, parseReportingAmount } from "@shared/reporting-platform";

export type SettlementTransactionReportingRow = SettlementTransaction;

export type RevenueByPaymentMethodBucket = Readonly<{
  paymentMethod: PaymentMethod;
  category: PaymentMethodCategory;
  transactionCount: number;
  amount: string;
}>;

/**
 * Sum captured settlement transactions by payment method.
 * Presentation / future APIs only — not a substitute for Check Revenue KPI.
 */
export async function listCapturedSettlementsByPaymentMethod(input: {
  restaurantId: number;
  from?: string;
  to?: string;
}): Promise<readonly RevenueByPaymentMethodBucket[]> {
  const rows = await listSettlementTransactionsForRestaurant(input);
  const buckets = new Map<
    PaymentMethod,
    { count: number; amount: number }
  >();

  for (const row of rows) {
    if (row.status !== "captured") continue;
    if (row.paymentMethod === "complimentary") continue;
    const acc = buckets.get(row.paymentMethod) ?? { count: 0, amount: 0 };
    acc.count += 1;
    acc.amount += parseReportingAmount(row.amount);
    buckets.set(row.paymentMethod, acc);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([paymentMethod, acc]) => ({
      paymentMethod,
      category: paymentMethodCategory(paymentMethod),
      transactionCount: acc.count,
      amount: formatReportingAmount(acc.amount),
    }));
}

export async function listSettlementTransactionsForReporting(input: {
  restaurantId: number;
  from?: string;
  to?: string;
}): Promise<readonly SettlementTransactionReportingRow[]> {
  return listSettlementTransactionsForRestaurant(input);
}
