/**
 * THERMAL-PRINTING-7B.5 — delivery confirmation orchestration (7A boundaries preserved).
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { recordDeliveryConfirmation, type DeliveryConfirmationInput } from "./deliveryConfirmationService";
import type { JobDeliveryStateRecord } from "./deliveryStateTracker";
import { resolvePrintJobAssignment } from "./assignmentService";

export type ProcessAgentDeliveryConfirmationResult =
  | { accepted: true; duplicate: false; record: JobDeliveryStateRecord }
  | { accepted: true; duplicate: true; record: JobDeliveryStateRecord }
  | { accepted: false; reason: string };

export async function processAgentDeliveryConfirmation(
  input: DeliveryConfirmationInput
): Promise<ProcessAgentDeliveryConfirmationResult> {
  const result = await recordDeliveryConfirmation(input);
  if (!result.accepted) {
    return result;
  }

  const assignment = await resolvePrintJobAssignment(input.jobId);
  opsLog({
    type: result.duplicate
      ? OPS_EVENT.print_job_delivery_confirmation_reused
      : OPS_EVENT.print_job_delivery_confirmed,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: assignment?.restaurantId,
    metadata: {
      printJobId: input.jobId,
      agentId: input.agentId,
      deliveryState: result.record.state,
    },
  });

  return result;
}
