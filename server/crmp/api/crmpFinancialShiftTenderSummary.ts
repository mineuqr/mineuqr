/**
 * FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 / CRMP-CF-ATTRIBUTION-1
 * Thin read compose for Shift tender mix.
 *
 * Membership: Financial Shift attributions (custody association).
 * Current Cashier tender facts: Collection Fact tendersJson (financial SSOT).
 * Historical / refund facts: Settlement Record paymentSnapshot.
 * Overlap: CF wins by restaurantId + orderingChannel + orderId. Never CF+SR as two sales.
 * Bucket rules: REPORTING-PAYMENT-METHOD-ANALYTICS-1 builder (no UI math).
 *
 * Does NOT invoke the Expected Cash formula.
 * Does NOT mutate Financial Shift / Settlement / Reporting ownership.
 */

import type { SettlementRecord } from "@shared/operational-session";
import {
  isCollectionFactProductionPurpose,
  type CollectionFact,
} from "@shared/operational-session/payment/collection-fact";
import {
  formatReportingAmount,
  parseReportingAmount,
} from "@shared/reporting-platform";
import {
  buildPaymentMethodAnalyticsFromCapturedLines,
  type PaymentMethodAnalyticsTenderLine,
} from "../../reporting-platform/PaymentMethodAnalyticsService";
import { collectionFactTendersToAnalyticsLines } from "../../reporting-platform/collectionFactTenderReportingAdapter";
import { listSettlementRecordsByIds } from "../../operational-session/check/settlementRecordRepository";
import { listCollectionFactsByIds } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import type { FinancialShiftDomainService } from "../FinancialShiftDomainService";
import type { FinancialShiftTenderSummaryDto } from "./crmpApiDtos";

/** PAYMENT-METHOD-CATALOG-UNIFICATION-1 — canonical catalog only. */
const DISPLAY_METHODS = ["cash", "card", "other"] as const;

export type SettlementRecordBatchLoader = (input: {
  restaurantId: number;
  settlementRecordIds: readonly string[];
}) => Promise<readonly SettlementRecord[]>;

export type CollectionFactBatchLoader = (input: {
  restaurantId: number;
  collectionFactIds: readonly string[];
}) => Promise<readonly CollectionFact[]>;

const defaultSettlementLoader: SettlementRecordBatchLoader = (input) =>
  listSettlementRecordsByIds(input);

const defaultCollectionFactLoader: CollectionFactBatchLoader = (input) =>
  listCollectionFactsByIds(input);

function saleIdentityKey(input: {
  restaurantId: number;
  orderId: number;
}): string {
  return `sale:${input.restaurantId}:${input.orderId}`;
}

function linesFromCollectionFacts(
  facts: readonly CollectionFact[]
): PaymentMethodAnalyticsTenderLine[] {
  const lines: PaymentMethodAnalyticsTenderLine[] = [];
  for (const fact of facts) {
    if (!isCollectionFactProductionPurpose(fact.purpose)) continue;
    lines.push(...collectionFactTendersToAnalyticsLines(fact));
  }
  return lines;
}

function occupiedSaleKeys(
  facts: readonly CollectionFact[]
): ReadonlySet<string> {
  const keys = new Set<string>();
  for (const fact of facts) {
    if (!isCollectionFactProductionPurpose(fact.purpose)) continue;
    keys.add(
      saleIdentityKey({
        restaurantId: fact.restaurantId,
        orderId: fact.orderId,
      })
    );
  }
  return keys;
}

function recordOverlapsCollectionFact(
  record: SettlementRecord,
  occupiedSales: ReadonlySet<string>
): boolean {
  for (const ref of record.orderRefs) {
    if (
      occupiedSales.has(
        saleIdentityKey({
          restaurantId: record.restaurantId,
          orderId: ref.orderId,
        })
      )
    ) {
      return true;
    }
  }
  return false;
}

function linesFromRecords(
  records: readonly SettlementRecord[],
  occupiedSales: ReadonlySet<string>
): PaymentMethodAnalyticsTenderLine[] {
  const lines: PaymentMethodAnalyticsTenderLine[] = [];
  for (const record of records) {
    if (record.recordKind === "refund" || record.recordKind === "void") {
      continue;
    }
    if (recordOverlapsCollectionFact(record, occupiedSales)) {
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
  loadCollectionFacts?: CollectionFactBatchLoader;
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

  const settlementRecordIds = shift.attributions
    .map((a) => a.settlementRecordId)
    .filter((id): id is string => Boolean(id?.trim()));
  const collectionFactIds = shift.attributions
    .map((a) => a.collectionFactId)
    .filter((id): id is string => Boolean(id?.trim()));

  const [records, facts] = await Promise.all([
    (input.loadSettlementRecords ?? defaultSettlementLoader)({
      restaurantId: input.restaurantId,
      settlementRecordIds,
    }),
    (input.loadCollectionFacts ?? defaultCollectionFactLoader)({
      restaurantId: input.restaurantId,
      collectionFactIds,
    }),
  ]);

  const occupiedSales = occupiedSaleKeys(facts);
  const analytics = buildPaymentMethodAnalyticsFromCapturedLines(
    {
      restaurantId: input.restaurantId,
      from: shift.openedAt,
      to: shift.closedAt,
    },
    [
      ...linesFromCollectionFacts(facts),
      ...linesFromRecords(records, occupiedSales),
    ]
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
