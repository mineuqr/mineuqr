/**
 * THERMAL-PRINTING-10C — network transport adapter (TCP ESC/POS delivery).
 */
import type { TransportRetryPolicy } from "../../shared/printing/transports/transportRetryPolicy";
import type {
  ExecutionTransportAdapter,
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import { deliverEscPosArtifactWithRetry } from "./transportDeliveryHelper";
import type { TcpSocketClientFactory } from "./tcpSocketClient";

export const NETWORK_TRANSPORT = "network" as const;

export class NetworkTransportAdapter implements ExecutionTransportAdapter {
  readonly transport = NETWORK_TRANSPORT;

  constructor(
    private readonly socketFactory: TcpSocketClientFactory,
    private readonly retryPolicy?: TransportRetryPolicy,
    private readonly defaultTimeoutMs = 5_000
  ) {}

  async deliver(request: TransportExecutionRequest): Promise<TransportExecutionResult> {
    const endpoint = request.networkEndpoint;
    if (!endpoint) {
      return {
        status: "failed",
        transport: this.transport,
        failureCode: "endpoint-missing",
        message: "Network transport endpoint is required",
      };
    }

    return deliverEscPosArtifactWithRetry({
      request,
      transport: this.transport,
      retryPolicy: this.retryPolicy,
      deliverBytes: async (bytes) => {
        const socket = this.socketFactory.create();
        try {
          await socket.connect({
            host: endpoint.host,
            port: endpoint.port,
            timeoutMs: this.defaultTimeoutMs,
          });
          await socket.write(bytes);
        } finally {
          await socket.close().catch(() => undefined);
        }
      },
    });
  }
}

export function createNetworkTransportAdapter(
  socketFactory: TcpSocketClientFactory,
  retryPolicy?: TransportRetryPolicy
): NetworkTransportAdapter {
  return new NetworkTransportAdapter(socketFactory, retryPolicy);
}
