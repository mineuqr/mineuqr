/**
 * THERMAL-PRINTING-13H — Print Host dispatch bridge execution.
 *
 * Assigns and notifies on the process that owns agentRegistry + WebSocket
 * connections. Safe for retries via assignment reuse + notification tracking.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { assignPrintJob, getPrintJobAssignment } from "./assignmentService";
import { notifyAgentOfAssignment } from "./assignmentNotifier";
import type { PrintJobAssignment } from "./assignmentTypes";
import {
  hasDispatchNotificationBeenSent,
  recordDispatchNotificationSent,
} from "./dispatchBridgeState";
import { findPrintJobById } from "./printJobRepository";
import { findPrinterById } from "./printerRepository";
import { PrintJobNotFoundError } from "./printJobTypes";

export type PrintHostDispatchStatus =
  | "dispatched"
  | "already_processed"
  | "failed";

export type ExecutePrintHostDispatchInput = {
  jobId: number;
  correlationId?: string;
  assignedAt?: string;
  notificationTimestamp?: string;
};

export type ExecutePrintHostDispatchResult = {
  status: PrintHostDispatchStatus;
  jobId: number;
  restaurantId?: number;
  printerId?: number;
  profileId?: string;
  agentId?: string;
  assignment?: PrintJobAssignment;
  assignmentCreated: boolean;
  notified: boolean;
  notificationSkippedReason?: "agent_disconnected";
  failureReason?: string;
};

function logDispatchEvent(input: {
  type: (typeof OPS_EVENT)[keyof typeof OPS_EVENT];
  severity: "info" | "warn" | "error";
  correlationId?: string;
  restaurantId?: number;
  metadata: Record<string, unknown>;
}): void {
  opsLog({
    type: input.type,
    category: "ORDER",
    severity: input.severity,
    ts: new Date().toISOString(),
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    metadata: input.metadata,
  });
}

function buildAlreadyProcessedResult(input: {
  jobId: number;
  assignment: PrintJobAssignment;
}): ExecutePrintHostDispatchResult {
  return {
    status: "already_processed",
    jobId: input.jobId,
    restaurantId: input.assignment.restaurantId,
    printerId: input.assignment.printerId,
    agentId: input.assignment.agentId,
    assignment: input.assignment,
    assignmentCreated: false,
    notified: true,
  };
}

export async function executePrintHostDispatch(
  input: ExecutePrintHostDispatchInput
): Promise<ExecutePrintHostDispatchResult> {
  logDispatchEvent({
    type: OPS_EVENT.dispatch_received,
    severity: "info",
    correlationId: input.correlationId,
    metadata: { jobId: input.jobId },
  });

  const existingAssignment = getPrintJobAssignment(input.jobId);
  if (existingAssignment && hasDispatchNotificationBeenSent(input.jobId)) {
    logDispatchEvent({
      type: OPS_EVENT.dispatch_assignment_completed,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: existingAssignment.restaurantId,
      metadata: {
        jobId: input.jobId,
        restaurantId: existingAssignment.restaurantId,
        printerId: existingAssignment.printerId,
        agentId: existingAssignment.agentId,
        outcome: "already_processed",
      },
    });
    return buildAlreadyProcessedResult({
      jobId: input.jobId,
      assignment: existingAssignment,
    });
  }

  const job = await findPrintJobById(input.jobId);
  if (!job) {
    logDispatchEvent({
      type: OPS_EVENT.dispatch_bridge_failed,
      severity: "warn",
      correlationId: input.correlationId,
      metadata: {
        jobId: input.jobId,
        reason: "print_job_not_found",
      },
    });
    return {
      status: "failed",
      jobId: input.jobId,
      assignmentCreated: false,
      notified: false,
      failureReason: "print_job_not_found",
    };
  }

  const printer =
    job.printerId != null ? await findPrinterById(job.printerId) : null;

  logDispatchEvent({
    type: OPS_EVENT.dispatch_assignment_started,
    severity: "info",
    correlationId: input.correlationId,
    restaurantId: job.restaurantId,
    metadata: {
      jobId: job.id,
      restaurantId: job.restaurantId,
      printerId: job.printerId ?? undefined,
      profileId: printer?.profileId,
      correlationId: input.correlationId,
    },
  });

  let assignmentResult;
  try {
    assignmentResult = await assignPrintJob({
      jobId: input.jobId,
      assignedAt: input.assignedAt,
    });
  } catch (error) {
    const failureReason =
      error instanceof PrintJobNotFoundError
        ? "print_job_not_found"
        : error instanceof Error
          ? error.message
          : String(error);

    logDispatchEvent({
      type: OPS_EVENT.dispatch_bridge_failed,
      severity: "warn",
      correlationId: input.correlationId,
      restaurantId: job.restaurantId,
      metadata: {
        jobId: job.id,
        restaurantId: job.restaurantId,
        printerId: job.printerId ?? undefined,
        profileId: printer?.profileId,
        reason: failureReason,
        correlationId: input.correlationId,
      },
    });

    return {
      status: "failed",
      jobId: job.id,
      restaurantId: job.restaurantId,
      printerId: job.printerId ?? undefined,
      profileId: printer?.profileId,
      assignmentCreated: false,
      notified: false,
      failureReason,
    };
  }

  const { assignment, created: assignmentCreated } = assignmentResult;

  logDispatchEvent({
    type: assignmentCreated
      ? OPS_EVENT.print_job_assigned
      : OPS_EVENT.print_job_assignment_reused,
    severity: "info",
    correlationId: input.correlationId,
    restaurantId: assignment.restaurantId,
    metadata: {
      jobId: assignment.jobId,
      restaurantId: assignment.restaurantId,
      printerId: assignment.printerId,
      agentId: assignment.agentId,
      correlationId: input.correlationId,
    },
  });

  logDispatchEvent({
    type: OPS_EVENT.dispatch_assignment_completed,
    severity: "info",
    correlationId: input.correlationId,
    restaurantId: assignment.restaurantId,
    metadata: {
      jobId: assignment.jobId,
      restaurantId: assignment.restaurantId,
      printerId: assignment.printerId,
      agentId: assignment.agentId,
      assignmentCreated,
      correlationId: input.correlationId,
    },
  });

  if (hasDispatchNotificationBeenSent(input.jobId)) {
    return buildAlreadyProcessedResult({
      jobId: input.jobId,
      assignment,
    });
  }

  const notification = notifyAgentOfAssignment({
    assignment,
    timestamp: input.notificationTimestamp,
  });

  if (notification.notified) {
    recordDispatchNotificationSent(input.jobId);
    logDispatchEvent({
      type: OPS_EVENT.dispatch_notification_sent,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: assignment.restaurantId,
      metadata: {
        jobId: assignment.jobId,
        restaurantId: assignment.restaurantId,
        printerId: assignment.printerId,
        agentId: assignment.agentId,
        correlationId: input.correlationId,
      },
    });
    logDispatchEvent({
      type: OPS_EVENT.print_agent_job_notified,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: assignment.restaurantId,
      metadata: {
        printJobId: assignment.jobId,
        agentId: assignment.agentId,
        correlationId: input.correlationId,
      },
    });
  } else {
    logDispatchEvent({
      type: OPS_EVENT.dispatch_notification_failed,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: assignment.restaurantId,
      metadata: {
        jobId: assignment.jobId,
        restaurantId: assignment.restaurantId,
        printerId: assignment.printerId,
        agentId: assignment.agentId,
        reason: notification.reason ?? "agent_disconnected",
        correlationId: input.correlationId,
      },
    });
    logDispatchEvent({
      type: OPS_EVENT.print_agent_job_notification_skipped,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: assignment.restaurantId,
      metadata: {
        printJobId: assignment.jobId,
        agentId: assignment.agentId,
        reason: notification.reason ?? "agent_disconnected",
        correlationId: input.correlationId,
      },
    });
  }

  return {
    status: "dispatched",
    jobId: assignment.jobId,
    restaurantId: assignment.restaurantId,
    printerId: assignment.printerId,
    profileId: printer?.profileId,
    agentId: assignment.agentId,
    assignment,
    assignmentCreated,
    notified: notification.notified,
    notificationSkippedReason: notification.reason,
  };
}
