/**
 * THERMAL-PRINTING-12A / 3B.3 / 10A.8 — non-blocking auto print job enqueue + assignment dispatch.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { requestPrintHostDispatch } from "./printHostDispatchClient";
import { createPrintJob } from "./printJobService";
import { emitPrintJobTelemetryAsync } from "./printJobTelemetryService";
import { PRINT_JOB_TELEMETRY_EVENT } from "../../shared/printing/telemetry";
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

      if (result.created) {
        emitPrintJobTelemetryAsync({
          printJobId: result.job.id,
          restaurantId: input.restaurantId,
          printerId: result.job.printerId ?? target.printerId,
          eventType: PRINT_JOB_TELEMETRY_EVENT.ROUTING_COMPLETED,
          payload: {
            orderId: input.orderId,
            stationId: target.stationId,
            stationName: target.stationName,
            selectionReason: target.selectionReason,
          },
        });
      }

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

      await requestPrintHostDispatch({
        jobId: result.job.id,
        restaurantId: input.restaurantId,
        printerId: result.job.printerId ?? target.printerId,
        procedure: input.procedure,
      });
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
