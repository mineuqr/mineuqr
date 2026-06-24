/**
 * THERMAL-PRINTING-13H.4 — Vercel → Print Host dispatch bridge client.
 */
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { randomUUID } from "node:crypto";
import superjson from "superjson";
import { opsLog } from "../_core/opsLog";
import { ENV } from "../_core/env";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import type { PrintHostRouter } from "../print-host/printHostRouter";
import { dispatchAssignedPrintJob } from "./endToEndPrintFlowService";
import type { ExecutePrintHostDispatchResult } from "./dispatchBridgeService";
import type { ExecutePrintHostDiagnosticTestPrintResult } from "./diagnosticPrintDispatchService";
import { executePrintHostDiagnosticTestPrint } from "./diagnosticPrintDispatchService";
import { PRINT_HOST_API_KEY_HEADER } from "./printHostDispatchAuth";

export type RequestPrintHostDispatchInput = {
  jobId: number;
  restaurantId?: number;
  printerId?: number;
  correlationId?: string;
  procedure?: string;
};

export type RequestPrintHostDispatchResult = {
  bridgeUsed: boolean;
  result?: ExecutePrintHostDispatchResult;
  failureReason?: string;
};

function resolveCorrelationId(correlationId?: string): string {
  return correlationId?.trim() || randomUUID();
}

function shouldUseColocatedDispatchFallback(): boolean {
  if (ENV.printHostDispatchUrl && ENV.printHostApiKey) {
    return false;
  }
  return !ENV.isProduction;
}

function createDispatchBridgeClient(correlationId: string) {
  return createTRPCProxyClient<PrintHostRouter>({
    links: [
      httpLink({
        url: `${ENV.printHostDispatchUrl}/api/trpc`,
        transformer: superjson,
        headers: () => ({
          [PRINT_HOST_API_KEY_HEADER]: ENV.printHostApiKey,
          "x-correlation-id": correlationId,
        }),
      }),
    ],
  });
}

export async function requestPrintHostDispatch(
  input: RequestPrintHostDispatchInput
): Promise<RequestPrintHostDispatchResult> {
  const correlationId = resolveCorrelationId(input.correlationId);

  opsLog({
    type: OPS_EVENT.dispatch_requested,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    correlationId,
    restaurantId: input.restaurantId,
    procedure: input.procedure,
    metadata: {
      jobId: input.jobId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      correlationId,
    },
  });

  if (shouldUseColocatedDispatchFallback()) {
    const localDispatch = await dispatchAssignedPrintJob({
      jobId: input.jobId,
      correlationId,
    });
    return {
      bridgeUsed: false,
      result: {
        status: "dispatched",
        jobId: input.jobId,
        restaurantId: localDispatch.assignment.restaurantId,
        printerId: localDispatch.assignment.printerId,
        agentId: localDispatch.assignment.agentId,
        assignment: localDispatch.assignment,
        assignmentCreated: localDispatch.assignmentCreated,
        notified: localDispatch.notified,
        notificationSkippedReason: localDispatch.notificationSkippedReason,
      },
    };
  }

  if (!ENV.printHostDispatchUrl || !ENV.printHostApiKey) {
    const failureReason = "dispatch_bridge_not_configured";
    opsLog({
      type: OPS_EVENT.dispatch_bridge_failed,
      category: "ORDER",
      severity: "error",
      ts: new Date().toISOString(),
      correlationId,
      restaurantId: input.restaurantId,
      procedure: input.procedure,
      metadata: {
        jobId: input.jobId,
        restaurantId: input.restaurantId,
        printerId: input.printerId,
        reason: failureReason,
        correlationId,
      },
    });
    return { bridgeUsed: true, failureReason };
  }

  try {
    const client = createDispatchBridgeClient(correlationId);
    const result = await client.dispatchBridge.dispatchJob.mutate({
      jobId: input.jobId,
    });
    return { bridgeUsed: true, result };
  } catch (error) {
    const failureReason =
      error instanceof Error ? error.message : "dispatch_bridge_unreachable";
    opsLog({
      type: OPS_EVENT.dispatch_bridge_failed,
      category: "ORDER",
      severity: "error",
      ts: new Date().toISOString(),
      correlationId,
      restaurantId: input.restaurantId,
      procedure: input.procedure,
      metadata: {
        jobId: input.jobId,
        restaurantId: input.restaurantId,
        printerId: input.printerId,
        reason: failureReason,
        correlationId,
      },
    });
    return { bridgeUsed: true, failureReason };
  }
}

export type RequestPrintHostDiagnosticTestPrintInput = {
  wireJobId: number;
  diagnosticId: string;
  diagnosticRunId: number;
  restaurantId: number;
  printerId: number;
  printerName: string;
  triggeredByLabel: string;
  triggeredAt: string;
  correlationId?: string;
  procedure?: string;
};

export type RequestPrintHostDiagnosticTestPrintResult = {
  bridgeUsed: boolean;
  result?: ExecutePrintHostDiagnosticTestPrintResult;
  failureReason?: string;
};

export async function requestPrintHostDiagnosticTestPrint(
  input: RequestPrintHostDiagnosticTestPrintInput
): Promise<RequestPrintHostDiagnosticTestPrintResult> {
  const correlationId = resolveCorrelationId(input.correlationId);

  if (shouldUseColocatedDispatchFallback()) {
    const result = await executePrintHostDiagnosticTestPrint({
      wireJobId: input.wireJobId,
      diagnosticId: input.diagnosticId,
      diagnosticRunId: input.diagnosticRunId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      printerName: input.printerName,
      triggeredByLabel: input.triggeredByLabel,
      triggeredAt: input.triggeredAt,
      correlationId,
    });
    return { bridgeUsed: false, result };
  }

  if (!ENV.printHostDispatchUrl || !ENV.printHostApiKey) {
    return {
      bridgeUsed: true,
      failureReason: "dispatch_bridge_not_configured",
    };
  }

  try {
    const client = createDispatchBridgeClient(correlationId);
    const result = await client.dispatchBridge.testPrint.mutate({
      wireJobId: input.wireJobId,
      diagnosticId: input.diagnosticId,
      diagnosticRunId: input.diagnosticRunId,
      restaurantId: input.restaurantId,
      printerId: input.printerId,
      printerName: input.printerName,
      triggeredByLabel: input.triggeredByLabel,
      triggeredAt: input.triggeredAt,
    });
    return { bridgeUsed: true, result };
  } catch (error) {
    return {
      bridgeUsed: true,
      failureReason:
        error instanceof Error ? error.message : "dispatch_bridge_unreachable",
    };
  }
}
