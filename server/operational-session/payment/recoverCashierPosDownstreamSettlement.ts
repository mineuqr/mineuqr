/**
 * POST-CONFIRM OPERATIONAL RECOVERY
 * Durable retry for Check / ST / OS / SR after Collection Fact PAID.
 * Direct cashier_pos and Incoming finalizable channels share this sweeper.
 * Does not write Collection Facts, Invoices, or Orders. Does not gate HTTP Confirm.
 * Does not Confirm, close Session, or enter Incoming.
 */
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import { deliverCashierPosOperationalSettlementAfterPaid } from "../check/CheckService";
import { listCashierPosProductionFactsAwaitingDownstreamSettlement } from "./collection-fact/collectionFactRepository";
import { dispatchBestEffortDownstreamDelivery } from "./dispatchBestEffortDownstreamDelivery";

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
): Promise<{ attempted: number; failed: number }> {
  const facts = await listCashierPosProductionFactsAwaitingDownstreamSettlement(
    limit
  );
  let failed = 0;
  for (const fact of facts) {
    try {
      await deliverCashierPosOperationalSettlementAfterPaid({
        restaurantId: fact.restaurantId,
        orderId: fact.orderId,
      });
    } catch (err) {
      failed += 1;
      opsLog({
        type: OPS_EVENT.check_operational_settlement_deferred_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: fact.restaurantId,
        action: "cashierDownstreamRecovery",
        metadata: {
          orderId: fact.orderId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
  return { attempted: facts.length, failed };
}
