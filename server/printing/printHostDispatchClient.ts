/**
 * THERMAL-PRINTING-13H.4 — Print Host dispatch bridge client (diagnostic test print).
 */
import { createTRPCProxyClient, httpLink } from "@trpc/client";
import { randomUUID } from "node:crypto";
import superjson from "superjson";
import { ENV } from "../_core/env";
import type { PrintHostRouter } from "../print-host/printHostRouter";
import type { ExecutePrintHostDiagnosticTestPrintResult } from "./diagnosticPrintDispatchService";
import { executePrintHostDiagnosticTestPrint } from "./diagnosticPrintDispatchService";
import { PRINT_HOST_API_KEY_HEADER } from "./printHostDispatchAuth";

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
