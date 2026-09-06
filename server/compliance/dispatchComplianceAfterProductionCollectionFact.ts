/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Post-commit compliance dispatch — mirrors downstream delivery pattern.
 * Does not influence the paid result returned to Cashier.
 *
 * CASHIER-POST-PAYMENT-TAX-INVOICE-LATENCY-REDUCTION-1
 * Runs Compliance immediately after CF (via continueAfterHttp / waitUntil),
 * then optional afterCompliance work (settlement / deferred relay). Does not
 * await on the Cashier HTTP return path.
 */

import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { continueAfterHttp } from "../_core/continueAfterHttp";
import {
  orchestrateProductionCollectionFactCommitted,
  type ProductionCollectionFactComplianceInput,
} from "./ComplianceOrchestrator";

export type DispatchComplianceAfterProductionCollectionFactOptions = {
  /** Runs only after Compliance orchestration settles (success or failure). */
  afterCompliance?: () => Promise<void>;
  onAfterComplianceFailure?: (error: unknown) => void;
};

export function dispatchComplianceAfterProductionCollectionFact(
  input: ProductionCollectionFactComplianceInput,
  options?: DispatchComplianceAfterProductionCollectionFactOptions
): void {
  continueAfterHttp(async () => {
    const started = Date.now();
    let complianceOk = false;
    try {
      await orchestrateProductionCollectionFactCommitted(input);
      complianceOk = true;
      opsLog({
        type: OPS_EVENT.compliance_after_collection_fact_completed,
        category: "ORDER",
        severity: "info",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "complianceAfterCollectionFact",
        metadata: {
          orderId: input.orderId,
          collectionFactId: input.collectionFactId,
          durationMs: Date.now() - started,
          commitOutcome: input.commitOutcome,
        },
      });
    } catch (error: unknown) {
      opsLog({
        type: OPS_EVENT.compliance_after_collection_fact_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "complianceAfterCollectionFact",
        metadata: {
          orderId: input.orderId,
          collectionFactId: input.collectionFactId,
          durationMs: Date.now() - started,
          error: error instanceof Error ? error.message : String(error),
        },
      });
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
    }

    if (!options?.afterCompliance) return;
    try {
      await options.afterCompliance();
    } catch (error: unknown) {
      if (options.onAfterComplianceFailure) {
        options.onAfterComplianceFailure(error);
      } else {
        opsLog({
          type: OPS_EVENT.check_operational_settlement_deferred_failed,
          category: "ORDER",
          severity: "warn",
          ts: new Date().toISOString(),
          restaurantId: input.restaurantId,
          action: "afterComplianceDownstream",
          metadata: {
            orderId: input.orderId,
            collectionFactId: input.collectionFactId,
            complianceOk,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  });
}
