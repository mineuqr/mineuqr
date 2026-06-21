/**
 * THERMAL-PRINTING-10B — network transport adapter (TCP delivery, no discovery).
 */
import { isEscPosPayload } from "../../shared/printing/executionExecutor";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import type { TcpSocketClient } from "./tcpSocketClient";

export const NETWORK_TRANSPORT = "network" as const;

export class NetworkTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = NETWORK_TRANSPORT;

  constructor(
    private readonly socketClient: TcpSocketClient,
    private readonly defaultTimeoutMs = 5_000
  ) {}

  async deliver(request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    const artifact = request.executionResult.artifact;
    if (!artifact || !isEscPosPayload(artifact)) {
      return {
        status: "rejected",
        transport: this.transport,
        message: "Network transport requires an ESC/POS execution artifact",
      };
    }

    const endpoint = request.networkEndpoint;
    if (!endpoint) {
      return {
        status: "failed",
        transport: this.transport,
        message: "Network transport endpoint is required",
      };
    }

    try {
      await this.socketClient.connect({
        host: endpoint.host,
        port: endpoint.port,
        timeoutMs: this.defaultTimeoutMs,
      });
      await this.socketClient.write(artifact.bytes);
      await this.socketClient.close();

      return {
        status: "completed",
        transport: this.transport,
        bytesTransmitted: artifact.byteLength,
      };
    } catch (error) {
      await this.socketClient.close().catch(() => undefined);
      return {
        status: "failed",
        transport: this.transport,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export function createNetworkTransportAdapter(
  socketClient: TcpSocketClient
): NetworkTransportAdapter {
  return new NetworkTransportAdapter(socketClient);
}
