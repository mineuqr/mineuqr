import type {
  ConnectorExecutionPort,
  ConnectorExecutionResult,
} from "../contracts/ConnectorExecutionPort";
import type { GatewayPrintRouteRequest } from "../contracts/gatewayContracts";

/**
 * Placeholder until PRINT-CONNECTOR-NETWORK-1 delivers RLC transport.
 */
export class PendingConnectorExecutionPort implements ConnectorExecutionPort {
  async executePrint(
    _connectorInstanceId: string,
    _request: GatewayPrintRouteRequest
  ): Promise<ConnectorExecutionResult> {
    return {
      success: false,
      failureReason: "transport_unavailable",
      message: "Connector transport not implemented",
    };
  }
}
