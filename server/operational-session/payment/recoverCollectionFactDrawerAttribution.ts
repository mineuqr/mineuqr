/**
 * DRAWER-ATTRIBUTION-RELIABILITY-1
 * Durable idempotent replay of CF → Drawer attribution after Financial Core commit.
 *
 * Does not write Invoice, CF, or PAID.
 * Does not roll back Financial Core.
 * Does not use Settlement as current-sale Drawer authority.
 * Missing / failed Attribution stays fail-open until replay converges.
 *
 * CASH-DRAWER-SHIFT-ATTRIBUTION-CONSISTENCY-FIX-1
 * Resolves the Shift that covered CF.committedAt. Never binds a pre-shift
 * Collection Fact to the currently open Shift.
 */

import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import { resolveSettlementContextForCollectionFact } from "../../crmp/SettlementContextResolver";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import {
  adoptSettlementAttributionAfterFinalize,
  type CollectionFactAttributionInput,
} from "../check/checkSettlementAttributionAdoption";
import { listProductionCollectionFactsAwaitingDrawerAttribution } from "./collection-fact/collectionFactRepository";

function toAttributionInput(
  fact: CollectionFact
): CollectionFactAttributionInput {
  return {
    collectionFactId: fact.collectionFactId,
    restaurantId: fact.restaurantId,
    orderId: fact.orderId,
    paymentIntentId: fact.paymentIntentId,
    purpose: fact.purpose,
    amount: fact.amount,
    discountAmount: fact.discountAmount,
    currencyCode: fact.currencyCode,
    tenders: fact.tenders,
    checkId: fact.checkId,
    committedAt: fact.committedAt,
    businessDay: fact.businessDay,
    actorId: fact.actorId,
    terminalId: fact.terminalId,
    orderingChannel: String(fact.orderingChannel),
  };
}

function operatorUserIdFromFact(fact: CollectionFact): number | undefined {
  const actor = Number.parseInt(fact.actorId ?? "", 10);
  return Number.isInteger(actor) && actor > 0 ? actor : undefined;
}

export async function recoverCollectionFactDrawerAttributions(
  limit = 25
): Promise<{ attempted: number; failed: number; created: number }> {
  const facts = await listProductionCollectionFactsAwaitingDrawerAttribution(
    limit
  );
  let failed = 0;
  let created = 0;
  for (const fact of facts) {
    try {
      const at = new Date().toISOString();
      const settlementContext = await resolveSettlementContextForCollectionFact({
        restaurantId: fact.restaurantId,
        deviceId: fact.terminalId?.trim() || undefined,
        operatorUserId: operatorUserIdFromFact(fact),
        committedAt: fact.committedAt,
      });
      const bundle = await adoptSettlementAttributionAfterFinalize({
        restaurantId: fact.restaurantId,
        outcome: "paid",
        settlementContext,
        settlementRecord: null,
        settlementLines: null,
        at,
        collectionFact: toAttributionInput(fact),
      });
      if (
        bundle.attribution.outcome === "created" ||
        bundle.attribution.outcome === "already_applied"
      ) {
        created += 1;
        continue;
      }
      if (bundle.attribution.outcome === "failed") {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      opsLog({
        type: OPS_EVENT.check_settlement_attribution_deferred_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: fact.restaurantId,
        action: "recoverCollectionFactDrawerAttributions",
        metadata: {
          orderId: fact.orderId,
          collectionFactId: fact.collectionFactId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
  return { attempted: facts.length, failed, created };
}
