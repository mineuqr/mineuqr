/**
 * THERMAL-PRINTING-13I.6 — Print Host diagnostic test print dispatch.
 */
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { notifyAgentOfJobId } from "./assignmentNotifier";
import {
  assignDiagnosticPrintJob,
  getDiagnosticPrintAssignment,
  hasDiagnosticNotificationBeenSent,
  recordDiagnosticNotificationSent,
} from "./diagnosticAssignmentService";
import { mapDiagnosticDispatchFailureReason } from "./diagnosticDispatchErrors";
import { buildDiagnosticTicketPayload } from "./diagnosticTicketRenderer";
import { findPrinterById } from "./printerRepository";
import { resolveRoutingDecision } from "./routingEngine";
import { RoutingRejectedError } from "./routingTypes";

export type ExecutePrintHostDiagnosticTestPrintInput = {
  wireJobId: number;
  diagnosticId: string;
  diagnosticRunId: number;
  restaurantId: number;
  printerId: number;
  printerName: string;
  triggeredByLabel: string;
  triggeredAt: string;
  correlationId?: string;
};

export type ExecutePrintHostDiagnosticTestPrintResult = {
  status: "dispatched" | "already_processed" | "failed";
  diagnosticId: string;
  wireJobId: number;
  restaurantId: number;
  printerId: number;
  agentId?: string;
  notified: boolean;
  notificationSkippedReason?: "agent_disconnected";
  failureReason?: string;
};

function logDiagnosticEvent(input: {
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

export async function executePrintHostDiagnosticTestPrint(
  input: ExecutePrintHostDiagnosticTestPrintInput
): Promise<ExecutePrintHostDiagnosticTestPrintResult> {
  logDiagnosticEvent({
    type: OPS_EVENT.diagnostic_print_received,
    severity: "info",
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    metadata: {
      diagnosticId: input.diagnosticId,
      wireJobId: input.wireJobId,
      printerId: input.printerId,
      correlationId: input.correlationId,
    },
  });

  const existing = getDiagnosticPrintAssignment(input.wireJobId);
  if (existing && hasDiagnosticNotificationBeenSent(input.wireJobId)) {
    return {
      status: "already_processed",
      diagnosticId: input.diagnosticId,
      wireJobId: input.wireJobId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      agentId: existing.agentId,
      notified: true,
    };
  }

  const printer = await findPrinterById(input.printerId);
  if (!printer || printer.restaurantId !== input.restaurantId) {
    const failureReason = "Printer not found for this restaurant";
    logDiagnosticEvent({
      type: OPS_EVENT.diagnostic_print_failed,
      severity: "warn",
      correlationId: input.correlationId,
      restaurantId: input.restaurantId,
      metadata: {
        diagnosticId: input.diagnosticId,
        printerId: input.printerId,
        reason: failureReason,
      },
    });
    return {
      status: "failed",
      diagnosticId: input.diagnosticId,
      wireJobId: input.wireJobId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      notified: false,
      failureReason,
    };
  }

  let agentId: string;
  try {
    agentId = resolveRoutingDecision({
      jobId: input.wireJobId,
      printerId: input.printerId,
    }).agentId;
  } catch (error) {
    const failureReason = mapDiagnosticDispatchFailureReason(error);
    logDiagnosticEvent({
      type: OPS_EVENT.diagnostic_print_failed,
      severity: "warn",
      correlationId: input.correlationId,
      restaurantId: input.restaurantId,
      metadata: {
        diagnosticId: input.diagnosticId,
        printerId: input.printerId,
        reason: failureReason,
        routingCode: error instanceof RoutingRejectedError ? error.code : undefined,
      },
    });
    return {
      status: "failed",
      diagnosticId: input.diagnosticId,
      wireJobId: input.wireJobId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      notified: false,
      failureReason,
    };
  }

  const assignmentResult = assignDiagnosticPrintJob({
    wireJobId: input.wireJobId,
    diagnosticId: input.diagnosticId,
    diagnosticRunId: input.diagnosticRunId,
    agentId,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    ticket: buildDiagnosticTicketPayload({
      wireJobId: input.wireJobId,
      restaurantId: input.restaurantId,
      printerName: input.printerName,
      agentId,
      diagnosticId: input.diagnosticId,
      triggeredBy: input.triggeredByLabel,
      triggeredAt: input.triggeredAt,
    }),
    assignedAt: new Date().toISOString(),
  });

  logDiagnosticEvent({
    type: OPS_EVENT.diagnostic_print_assignment_completed,
    severity: "info",
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    metadata: {
      diagnosticId: input.diagnosticId,
      wireJobId: input.wireJobId,
      printerId: input.printerId,
      agentId,
      assignmentCreated: assignmentResult.created,
    },
  });

  if (hasDiagnosticNotificationBeenSent(input.wireJobId)) {
    return {
      status: "already_processed",
      diagnosticId: input.diagnosticId,
      wireJobId: input.wireJobId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      agentId,
      notified: true,
    };
  }

  const notification = notifyAgentOfJobId({
    agentId,
    jobId: input.wireJobId,
  });

  if (notification.notified) {
    recordDiagnosticNotificationSent(input.wireJobId);
    logDiagnosticEvent({
      type: OPS_EVENT.diagnostic_print_notification_sent,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: input.restaurantId,
      metadata: {
        diagnosticId: input.diagnosticId,
        wireJobId: input.wireJobId,
        agentId,
        printerId: input.printerId,
      },
    });
  } else {
    logDiagnosticEvent({
      type: OPS_EVENT.diagnostic_print_notification_failed,
      severity: "info",
      correlationId: input.correlationId,
      restaurantId: input.restaurantId,
      metadata: {
        diagnosticId: input.diagnosticId,
        wireJobId: input.wireJobId,
        agentId,
        printerId: input.printerId,
        reason: notification.reason ?? "agent_disconnected",
      },
    });
  }

  return {
    status: "dispatched",
    diagnosticId: input.diagnosticId,
    wireJobId: input.wireJobId,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    agentId,
    notified: notification.notified,
    notificationSkippedReason: notification.reason,
  };
}
