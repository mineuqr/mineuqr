/**
 * THERMAL-PRINTING-3B.3 — non-blocking auto print job enqueue on order.create.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { createPrintJob } from "./printJobService";

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
    const result = await createPrintJob({
      orderId: input.orderId,
      trigger: "auto",
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
        idempotencyKey: result.job.idempotencyKey,
        status: result.job.status,
      },
    });
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
