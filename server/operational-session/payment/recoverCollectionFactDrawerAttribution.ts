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
 *
 * RECOVERY-DISCOVERY-STARVATION-HARDENING-1
 * Parks permanently unrecoverable (and cooled-down deferred/retryable) CFs
 * out of the bounded oldest-first window. Does not delete the CF.
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
import { classifyDrawerAttributionRecovery } from "./recoveryDiscoveryClassification";
import {
  listActiveParkedDrawerAttributionFactIds,
  parkDrawerAttributionDiscovery,
} from "./recoveryDiscoveryPark";
import { getRecoveryParkStore } from "./recoveryParkStore";

export const DRAWER_ATTRIBUTION_RECOVERY_PAGE_CAP = 50;
export const DRAWER_ATTRIBUTION_RECOVERY_MAX_PAGES = 4;

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
): Promise<{
  attempted: number;
  failed: number;
  created: number;
  parked: number;
}> {
  const pageSize = Math.min(Math.max(limit, 0), DRAWER_ATTRIBUTION_RECOVERY_PAGE_CAP);
  const maxCandidates = pageSize * DRAWER_ATTRIBUTION_RECOVERY_MAX_PAGES;
  let attempted = 0;
  let failed = 0;
  let created = 0;
  let parked = 0;
  let actionable = 0;

  if (pageSize === 0) {
    return { attempted: 0, failed: 0, created: 0, parked: 0 };
  }

  while (attempted < maxCandidates && actionable < pageSize) {
    const facts = await listProductionCollectionFactsAwaitingDrawerAttribution(
      pageSize,
      {
        excludeCollectionFactIds: listActiveParkedDrawerAttributionFactIds(),
      }
    );
    if (facts.length === 0) break;

    for (const fact of facts) {
      if (attempted >= maxCandidates || actionable >= pageSize) break;
      attempted += 1;
      if (await getRecoveryParkStore().hasDrawer(fact.collectionFactId)) {
        parkDrawerAttributionDiscovery({
          collectionFactId: fact.collectionFactId,
          restaurantId: fact.restaurantId,
          classification: "permanently_unrecoverable",
          gaps: ["durably_parked"],
          reason: "durable_recovery_park",
        });
        continue;
      }
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
        const classification = classifyDrawerAttributionRecovery({
          outcome: bundle.attribution.outcome,
          gaps: bundle.attribution.gaps,
        });
        if (
          classification === "recovered" ||
          classification === "already_resolved"
        ) {
          created += 1;
          actionable += 1;
          continue;
        }
        if (classification === "retryable") {
          failed += 1;
          actionable += 1;
          parkDrawerAttributionDiscovery({
            collectionFactId: fact.collectionFactId,
            restaurantId: fact.restaurantId,
            classification: "retryable",
            gaps: bundle.attribution.gaps,
            reason: bundle.attribution.reason ?? "retryable_drawer_attribution",
          });
          parked += 1;
          logParked(fact, "retryable", bundle.attribution.gaps, bundle.attribution.reason);
          continue;
        }
        parkDrawerAttributionDiscovery({
          collectionFactId: fact.collectionFactId,
          restaurantId: fact.restaurantId,
          classification,
          gaps: bundle.attribution.gaps,
          reason:
            bundle.attribution.reason ??
            (classification === "permanently_unrecoverable"
              ? "permanently_unrecoverable_drawer_attribution"
              : "deferred_drawer_attribution"),
        });
        parked += 1;
        if (classification === "permanently_unrecoverable") {
          await getRecoveryParkStore().markDrawer(fact.collectionFactId);
        }
        logParked(fact, classification, bundle.attribution.gaps, bundle.attribution.reason);
      } catch (err) {
        failed += 1;
        actionable += 1;
        parkDrawerAttributionDiscovery({
          collectionFactId: fact.collectionFactId,
          restaurantId: fact.restaurantId,
          classification: "retryable",
          gaps: ["recovery_writer_threw"],
          reason: err instanceof Error ? err.message : String(err),
        });
        parked += 1;
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
            classification: "retryable",
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    if (facts.length < pageSize) break;
  }

  return { attempted, failed, created, parked };
}

function logParked(
  fact: CollectionFact,
  classification: "permanently_unrecoverable" | "deferred" | "retryable",
  gaps: readonly string[],
  reason: string | null | undefined
): void {
  opsLog({
    type: OPS_EVENT.recovery_discovery_parked,
    category: "ORDER",
    severity: classification === "retryable" ? "warn" : "info",
    ts: new Date().toISOString(),
    restaurantId: fact.restaurantId,
    action: "recoverCollectionFactDrawerAttributions",
    metadata: {
      orderId: fact.orderId,
      collectionFactId: fact.collectionFactId,
      classification,
      gaps: [...gaps],
      reason: reason ?? null,
    },
  });
}
