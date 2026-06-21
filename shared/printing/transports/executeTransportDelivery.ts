/**
 * THERMAL-PRINTING-10B — transport selection and delivery pipeline.
 *
 * Consumes ExecutionContext, PrinterProfile, and ExecutionPlan only.
 * Does not re-run strategy or capability selection.
 */
import type { ExecutionTransport } from "../executionCapabilities";
import type { ExecutionContext } from "../executionContext";
import type { PrinterProfile } from "../printerProfiles";
import type {
  TransportExecutionRequest,
  TransportExecutionResult,
  TransportRegistry,
} from "./transportContracts";

export type ResolveTransportInput = {
  executionContext: ExecutionContext;
  printerProfile: PrinterProfile;
};

export function resolveTransportForDelivery(
  input: ResolveTransportInput
): ExecutionTransport {
  return input.printerProfile.transport;
}

export async function executeTransportDelivery(
  request: TransportExecutionRequest,
  registry: TransportRegistry
): Promise<TransportExecutionResult> {
  if (request.executionResult.status !== "completed") {
    return {
      status: "rejected",
      transport: resolveTransportForDelivery({
        executionContext: request.executionContext,
        printerProfile: request.printerProfile,
      }),
      message:
        request.executionResult.message ??
        "Transport requires a completed execution result",
    };
  }

  if (!request.executionResult.artifact) {
    return {
      status: "rejected",
      transport: resolveTransportForDelivery({
        executionContext: request.executionContext,
        printerProfile: request.printerProfile,
      }),
      message: "Transport requires an execution artifact",
    };
  }

  if (!request.executionPlan.strategyResolved) {
    return {
      status: "rejected",
      transport: resolveTransportForDelivery({
        executionContext: request.executionContext,
        printerProfile: request.printerProfile,
      }),
      message: request.executionPlan.message ?? "Execution plan not resolved",
    };
  }

  const transport = resolveTransportForDelivery({
    executionContext: request.executionContext,
    printerProfile: request.printerProfile,
  });

  const adapter = registry.get(transport);
  if (!adapter) {
    return {
      status: "not-implemented",
      transport,
      message: `No transport adapter registered for: ${transport}`,
    };
  }

  return adapter.deliver(request);
}
