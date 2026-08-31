/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Post-commit compliance dispatch — mirrors downstream delivery pattern.
 * Does not influence the paid result returned to Cashier.
 */

import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { dispatchBestEffortDownstreamDelivery } from "../operational-session/payment/dispatchBestEffortDownstreamDelivery";
import {
  orchestrateProductionCollectionFactCommitted,
  type ProductionCollectionFactComplianceInput,
} from "./ComplianceOrchestrator";

export function dispatchComplianceAfterProductionCollectionFact(
  input: ProductionCollectionFactComplianceInput
): void {
  dispatchBestEffortDownstreamDelivery({
    delivery: () => orchestrateProductionCollectionFactCommitted(input),
    onFailure: (error: unknown) => {
      opsLog({
        type: OPS_EVENT.check_operational_settlement_deferred_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "complianceAfterCollectionFact",
        metadata: {
          orderId: input.orderId,
          collectionFactId: input.collectionFactId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    },
  });
}
