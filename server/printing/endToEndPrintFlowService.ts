/**
 * THERMAL-PRINTING-7A.5 — end-to-end print flow orchestration (integration only).
 */
import type { SelectPrintJob } from "../../drizzle/schema";
import { getOrderById } from "../db";
import { PRINT_JOB_TRIGGER } from "../../shared/printing/types";
import type { PrintJobAssignment } from "./assignmentTypes";
import { createPrintJob } from "./printJobService";
import type { CreatePrintJobInput } from "./printJobTypes";
import { resolvePrintTarget } from "./printTargetSelectionService";
import { executePrintHostDispatch } from "./dispatchBridgeService";

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
  correlationId?: string;
};

export type DispatchAssignedPrintJobResult = {
  assignment: PrintJobAssignment;
  assignmentCreated: boolean;
  notified: boolean;
  notificationSkippedReason?: "agent_disconnected";
};

export async function dispatchAssignedPrintJob(
  input: DispatchAssignedPrintJobInput
): Promise<DispatchAssignedPrintJobResult> {
  const dispatch = await executePrintHostDispatch({
    jobId: input.jobId,
    assignedAt: input.assignedAt,
    notificationTimestamp: input.notificationTimestamp,
    correlationId: input.correlationId,
  });

  if (!dispatch.assignment) {
    throw new Error(dispatch.failureReason ?? "Print job dispatch failed");
  }

  return {
    assignment: dispatch.assignment,
    assignmentCreated: dispatch.assignmentCreated,
    notified: dispatch.notified,
    notificationSkippedReason: dispatch.notificationSkippedReason,
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
