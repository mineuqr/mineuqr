/**
 * THERMAL-PRINTING-10C — shared transport delivery helper with retry.
 */
import { isEscPosPayload } from "../../shared/printing/executionExecutor";
import { deliverWithTransportRetry } from "../../shared/printing/transports/transportRetryPolicy";
import type {
  TransportExecutionRequest,
  TransportExecutionResult,
  TransportFailureCode,
} from "../../shared/printing/transports/transportContracts";
import type { ExecutionTransport } from "../../shared/printing/executionCapabilities";
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";

function mapErrorToFailureCode(error: unknown): TransportFailureCode {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("timed out") || message.includes("timeout")) {
    return "timeout";
  }
  if (message.includes("writeprinter") || message.includes("write failed") || message.includes("write-failed")) {
    return "write-failed";
  }
  if (
    message.includes("not found") ||
    message.includes("openprinter failed") ||
    message.includes("spooler unavailable")
  ) {
    return "connection-failed";
  }
  if (message.includes("write")) {
    return "write-failed";
  }
  return "connection-failed";
}

export async function deliverEscPosArtifactWithRetry(input: {
  request: TransportExecutionRequest;
  transport: ExecutionTransport;
  retryPolicy?: TransportRetryPolicy;
  deliverBytes: (bytes: Uint8Array) => Promise<void>;
}): Promise<TransportExecutionResult> {
  const artifact = input.request.executionResult.artifact;
  if (!artifact || !isEscPosPayload(artifact)) {
    return {
      status: "rejected",
      transport: input.transport,
      failureCode: "unsupported-artifact",
      message: `${input.transport} transport requires an ESC/POS execution artifact`,
    };
  }

  return deliverWithTransportRetry(async () => {
    try {
      await input.deliverBytes(artifact.bytes);
      return {
        status: "completed",
        transport: input.transport,
        bytesTransmitted: artifact.byteLength,
      };
    } catch (error) {
      return {
        status: "failed",
        transport: input.transport,
        failureCode: mapErrorToFailureCode(error),
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, input.retryPolicy);
}
