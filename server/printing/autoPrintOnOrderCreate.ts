/**
 * THERMAL-PRINTING-11A / 3B.3 / 10A.8 — non-blocking auto print job enqueue + assignment dispatch.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { dispatchAssignedPrintJob } from "./endToEndPrintFlowService";
import { createPrintJob } from "./printJobService";
import {
  isAutoPrintEnabledForRestaurant,
  resolvePrintTarget,
} from "./printTargetSelectionService";

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

    const target = await resolvePrintTarget({
      restaurantId: input.restaurantId,
    });

    const result = await createPrintJob({
      orderId: input.orderId,
      trigger: "auto",
      printerId: target.dbPrinterId,
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
        printerId: result.job.printerId ?? target.dbPrinterId,
        selectionReason: target.reason,
        idempotencyKey: result.job.idempotencyKey,
        status: result.job.status,
      },
    });

    await dispatchAssignedPrintJob({ jobId: result.job.id });
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
