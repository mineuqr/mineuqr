/**
 * THERMAL-PRINTING-12A / 3B.3 / 10A.8 — non-blocking auto print job enqueue + assignment dispatch.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { dispatchAssignedPrintJob } from "./endToEndPrintFlowService";
import { createPrintJob } from "./printJobService";
import { isAutoPrintEnabledForRestaurant } from "./printTargetSelectionService";
import { resolveStationPrintTargets } from "./stationRoutingService";

export type EnqueueAutoPrintJobForOrderInput = {
  orderId: number;
  restaurantId: number;
  procedure?: string;
};

/**
 * Best-effort side effect for order.create. Never throws to callers.
 */
export async function enqueueAutoPrintJobForOrder(
  input: EnqueueAutoPrintJobForOrderInput
): Promise<void> {
  try {
    const autoPrintEnabled = await isAutoPrintEnabledForRestaurant(input.restaurantId);
    if (!autoPrintEnabled) {
      return;
    }

    const routing = await resolveStationPrintTargets({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    });

    for (const skipped of routing.skipped) {
      opsLog({
        type: OPS_EVENT.print_job_creation_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        procedure: input.procedure,
        metadata: {
          orderId: input.orderId,
          stationId: skipped.stationId,
          stationName: skipped.stationName,
          orderItemIds: skipped.orderItemIds,
          error: skipped.reason,
          failureLayer: "station-routing",
        },
      });
    }

    for (const target of routing.targets) {
      const result = await createPrintJob({
        orderId: input.orderId,
        trigger: "auto",
        printerId: target.printerId,
        stationId: target.stationId,
        idempotencyKey: target.idempotencyKey,
      });

      opsLog({
        type: result.created
          ? OPS_EVENT.print_job_created
          : OPS_EVENT.print_job_idempotency_reused,
        category: "ORDER",
        severity: "info",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        procedure: input.procedure,
        metadata: {
          orderId: input.orderId,
          printJobId: result.job.id,
          printerId: result.job.printerId ?? target.printerId,
          stationId: target.stationId,
          stationName: target.stationName,
          selectionReason: target.selectionReason,
          idempotencyKey: result.job.idempotencyKey,
          status: result.job.status,
        },
      });

      await dispatchAssignedPrintJob({ jobId: result.job.id });
    }
  } catch (error) {
    opsLog({
      type: OPS_EVENT.print_job_creation_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: input.procedure,
      metadata: {
        orderId: input.orderId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
