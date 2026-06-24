/**
 * THERMAL-PRINTING-13I.6 — diagnostic test print orchestration (API / dashboard).
 */
import { randomUUID } from "node:crypto";
import { opsLog } from "../_core/opsLog";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import {
  diagnosticWireJobIdFromRunId,
  DIAGNOSTIC_PRINT_STATUS,
} from "../../shared/printing/diagnosticPrint";
import {
  insertPrintDiagnosticRun,
  updatePrintDiagnosticRun,
} from "./diagnosticPrintRepository";
import { findPrinterById } from "./printerRepository";
import { requestPrintHostDiagnosticTestPrint } from "./printHostDispatchClient";

export type SubmitDiagnosticTestPrintInput = {
  restaurantId: number;
  printerId: number;
  triggeredByUserId: number;
  triggeredByLabel: string;
  correlationId?: string;
};

export type SubmitDiagnosticTestPrintResult =
  | {
      accepted: true;
      diagnosticId: string;
      printerId: number;
      printerName: string;
      submittedAt: string;
      agentId?: string;
      notified: boolean;
      warning?: string;
    }
  | {
      accepted: false;
      diagnosticId?: string;
      printerId: number;
      printerName?: string;
      submittedAt: string;
      reason: string;
    };

function createDiagnosticId(): string {
  return `diag_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function submitDiagnosticTestPrint(
  input: SubmitDiagnosticTestPrintInput
): Promise<SubmitDiagnosticTestPrintResult> {
  const submittedAt = new Date().toISOString();
  const printer = await findPrinterById(input.printerId);

  if (!printer) {
    return {
      accepted: false,
      printerId: input.printerId,
      submittedAt,
      reason: "Printer not found",
    };
  }

  if (printer.restaurantId !== input.restaurantId) {
    return {
      accepted: false,
      printerId: input.printerId,
      printerName: printer.name,
      submittedAt,
      reason: "Printer does not belong to this restaurant",
    };
  }

  const diagnosticId = createDiagnosticId();
  const run = await insertPrintDiagnosticRun({
    diagnosticId,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    triggeredByUserId: input.triggeredByUserId,
    triggeredByLabel: input.triggeredByLabel,
  });
  const wireJobId = diagnosticWireJobIdFromRunId(run.id);

  opsLog({
    type: OPS_EVENT.diagnostic_print_requested,
    category: "ORDER",
    severity: "info",
    ts: submittedAt,
    correlationId: input.correlationId,
    restaurantId: input.restaurantId,
    actorId: input.triggeredByUserId,
    metadata: {
      diagnosticId,
      printerId: input.printerId,
      wireJobId,
    },
  });

  const dispatch = await requestPrintHostDiagnosticTestPrint({
    wireJobId,
    diagnosticId,
    diagnosticRunId: run.id,
    restaurantId: input.restaurantId,
    printerId: input.printerId,
    printerName: printer.name,
    triggeredByLabel: input.triggeredByLabel,
    triggeredAt: submittedAt,
    correlationId: input.correlationId,
    procedure: "printOps.testPrint",
  });

  if (!dispatch.result || dispatch.result.status === "failed") {
    const reason =
      dispatch.failureReason ??
      dispatch.result?.failureReason ??
      "Diagnostic test print dispatch failed";

    await updatePrintDiagnosticRun({
      id: run.id,
      status: DIAGNOSTIC_PRINT_STATUS.FAILED,
      error: reason,
      completedAt: new Date().toISOString(),
    });

    opsLog({
      type: OPS_EVENT.diagnostic_print_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      correlationId: input.correlationId,
      restaurantId: input.restaurantId,
      actorId: input.triggeredByUserId,
      metadata: {
        diagnosticId,
        printerId: input.printerId,
        reason,
      },
    });

    return {
      accepted: false,
      diagnosticId,
      printerId: input.printerId,
      printerName: printer.name,
      submittedAt,
      reason,
    };
  }

  await updatePrintDiagnosticRun({
    id: run.id,
    status: DIAGNOSTIC_PRINT_STATUS.ACCEPTED,
    agentId: dispatch.result.agentId ?? null,
    error: dispatch.result.notified
      ? null
      : (dispatch.result.notificationSkippedReason ?? "agent_disconnected"),
  });

  const warning = dispatch.result.notified
    ? undefined
    : "Dispatch accepted but the agent did not receive the notification (agent may be offline)";

  return {
    accepted: true,
    diagnosticId,
    printerId: input.printerId,
    printerName: printer.name,
    submittedAt,
    agentId: dispatch.result.agentId,
    notified: dispatch.result.notified,
    warning,
  };
}
