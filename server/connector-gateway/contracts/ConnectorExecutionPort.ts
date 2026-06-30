import type { GatewayPrintRouteRequest } from "./gatewayContracts";

/**
 * Transport to RLC — implemented by PRINT-CONNECTOR-NETWORK-1 (future).
 * Gateway routes only; this port executes cross-process delivery.
 */
export type ConnectorExecutionResult = {
  success: boolean;
  failureReason?: string;
  message?: string;
};

export interface ConnectorExecutionPort {
  executePrint(
    connectorInstanceId: string,
    request: GatewayPrintRouteRequest
  ): Promise<ConnectorExecutionResult>;
}
