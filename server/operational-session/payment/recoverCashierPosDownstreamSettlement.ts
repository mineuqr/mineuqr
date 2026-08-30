/**
 * POST-CONFIRM OPERATIONAL RECOVERY
 * Durable retry for Check / ST / OS / SR after Collection Fact PAID.
 * Direct cashier_pos and Incoming finalizable channels share this sweeper.
 * Does not write Collection Facts, Invoices, or Orders. Does not gate HTTP Confirm.
 * Does not Confirm, close Session, or enter Incoming.
 *
 * RECOVERY-RESILIENCE-AND-DURABILITY-HARDENING-1 Phase 1
 * Missing Order is CheckOrderNotFoundError (permanent).
 * DiningSessionUnavailableError remains retryable infrastructure failure.
 */
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import { deliverCashierPosOperationalSettlementAfterPaid } from "../check/CheckService";
import { listCashierPosProductionFactsAwaitingDownstreamSettlement } from "./collection-fact/collectionFactRepository";
import { dispatchBestEffortDownstreamDelivery } from "./dispatchBestEffortDownstreamDelivery";
import { classifyCheckDownstreamRecovery } from "./recoveryDiscoveryClassification";
import {
  listActiveParkedCheckOrderIds,
  parkCheckDownstreamDiscovery,
} from "./recoveryDiscoveryPark";
import { getRecoveryParkStore } from "./recoveryParkStore";

export const CHECK_DOWNSTREAM_RECOVERY_PAGE_CAP = 50;
export const CHECK_DOWNSTREAM_RECOVERY_MAX_PAGES = 4;

export type CashierPosDownstreamSettlementInput = {
  restaurantId: number;
  orderId: number;
  billDiscountAmount?: string;
  settlements?: Parameters<
    typeof deliverCashierPosOperationalSettlementAfterPaid
  >[0]["settlements"];
  settlementContext?: Parameters<
    typeof deliverCashierPosOperationalSettlementAfterPaid
  >[0]["settlementContext"];
  settlementContextHints?: Parameters<
    typeof deliverCashierPosOperationalSettlementAfterPaid
  >[0]["settlementContextHints"];
};

export function scheduleCashierPosOperationalSettlementAfterPaid(
  input: CashierPosDownstreamSettlementInput
): void {
  dispatchBestEffortDownstreamDelivery({
    delivery: () => deliverCashierPosOperationalSettlementAfterPaid(input),
    onFailure: (err: unknown) => {
      opsLog({
        type: OPS_EVENT.check_operational_settlement_deferred_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "cashierDownstreamDelivery",
        metadata: {
          orderId: input.orderId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    },
  });
}

export async function recoverCashierPosDownstreamSettlements(
  limit = 25
): Promise<{
  attempted: number;
  failed: number;
  recovered: number;
  parked: number;
}> {
  const pageSize = Math.min(Math.max(limit, 0), CHECK_DOWNSTREAM_RECOVERY_PAGE_CAP);
  const maxCandidates = pageSize * CHECK_DOWNSTREAM_RECOVERY_MAX_PAGES;
  let attempted = 0;
  let failed = 0;
  let recovered = 0;
  let parked = 0;
  let actionable = 0;

  if (pageSize === 0) {
    return { attempted: 0, failed: 0, recovered: 0, parked: 0 };
  }

  while (attempted < maxCandidates && actionable < pageSize) {
    const facts = await listCashierPosProductionFactsAwaitingDownstreamSettlement(
      pageSize,
      { excludeOrderIds: listActiveParkedCheckOrderIds() }
    );
    if (facts.length === 0) break;

    for (const fact of facts) {
      if (attempted >= maxCandidates || actionable >= pageSize) break;
      attempted += 1;
      if (await getRecoveryParkStore().hasCheck(fact.restaurantId, fact.orderId)) {
        parkCheckDownstreamDiscovery({
          restaurantId: fact.restaurantId,
          orderId: fact.orderId,
          classification: "permanently_unrecoverable",
          gaps: ["durably_parked"],
          reason: "durable_recovery_park",
        });
        continue;
      }
      try {
        await deliverCashierPosOperationalSettlementAfterPaid({
          restaurantId: fact.restaurantId,
          orderId: fact.orderId,
        });
        recovered += 1;
        actionable += 1;
      } catch (err) {
        const classification = classifyCheckDownstreamRecovery(err);
        const reason = err instanceof Error ? err.message : String(err);
        if (classification === "permanently_unrecoverable") {
          parkCheckDownstreamDiscovery({
            restaurantId: fact.restaurantId,
            orderId: fact.orderId,
            classification,
            gaps: ["order_not_found"],
            reason,
          });
          await getRecoveryParkStore().markCheck(fact.restaurantId, fact.orderId);
          parked += 1;
          opsLog({
            type: OPS_EVENT.recovery_discovery_parked,
            category: "ORDER",
            severity: "info",
            ts: new Date().toISOString(),
            restaurantId: fact.restaurantId,
            action: "cashierDownstreamRecovery",
            metadata: {
              orderId: fact.orderId,
              classification,
              gaps: ["order_not_found"],
              error: reason,
            },
          });
          continue;
        }
        failed += 1;
        actionable += 1;
        parkCheckDownstreamDiscovery({
          restaurantId: fact.restaurantId,
          orderId: fact.orderId,
          classification: "retryable",
          gaps: ["check_downstream_retryable"],
          reason,
        });
        parked += 1;
        opsLog({
          type: OPS_EVENT.check_operational_settlement_deferred_failed,
          category: "ORDER",
          severity: "warn",
          ts: new Date().toISOString(),
          restaurantId: fact.restaurantId,
          action: "cashierDownstreamRecovery",
          metadata: {
            orderId: fact.orderId,
            classification: "retryable",
            error: reason,
          },
        });
      }
    }

    if (facts.length < pageSize) break;
  }

  return { attempted, failed, recovered, parked };
}
