/**
 * THERMAL-PRINTING-7A.5 — end-to-end print flow orchestration (integration only).
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import type { SelectPrintJob } from "../../drizzle/schema";
import { getOrderById } from "../db";
import { PRINT_JOB_TRIGGER } from "../../shared/printing/types";
import { assignPrintJob } from "./assignmentService";
import { notifyAgentOfAssignment } from "./assignmentNotifier";
import type { PrintJobAssignment } from "./assignmentTypes";
import { createPrintJob } from "./printJobService";
import type { CreatePrintJobInput } from "./printJobTypes";
import { resolvePrintTarget } from "./printTargetSelectionService";

export type OrchestratePrintJobFlowInput = CreatePrintJobInput;

export type OrchestratePrintJobFlowResult = {
  job: SelectPrintJob;
  jobCreated: boolean;
  assignment: PrintJobAssignment;
  assignmentCreated: boolean;
  notified: boolean;
  notificationSkippedReason?: "agent_disconnected";
};

export type DispatchAssignedPrintJobInput = {
  jobId: number;
  assignedAt?: string;
  notificationTimestamp?: string;
};

export type DispatchAssignedPrintJobResult = {
  assignment: PrintJobAssignment;
  assignmentCreated: boolean;
  notified: boolean;
  notificationSkippedReason?: "agent_disconnected";
};

function logPrintFlowEvent(input: {
  type: (typeof OPS_EVENT)[keyof typeof OPS_EVENT];
  severity: "info" | "warn";
  restaurantId?: number;
  metadata?: Record<string, unknown>;
}): void {
  opsLog({
    type: input.type,
    category: "ORDER",
    severity: input.severity,
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    metadata: input.metadata,
  });
}

export async function dispatchAssignedPrintJob(
  input: DispatchAssignedPrintJobInput
): Promise<DispatchAssignedPrintJobResult> {
  const assignmentResult = await assignPrintJob({
    jobId: input.jobId,
    assignedAt: input.assignedAt,
  });

  logPrintFlowEvent({
    type: assignmentResult.created
      ? OPS_EVENT.print_job_assigned
      : OPS_EVENT.print_job_assignment_reused,
    severity: "info",
    restaurantId: assignmentResult.assignment.restaurantId,
    metadata: {
      printJobId: assignmentResult.assignment.jobId,
      agentId: assignmentResult.assignment.agentId,
    },
  });

  const notification = notifyAgentOfAssignment({
    assignment: assignmentResult.assignment,
    timestamp: input.notificationTimestamp,
  });

  if (notification.notified) {
    logPrintFlowEvent({
      type: OPS_EVENT.print_agent_job_notified,
      severity: "info",
      restaurantId: assignmentResult.assignment.restaurantId,
      metadata: {
        printJobId: assignmentResult.assignment.jobId,
        agentId: assignmentResult.assignment.agentId,
      },
    });
  } else {
    logPrintFlowEvent({
      type: OPS_EVENT.print_agent_job_notification_skipped,
      severity: "info",
      restaurantId: assignmentResult.assignment.restaurantId,
      metadata: {
        printJobId: assignmentResult.assignment.jobId,
        agentId: assignmentResult.assignment.agentId,
        reason: notification.reason ?? "agent_disconnected",
      },
    });
  }

  return {
    assignment: assignmentResult.assignment,
    assignmentCreated: assignmentResult.created,
    notified: notification.notified,
    notificationSkippedReason: notification.reason,
  };
}

export async function orchestratePrintJobFlow(
  input: OrchestratePrintJobFlowInput
): Promise<OrchestratePrintJobFlowResult> {
  let printerId = input.printerId;

  if (
    input.trigger === PRINT_JOB_TRIGGER.AUTO &&
    (printerId == null || printerId <= 0)
  ) {
    const order = await getOrderById(input.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const target = await resolvePrintTarget({
      restaurantId: order.restaurantId,
      explicitPrinterId: input.printerId,
    });
    printerId = target.dbPrinterId;
  }

  const createdJob = await createPrintJob({
    ...input,
    printerId,
  });
  const dispatch = await dispatchAssignedPrintJob({ jobId: createdJob.job.id });

  return {
    job: createdJob.job,
    jobCreated: createdJob.created,
    assignment: dispatch.assignment,
    assignmentCreated: dispatch.assignmentCreated,
    notified: dispatch.notified,
    notificationSkippedReason: dispatch.notificationSkippedReason,
  };
}
