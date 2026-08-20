/**
 * REVENUE-UNION-ADOPTION-1 — read-only Collection Fact projection for shadow Union.
 * Does not write facts. Does not contribute to published Dashboard Revenue.
 */

import { eq } from "drizzle-orm";
import { paymentCollectionFacts } from "../../../drizzle/schema";
import { getDb } from "../../db";
import { isCollectionFactPurpose } from "@shared/operational-session/payment/collection-fact";
import type { CurrencySnapshot, TaxPolicySnapshot } from "@shared/operational-session";
import type { RevenueUnionCollectionFact } from "@shared/reporting-platform/revenue-union";

function asSnapshot<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function asTenders(
  value: unknown
): RevenueUnionCollectionFact["tenders"] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => ({
    paymentMethod: String((item as { paymentMethod?: string }).paymentMethod ?? ""),
    amount: String((item as { amount?: string }).amount ?? "0.00"),
  }));
}

export async function listCollectionFactsForShadowRevenue(input: {
  restaurantId: number;
}): Promise<readonly RevenueUnionCollectionFact[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(paymentCollectionFacts)
    .where(eq(paymentCollectionFacts.restaurantId, input.restaurantId));
  const out: RevenueUnionCollectionFact[] = [];
  for (const row of rows) {
    if (!isCollectionFactPurpose(row.purpose)) continue;
    out.push({
      collectionFactId: row.collectionFactId,
      restaurantId: row.restaurantId,
      orderId: row.orderId,
      paymentIntentId: row.paymentIntentId,
      orderingChannel: row.orderingChannel,
      purpose: row.purpose,
      amount: String(row.amount),
      taxAmount: String(row.taxAmount),
      discountAmount: String(row.discountAmount),
      currencyCode: row.currencyCode,
      currencySnapshot: asSnapshot(row.currencySnapshotJson, {
        currencyCode: row.currencyCode,
        currencySymbol: "",
      }) as CurrencySnapshot,
      taxPolicySnapshot: asSnapshot(row.taxPolicySnapshotJson, {
        version: 1,
        enabled: false,
        mode: "exclusive",
        components: [],
      }) as TaxPolicySnapshot,
      tenders: asTenders(row.tendersJson),
      checkId: row.checkId ?? null,
      businessDay: row.businessDay,
      committedAt: String(row.committedAt),
    });
  }
  return out;
}
