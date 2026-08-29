/**
 * SETTLEMENT-DOWNSTREAM-OF-COLLECTION-FACT-BOUNDARY-1
 * Current paid-sale Settlement money/tenders come from a unique production CF.
 * No-CF / ambiguous CF keep the existing Check freeze. Does not write CF or PAID.
 */

import type {
  SettlementTransactionInput,
  TaxBreakdown,
} from "@shared/operational-session";
import {
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  type CollectionFact,
} from "@shared/operational-session/payment/collection-fact";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { listProductionCollectionFactsForRefundAnchor } from "../payment/collection-fact/collectionFactRepository";

export type SettlementPaidSaleFinancialFacts = Readonly<{
  source: "collection_fact";
  collectionFactId: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  taxBreakdown: TaxBreakdown;
  grandTotal: string;
  settledAt: string;
  paymentLines: readonly SettlementTransactionInput[];
}>;

export function settlementFinancialFactsFromCollectionFact(
  fact: CollectionFact
): SettlementPaidSaleFinancialFacts {
  return {
    source: "collection_fact",
    collectionFactId: fact.collectionFactId,
    subtotal: String(fact.subtotal),
    discountAmount: String(fact.discountAmount),
    taxAmount: String(fact.taxAmount),
    taxBreakdown: fact.taxBreakdown,
    grandTotal: String(fact.amount),
    settledAt: fact.committedAt,
    paymentLines: fact.tenders.map((tender) => ({
      paymentMethod: tender.paymentMethod,
      amount: String(tender.amount),
      status: "captured" as const,
    })),
  };
}

function uniqueProductionFacts(
  facts: readonly CollectionFact[]
): CollectionFact[] {
  const unique = new Map<string, CollectionFact>();
  for (const fact of facts) {
    if (fact.purpose !== COLLECTION_FACT_PRODUCTION_PURPOSE) continue;
    unique.set(fact.collectionFactId, fact);
  }
  return [...unique.values()];
}

/**
 * Unique production CF for the Check's enrolled Orders, or null (legacy path).
 * Incoming CF often has checkId=0 — Order ids are the join key.
 */
export async function resolveUniqueProductionCollectionFactForSettlement(input: {
  restaurantId: number;
  checkId: number;
  orderIds: readonly number[];
  client?: SessionDbClient;
}): Promise<CollectionFact | null> {
  const facts = uniqueProductionFacts(
    await listProductionCollectionFactsForRefundAnchor(
      {
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        orderIds: input.orderIds,
      },
      input.client
    )
  );
  if (facts.length !== 1) return null;
  return facts[0] ?? null;
}
