/**
 * ST-TENDER-PROJECTION-CLEANUP-1
 *
 * Read-only Collection Fact tendersJson projection for payment-method analytics.
 * Production purpose only. Isolated facts never publish.
 * Does not write Collection Facts. Does not replace Check ST writers.
 */

import { and, eq, inArray } from "drizzle-orm";
import { checkOrderMembership } from "../../drizzle/schema";
import { getDb } from "../db";
import { isCollectionFactProductionPurpose } from "@shared/operational-session/payment/collection-fact";
import { isComplimentaryCollectionFact } from "@shared/pos";
import type { RevenueUnionCollectionFact } from "@shared/reporting-platform/revenue-union";
import type { PaymentMethodAnalyticsTenderLine } from "./cashierTenderAnalyticsMerge";
import { listCollectionFactsForRevenueUnion } from "./revenue-union/collectionFactReportingAdapter";

export type CollectionFactTenderReportingQuery = Readonly<{
  restaurantId: number;
  from?: string;
  to?: string;
}>;

function inDateWindow(
  value: string | null | undefined,
  from?: string,
  to?: string
): boolean {
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export function collectionFactTendersToAnalyticsLines(
  fact: Pick<
    RevenueUnionCollectionFact,
    | "collectionFactId"
    | "amount"
    | "discountAmount"
    | "tenders"
    | "checkId"
  >
): PaymentMethodAnalyticsTenderLine[] {
  const saleKey = `cf:${fact.collectionFactId}`;
  const checkId = fact.checkId ?? 0;
  if (isComplimentaryCollectionFact(fact)) {
    return [
      {
        paymentMethod: "complimentary",
        amount: fact.discountAmount,
        status: "captured",
        checkId,
        saleKey,
      },
    ];
  }
  const lines: PaymentMethodAnalyticsTenderLine[] = [];
  for (const tender of fact.tenders) {
    if (tender.amount === "0.00" || tender.amount === "0") continue;
    lines.push({
      paymentMethod: tender.paymentMethod,
      amount: tender.amount,
      status: "captured",
      checkId,
      saleKey,
    });
  }
  return lines;
}

export async function listOccupiedCheckIdsForProductionCollectionFacts(input: {
  restaurantId: number;
  facts: readonly Pick<
    RevenueUnionCollectionFact,
    "checkId" | "orderId"
  >[];
}): Promise<Set<number>> {
  const occupied = new Set<number>();
  const orderIds: number[] = [];
  for (const fact of input.facts) {
    if (fact.checkId != null && fact.checkId > 0) occupied.add(fact.checkId);
    if (Number.isInteger(fact.orderId) && fact.orderId > 0) {
      orderIds.push(fact.orderId);
    }
  }
  if (orderIds.length === 0) return occupied;
  const db = await getDb();
  if (!db) return occupied;
  const uniqueOrderIds = [...new Set(orderIds)];
  const rows = await db
    .select({ checkId: checkOrderMembership.checkId })
    .from(checkOrderMembership)
    .where(
      and(
        eq(checkOrderMembership.restaurantId, input.restaurantId),
        inArray(checkOrderMembership.orderId, uniqueOrderIds)
      )
    );
  for (const row of rows) {
    if (row.checkId > 0) occupied.add(row.checkId);
  }
  return occupied;
}

export async function listProductionCollectionFactTenderLinesForReporting(
  input: CollectionFactTenderReportingQuery
): Promise<{
  lines: readonly PaymentMethodAnalyticsTenderLine[];
  occupiedCheckIds: ReadonlySet<number>;
}> {
  const facts = await listCollectionFactsForRevenueUnion({
    restaurantId: input.restaurantId,
  });
  const production = facts.filter((fact) =>
    isCollectionFactProductionPurpose(fact.purpose)
  );
  const occupiedCheckIds = await listOccupiedCheckIdsForProductionCollectionFacts(
    {
      restaurantId: input.restaurantId,
      facts: production,
    }
  );
  const lines: PaymentMethodAnalyticsTenderLine[] = [];
  for (const fact of production) {
    if (!inDateWindow(fact.committedAt, input.from, input.to)) continue;
    lines.push(...collectionFactTendersToAnalyticsLines(fact));
  }
  return { lines, occupiedCheckIds };
}
