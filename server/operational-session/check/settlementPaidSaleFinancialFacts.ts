/**
 * CHECK-FINALIZE-PAYABLE-ISOLATION-1
 * CHECK-RESIDUAL-FINANCIAL-REFERENCE-CLEANUP-1
 * Current paid-sale Settlement money is resolved per enrolled Order CF.
 * Check-wide CF cardinality must not suppress a valid Order-level CF.
 * Check operational money may differ and must not become Settlement authority.
 * Does not write Invoice, CF, or PAID.
 */

import { addAmounts } from "@shared/crmp";
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
  orderFacts: Readonly<
    Record<
      number,
      Readonly<{
        collectionFactId: string;
        grandTotal: string;
      }>
    >
  >;
}>;

export type OrderProductionCollectionFactResolution =
  | { status: "unique"; fact: CollectionFact }
  | { status: "missing" }
  | { status: "ambiguous" };

export function settlementFinancialFactsFromCollectionFact(
  fact: CollectionFact
): SettlementPaidSaleFinancialFacts {
  return composeSettlementFinancialFactsFromCollectionFacts([fact]);
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
 * Attribute production CFs only to the enrolled Order they belong to.
 * Check-wide fact lists never assign Order A's CF to Order B.
 */
export function resolveProductionCollectionFactsByEnrolledOrders(input: {
  orderIds: readonly number[];
  facts: readonly CollectionFact[];
}): ReadonlyMap<number, OrderProductionCollectionFactResolution> {
  const enrolled = input.orderIds.filter((id) => Number.isInteger(id) && id > 0);
  const byOrder = new Map<number, CollectionFact[]>();
  for (const orderId of enrolled) {
    byOrder.set(orderId, []);
  }
  for (const fact of uniqueProductionFacts(input.facts)) {
    const bucket = byOrder.get(fact.orderId);
    if (!bucket) continue;
    bucket.push(fact);
  }
  const resolved = new Map<number, OrderProductionCollectionFactResolution>();
  for (const orderId of enrolled) {
    const facts = byOrder.get(orderId) ?? [];
    if (facts.length === 1 && facts[0]) {
      resolved.set(orderId, { status: "unique", fact: facts[0] });
    } else if (facts.length === 0) {
      resolved.set(orderId, { status: "missing" });
    } else {
      resolved.set(orderId, { status: "ambiguous" });
    }
  }
  return resolved;
}

function composeSettlementFinancialFactsFromCollectionFacts(
  facts: readonly CollectionFact[]
): SettlementPaidSaleFinancialFacts {
  const first = facts[0];
  if (!first) {
    throw new Error("CHECK-FINALIZE-PAYABLE-ISOLATION-1: CF compose requires facts");
  }
  let subtotal = "0.00";
  let discountAmount = "0.00";
  let taxAmount = "0.00";
  let grandTotal = "0.00";
  let settledAt = first.committedAt;
  const taxLines: TaxBreakdown["lines"][number][] = [];
  const paymentLines: SettlementTransactionInput[] = [];
  const orderFacts: Record<
    number,
    { collectionFactId: string; grandTotal: string }
  > = {};
  for (const fact of facts) {
    subtotal = addAmounts(subtotal, String(fact.subtotal));
    discountAmount = addAmounts(discountAmount, String(fact.discountAmount));
    taxAmount = addAmounts(taxAmount, String(fact.taxAmount));
    grandTotal = addAmounts(grandTotal, String(fact.amount));
    if (fact.committedAt > settledAt) settledAt = fact.committedAt;
    taxLines.push(...fact.taxBreakdown.lines);
    for (const tender of fact.tenders) {
      paymentLines.push({
        paymentMethod: tender.paymentMethod,
        amount: String(tender.amount),
        status: "captured",
      });
    }
    orderFacts[fact.orderId] = {
      collectionFactId: fact.collectionFactId,
      grandTotal: String(fact.amount),
    };
  }
  return {
    source: "collection_fact",
    collectionFactId:
      facts.length === 1 ? first.collectionFactId : facts.map((f) => f.collectionFactId).join(","),
    subtotal,
    discountAmount,
    taxAmount,
    taxBreakdown: {
      totalTaxAmount: taxAmount,
      lines: taxLines,
    },
    grandTotal,
    settledAt,
    paymentLines,
    orderFacts,
  };
}

/**
 * Build Settlement money from every enrolled Order that has exactly one CF.
 * Ambiguous per-Order CFs are skipped (no first/latest pick).
 * Missing Orders do not inherit another Order's CF.
 * Check freeze is used only when no enrolled Order has a unique CF.
 */
export function settlementFinancialFactsFromOrderResolutions(
  resolutions: ReadonlyMap<number, OrderProductionCollectionFactResolution>
): SettlementPaidSaleFinancialFacts | null {
  const uniqueFacts: CollectionFact[] = [];
  for (const resolution of resolutions.values()) {
    if (resolution.status === "unique") uniqueFacts.push(resolution.fact);
  }
  if (uniqueFacts.length === 0) return null;
  uniqueFacts.sort((a, b) => a.orderId - b.orderId);
  return composeSettlementFinancialFactsFromCollectionFacts(uniqueFacts);
}

/**
 * One batch CF load, then Order-level resolution. Refund-anchor remains Check-capable;
 * paid-sale ownership is still orderId-scoped after grouping.
 */
export async function resolvePaidSaleSettlementFinancialFacts(input: {
  restaurantId: number;
  checkId: number;
  orderIds: readonly number[];
  client?: SessionDbClient;
}): Promise<SettlementPaidSaleFinancialFacts | null> {
  if (input.orderIds.length === 0) return null;
  const facts = await listProductionCollectionFactsForRefundAnchor(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      orderIds: input.orderIds,
    },
    input.client
  );
  return settlementFinancialFactsFromOrderResolutions(
    resolveProductionCollectionFactsByEnrolledOrders({
      orderIds: input.orderIds,
      facts,
    })
  );
}
